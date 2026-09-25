# Evento

Event discovery, booking and management platform — Next.js 16 (App Router) · TypeScript · Tailwind 4 · Neon Postgres + Drizzle · Auth.js v5 · Argon2 · Zod · React Hook Form · next-intl (fr/en) · Sonner · TanStack Query · Zustand · Socket.IO · Resend · Cloudinary · QR codes.

## Getting started

```bash
cp .env.example .env         # fill AUTH_SECRET and PAYMENT_WEBHOOK_SECRET at minimum
# In Neon Console, copy the pooled connection string (with ?sslmode=require)
# into DATABASE_URL in .env.
npm install
npm run db:migrate           # apply migrations in ./drizzle
npm run db:seed              # demo data (idempotent)
npm run dev                  # http://localhost:3000
npm run realtime             # optional Socket.IO server (set NEXT_PUBLIC_SOCKET_URL)
```

Demo accounts (seed): `admin@evento.app / Admin12345`, `organizer@evento.app / Organizer123`, `user@evento.app / User12345`.

### Neon database

1. Create a Neon project and database, then copy its **pooled** connection string from the Connect panel.
2. Set it as `DATABASE_URL` in `.env` (keep `?sslmode=require`). The value is server-only; never use a `NEXT_PUBLIC_` variable for it.
3. Run `npm run db:migrate`, then optionally `npm run db:seed`.

The application uses the standard `pg` client, which supports both Neon (with its pooled TLS URL) and conventional PostgreSQL servers. `drizzle-kit` applies the existing PostgreSQL migrations to either database.

| Script | Purpose |
| --- | --- |
| `db:generate` / `db:migrate` | Generate / apply SQL migrations (never edit applied migrations) |
| `db:studio` | Drizzle Studio |
| `test` | Unit + DB integration tests; E2E smoke with `E2E_BASE_URL=http://localhost:3000 npm test` |
| `lint`, `build` | Quality gate |

## Architecture

```
src/app/[locale]/(auth|public|user|organizer|admin)   thin pages → feature pages
src/features/<feature>/{actions,queries,services,validations,components,pages}
src/components/{ui,forms,layout}                      design system
src/db/{schema/*,relations.ts,index.ts}               Drizzle schema (barrel: src/db/schema.ts)
src/lib                                               auth, email, pricing, tokens, realtime, seo…
realtime/server.ts                                    standalone Socket.IO server
```

- Server Components by default; client components only for forms, interactivity, TanStack Query, Zustand, sockets.
- Zod schemas emit **error codes** (`validation.*`, `errors.*`) translated in the UI — no UI text in schemas.
- Server actions return a typed `ActionResult` (`ok` / `fail(code, fieldErrors)`).

## Key flows

- **Auth**: Auth.js JWT sessions (credentials + Google when env vars exist). Every request re-reads the user from the DB, so bans/suspensions/role changes apply instantly. Email verification (Resend) never blocks usage. Password reset tokens are random, SHA-256-hashed at rest, expirable and single-use (atomic consume).
- **Booking**: prices always recomputed server-side; inventory reserved with a conditional atomic `UPDATE … WHERE sold + q <= quantity` inside a transaction (no overselling — covered by a concurrency test); 15-minute holds released lazily.
- **Payments**: `PaymentProvider` interface (`src/features/payments/providers`). The built-in `mock` sandbox provider has a hosted page and Stripe-style signed webhooks (HMAC over `timestamp.body`, 5-min replay window). Webhooks are verified, deduplicated (`webhook_events` unique provider+eventId), processed in a transaction with row locks, logged, and return 5xx to trigger provider retries. Success → booking confirmed → tickets + QR generated → notification → emails.
- **Realtime**: rooms `user:{id}` (auto, token-authenticated), `event:{id}` (live availability), `booking:{id}` (owner-only, checked in DB). The app publishes via an authenticated internal HTTP endpoint. PostgreSQL stays the source of truth; UI falls back to polling when sockets are unavailable.

## Security audit summary

| Area | Measure |
| --- | --- |
| Authentication | Argon2id (OWASP params), rate-limited login/register/reset, generic errors (no user enumeration) |
| Authorization | Role checks in layouts **and** every server action/route; ADMIN-only moderation; self-moderation blocked |
| Ownership / IDOR | Ownership enforced in SQL `WHERE` (bookings, tickets, events, comments, reviews, notifications); UUID params validated |
| Mass assignment | Explicit column whitelists (profile never updates id/role/status/passwordHash/emailVerified) |
| XSS | React escaping, no raw HTML except escaped JSON-LD; emails HTML-escaped |
| CSRF | Server Actions origin checks + Auth.js CSRF tokens; SameSite cookies |
| Cookies / sessions | Auth.js secure, httpOnly cookies (secure prefix on HTTPS) |
| Webhooks | Signature + timestamp verification, zod validation, amount/currency check, idempotency |
| Uploads | Auth required, 5 MB limit, magic-byte type sniffing, per-user Cloudinary folder, URL ownership validation |
| Secrets | Server-only env vars; only `NEXT_PUBLIC_*` reach the browser; `.env` git-ignored |
| Headers | nosniff, frame DENY, strict referrer, permissions policy, no `x-powered-by` |

Production notes: replace the in-memory rate limiter with Redis for multi-instance deployments, configure a real payment provider, and set `RESEND_*`, `CLOUDINARY_*`, `NEXT_PUBLIC_APP_URL`.
