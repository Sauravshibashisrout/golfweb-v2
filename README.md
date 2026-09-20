# GolfGives — Golf Charity Platform

GolfGives is a subscription-based golf charity platform where members pay a monthly (₹599) or annual (₹5,999) fee, log real Stableford scores from golf courses, and a portion of every payment is automatically allocated to their chosen charity. The platform includes a score-based monthly reward draw engine (jurisdiction-gated sandbox by default), admin tooling for charity management, winner verification, and payout recording, with Razorpay-powered subscriptions and Supabase as the backend.

## Tech Stack

- **Next.js 16** (App Router, TypeScript, `src/` layout)
- **Supabase** (Postgres, Auth, Storage, Edge Functions, Row Level Security)
- **Razorpay** (India-first payment provider)
- **Tailwind CSS v4**

## Required Environment Variables

Create `.env.local` at the repo root (copy from `.env.local.example`). Never commit values.

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

NEXT_PUBLIC_RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Razorpay credentials

# 3. Start the dev server
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Database Migrations

SQL migrations live in `supabase/migrations/`. Apply them in order via the Supabase dashboard SQL editor or CLI:

```bash
supabase db push
```

## Supabase Edge Functions

Functions live in `supabase/functions/`. Deploy with:

```bash
supabase functions deploy <function-name>
```

Set secrets on the Supabase project:

```bash
supabase secrets set RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=...
```

## Cash Prize Draw

`cashPrizeDrawEnabled` defaults to `false` in `app_settings`. This flag **must not be set to `true`** without recorded legal approval confirming the jurisdiction permits cash-prize competitions. The draw engine runs in sandbox/demo mode until this is explicitly enabled via a reviewed admin action with a `legal_approval_ref` recorded on the draw record.

## Project Structure

```
repo-root/
├── src/
│   ├── app/          # Next.js App Router — pages, layouts, API routes
│   ├── components/   # React components (ui/, draw/, scores/, charity/)
│   ├── lib/          # Supabase clients, RBAC helpers
│   └── types/        # Generated Supabase database types
├── public/           # Static assets
├── scripts/          # Dev/test utility scripts
├── supabase/
│   ├── functions/    # Edge Functions (Deno) — payments, draw, admin ops
│   └── migrations/   # SQL migrations (additive only)
├── package.json
├── next.config.ts
├── tsconfig.json
└── .env.local.example
```
