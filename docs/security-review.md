# Security review

Review of the Gedocs demo against secure-by-default practices for a Laravel (PHP) backend and a React frontend. The backend was reviewed against well-known Laravel and OWASP practices (broken access control, unrestricted file upload, injection, session and CORS configuration, rate limiting, dependency vulnerabilities) because no PHP-specific reference checklist was used; the frontend was checked against React and general web-frontend guidance (XSS sinks, third-party requests, storage of sensitive data in the browser).

Each finding below was fixed in this repository and has an automated test, except where stated. Line numbers refer to the current code.

## Executive summary

The original code had **no entity-level authorization in the file explorer** and left several endpoints with personal data open to anonymous users. Both matter more in a public demo with published credentials, but they were real defects in the application itself. They are fixed, covered by tests, and the dependency tree went from 60 known PHP advisories (2 critical) and 17 npm advisories (2 critical) to zero in both.

| Severity | Count | Status |
|---|---|---|
| Critical | 2 | Fixed |
| High | 5 | Fixed |
| Medium | 5 | Fixed |
| Low | 3 | Fixed, or a known risk (explained) |

## Critical

**S-01. Anonymous read and write of PQRs (personal data, sequential IDs).**
`GET /api/pqrs/{id}`, `PUT /api/pqrs/{id}` and `GET /api/pqr/response-details/{id}` were public. Anyone could read names, emails and document numbers by counting IDs, and reassign or archive any request.
Fix: the read endpoints require a session ([routes/api.php:125](../routes/api.php)), each action checks the same visibility the inbox uses ([EntityAccess::canAccessPqr](../app/Support/EntityAccess.php), called from [PQRController.php:259](../app/Http/Controllers/Api/PQRController.php), `:328`, `:541`), reassignment is limited to dependencies of the PQR's own entity, and the anonymous `PUT`/`DELETE` routes were removed. Only the citizen submission (`POST /api/pqrs`) and the UUID reply link stay public.
Tests: `tests/Feature/Security/AccessControlTest.php` (PQR section).

**S-02. Documents of any entity readable and editable by any logged-in user (IDOR).**
`FolderController` never checked which entity a folder or file belongs to: a user of one entity could download, rename, move, trash or upload into another entity's archive by changing a numeric ID.
Fix: a single authorization service, [EntityAccess](../app/Support/EntityAccess.php), applied to create, upload ([FolderController.php:154](../app/Http/Controllers/FolderController.php)), download, rename, move, trash, restore, ZIP download, the archived listing ([:447](../app/Http/Controllers/FolderController.php)) and the PDF-to-explorer action ([PdfController.php:85](../app/Http/Controllers/PdfController.php)). Admin sees everything; Supervisor and Auxiliar see their assigned entities; Dependencia sees its own; only Admin and Supervisor can write.
Tests: `AccessControlTest.php` (explorer section).

## High

**S-03. Unrestricted file upload.**
Uploads accepted any type up to 50 MB, were stored on the public disk, and kept the client's extension, so a script or HTML file could be uploaded and then served from the app's own origin.
Fix: allow-list of document and image types checked on the file **content** (`mimes:`, [FolderController.php:159](../app/Http/Controllers/FolderController.php)), 10 MB limit, name rebuilt from a slug plus the extension detected from the content (`:181`). The same rule applies to profile photos ([ProfileController.php:84](../app/Http/Controllers/ProfileController.php)) and PDF logos ([PdfController.php:171](../app/Http/Controllers/PdfController.php)), and SVG is no longer accepted for stored logos ([:269](../app/Http/Controllers/PdfController.php)). The web server serves `/storage` as static, sandboxed content and never runs PHP there ([docker/Caddyfile](../docker/Caddyfile)).
Tests: rejected `.php`, `.html` and `.svg` uploads, sanitized names.

**S-04. Path characters in file renames.**
The new name was concatenated into a storage path without validation.
Fix: length limit and a regex that forbids separators and reserved characters ([FolderController.php:716](../app/Http/Controllers/FolderController.php)). Test: `../../escape.pdf` is rejected.

**S-05. Public endpoint that wrote files.**
`GET /api/qrcode` was unauthenticated and wrote a PNG to a path built from request input. It was not used by the frontend. Fix: removed.

**S-06. Known vulnerabilities in dependencies.**
`composer audit` reported 60 advisories in 16 packages (including a critical one in `phpspreadsheet` and high ones in `guzzle`, `league/commonmark` and `symfony/*`); `npm audit` reported 17 (2 critical, including `vite` and `axios`). Fix: updated inside the existing version ranges (the PHP platform is pinned to 8.2 so the lock stays installable on 8.2 to 8.4) and pinned `pdfjs-dist` to 5.5.x because 5.6.83 and later 5.x versions have an arbitrary-script advisory when opening a crafted PDF. A deprecated, unused package (`@inertiajs/inertia` 0.11) was removed. Both audits now report zero, and CI runs both on every push to `main` and on every pull request.

**S-07. CORS with credentials and a wildcard origin.**
[config/cors.php:22](../config/cors.php) allowed every origin while `supports_credentials` was true. Fix: origins come from `CORS_ALLOWED_ORIGINS`, defaulting to the app URL.

## Medium

**S-08. Public demo accounts could be taken over.** With published credentials, a visitor could change the password or email of the demo accounts or delete them. Fix: `ProtectDemoAccounts` middleware (active only with `APP_DEMO=true`) on profile, password, photo and user update/delete routes ([routes/api.php:39](../routes/api.php), `:78`, `:133`; [routes/web.php:137](../routes/web.php)). The nightly reset restores everything else.

**S-09. No rate limits.** The API token login, the public PQR form, the public reply link and self-registration could be hammered. Fix: `throttle` middleware on each ([routes/api.php:147](../routes/api.php), `:156`, `:159`, `:173`; [routes/auth.php:20](../routes/auth.php)). The API login also now refuses accounts that are still pending approval, like the web login.

**S-10. Tokens never expired.** [config/sanctum.php:50](../config/sanctum.php): now 24 hours by default (`SANCTUM_TOKEN_EXPIRATION`).

**S-11. Entities and dependencies leaked across roles.** The shared Inertia props gave every role except Supervisor the full list of dependencies. They are now scoped to the user's entities ([HandleInertiaRequests.php:64](../app/Http/Middleware/HandleInertiaRequests.php)). Management pages (`/users/*`, `/sheets`) also require the Admin or Supervisor role.

**S-12. Personal data in logs.** `PQRController::update` logged the whole request payload on every change. Removed.

## Low

**S-13. Names sent to a third-party avatar service.** The header and profile card requested `ui-avatars.com` with the user's name. Replaced by a local initials avatar ([InitialsAvatar.jsx](../resources/js/Components/InitialsAvatar.jsx)).

**S-14. Default error pages.** Added friendly pages for 403, 404, 419, 500 and 503 outside local and testing environments ([bootstrap/app.php:46](../bootstrap/app.php)), so stack traces are never shown. Production uses `APP_DEBUG=false`.

**S-15. Broken redirects.** Three Breeze controllers redirected to a `dashboard` route that does not exist. They now go to the inbox.

**Known risk:** `trustProxies(at: '*')` ([bootstrap/app.php](../bootstrap/app.php)). In the normal deployment Caddy runs inside the same container as the app (FrankenPHP), so it is not a separate proxy and the app trusts the forwarding headers it receives, including those a visitor sends. A forged `X-Forwarded-For` therefore changes the IP the `throttle` limits see, which lets someone sidestep the per-IP rate limits. HTTPS detection and secure cookies are not affected. Behind the shared proxy (see the AWS guide) the risk is smaller, because that proxy rewrites the header. The fix is to trust only the proxy address through an environment variable; it is left as is on purpose because the demo holds no real data, and it is listed in the README under "What I would improve".

## Things that were already right

- dompdf runs with remote resources and PHP disabled and a restricted root (`config/dompdf.php`).
- All user text in PDF templates goes through `e()` before `nl2br`; there is no `dangerouslySetInnerHTML` in the React code.
- Registration creates `pending` accounts that a supervisor or admin must approve; passwords use Laravel's default password rules.
- Public reply links use random UUIDs with an expiry and a single use.
- Sessions are regenerated on login; the session cookie is `HttpOnly` and `SameSite=Lax`.

## Not changed on purpose

- **Filing numbers are not race-free.** `PdfController::getNextEnvConsecutive` reads the maximum and adds one without a lock, so two simultaneous requests can receive the same number. Fixing it properly needs a database sequence or a locked counter table, which changes the schema of a running system; it is listed under "What I would improve" in the README.
- **Real credentials of the original system.** The original repository history contains an administrator account with a real email and password. If that password is still in use in production it must be changed there. This repository starts without that history and its seeders only create fictional accounts.
