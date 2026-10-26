# Quizly backend

Express + MongoDB API for account-based quiz publishing, shared links, self-paced attempts, server grading, and owner-visible participant results.

Read the [architecture and workflow](documentation/overview.md), [API contract](../quizzo_frontend/documentation/backend-contract.md), and [verification status](documentation/verification.md).

## Quick start with a persistent local database

Use Node.js 22.12+ or Node.js 24 and npm. Run these commands from the indicated folders. On Windows PowerShell use `npm.cmd`; on other platforms use `npm`.

First build the frontend, from `QuizApp/quizzo_frontend`:

```powershell
npm.cmd ci
npm.cmd run build
```

Then, from `QuizApp/quizzo_backend`:

```powershell
npm.cmd ci
npm.cmd run setup:local
npm.cmd run dev:local
```

Open **http://127.0.0.1:4444**. Create your own account; normal mode does not seed sample accounts.

`setup:local` installs the optional MongoDB process manager without changing the application dependency lockfile. The first local start downloads an official MongoDB executable. This needs internet access. If `npm ci` later removes the optional package, rerun `setup:local`.

Despite the package's name (`mongodb-memory-server`), `dev:local` uses **real MongoDB with persistent WiredTiger files** in `.local/mongodb`, a generated signing secret in `.local/jwt-secret`, and a binary cache in `.cache/mongodb`. The database listens on 127.0.0.1:27027. Ctrl+C shuts down the API and MongoDB cleanly while preserving the data. Keep this local data and secret out of Git.

If the frontend has not been built, the same command runs the API alone; start Vite in another terminal using `npm.cmd run dev` in the frontend folder. Its `/api` proxy targets 127.0.0.1:4444.

## Use an existing MongoDB server

Install backend dependencies with `npm.cmd ci`. Create `.env` from [.env.example](.env.example) if you do not already have one. Set `MONGOURL` to the database you intend to use and set a private `JWT_SECRET`.

Generate a secret locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value into the backend `.env`. Then:

```powershell
npm.cmd run dev
```

Use `npm.cmd start` for a normal Node process without nodemon. The default address is http://127.0.0.1:4444 and readiness is available at `/health`. Startup waits for MongoDB and indexes before listening.

This standard path needs no optional MongoDB tool. It uses the configured database and does not erase or seed it. Use a development database for local testing.

## Frontend connection and sharing

The frontend normally calls relative `/api` URLs. Vite proxies them during development; Express handles them directly when serving the built frontend. See the frontend [.env.example](../quizzo_frontend/.env.example).

To serve the production frontend, build it and set `SERVE_FRONTEND=true` in the backend environment. Direct links such as `/q/:shareId` and `/attempts/:id/result` then load correctly from Express.

A shared URL contains a quiz lookup code. Every participant accesses the same published quiz but receives their own Attempt record. Their final score is calculated and stored by this API.

For a local-network test, bind the API with `HOST=0.0.0.0`, allow the port through the local firewall if needed, and open the app using the server machine's LAN address before copying a link. A localhost link cannot point another device back to your machine. Use HTTPS hosting for internet sharing.

For deployment, use a persistent MongoDB service, a long private signing secret, `NODE_ENV=production`, and a reachable HTTPS frontend/API. Set `HOST` as required by the hosting platform. Configure `TRUST_PROXY=1` only for exactly one trusted reverse proxy that controls forwarded headers. A separate public API origin also requires `VITE_API_URL` at frontend build time and the frontend origin in `CORS_ORIGIN`.

## Verify

Fast backend checks (no database needed):

```powershell
npm.cmd test
```

Real MongoDB + HTTP + frontend API integration (install both folders' dependencies first):

```powershell
npm.cmd run setup:local
npm.cmd run test:integration
```

Alternatively, use an existing test MongoDB server:

If your Atlas or other MongoDB connection is already saved as `MONGOURL` in the backend `.env`, run:

```powershell
npm.cmd run test:configured-db
```

This explicitly selects the saved server while still creating and cleaning up only an isolated `quizly_test_...` database. The database user needs permission to create/index/write/drop that test database. Connection credentials are not printed. `TEST_MONGO_URL`, if set, takes precedence.

Or supply a separate test connection for one terminal session:

```powershell
$env:TEST_MONGO_URL = "mongodb://127.0.0.1:27017"
npm.cmd run test:integration
Remove-Item Env:TEST_MONGO_URL
```

The integration test creates a random `quizly_test_...` database and deletes only that database. It does not load the application's `MONGOURL` as a test default. With the local tool, it also checks data after restarting the MongoDB process; with an external server, it checks an application restart and database reconnect.

Frontend checks, from its folder:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

On restricted Windows environments where esbuild cannot read parent directories while loading Vite's config, use `npm.cmd run build -- --configLoader native` with the supported Node version.

Manual acceptance flow: register a creator → publish a quiz → copy its link → sign in as another account → complete it → reload the result → return to the creator's quiz and Refresh results. Test a retake as a separate attempt and another account's denied access to the owner URL.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Missing JWT secret / startup exits | Configure backend `.env`, or use `dev:local`. |
| Atlas credential placeholder error | Replace the URI's username/password placeholder with the database user's actual credentials. URL-encode reserved characters in credentials; do not encode the entire URI. |
| API never announces readiness | MongoDB availability, `MONGOURL`, database permissions/indexes, and port availability. |
| Optional local tooling is missing | Run `npm.cmd run setup:local`, or use an existing MongoDB server. |
| First MongoDB start cannot download | Internet access and the official binary download; install/start a system MongoDB instead if needed. |
| API works but browser requests fail | Vite proxy target or separate `VITE_API_URL`; exact CORS origins. |
| Shared link opens only on this computer | Use a reachable LAN/public app origin instead of localhost. |
| Account request returns 429 | Shared signup/sign-in limit: 40 requests per IP in 15 minutes. |
| Old account receives 409 | Duplicate legacy email records need deliberate administrator resolution. |
| Old stored token returns 401 | Sign in again to receive the new expiring token format. |
| Owner sees no results yet | Only submitted attempts appear. Refresh the results table after completion. |
