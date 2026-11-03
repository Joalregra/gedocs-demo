# Glossary

Terms used in the code, the interface and the documentation. The interface is in Spanish because it follows Colombian records-management rules, so the Spanish term is given first where it appears on screen.

## Domain terms

| Term | Definition |
|---|---|
| Entidad (entity) | An organization with its own single window, dependencies, users and archive tree. It is the unit of data isolation: a user only sees the entities they belong to. In code it is the `Sheet_number` model, the `sheet_numbers` table and the `/sheets` API |
| Admin | Role that sees every entity and manages users, entities and dependencies |
| Supervisor | Role that manages the entities it belongs to and approves new accounts. Can write in the archive |
| Auxiliar | Role that consults and files documents of its entities. Read-only in the archive |
| Dependencia (dependency) | An organizational unit inside an entity that receives and answers PQRSD and owns folders. The role `Dependencia` belongs to staff of one dependency |
| Ventanilla Única (single window) | The dependency created with every entity that receives the PQRSD that do not name another dependency. It is a dependency, not a role (`ventanilla_unica_id`), and its archive section is named by `Folder::VENTANILLA_NAME` |
| PQRSD | Peticiones, Quejas, Reclamos y Sugerencias (the form offers these four types): petitions, complaints, claims and suggestions submitted by citizens. The interface and the code call them PQRSD; the table is `p_q_r_s` |
| Radicado (filing number) | Number given to a received or sent document. It is stored as a plain sequence (`007`) and shown with prefix and year only in PDFs, reports and stamps (`DEMO-2026-000007`, see `InstitutionIdentity::formatFiling`) |
| REC, RECIBO and ENV | Origin codes of the supports attached to a PQRSD: `REC` and `RECIBO` for received documents (from the citizen) and `ENV` for sent ones |
| Plazo (due date) | Deadline of a PQRSD, assigned as 10, 15 or 30 days. Pending requests past their due date are archived automatically every ten minutes (`PqrAutoArchiveService`) |
| Vencidos | Expired. Menu item that lists the PQRSD archived because their due date passed |
| Constancia de Recibido | Receipt certificate PDF generated for a received PQRSD |
| Carta, circular, acta, informe, constancia | Letter, circular, minutes, report and certificate: document types of the PDF generator |
| Explorador (explorer) | The file explorer module |
| Índice electrónico (electronic index) | Page that lists the files of an entity, year and dependency with their classification code and SHA-256 hash |
| Papelera (trash) | Logical deletion area. Folders and files have `active = false` and can be restored |
| Año, Sección, Subsección, Serie, Subserie | Levels of the archive classification. They are stored as labels in `folders.department` on a self-referencing `Folder` tree, not as separate tables. `FolderStructureService` builds the default tree for each year |
| TRD | Tabla de Retención Documental: the records retention schedule that defines how long each series is kept and its final disposition. The default tree follows it, and it appears as a series in the tree. The "Generar TRD" button in the explorer is a different thing: it downloads the Excel register of received and sent PQRSD (`GET /api/export`) |
| Ley 594 de 2000 | Colombian General Archives Law, which the folder structure follows |
| Ley 1581 de 2012 | Colombian personal data protection law, referenced in the consent statement of the public PQRSD form |

## Demo terms

| Term | Definition |
|---|---|
| Demo mode | Enabled with `APP_DEMO=true`. Adds one-click login for each role, the header badge and guided tour, protection of the demo accounts and the nightly reset. See [demo-decisions.md](demo-decisions.md) |
| `demo:reset` | Artisan command that wipes the database and uploaded files and loads the fictional data again. It refuses to run unless `APP_DEMO=true`; the scheduler runs it every night at 03:00 (Bogotá) |
| Institution identity | Name, tax id, city, area, filing prefix, logo and PDF footer, read from `config/institution.php` (`INSTITUTION_*` variables) instead of being written in the code |

## Technical terms

| Term | Definition |
|---|---|
| Laravel | PHP web framework used for the backend |
| Inertia.js | Library that connects Laravel routes with React pages without a separate API for page rendering |
| React | JavaScript library used for the interface |
| Vite | Frontend build tool and development server |
| Tailwind CSS and daisyUI | Utility CSS framework and component library used for styling |
| Sanctum | Laravel package for token and session based API authentication. The interface uses its stateful session cookie |
| Spatie Laravel Permission | Package that manages roles. Only roles are used |
| Eloquent | Laravel ORM |
| SPA | Single Page Application: pages update without a full reload |
| SHA-256 | Hash function used to fingerprint the content of each uploaded file |
| DomPDF | PHP library that renders HTML templates to PDF |
| FrankenPHP and Caddy | Application server and web server of the Docker image. Caddy gets the HTTPS certificate automatically |
| Scheduler | Laravel task scheduler. It runs the automatic archiving of expired PQRSD and, in demo mode, the nightly reset |
| Pest and Vitest | Test frameworks for the backend and the frontend |
