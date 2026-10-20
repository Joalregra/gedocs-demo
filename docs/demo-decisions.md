# Demo decisions

Why this repository differs from a normal production codebase. Each item is a conscious decision, not an oversight.

## Identity is configuration

Everything that identifies an institution lives in [`config/institution.php`](../config/institution.php) and the `INSTITUTION_*` environment variables: name, tax id, city, area, filing prefix and the default logo. PDF footers, report headers, the logo and the filing number format all read from there through [`InstitutionIdentity`](../app/Support/InstitutionIdentity.php). The same code can serve another organization by changing the environment, with no code edits.

The React side receives the public part of it through the shared Inertia props (`usePage().props.institution`).

## Neutral vocabulary

The original system used the vocabulary of the institution it was built for. The demo uses neutral terms, defined once in [`app/Enums/UserRole.php`](../app/Enums/UserRole.php) and mirrored in [`resources/js/constants/roles.js`](../resources/js/constants/roles.js):

| Role | Meaning in Gedocs |
|---|---|
| Admin | Sees every entity; manages users, entities and dependencies. |
| Supervisor | Manages the entities (organizations) they belong to and approves new accounts. |
| Auxiliar | Consults and files documents of their entity. |
| Dependencia | Answers the PQRSD assigned to their dependency. |

An **entity** is an organization with its own single window, dependencies and archive tree (the original system used an institution-specific word for this unit).

Decisions:

- The role names are stored in the database and used in routes (`/users/auxiliar`, `/users/supervisor`). Because the demo database is created from scratch by the seeders, **existing migrations were edited instead of adding rename migrations**. That would be forbidden in a system with real data and is noted here on purpose.
- The Eloquent model and table are still called `Sheet_number` / `sheet_numbers`, and the API still uses `/sheets`. Renaming a model and its table across the whole codebase has a high risk and no user-visible benefit; the user interface says "entidad".

## Filing numbers

The stored filing (radicado) number stays a plain sequence (`007`) because several queries order and cast it as a number. The institution prefix and the year are added only when the number is displayed in PDFs, reports and the QR stamp (`DEMO-2026-000007`, see `InstitutionIdentity::formatFiling`).

## Data and accounts

- The seeded names come from a fixed Faker seed (`es_ES`: FakerPHP has no Colombian Spanish locale), so every reset tells the same story. All emails end in `@demo.test`, a domain reserved for tests that never resolves.
- The four demo accounts share a **published** password (`demo1234`, configurable with `DEMO_PASSWORD`). That is intentional: it is a demo with no real data. They are protected from changes by `ProtectDemoAccounts` only while `APP_DEMO=true`.
- `php artisan demo:reset` wipes the database and uploaded files. It refuses to run unless `APP_DEMO=true`, and the nightly schedule is only registered in demo mode.
- `db:seed` creates fictional users only when `APP_DEMO=true`, so a normal installation never gets accounts with a public password.
- Sample documents are generated with the app's own PDF template, and each one says it is a sample with fictional data.

## Mail, queue and sessions

- `MAIL_MAILER=log`: the demo never sends real email.
- `QUEUE_CONNECTION=sync` in the demo deployment: nothing is queued, so no worker container is needed (this matters on a small VM).
- Sessions and cache use the database, which survives container restarts.

## Tests

- The README credits the original team by name, so the trace scan excludes `README.md` (`EXCLUDE_FILES=README.md`). It is the only file excluded; it contains no institutional name, domain or data.
- Tests use SQLite in memory for speed. The application itself was exercised against MariaDB 10.4 (local XAMPP) and runs on MariaDB 11.4 in Docker.
- Pre-existing failures found while setting the baseline were fixed rather than skipped: a folder-name mismatch ("Ventanilla Única" was spelled two ways and only matched on MySQL collations) and a report that did not resolve the folder code of sent documents.

## Hosting: AWS Lightsail instead of Oracle Always Free

**Context.** The first plan was a free Oracle Cloud VM. The account's home region has no free capacity: the Ampere A1 shape fails with "Out of capacity", and the AMD Micro shape is not offered there. The home region of an account cannot be changed, and Always Free resources only exist in it, so there is no free machine available today. Oracle also cut the free Ampere allowance to 2 OCPU and 12 GB in June 2026 and may reclaim idle free instances.

**Decision.** The demo runs on one Amazon Lightsail instance: general purpose, 2 vCPU and 2 GB RAM, Ubuntu 24.04 LTS x86_64, region `us-east-1`, 12 USD per month with a fixed price and a static IP. The unchanged `docker-compose.yml` (app, scheduler, MariaDB) is enough; the guide is [deploy-aws-lightsail.md](deploy-aws-lightsail.md), with a 2 GB swap file and `DB_BUFFER_POOL` at its default of 128M. The Oracle guide stays as a free alternative for whoever does get capacity.

**Alternatives considered.** Hetzner (cheaper, but only in Germany and Finland, so higher latency from the Americas), DigitalOcean, Contabo and a Google Cloud e2-micro. Lightsail won on predictable pricing, closer regions and the value of AWS experience for the author's profile.

**Consequences.**

- A fixed monthly cost and a single server for the whole demo. A stopped instance is still billed, so shutting it down means deleting the instance and releasing the static IP.
- A later portfolio backend can share the same instance behind one shared Caddy that owns ports 80 and 443 (described in the guide, not implemented).
- Gedocs keeps MariaDB in its own container: it is a MySQL-family application, so a PostgreSQL service would not replace it.
- The image is still published for `amd64` and `arm64`: Lightsail uses `amd64`, and `arm64` keeps the Oracle Ampere alternative working.
