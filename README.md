# GolfGives — Golf Charity Platform

GolfGives is a subscription-based golf charity platform where members pay a monthly or annual fee, log their Stableford scores, and a portion of every payment is automatically allocated to their chosen charity. The platform includes a draw engine for optional cash-prize competitions (jurisdiction-gated), admin tooling for charity management and winner verification, and Razorpay-powered payments with Supabase as the backend.

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Supabase** (Postgres, Auth, Storage, Edge Functions)
- **Razorpay** (primary payment provider, India-first)
- **Stripe** (optional secondary provider)
- **Tailwind CSS**

## Required Environment Variables

Create `.env.local` at the repo root with the following keys (never commit values):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
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

## Supabase Edge Functions

Functions live in `supabase/functions/`. Deploy with:

```bash
supabase functions deploy <function-name>
```

Set secrets on the Supabase project with:

```bash
supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=...
```

## Cash Prize Draw

`cashPrizeDrawEnabled` defaults to `false` in `app_settings`. This flag **must not be set to `true`** without recorded approval confirming the jurisdiction permits cash-prize competitions. Update it only via a reviewed database migration or admin action with documented legal sign-off.

## Project Structure

```
repo-root/
├── src/
│   ├── app/          # Next.js App Router pages and API routes
│   ├── components/   # React components
│   ├── lib/          # Supabase clients, Razorpay helpers, RBAC
│   └── types/        # Database types
├── public/           # Static assets
├── scripts/          # Dev/test utility scripts
├── package.json
├── next.config.ts
├── tsconfig.json
├── .env.local.example
└── supabase/
    ├── functions/    # Edge Functions (Deno)
    └── migrations/   # SQL migrations
```
