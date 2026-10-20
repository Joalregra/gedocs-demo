# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gedocs: a document-archive + PQRSD (petitions, complaints, claims, suggestions) system. This repository is the **public portfolio demo** of a system built by a team for a public institution: it must contain **no trace of that institution** and only fictional data. Laravel 12 backend, Inertia.js 2 + React 18 frontend (Vite 7, Tailwind 4 + daisyUI 5). The UI and many identifiers are in Spanish. Before finishing any change run `bash buscar-rastros.sh .` (see "Trace scan"); it must end in `OK`.

Documentation lives in `docs/`: `demo-decisions.md` (why things differ from a production codebase), `security-review.md`, `deploy-aws-lightsail.md` (the recommended deployment) and `deploy-oracle.md` (free alternative).

## Commands

- Dev (server + queue listener + Vite): `composer dev`. Frontend build: `npm run build`. Full setup: `composer setup`.
- PHP tests (Pest 3, SQLite in memory): `php artisan test`; one file: `php artisan test tests/Feature/Security/AccessControlTest.php`; one test: `--filter="name"`. The Inertia pages need `public/build`, so run `npm run build` once before the suite.
- JS tests (Vitest + jsdom): `npm run test:unit`; one file: `npx vitest run resources/js/tests/Demo/DemoMode.test.jsx`.
- PHP style: `./vendor/bin/pint`. Dependency audits: `composer audit` and `npm audit` (both are clean; keep them that way).
- Load the fictional data: set `APP_DEMO=true`, then `php artisan migrate:fresh --seed`. Restore it later with `php artisan demo:reset` (refuses to run unless `APP_DEMO=true`).
- Trace scan: `EXTRA_TERMS="<terms>" bash buscar-rastros.sh .` (writes `reporte-rastros.txt`, exit code 1 while traces remain). In CI the terms come from the `TRACE_EXTRA_TERMS` secret. Words the script flags (the institution's name and acronym, its role and unit vocabulary, its tax-id label) must not appear anywhere in code, tests, docs or README.
- Docker (production image, AWS Lightsail 2 GB): `docker compose pull && docker compose up -d`; see `docs/deploy-aws-lightsail.md` (Oracle Always Free alternative: `docs/deploy-oracle.md`).

### Local environment notes (this machine)

PHP 8.4 and Node 22 are installed in user space under `~/.local` (no root); they work from WSL through the `php`, `composer`, `node`, `npm` wrappers in `~/.local/bin`. The `php` wrapper sets `LD_LIBRARY_PATH`/`PHPRC` and runs the real binary with `exec -a`, so `PHP_BINARY` points at the wrapper and child processes (`artisan serve`, `queue:listen`, tests) keep working even though `artisan serve` strips their environment; do not replace `~/.local/bin/php` with a plain symlink, and keep its paths absolute (`artisan serve` starts the child with no `HOME` or `PATH`). When checking the dev server, test for `data-page` in the response, not just for a non-empty body: a PHP fatal error is also served with HTTP 200. One trap: npm 10.9 crashes resolving this dependency tree (`edgesOut` error); use `npx npm@11 install` when the lock must change, and `npm ci` is fine. The local `.env` points at the XAMPP MariaDB on Windows through the WSL gateway IP (`DB_HOST`), with a user limited to the `gedocs` database; start `mysqld.exe` from XAMPP if connections are refused.

## Architecture

**Two route surfaces, one session.** `routes/web.php` serves Inertia pages (mostly closures returning `Inertia::render('<Page>')` with no data) plus folder/PDF actions; the pages then fetch data from `routes/api.php` (`/api/...`, `auth:sanctum`). The axios instance (`resources/js/lib/axios.js`) relies on Sanctum's stateful session cookie (`EnsureFrontendRequestsAreStateful` in `bootstrap/app.php`). The only public API routes are `POST pqrs` (citizen form), `GET dependencies` and the UUID reply links under `pqr/responder/{uuid}`; all are throttled.

**Roles** (spatie/laravel-permission) are defined once in `app/Enums/UserRole.php` (`Admin`, `Supervisor`, `Auxiliar`, `Dependencia`) and mirrored in `resources/js/constants/roles.js`. Use the enum (`hasRole(UserRole::Admin)`, `UserRole::middleware(...)` for route middleware) instead of strings. The unit of tenancy is the **entity**: user-facing text says "entidad", while the model, table and API keep the English names `Sheet_number`, `sheet_numbers` and `/sheets`.

**Authorization by entity** is centralized in `app/Support/EntityAccess.php` (`sheetIds`, `canRead/canWrite`, `authorizeFolder/File/Selection`, `canAccessPqr`). Every folder/file action and the PQR endpoints go through it; reading is allowed for the entities a user belongs to, writing only for Admin and Supervisor. New explorer or PQR endpoints must use it. `HandleInertiaRequests::share` also scopes the shared `sheets` and `dependencies` props with it.

**Institution identity** is configuration: `config/institution.php` (`INSTITUTION_*` env vars) read through `app/Support/InstitutionIdentity.php` (default footer, default logo, `formatFiling()`). Never hard-code an organization name, logo path or footer; the filing number is stored as a plain number and only formatted (`DEMO-2026-000123`) for display in PDFs, Excel and stamps. The public part is shared to React as `usePage().props.institution`.

**Demo mode** (`config('app.demo')`, env `APP_DEMO`): shared to React as `props.demo`; enables the one-click login (`POST demo-login/{role}`, `DemoLoginController`), the header badge and tour (`resources/js/Components/Demo/`), account protection (`ProtectDemoAccounts`, alias `demo.protect:self|target`, accounts listed in `config/demo.php`) and the nightly `demo:reset` schedule in `routes/console.php`. `DatabaseSeeder` only loads `DemoSeeder` when demo mode is on.

**Domain model.** `Sheet_number` (entity) has users (pivot), `Dependency` rows and a `Folder` tree; `ventanilla_unica_id` points to the single-window dependency that receives incoming PQRs. `Folder` is self-referencing (year → section → subsection → series → subseries) with `getFullHierarchyCode()`; `FolderStructureService` builds the default tree, and the section folder for the single window is named by `Folder::VENTANILLA_NAME`. Uploaded files get a sha256 hash and a standardized name. `PQR` (table `p_q_r_s`) has `response_status` (`pending`/`responded`/`closed`), `archived`, a due date auto-archived by `PqrAutoArchiveService`, attached supports (`REC`/`RECIBO`/`ENV` origins) and `comunication` rows (note the lowercase class) that can carry an expiring `response_uuid` for external replies. `PdfController` renders `resources/views/pdf/template.blade.php` with dompdf; `app/Exports/ExcelExport.php` holds the Received and Sended report sheets (shared helpers in `Exports/Concerns`).

**Uploads are untrusted.** File types are validated on content (`mimes:`), names are rebuilt from a slug plus the detected extension, and the web server (`docker/Caddyfile`) serves `/storage` as static, sandboxed content with no PHP handler. Do not store the client-supplied extension.

**Frontend** (`resources/js`, alias `@/` → `resources/js`): `app.jsx` resolves pages from `Pages/**/*.jsx` and wraps everything in context providers (`context/`) that own the axios fetching per domain; layouts in `Layouts/`, features in `Components/<Feature>/`. Colors come only from the daisyUI theme tokens in `resources/css/app.css` (brand: ink `primary`, seal-purple `accent`, teal `secondary`); do not add hard-coded brand colors. Error pages (403/404/419/500/503) are `Pages/Error.jsx`, rendered by `withExceptions` in `bootstrap/app.php` outside local/testing.

**Deployment.** `Dockerfile` (multi-stage, FrankenPHP/Caddy, non-root, amd64 + arm64), `docker-compose.yml` (app, scheduler, MariaDB), `docker/` (Caddyfile, php.ini, entrypoint), `.github/workflows/` (CI and image build). The demo uses `QUEUE_CONNECTION=sync`, so there is no worker container. The target is one AWS Lightsail instance (2 GB RAM, `us-east-1`, Ubuntu 24.04 x86_64), guide `docs/deploy-aws-lightsail.md`; memory is tight, so keep the 2 GB swap file and the `DB_BUFFER_POOL` default of 128M, and measure with `docker stats` before adding any container.

## Testing notes

- PHP: Pest feature tests in `tests/Feature/{Admin,Supervisor,Assistants,shared,Security,Demo}`; `tests/Pest.php` applies `RefreshDatabase` and defines the `makeUser(UserRole, ?Sheet_number)` helper. `phpunit.xml` forces `APP_DEMO=false`; tests that need demo mode set `config(['app.demo' => true])`. Feature tests create their own roles, entities and users.
- JS: tests in `resources/js/tests/<area>/`, with `axios` and `@inertiajs/react` mocked via `vi.mock` and `window.route` stubbed. Setup is `resources/js/tests/setup.js`; config lives in `vite.config.js` (timeout raised to 20 s because the suite is heavy when run in parallel).
