# NEC Naija

A responsive website for the NEC Naija creative cooperative, based on the supplied 2026 development roadmap.

## Run locally

Requirements: Bun 1.4.2, Node.js 20.9 or later, and a PostgreSQL database. Supabase Postgres through its session pooler is supported; the app does not use Supabase Auth, anon keys, or Supabase API keys.

```bash
bun install
bun run db:migrate
bun run dev
```

Copy `.env.example` to `.env.local` and set `DATABASE_URL` to the PostgreSQL session-pooler connection string with SSL enabled. It is the only required environment variable for the core application. Keep it server-side; never use a `NEXT_PUBLIC_` prefix or expose it to browser code. Open http://localhost:3000. Use `bun run build` to create a production build, `bun run start` to serve it, `bun run lint` for ESLint, and `bunx tsc --noEmit` for a standalone type check.

## Administrator account

After applying the migrations, create or update the single super-admin account with:

```bash
bun run admin:create
```

The script prompts for email and password (masked and not saved to environment files); the password must be at least 8 characters. On first run it creates the account and grants the super-admin role. On later runs it updates that sole super-admin login while retaining its user ID and related records. Passwords are bcrypt-hashed before storage. No bootstrap environment variables, anon key, Supabase service-role key, or Supabase API URL are used.

## Database and access model

The PostgreSQL schema and business logic are in the migrations under [`supabase/migrations`](./supabase/migrations); inactive Northern Nigeria chapter seeds are in [`supabase/seed.sql`](./supabase/seed.sql). The `bun run db:migrate` runner connects directly using `DATABASE_URL`, tracks applied files and checksums in `public.app_migrations`, and applies each migration transactionally without resetting database records. It skips previously applied migrations and refuses changed checksums; add a new SQL migration instead. Run it after pulling schema updates and before starting the app.

The auth migration preserves existing Auth user IDs and related application data while moving accounts to application-managed password hashes and database sessions. The chapter seed uses `ON CONFLICT DO NOTHING`. The schema also includes policy consent, membership applications and records, granular roles/permissions, opt-in artist profiles, events/reviews, support and data requests, notifications, payment intents, webhook idempotency, immutable ledger journals and audit logs. Passwords are stored as salted bcrypt hashes. Session tokens are random, stored only as SHA-256 hashes in Postgres, and sent in HttpOnly/SameSite cookies.

The web server connects with a privileged Postgres account, so row-level security does not isolate application requests. Keep `DATABASE_URL` exclusively on the server and enforce ownership and role permissions in every server route. Never connect to Postgres from browser/client code.

## Payments

The proposed annual membership fee is ₦50,000, configurable with `MEMBERSHIP_ANNUAL_FEE_KOBO`. It is paid as a one-time annual fee and must be renewed manually; the former monthly/yearly recurring subscription plans are no longer offered to new members. Existing legacy subscriptions remain in the database until their paid period expires.

Live annual-fee checkout remains unavailable unless `PAYMENTS_ENABLED=true`, `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_APP_URL` are configured, and an operator enables the database `live_payments` flag after legal and operational approval:

```sql
update public.feature_flags
set enabled = true, updated_at = now()
where flag_code = 'live_payments';
```

Configure Paystack webhooks to `/api/payments/webhook` for `charge.success`. Transaction amounts and references are checked against server-created payment intents before a balanced ledger entry is posted. Renewal is manual, and the member account shows the paid-through date.

Members are expected to contribute ₦10,000 each month and may submit optional additional contribution records. Contributions remain pending until a finance officer reconciles the payment reference; only verified records are included in annual eligible balances. After an annual report with declared profit is published, members can request profit-only or profit-plus-contribution handling. The current system estimates an individual share using 70% of net profit multiplied by the member's eligible year-end contribution balance divided by all eligible balances, and records a 10% rollover bonus when profits-only is selected. These are proposed rules and require formal policy and Board approval before payouts.

Members can submit project loan applications. An authorised reviewer can approve or decline each request; a separately recorded issuance requires a disbursement reference, agreed repayment terms and a due date before December of the requested repayment year. Members submit repayment references for finance reconciliation; verified repayments update the outstanding balance and post a balanced ledger entry. These records do not transfer funds or independently confirm bank settlement, and interest, collateral and guarantor terms are not invented by the system. The proposed ownership structure (₦100 million across 100 units, founder 10%, 90 units unclaimed), Owners' Membership Board authority, and annual management elections are described as governance proposals; the site does not sell ownership units, conduct votes or appoint leaders.

## Email and portfolio media

Branded transactional email uses `RESEND_API_KEY` and the verified sender in `RESEND_FROM`. Welcome, application-status, annual membership receipt and support-acknowledgement emails are queued in the database. Schedule an authenticated daily request to `/api/cron/emails` with `Authorization: Bearer <CRON_SECRET>` to deliver queued messages and membership-expiry reminders.

Signed Cloudinary uploads use `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`. Active members can publish images up to 10 MB and videos up to 60 seconds to their portfolio. Cloudinary metadata and upload signatures are verified server-side. Public work is shown in `/artists`.

## Routes

- `/` — public landing page and cooperative information.
- `/about`, `/membership`, `/artists`, `/events`, `/chapters`, `/opportunities`, `/contact`, `/policies`, `/governance`, `/reports` — public information, approved event listings and published cooperative reports.
- `/register` — database-backed account creation, consent and membership application.
- `/login` — database-backed sign-in for members and administrators.
- `/dashboard` — authenticated member workspace for annual membership, contribution reconciliation, annual requests, loan applications, event proposals and leadership campaigns.
- `/admin` — permission-checked national administration workspace, including finance request review and report publication.
- `/payments/return` — server-verified Paystack return; a browser redirect is not proof of payment.

## Operational readiness

Registration writes account, policy-consent and application records. `/dashboard` requires a signed-in account, while `/admin` additionally requires its assigned access. The administration workspace reads current service records and applies role-specific access checks. Event reviews, role assignment changes, support-ticket status changes and data-request triage are audited. Financial records and high-impact service settings are read-only from the workspace.

The Paystack key is needed only for Paystack checkout. It does not control whether applications, events, chapters, roles, audit records, support requests or settings appear in the admin workspace; those panels use `DATABASE_URL`. Identity evidence is not collected or stored, so identity verification remains unavailable until a secure, approved evidence workflow is selected. Configure a verified Resend sender and a scheduled email task before relying on member notifications.

The membership fee and financial rules are proposed and subject to approved policy. Test transactions are not real payments and cannot activate membership. Contribution entries require reconciliation; loan requests and annual profit requests do not initiate lending or payouts. Balances, member counts, testimonials and event listings are not fabricated. Do not use this site to collect identity documents; approve privacy terms, retention schedules and financial controls before accepting members or payments.

## Visual and accessibility notes

The visual system uses a warm editorial palette, tactile membership-card and stage illustrations, motion-based reveals and CSS animation. Animations respect the operating system's reduced-motion preference; navigation, disclosures and application forms are keyboard-operable.
#   N E C  
 #   N E C  
 