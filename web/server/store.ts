import pg from 'pg'
import type { Pool, PoolClient } from 'pg'
import type { Client, Data, Week } from '../shared/model.ts'

// Keep Postgres `date` values as the model's 'YYYY-MM-DD' strings; the default parser makes local-time Dates.
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value)

export const databaseUrl = process.env.DATABASE_URL ?? 'postgres://localhost/coach'

/** The request can't be carried out. Thrown inside a change, it also rolls the change back. */
export class Refused extends Error {
  status: number
  errors: string[]

  constructor(status: number, ...errors: string[]) {
    super(errors.join(' '))
    this.status = status
    this.errors = errors
  }
}

export interface Store {
  data(): Promise<Data>
  coach(): Promise<Data['coach']>
  client(id: string): Promise<Client>
  addClient(client: Client): Promise<void>
  /** Changes who may sign in as a client. Whoever was signed in as them is signed out. */
  setEmail(id: string, email: string | null): Promise<void>
  /**
   * The id of the client a Google account belongs to, or null if the coach hasn't entered its
   * email. The first sign-in ties the client to that account, so a later change of the account's
   * email address doesn't lock them out.
   */
  clientForGoogle(sub: string, email: string): Promise<string | null>
  createSession(tokenHash: string, clientId: string): Promise<void>
  /** The client a session belongs to, or null if there is none or it has expired. Using a session renews it. */
  sessionClient(tokenHash: string): Promise<string | null>
  deleteSession(tokenHash: string): Promise<void>
  /**
   * Applies [change] to a client while holding its row lock, so concurrent requests for the same
   * client, from any server process, run one at a time. Only `draft` and the latest week are saved.
   */
  update<T>(id: string, change: (client: Client) => T): Promise<T>
  close(): Promise<void>
}

interface Options {
  url: string
  /** Use this schema instead of `public`. */
  schema?: string
  /** Drop [schema] first. Only ever applies to a named schema, never to `public`. */
  reset?: boolean
}

// Weeks are read and written whole, so a week's workouts, exercises and logs stay in one JSON value.
const tables = `
  create table if not exists coach (
    only_row boolean primary key default true check (only_row),
    name text not null,
    initials text not null
  );
  create table if not exists clients (
    id text primary key,
    seq bigint generated always as identity,
    name text not null,
    initials text not null,
    joined_on date not null,
    draft jsonb
  );
  create table if not exists weeks (
    client_id text not null references clients on delete cascade,
    id text not null,
    seq bigint generated always as identity,
    block integer not null,
    number integer not null,
    theme text not null,
    started_on date not null,
    workouts jsonb not null,
    finished_on date,
    note text not null,
    last_activity_on date,
    primary key (client_id, id)
  );
  create index if not exists weeks_by_client on weeks (client_id, seq);

  -- Added after the first release, so they are added to an existing clients table too.
  alter table clients add column if not exists email text unique;
  alter table clients add column if not exists google_sub text unique;
  -- Only a hash of the token is kept, so reading this table doesn't let anyone sign in.
  create table if not exists sessions (
    token_hash text primary key,
    client_id text not null references clients on delete cascade,
    expires_at timestamptz not null
  );
`

const sessionDays = 90

/** Turns the database's unique-email error into an answer for the coach. */
function refuseTakenEmail(error: unknown): never {
  const { code, constraint } = error as { code?: string; constraint?: string }
  if (code === '23505' && constraint === 'clients_email_key') {
    throw new Refused(409, 'Another client already has that email.')
  }
  throw error
}

const clientColumns = 'id, name, initials, joined_on as "joinedOn", email, draft'
const weekColumns = `id, block, number, theme, started_on as "startedOn", workouts,
  finished_on as "finishedOn", note, last_activity_on as "lastActivityOn"`

const insertClient = (db: PoolClient, client: Client) => db.query(
  'insert into clients (id, name, initials, joined_on, email, draft) values ($1, $2, $3, $4, $5, $6)',
  [client.id, client.name, client.initials, client.joinedOn, client.email, client.draft],
)

const saveWeek = (db: PoolClient, clientId: string, week: Week) => db.query(
  `insert into weeks (client_id, id, block, number, theme, started_on, workouts, finished_on, note, last_activity_on)
   values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
   on conflict (client_id, id) do update set
     block = excluded.block, number = excluded.number, theme = excluded.theme,
     started_on = excluded.started_on, workouts = excluded.workouts, finished_on = excluded.finished_on,
     note = excluded.note, last_activity_on = excluded.last_activity_on`,
  [
    clientId, week.id, week.block, week.number, week.theme, week.startedOn,
    // The driver would send a JS array as a Postgres array, not JSON.
    JSON.stringify(week.workouts),
    week.finishedOn, week.note, week.lastActivityOn,
  ],
)

async function transaction<T>(pool: Pool, work: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await pool.connect()
  try {
    await db.query('begin')
    const result = await work(db)
    await db.query('commit')
    return result
  } catch (error) {
    await db.query('rollback')
    throw error
  } finally {
    db.release()
  }
}

/** Creates any missing tables, and fills them from [seed] only if nothing has been seeded yet. */
async function prepare(pool: Pool, { schema, reset }: Options, seed: () => Data) {
  await transaction(pool, async (db) => {
    if (schema) {
      if (reset) await db.query(`drop schema if exists ${schema} cascade`)
      await db.query(`create schema if not exists ${schema}`)
    }
    await db.query(tables)
    const { coach, clients } = seed()
    const inserted = await db.query(
      'insert into coach (name, initials) values ($1, $2) on conflict do nothing',
      [coach.name, coach.initials],
    )
    if (!inserted.rowCount) return
    for (const client of clients) {
      await insertClient(db, client)
      for (const week of client.weeks) await saveWeek(db, client.id, week)
    }
  })
}

export async function openStore(options: Options, seed: () => Data): Promise<Store> {
  const pool = new pg.Pool({
    connectionString: options.url,
    options: options.schema ? `-c search_path=${options.schema}` : undefined,
  })
  // Without a listener, a dropped idle connection would take the whole process down.
  pool.on('error', (error) => console.error('Postgres connection lost:', error.message))

  const weeksOf = async (db: Pool | PoolClient, clientId: string): Promise<Week[]> => {
    const { rows } = await db.query(
      `select ${weekColumns} from weeks where client_id = $1 order by seq`, [clientId],
    )
    return rows
  }

  const loadClient = async (db: Pool | PoolClient, id: string, lock = ''): Promise<Client> => {
    const { rows } = await db.query(`select ${clientColumns} from clients where id = $1 ${lock}`, [id])
    if (!rows[0]) throw new Refused(404, 'No such client.')
    return { ...rows[0], weeks: await weeksOf(db, id) }
  }

  try {
    await prepare(pool, options, seed)
  } catch (error) {
    await pool.end()
    throw error
  }

  return {
    async data() {
      const [coach, clients, weeks] = await Promise.all([
        pool.query('select name, initials from coach'),
        pool.query(`select ${clientColumns} from clients order by seq`),
        pool.query(`select client_id, ${weekColumns} from weeks order by seq`),
      ])
      const byClient = new Map<string, Week[]>()
      for (const { client_id: clientId, ...week } of weeks.rows) {
        byClient.set(clientId, [...byClient.get(clientId) ?? [], week])
      }
      return {
        coach: coach.rows[0],
        clients: clients.rows.map((client) => ({
          ...client,
          weeks: byClient.get(client.id) ?? [],
        })),
      }
    },

    async coach() {
      const { rows } = await pool.query('select name, initials from coach')
      return rows[0]
    },

    client: (id) => loadClient(pool, id),

    async addClient(client) {
      await transaction(pool, (db) => insertClient(db, client)).catch(refuseTakenEmail)
    },

    async setEmail(id, email) {
      await transaction(pool, async (db) => {
        const { rows } = await db.query('select email from clients where id = $1 for update', [id])
        if (!rows[0]) throw new Refused(404, 'No such client.')
        if (rows[0].email === email) return
        await db.query('update clients set email = $2, google_sub = null where id = $1', [id, email])
        await db.query('delete from sessions where client_id = $1', [id])
      }).catch(refuseTakenEmail)
    },

    async clientForGoogle(sub, email) {
      const known = await pool.query('select id from clients where google_sub = $1', [sub])
      if (known.rows[0]) return known.rows[0].id
      // A client already tied to another Google account is left alone.
      const linked = await pool.query(
        'update clients set google_sub = $1 where email = $2 and google_sub is null returning id',
        [sub, email.toLowerCase()],
      )
      return linked.rows[0]?.id ?? null
    },

    async createSession(tokenHash, clientId) {
      await pool.query(
        `insert into sessions (token_hash, client_id, expires_at)
         values ($1, $2, now() + make_interval(days => $3))`,
        [tokenHash, clientId, sessionDays],
      )
      await pool.query('delete from sessions where expires_at < now()')
    },

    async sessionClient(tokenHash) {
      const { rows } = await pool.query(
        `update sessions set expires_at = now() + make_interval(days => $2)
         where token_hash = $1 and expires_at > now() returning client_id`,
        [tokenHash, sessionDays],
      )
      return rows[0]?.client_id ?? null
    },

    async deleteSession(tokenHash) {
      await pool.query('delete from sessions where token_hash = $1', [tokenHash])
    },

    update: (id, change) => transaction(pool, async (db) => {
      const client = await loadClient(db, id, 'for update')
      const result = change(client)
      await db.query('update clients set draft = $2 where id = $1', [id, client.draft])
      const latest = client.weeks.at(-1)
      if (latest) await saveWeek(db, id, latest)
      return result
    }),

    close: () => pool.end(),
  }
}
