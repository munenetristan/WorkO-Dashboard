# WorkO Admin Dashboard

A Next.js (App Router) admin console for managing the WorkO marketplace. The dashboard provides workflows for admin authentication, countries management, services catalog controls, pricing, provider verification, job monitoring, ratings, and settings.

## Features

- Admin authentication with token storage + route protection
- Country enable/disable management
- 41-service catalog with gender tags and per-country toggles
- Pricing management by country, city/zone, and service
- Provider verification with approve/reject/suspend actions
- Job monitoring with filters and timeline-ready layout
- Ratings monitoring with dispute flagging
- Settings for Firebase and payment keys
- API client module with JWT attachment

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Set the backend base URL (expects `/api/v1`):

```bash
NEXT_PUBLIC_API_URL=https://api.worko.africa
```

### 3) Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API Notes

The API client lives in `src/lib/api-client.ts` and attaches the JWT from `localStorage` using the `worko_admin_token` key. Update endpoint paths there if your backend versioning changes.

## Deployment

```bash
npm run build
npm run start
```

## License

This project is private and intended for the WorkO admin team.
