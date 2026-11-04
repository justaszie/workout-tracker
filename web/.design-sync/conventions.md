# Workout Program coach app: how to build with it

The web app a personal coach uses to review clients' training weeks and plan the next one. It is light-only, uses Material 3 proportions, a single brand red, and condensed uppercase page titles. All components are on `window.WorkoutCoach`.

## Setup

No provider or theme wrapper is needed. Everything is styled by `styles.css`, which also loads Roboto and Roboto Condensed from Google Fonts. That stylesheet sets global rules on `body` (grey `--paper` background, 14px Roboto, ink colour), `h1` (40px uppercase Roboto Condensed 800), `h2`, `p` (no margins), `a` and inputs, so plain elements already look right.

Build full screens inside `AppShell` with a `NavRail`, and start each screen with an optional `Breadcrumbs`, then a `PageHeader`. The page column stacks its children with a 24px gap, so don't add margins between sections.

## Styling idiom

Style through component props: `variant`, `size`, `tone`, `padded`, `clip`, `active`. For your own layout glue, use these utility classes from `styles.css`, or inline `display:flex`/`grid` with `gap`. Don't invent other class names.

| Class | Effect |
|---|---|
| `muted` | grey `--ink-muted` text |
| `small` / `caption` | 14px / 12px muted text |
| `lead` / `subtitle` | 16px body / muted 16px line |
| `eyebrow` | 12px uppercase muted label |
| `medium` / `bold` | weight 500 / 700 |
| `flagged` | red bold, for a result off target |
| `right` / `center` | text alignment |
| `grow` / `stack` / `self-start` | flex grow, column, align-self start |
| `chips` / `icon-row` | wrapping row of chips / row of IconButtons |

Colour tokens (use `var(--name)`): `--red`, `--red-hover`, `--red-container`, `--on-red-container`, `--green-container`, `--on-green-container`, `--amber-container`, `--on-amber-container`, `--ink`, `--ink-muted`, `--outline`, `--outline-muted`, `--grey-90`, `--grey-95`, `--paper`, `--white`. The font token is `--condensed`. Red means "needs the coach's attention" or "primary action". Use it sparingly, with at most one `primary` Button per area.

## Components and their usual roles

- Actions: `Button` (`to` makes it an in-app link), `IconButton`, `TextLink`, `Link`.
- Status: `Chip` (`tone` red = needs review, amber = gone quiet, green = done, grey = neutral), `Chips`, `LinkChip`, `Avatar`, `NumberBadge`, `ProgressBar`.
- Forms: `TextField` (outlined, labelled), `SearchField`, `Input` (dense, for editors; give it `aria-label`), `SegmentedControl`, `FilterGroup`. `Button`, `IconButton`, `TextField`, `SearchField` and `Input` also accept every native button or input attribute (`onClick`, `disabled`, `type`, `value`, `onChange`, `placeholder`), even though their `.d.ts` lists only the custom props.
- Surfaces: `Card` (`padded` for free content, `clip` for rows and tables), `ListRow`, `Banner`, `Callout`, `NoteCard`, `ErrorList`, `FlagList` with `FlagItem`, `Dialog`.
- Data: `Table` with `TableRow` and `TableCell`. Columns take CSS grid widths. Always put a Table in `<Card clip>`.
- `Icon` takes a `name` from the 19 names in `Icon.d.ts`.

Read `_ds/<folder>/styles.css` (its `_ds_bundle.css` import holds every class) and each component's `.prompt.md` before styling anything new.

## Example

```jsx
const { AppShell, NavRail, PageHeader, Button, Card, Table, TableRow, TableCell, Avatar, Chip } = window.WorkoutCoach

<AppShell nav={<NavRail items={[{ label: 'Clients', icon: 'clients', to: '/', current: true }]} />}>
  <PageHeader title="Clients" subtitle="6 clients · Coach Marta" actions={<Button icon="plus">Add client</Button>} />
  <Card clip>
    <Table label="Clients" columns={[
      { header: 'Client', width: 'minmax(180px, 1.3fr)' },
      { header: 'Status', width: '140px' },
      { header: 'Action', width: '100px', align: 'right' },
    ]}>
      <TableRow>
        <TableCell><Avatar initials="AP" name="Alex Petrauskas" /></TableCell>
        <TableCell><Chip tone="red">Needs review</Chip></TableCell>
        <TableCell align="right"><Button size="sm">Review</Button></TableCell>
      </TableRow>
    </Table>
  </Card>
</AppShell>
```
