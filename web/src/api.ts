import type { Data, PlanForm } from '../shared/model.ts'

async function request(path: string, method = 'GET', body?: unknown): Promise<Data> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(json?.errors ?? ['Something went wrong. Try again.'])
  return json
}

export class ApiError extends Error {
  errors: string[]

  constructor(errors: string[]) {
    super(errors.join(' '))
    this.errors = errors
  }
}

export const loadData = () => request('/data')
export const addClient = (name: string) => request('/clients', 'POST', { name })
export const saveDraft = (clientId: string, form: PlanForm) =>
  request(`/clients/${clientId}/draft`, 'PUT', form)
export const publishWeek = (clientId: string, form: PlanForm) =>
  request(`/clients/${clientId}/publish`, 'POST', form)
