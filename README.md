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

## Deploying to MiMi

The Kubernetes manifests for the `maestro-ui.mimi.local` deployment live in
the [`MiMi` repo](https://github.com/oravandres/MiMi), not here. Rolling a
new MaestroUI version is a two-repo flow:

1. **Land changes in this repo.** Merging to `main` triggers `ci.yml`, which
   builds the multi-arch image and publishes it to
   `ghcr.io/oravandres/maestroui/maestro-ui:<short-commit-sha>`.
2. **Update the MiMi manifest.** Open a PR in the MiMi repo that bumps the
   `maestro-ui` Deployment's image reference to the new tag (or digest).
   Pinning by digest is preferred — pull the digest from the GHCR package
   page or with `docker buildx imagetools inspect`.
3. **Verify the rollout** with `kubectl -n maestro rollout status deploy/maestro-ui`,
   then load <https://maestro-ui.mimi.local/> and check that the asset URL
   has changed (the `index-<hash>.js` filename moves on every build, so a
   stale bundle is the most reliable "deploy did not happen" signal).

### Checking what's currently deployed

```bash
# Image (digest pinned by the MiMi manifest)
kubectl -n maestro get deploy maestro-ui -o jsonpath='{.spec.template.spec.containers[0].image}'

# Live bundle hash from the served HTML
curl -s https://maestro-ui.mimi.local/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js'
```

If the bundle hash on the live site doesn't match `dist/assets/index-*.js`
from a fresh `npm run build`, the MiMi manifest still references an older
image and needs the bump described above.

## Design

- **Dark theme** with glassmorphism
- **Amber-to-rose** gradient accent palette
- **Inter** typeface
- Micro-animations, responsive layout
