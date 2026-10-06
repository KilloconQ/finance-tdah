import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

export interface SentRequest {
  method: string
  path: string
  body: Record<string, unknown> | undefined
}

type Handler = (req: SentRequest) => Response | Promise<Response>

/**
 * Stands in for the API at the network edge, so a screen runs through the real
 * `api` client (ky, error mapping, Zod validation) and the real hooks.
 * Routes are keyed "METHOD /path" (path relative to /api); anything unrouted
 * fails the test loudly instead of hanging.
 */
export function fakeApi(routes: Record<string, Handler>) {
  const sent: SentRequest[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (req: Request) => {
      const url = new URL(req.url)
      const path = url.pathname.replace(/^\/api/, '')
      const text = await req.clone().text()
      const entry: SentRequest = { method: req.method, path, body: text ? JSON.parse(text) : undefined }
      sent.push(entry)
      const handler = routes[`${req.method} ${path}`]
      if (!handler) throw new Error(`Unmocked request: ${req.method} ${path}`)
      return handler(entry)
    }),
  )
  return {
    sent,
    writes: () => sent.filter((r) => r.method !== 'GET'),
  }
}

export function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return { client, tree: createElement(QueryClientProvider, { client }, ui) }
}
