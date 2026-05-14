# MaestroUI

**MaestroUI** is the React/TypeScript dashboard for the Maestro AI workflow
orchestrator. It provides a visual interface for composing, scheduling, and
monitoring automated workflows across the MiMi cluster.

## Quick Start

```bash
npm install
npm run dev    # port 5175
npm run build
npm test
npm run lint
```

## Environment Variables

| Variable | Default (dev) | Description |
|---|---|---|
| `VITE_MAESTRO_API_BASE_URL` | same origin | Optional public Maestro API base URL override. Leave unset for the Vite/nginx `/api/v1` proxy path. |
| `MAESTRO_API_PROXY_TARGET` | `http://localhost:8002` | Server-only proxy target used by Vite dev proxy and the production nginx BFF. |
| `MAESTRO_API_KEY` | none | Server-only bearer token injected by the proxy. Never expose this as a `VITE_*` value. |

By default, browser requests use relative `/api/v1/*` URLs. In development,
Vite proxies those requests to Maestro and injects `MAESTRO_API_KEY` when it is
present. In production, nginx provides the same BFF-style proxy behavior.

## Container

Merges to `main` publish a multi-arch image to:

```text
ghcr.io/oravandres/maestroui/maestro-ui:<short-commit-sha>
```

The runtime image listens on port `8080`, serves the SPA, and proxies
same-origin `/api/v1/*` requests to `MAESTRO_API_PROXY_TARGET` with
`Authorization: Bearer <MAESTRO_API_KEY>`. MiMi deployments should pin the
published multi-arch digest rather than a mutable tag.

## Design

- **Dark theme** with glassmorphism
- **Amber-to-rose** gradient accent palette
- **Inter** typeface
- Micro-animations, responsive layout
