import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'

const DEFAULT_GREEN_API_URL = 'https://api.green-api.com'

function isGreenApiOrigin(value: string): string | null {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    const allowed =
      url.protocol === 'https:' &&
      (host === 'green-api.com' ||
        host.endsWith('.green-api.com') ||
        host === 'greenapi.com' ||
        host.endsWith('.greenapi.com'))
    return allowed ? url.origin : null
  } catch {
    return null
  }
}

function resolveTarget(req: IncomingMessage): string {
  const header = req.headers['x-green-api-url']
  if (typeof header === 'string') {
    return isGreenApiOrigin(header) ?? DEFAULT_GREEN_API_URL
  }
  return DEFAULT_GREEN_API_URL
}

/**
 * Proxy /green-api/* → https://*.green-api.com or https://*.greenapi.com
 * from X-Green-Api-Url, otherwise https://api.green-api.com.
 * Avoids browser CORS for the client-only MVP.
 */
function greenApiProxyPlugin(): Plugin {
  return {
    name: 'green-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/green-api')) {
          next()
          return
        }
        try {
          await forwardGreenApi(req, res)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Proxy error'
          if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message }))
          }
        }
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/green-api')) {
          next()
          return
        }
        try {
          await forwardGreenApi(req, res)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Proxy error'
          if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ message }))
          }
        }
      })
    },
  }
}

async function forwardGreenApi(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const targetBase = resolveTarget(req)
  const incomingUrl = req.url ?? '/green-api'
  const pathAndQuery = incomingUrl.replace(/^\/green-api/, '') || '/'
  const targetUrl = new URL(pathAndQuery, `${targetBase}/`)

  const method = req.method ?? 'GET'
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  const body = chunks.length ? Buffer.concat(chunks) : undefined

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue
    const lower = key.toLowerCase()
    if (
      lower === 'host' ||
      lower === 'connection' ||
      lower === 'content-length' ||
      lower === 'x-green-api-url'
    ) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item)
    } else {
      headers.set(key, value)
    }
  }

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  })

  res.statusCode = upstream.status
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    // Node already decoded the body. Forwarding these headers makes the
    // browser fail the response and the login form show a network error.
    if (
      lower === 'transfer-encoding' ||
      lower === 'content-encoding' ||
      lower === 'content-length'
    ) {
      return
    }
    res.setHeader(key, value)
  })

  const buffer = Buffer.from(await upstream.arrayBuffer())
  res.end(buffer)
}

export default defineConfig({
  plugins: [react(), greenApiProxyPlugin()],
  server: {
    host: '127.0.0.1',
    port: 4317,
  },
  preview: {
    host: '127.0.0.1',
    port: 4317,
  },
})
