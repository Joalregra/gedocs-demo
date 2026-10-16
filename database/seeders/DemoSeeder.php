<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Dependency;
use App\Models\File;
use App\Models\Folder;
use App\Models\PQR;
use App\Models\Sheet_number;
use App\Models\User;
use App\Notifications\NewUserRegistered;
use App\Services\FolderStructureService;
use App\Support\InstitutionIdentity;
use Carbon\Carbon;
use Database\Seeders\Support\DemoDocuments;
use Faker\Generator;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Fictional data for the public demo: two entities with their folder trees, users per role,
 * archived documents and PQRs in every state. Seeded with a fixed Faker seed so every reset
 * produces the same story. Nothing here comes from a real institution or person.
 */
class DemoSeeder extends Seeder
{
    private Generator $faker;

    private string $passwordHash;

    private int $year;

    /** Next filing (radicado) number; shared by explorer files and PQR responses like the app does. */
    private int $consecutive = 1;

    /** @var array<string, User> */
    private array $users = [];

    /** @var array<string, Dependency> keyed "<number>:<name>" */
    private array $dependencies = [];

    private Sheet_number $entityA;

    private Sheet_number $entityB;

    public function run(): void
    {
        $this->faker = fake('es_ES');
        $this->faker->seed(20260101);
        $this->passwordHash = Hash::make(config('demo.password'));
        $this->year = (int) now()->year;

        $this->seedEntities();
        $this->seedUsers();
        $this->seedFolders();
        $this->seedExplorerDocuments();
        $this->seedPqrs();
        $this->seedNotifications();
    }

    private function seedEntities(): void
    {
        $this->entityA = $this->createEntity('1001', ['Gestión Documental', 'Talento Humano', 'Jurídica', 'Atención al Ciudadano', 'Financiera']);
        $this->entityB = $this->createEntity('1002', ['Planeación', 'Control Interno']);
    }

    /** @param list<string> $dependencyNames */
    private function createEntity(string $number, array $dependencyNames): Sheet_number
    {
        $entity = Sheet_number::create(['number' => $number, 'active' => true, 'state' => 'Activa']);

        $ventanilla = Dependency::create(['name' => 'Ventanilla Unica', 'sheet_number_id' => $entity->id]);
        $entity->update(['ventanilla_unica_id' => $ventanilla->id]);
        $this->dependencies["{$number}:Ventanilla Unica"] = $ventanilla;

        foreach ($dependencyNames as $name) {
            $this->dependencies["{$number}:{$name}"] = Dependency::create(['name' => $name, 'sheet_number_id' => $entity->id]);
        }

        return $entity;
    }

    private function seedUsers(): void
    {
        $document = 9000100;

        foreach (config('demo.accounts') as $email => $account) {
            $this->users[$email] = $this->createUser($account['name'], $email, $account['role'], 'active', $account['document_number']);
        }

        // Fictional staff so the user lists are not empty. Names come from the seeded Faker.
        $staff = [
            [UserRole::Supervisor, 'active', $this->entityB],
            [UserRole::Supervisor, 'pending', $this->entityB],
            [UserRole::Auxiliar, 'active', $this->entityA],
            [UserRole::Auxiliar, 'active', $this->entityA],
            [UserRole::Auxiliar, 'active', $this->entityB],
            [UserRole::Auxiliar, 'pending', $this->entityA],
            [UserRole::Auxiliar, 'pending', $this->entityB],
            [UserRole::Dependencia, 'active', null],
            [UserRole::Dependencia, 'active', null],
        ];

        foreach ($staff as $i => [$role, $status, $entity]) {
            $name = $this->faker->firstName().' '.$this->faker->lastName().' '.$this->faker->lastName();
            $email = Str::slug($name, '.').'@demo.test';
            $user = $this->createUser($name, $email, $role->value, $status, ++$document);
            $this->users['staff'.$i] = $user;

            if ($entity) {
                $user->sheetNumbers()->attach($entity->id);
            }
        }

        // Main accounts: the demo supervisor sees both entities, the auxiliar one, the dependencia works in "Gestión Documental".
        $this->users['supervisor@demo.test']->sheetNumbers()->attach([$this->entityA->id, $this->entityB->id]);
        $this->users['auxiliar@demo.test']->sheetNumbers()->attach($this->entityA->id);
        $this->users['dependencia@demo.test']->update(['dependency_id' => $this->dependencies['1001:Gestión Documental']->id]);
        $this->users['staff7']->update(['dependency_id' => $this->dependencies['1001:Talento Humano']->id]);
        $this->users['staff8']->update(['dependency_id' => $this->dependencies['1001:Jurídica']->id]);
    }

    private function createUser(string $name, string $email, string $role, string $status, int $document): User
    {
        $user = User::create([
            'type_document' => 'CC',
            'document_number' => $document,
            'name' => $name,
            'email' => $email,
            'password' => $this->passwordHash,
            'status' => $status,
        ]);
        $user->forceFill(['email_verified_at' => now()])->save();
        $user->assignRole($role);

        return $user;
    }

    private function seedFolders(): void
    {
        // Entity A: full default retention-schedule tree for this year and the previous one.
        FolderStructureService::createDefaultStructure($this->entityA->id, $this->year);
        FolderStructureService::createDefaultStructure($this->entityA->id, $this->year - 1);
        $this->addDependencyFolders($this->entityA, $this->year);

        // Entity B: only the year folder with its dependency folders.
        Folder::create([
            'name' => (string) $this->year, 'year' => $this->year, 'department' => 'Año', 'folder_code' => (string) $this->year,
            'sheet_number_id' => $this->entityB->id, 'active' => true, 'parent_id' => null,
        ]);
        $this->addDependencyFolders($this->entityB, $this->year);
    }

    private function addDependencyFolders(Sheet_number $entity, int $year): void
    {
        $yearFolder = Folder::where('sheet_number_id', $entity->id)->where('year', $year)->whereNull('parent_id')->firstOrFail();

        Folder::create([
            'name' => 'Ventanilla Única', 'parent_id' => $yearFolder->id, 'folder_code' => '000',
            'department' => 'sección', 'sheet_number_id' => $entity->id, 'active' => true,
        ]);

        $dependencies = Dependency::where('sheet_number_id', $entity->id)->where('id', '!=', $entity->ventanilla_unica_id)->orderBy('id')->get();

        foreach ($dependencies as $index => $dependency) {
            Folder::create([
                'name' => $dependency->name, 'parent_id' => $yearFolder->id, 'folder_code' => (string) (200 + $index),
                'department' => 'sección', 'sheet_number_id' => $entity->id, 'active' => true,
            ]);
        }
    }

    private function seedExplorerDocuments(): void
    {
        $signer = $this->users['supervisor@demo.test']->name;
        $folders = Folder::where('sheet_number_id', $this->entityA->id)
            ->whereIn('department', ['Serie', 'Subserie', 'SubSerie'])
            ->orderBy('id')
            ->get();

        // Spread documents over the last months: 36 for this year, 12 for the previous one.
        $plan = [[$this->year, 36], [$this->year - 1, 12]];

        foreach ($plan as [$year, $count]) {
            $yearFolderId = Folder::where('sheet_number_id', $this->entityA->id)->where('year', $year)->whereNull('parent_id')->value('id');
            $inYear = $folders->filter(fn (Folder $f) => $this->belongsToYear($f, $yearFolderId))->values();

            for ($i = 0; $i < $count; $i++) {
                $folder = $inYear[$i % $inYear->count()];
                $date = $year === $this->year
                    ? now()->subDays($this->faker->numberBetween(2, 170))
                    : Carbon::create($year, $this->faker->numberBetween(1, 12), $this->faker->numberBetween(1, 28));

                $this->storeFolderDocument($folder, $date, $signer, $i);
            }
        }
    }

    private function belongsToYear(Folder $folder, int $yearFolderId): bool
    {
        for ($current = $folder, $guard = 0; $current && $guard < 10; $guard++) {
            if ($current->parent_id === $yearFolderId) {
                return true;
            }
            $current = $current->parent;
        }

        return false;
    }

    private function storeFolderDocument(Folder $folder, Carbon $date, string $signer, int $index): void
    {
        $number = $this->nextFiling();
        $label = Str::lower($folder->name);
        $dateText = $date->format('d/m/Y');
        $code = 'DOC-'.str_pad((string) $number, 3, '0', STR_PAD_LEFT);
        $place = config('institution.city');

        $data = match (true) {
            str_contains($label, 'acta') => DemoDocuments::acta('Acta de comité '.$date->format('m/Y'), $dateText, $code, $number, $place, [$signer, $this->faker->name(), $this->faker->name()]),
            str_contains($label, 'circular') => DemoDocuments::circular('Circular informativa '.$date->format('m/Y'), $dateText, $code, $number, $place, $signer),
            str_contains($label, 'informe') => DemoDocuments::informe('Informe de gestión '.$date->format('m/Y'), $dateText, $code, $number, $place, $signer),
            str_contains($label, 'derechos de petici') => DemoDocuments::carta($this->faker->name(), 'Respuesta a derecho de petición', 'Se da respuesta a su solicitud dentro de los términos legales.', $dateText, $code, $number, $place, $signer),
            default => DemoDocuments::constancia($dateText, $code, $number, $place, $this->faker->name(), $signer),
        };

        $this->storeFile($folder, DemoDocuments::render($data), $date, $number, "ENV-{$date->year}");
    }

    /** Writes a PDF to the public disk and registers it as an explorer file, mirroring FolderController::upload naming. */
    private function storeFile(Folder $folder, string $pdf, Carbon $date, int $number, string $tag): File
    {
        $hash = hash('sha256', $pdf);
        $name = $folder->getFullHierarchyCode()."-{$tag}-".str_pad((string) $number, 3, '0', STR_PAD_LEFT).'-'.substr($hash, 0, 10).'.pdf';
        $path = "folders/{$folder->id}/{$name}";
        Storage::disk('public')->put($path, $pdf);

        $file = File::create([
            'name' => $name,
            'path' => $path,
            'extension' => 'pdf',
            'mime_type' => 'application/pdf',
            'size' => strlen($pdf),
            'active' => true,
            'folder_id' => $folder->id,
            'file_code' => str_pad((string) $number, 3, '0', STR_PAD_LEFT),
            'hash' => $hash,
        ]);
        $file->forceFill(['created_at' => $date, 'updated_at' => $date])->save();

        return $file;
    }

    private function nextFiling(): int
    {
        return $this->consecutive++;
    }

    private function seedPqrs(): void
    {
        $responsibles = [
            '1001:Gestión Documental' => $this->users['dependencia@demo.test'],
            '1001:Talento Humano' => $this->users['staff7'],
            '1001:Jurídica' => $this->users['staff8'],
        ];

        // [type, affair, description, dependency key, status, days ago it was received]
        $cases = [
            ['Peticion', 'Solicitud de certificación de documentos', 'Solicito certificación de los documentos radicados a mi nombre durante el último año.', '1001:Ventanilla Unica', 'pending', 3],
            ['Peticion', 'Copia de un expediente archivado', 'Requiero copia del expediente de mi trámite, que según me informaron fue archivado.', '1001:Gestión Documental', 'pending', 6],
            ['Peticion', 'Consulta sobre la tabla de retención', 'Quisiera conocer el tiempo de retención de las actas de comité de mi dependencia.', '1001:Gestión Documental', 'pending', 9],
            ['Queja', 'Demora en la atención de un trámite', 'Mi trámite lleva más de un mes sin respuesta y nadie me da razón en la ventanilla.', '1001:Talento Humano', 'pending', 11],
            ['Reclamo', 'Documento radicado sin respuesta', 'Radiqué un documento hace tres semanas y no he recibido ninguna respuesta.', '1001:Jurídica', 'pending', 13],
            ['Sugerencia', 'Habilitar radicación virtual', 'Sugiero habilitar la radicación de documentos desde el celular para evitar desplazamientos.', '1001:Ventanilla Unica', 'pending', 2],
            ['Peticion', 'Solicitud de información general', 'Solicito información sobre los horarios y requisitos para radicar documentos.', '1002:Ventanilla Unica', 'pending', 5],
            ['Otro', 'Corrección de datos en el sistema', 'Mis datos de contacto aparecen con un error en la constancia de radicado.', '1002:Planeación', 'pending', 7],
            ['Peticion', 'Certificado de radicados del año', 'Necesito un listado de los radicados que hice durante este año.', '1001:Gestión Documental', 'responded', 34],
            ['Queja', 'Trato recibido en ventanilla', 'Quiero dejar constancia de la mala atención que recibí al radicar mi documento.', '1001:Atención al Ciudadano', 'responded', 41],
            ['Reclamo', 'Error en una constancia emitida', 'La constancia que me entregaron tiene mal escrito mi nombre y número de documento.', '1001:Jurídica', 'responded', 52],
            ['Sugerencia', 'Ampliar el horario de atención', 'Sería de gran ayuda ampliar el horario de atención en las tardes.', '1001:Ventanilla Unica', 'responded', 60],
            ['Peticion', 'Copia de acta de comité', 'Solicito copia del acta del comité del mes pasado, que es de carácter público.', '1002:Control Interno', 'responded', 27],
            ['Peticion', 'Actualización de datos de contacto', 'Solicito actualizar mi correo en los registros de la entidad.', '1001:Talento Humano', 'closed', 75],
            ['Reclamo', 'Cobro no reconocido', 'Se me informó de un cobro que no reconozco y pido su revisión.', '1001:Financiera', 'closed', 88],
            ['Queja', 'Documento extraviado', 'Entregué un documento original y ahora no aparece en mi expediente.', '1001:Gestión Documental', 'closed', 102],
            ['Sugerencia', 'Mejorar la señalización de la sede', 'Propongo mejorar la señalización para encontrar la ventanilla única.', '1002:Ventanilla Unica', 'closed', 120],
            ['Peticion', 'Solicitud de paz y salvo', 'Requiero un paz y salvo para completar un trámite en otra entidad.', '1001:Financiera', 'expired', 45],
            ['Otro', 'Consulta sobre un radicado antiguo', 'Quiero saber qué pasó con el radicado que presenté a comienzos de año.', '1001:Ventanilla Unica', 'expired', 58],
        ];

        foreach ($cases as $i => [$type, $affair, $description, $dependencyKey, $status, $daysAgo]) {
            $this->createPqr($i, $type, $affair, $description, $dependencyKey, $status, $daysAgo, $responsibles[$dependencyKey] ?? null);
        }
    }

    private function createPqr(int $i, string $type, string $affair, string $description, string $dependencyKey, string $status, int $daysAgo, ?User $responsible): void
    {
        [$entityNumber] = explode(':', $dependencyKey);
        $entity = $entityNumber === '1001' ? $this->entityA : $this->entityB;
        $dependency = $this->dependencies[$dependencyKey];
        $received = now()->subDays($daysAgo)->setTime($this->faker->numberBetween(8, 16), $this->faker->numberBetween(0, 59));
        $days = [10, 15, 30][$i % 3];
        $name = $this->faker->firstName().' '.$this->faker->lastName().' '.$this->faker->lastName();

        $dueDate = $status === 'expired'
            ? now()->subDays($this->faker->numberBetween(3, 20))->startOfDay()
            : $received->copy()->addDays($status === 'pending' ? max($days, $daysAgo + 4) : $days)->startOfDay();

        $pqr = PQR::create([
            'sender_name' => $name,
            'email' => Str::slug($name, '.').'@demo.test',
            'description' => $description,
            'affair' => $affair,
            'request_type' => $type,
            'document_type' => $this->faker->randomElement(['CC', 'CC', 'CE', 'TI']),
            'document' => (string) $this->faker->numberBetween(9100000, 9999999),
            'response_days' => $days,
            'response_time' => $dueDate->toDateString(),
            'state' => in_array($status, ['responded', 'closed'], true),
            'archived' => $status === 'expired',
            'user_id' => null,
            'responsible_id' => $responsible?->id,
            'dependency_id' => $dependency->id,
            'sheet_number_id' => $entity->id,
            'response_status' => $status === 'expired' ? 'pending' : $status,
        ]);
        $pqr->forceFill(['created_at' => $received, 'updated_at' => $received])->save();

        $this->attachReceipt($pqr, $entity, $received);

        if (in_array($status, ['responded', 'closed'], true)) {
            $this->respond($pqr, $entity, $received, $status, $responsible);
        }

        // Two pending PQRs wait for the citizen to answer a clarification request (public reply link).
        if ($status === 'pending' && in_array($i, [1, 4], true)) {
            $communication = $pqr->comunications()->create([
                'message' => 'Para continuar con su solicitud necesitamos que adjunte una copia legible de su documento de identidad.',
                'requires_response' => true,
            ]);
            $communication->generateResponseUuid(7);
            $communication->save();
        }
    }

    /** Receipt PDF in the entity's explorer, same naming the app uses (…-REC-<year>-<id>.pdf). */
    private function attachReceipt(PQR $pqr, Sheet_number $entity, Carbon $received): void
    {
        $yearFolderId = Folder::where('sheet_number_id', $entity->id)->where('year', $this->year)->whereNull('parent_id')->value('id');
        $folder = Folder::where('parent_id', $yearFolderId)->where('name', $pqr->dependency->name)->first()
            ?? Folder::where('parent_id', $yearFolderId)->where('name', 'Ventanilla Única')->first();
        $number = str_pad((string) $pqr->id, 3, '0', STR_PAD_LEFT);

        $data = DemoDocuments::carta(
            $pqr->sender_name,
            'CONSTANCIA DE RECIBIDO DE PQR - '.Str::upper($pqr->request_type),
            "Se confirma el recibido de su solicitud.\n\nRadicado No: ".InstitutionIdentity::formatFiling($number, $received->year)
                ."\nTipo de solicitud: {$pqr->request_type}\nAsunto: {$pqr->affair}\nAsignado a: {$pqr->dependency->name}",
            $received->format('d/m/Y'),
            "REC-{$number}",
            $number,
            config('institution.city'),
            'SISTEMA GEDOCS',
            isReceipt: true,
        );
        $pdf = DemoDocuments::render($data);

        $name = $folder->getFullHierarchyCode()."-REC-{$received->year}-{$number}.pdf";
        $path = "folders/{$folder->id}/{$name}";
        Storage::disk('public')->put($path, $pdf);

        $file = File::create([
            'name' => $name, 'path' => $path, 'extension' => 'pdf', 'mime_type' => 'application/pdf',
            'size' => strlen($pdf), 'active' => true, 'folder_id' => $folder->id, 'file_code' => $number, 'hash' => hash('sha256', $pdf),
        ]);
        $file->forceFill(['created_at' => $received, 'updated_at' => $received])->save();

        $pqr->attachedSupports()->create([
            'name' => $name, 'path' => $path, 'type' => 'pdf', 'origin' => 'RECIBO',
            'size' => strlen($pdf), 'hash' => hash('adler32', $pdf), 'no_radicado' => $number,
        ]);
    }

    private function respond(PQR $pqr, Sheet_number $entity, Carbon $received, string $status, ?User $responsible): void
    {
        $answeredAt = $received->copy()->addDays($this->faker->numberBetween(3, 9));
        $message = 'Se atiende su solicitud conforme a los procedimientos de la entidad. Quedamos atentos a cualquier inquietud adicional.';

        $pqr->forceFill([
            'response_message' => $message,
            'response_date' => $answeredAt,
            'responsible_id' => $pqr->responsible_id ?? $this->users['dependencia@demo.test']->id,
        ])->save();

        $communication = $pqr->comunications()->create(['message' => $message, 'requires_response' => false]);
        $communication->forceFill(['created_at' => $answeredAt, 'updated_at' => $answeredAt])->save();

        $number = $this->nextFiling();
        $yearFolderId = Folder::where('sheet_number_id', $entity->id)->where('year', $this->year)->whereNull('parent_id')->value('id');
        $folder = Folder::where('parent_id', $yearFolderId)->where('name', $pqr->dependency->name)->first()
            ?? Folder::where('parent_id', $yearFolderId)->where('name', 'Ventanilla Única')->first();

        $data = DemoDocuments::carta(
            $pqr->sender_name, 'Respuesta a su '.Str::lower($pqr->request_type).': '.$pqr->affair, $message,
            $answeredAt->format('d/m/Y'), 'ENV-'.str_pad((string) $number, 3, '0', STR_PAD_LEFT), (string) $number,
            config('institution.city'), $responsible?->name ?? $this->users['dependencia@demo.test']->name,
        );
        $file = $this->storeFile($folder, DemoDocuments::render($data), $answeredAt, $number, "ENV-{$answeredAt->year}");

        $communication->attachedSupports()->create([
            'pqr_id' => $pqr->id, 'name' => $file->name, 'path' => $file->path, 'type' => 'pdf', 'origin' => 'ENV',
            'size' => $file->size, 'hash' => substr($file->hash, 0, 8), 'no_radicado' => str_pad((string) $number, 3, '0', STR_PAD_LEFT),
        ]);
    }

    /** Registration requests waiting for approval show up in the supervisors' and admin's notification hub. */
    private function seedNotifications(): void
    {
        $admin = $this->users['admin@demo.test'];
        $supervisor = $this->users['supervisor@demo.test'];

        foreach (User::where('status', 'pending')->get() as $pending) {
            $admin->notify(new NewUserRegistered($pending));
            if ($pending->hasRole(UserRole::Auxiliar)) {
                $supervisor->notify(new NewUserRegistered($pending));
            }
        }
    }
}
