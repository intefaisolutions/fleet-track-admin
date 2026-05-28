# Fleet Admin Portal

React + Vite **Super Admin** dashboard for FleetTrack SaaS.

Only **SUPER_ADMIN** users can log in to this application.

## Quick start

```bash
pnpm install
```

Create `.env`:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

```bash
pnpm run dev
```

Open `http://localhost:5173`

## Documentation

| Document | Location |
|----------|----------|
| Project docs index | [../docs/README.md](../docs/README.md) |
| Admin portal guide | [../docs/ADMIN_PORTAL.md](../docs/ADMIN_PORTAL.md) |
| Setup guide | [../docs/SETUP_GUIDE.md](../docs/SETUP_GUIDE.md) |
| SaaS flow | [../docs/SAAS_FLOW.md](../docs/SAAS_FLOW.md) |

## Pages

| Route | Purpose |
|-------|---------|
| `/signin` | Super Admin login |
| `/setup-super-admin` | One-time platform bootstrap |
| `/dashboard` | Platform overview |
| `/companies` | Manage companies |
| `/revenue` | Revenue overview |
| `/licenses` | Licenses (scaffold) |
| `/subscriptions` | Subscriptions (scaffold) |

## Stack

React 19 · Vite · TypeScript · Tailwind CSS · Axios · pnpm
