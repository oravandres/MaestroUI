# MaestroUI

**MaestroUI** is the React/TypeScript dashboard for the Maestro AI workflow
orchestrator. It provides a visual interface for composing, scheduling, and
monitoring automated workflows across the MiMi cluster.

## Quick Start

```bash
npm install
npm run dev    # port 5175
npm run build  # requires VITE_MAESTRO_API_BASE_URL
npm test
npm run lint
```

## Environment Variables

| Variable | Default (dev) | Description |
|---|---|---|
| `VITE_MAESTRO_API_BASE_URL` | `http://localhost:8002` | Maestro API base URL |

## Design

- **Dark theme** with glassmorphism
- **Amber-to-rose** gradient accent palette
- **Inter** typeface
- Micro-animations, responsive layout
