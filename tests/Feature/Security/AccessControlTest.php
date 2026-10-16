<?php

use App\Enums\UserRole;
use App\Models\Dependency;
use App\Models\File;
use App\Models\Folder;
use App\Models\PQR;
use App\Models\Sheet_number;
use Database\Seeders\RoleSeeder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\getJson;
use function Pest\Laravel\putJson;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    Storage::fake('public');

    $this->sheetA = Sheet_number::create(['number' => '2001', 'active' => true, 'state' => 'Activa']);
    $this->sheetB = Sheet_number::create(['number' => '2002', 'active' => true, 'state' => 'Activa']);

    $this->dependencyA = Dependency::create(['name' => 'Ventanilla Unica', 'sheet_number_id' => $this->sheetA->id]);
    $this->dependencyB = Dependency::create(['name' => 'Ventanilla Unica', 'sheet_number_id' => $this->sheetB->id]);

    $this->folderA = Folder::create(['name' => '2026', 'year' => 2026, 'department' => 'Año', 'sheet_number_id' => $this->sheetA->id, 'active' => true]);

    $this->admin = makeUser(UserRole::Admin);
    $this->supervisorA = makeUser(UserRole::Supervisor, $this->sheetA);
    $this->supervisorB = makeUser(UserRole::Supervisor, $this->sheetB);
    $this->auxiliarA = makeUser(UserRole::Auxiliar, $this->sheetA);

    $this->pqr = PQR::create([
        'sender_name' => 'Persona Ficticia',
        'description' => 'Solicitud de prueba',
        'affair' => 'Asunto de prueba',
        'request_type' => 'Peticion',
        'document_type' => 'CC',
        'response_status' => 'pending',
        'dependency_id' => $this->dependencyA->id,
        'sheet_number_id' => $this->sheetA->id,
    ]);
});

// ---- PQR endpoints ------------------------------------------------------------------------------

it('requires a session to read a single PQR', function () {
    getJson("/api/pqrs/{$this->pqr->id}")->assertUnauthorized();
});

it('requires a session to read the internal response details', function () {
    getJson("/api/pqr/response-details/{$this->pqr->id}")->assertUnauthorized();
});

it('lets the supervisor of the entity read its PQR', function () {
    actingAs($this->supervisorA)->getJson("/api/pqrs/{$this->pqr->id}")->assertOk();
});

it('hides a PQR from a supervisor of another entity', function () {
    actingAs($this->supervisorB)->getJson("/api/pqrs/{$this->pqr->id}")->assertForbidden();
    actingAs($this->supervisorB)->getJson("/api/pqr/response-details/{$this->pqr->id}")->assertForbidden();
});

it('does not let another entity change a PQR', function () {
    actingAs($this->supervisorB)
        ->patchJson("/api/pqrs/{$this->pqr->id}", ['archived' => true])
        ->assertForbidden();

    expect($this->pqr->fresh()->archived)->toBeFalse();
});

it('does not allow reassigning a PQR to a dependency of another entity', function () {
    actingAs($this->supervisorA)
        ->patchJson("/api/pqrs/{$this->pqr->id}", ['dependency_id' => $this->dependencyB->id])
        ->assertStatus(422);
});

it('no longer exposes the anonymous update or the QR writer endpoint', function () {
    putJson("/api/pqrs/{$this->pqr->id}", ['archived' => true])->assertStatus(405);
    getJson('/api/qrcode?url=x&file_name=y')->assertNotFound();
});

it('keeps citizen PQR submission public', function () {
    $this->postJson('/api/pqrs', [])->assertStatus(422); // reaches validation, not a 401
});

// ---- Explorer: entity isolation -----------------------------------------------------------------

it('stops a supervisor from uploading into another entity folder', function () {
    actingAs($this->supervisorB)
        ->post("/folders/{$this->folderA->id}/upload", ['files' => [UploadedFile::fake()->create('doc.pdf', 20, 'application/pdf')]])
        ->assertForbidden();
});

it('stops an auxiliar from changing documents even inside its own entity', function () {
    actingAs($this->auxiliarA)
        ->post("/folders/{$this->folderA->id}/upload", ['files' => [UploadedFile::fake()->create('doc.pdf', 20, 'application/pdf')]])
        ->assertForbidden();
});

it('stops a supervisor from downloading a file of another entity', function () {
    Storage::disk('public')->put('folders/x/secret.pdf', 'pdf-bytes');
    $file = File::create([
        'name' => 'secret.pdf', 'path' => 'folders/x/secret.pdf', 'extension' => 'pdf',
        'mime_type' => 'application/pdf', 'size' => 9, 'active' => true, 'folder_id' => $this->folderA->id,
    ]);

    actingAs($this->supervisorB)->get("/folders/file/download/{$file->id}")->assertForbidden();
    actingAs($this->supervisorA)->get("/folders/file/download/{$file->id}")->assertOk();
});

it('stops a supervisor from trashing items of another entity', function () {
    actingAs($this->supervisorB)
        ->post('/folders/delete-mixed', ['folders' => [$this->folderA->id]])
        ->assertForbidden();

    $this->assertDatabaseHas('folders', ['id' => $this->folderA->id, 'active' => true]);
});

it('only lists archived items of the entities the user belongs to', function () {
    Folder::create(['name' => 'Oculta', 'department' => 'sección', 'sheet_number_id' => $this->sheetA->id, 'active' => false]);

    actingAs($this->supervisorB)->getJson('/folders/archived')->assertOk()->assertJsonCount(0, 'folders');
    actingAs($this->supervisorB)->getJson("/folders/archived?sheet_id={$this->sheetA->id}")->assertForbidden();
    actingAs($this->admin)->getJson('/folders/archived')->assertOk()->assertJsonCount(1, 'folders');
});

// ---- Explorer: uploads --------------------------------------------------------------------------

it('rejects executable and script uploads', function (string $name, string $mime) {
    actingAs($this->supervisorA)
        ->post("/folders/{$this->folderA->id}/upload", ['files' => [UploadedFile::fake()->create($name, 5, $mime)]])
        ->assertSessionHasErrors();

    expect(File::count())->toBe(0);
})->with([
    'php script' => ['shell.php', 'application/x-httpd-php'],
    'html page' => ['page.html', 'text/html'],
    'svg image' => ['image.svg', 'image/svg+xml'],
]);

it('stores allowed uploads under a sanitized name', function () {
    actingAs($this->supervisorA)
        ->post("/folders/{$this->folderA->id}/upload", ['files' => [UploadedFile::fake()->create('Informe Final (v2)!.pdf', 20, 'application/pdf')]])
        ->assertSessionHasNoErrors();

    $file = File::firstOrFail();
    expect($file->extension)->toBe('pdf')
        ->and($file->name)->toEndWith('-informe-final-v2.pdf')
        ->and($file->name)->not->toContain(' ');
});

it('does not allow a rename to carry path separators', function () {
    Storage::disk('public')->put("folders/{$this->folderA->id}/original.pdf", 'x');
    $file = File::create([
        'name' => 'PRE-ENV-2026-001-abcdef1234-original.pdf', 'path' => "folders/{$this->folderA->id}/original.pdf",
        'extension' => 'pdf', 'mime_type' => 'application/pdf', 'size' => 1, 'active' => true, 'folder_id' => $this->folderA->id,
    ]);

    actingAs($this->supervisorA)
        ->put("/files/{$file->id}", ['name' => '../../escape.pdf'])
        ->assertSessionHasErrors('name');
});

// ---- Pages --------------------------------------------------------------------------------------

it('keeps the user management pages for admins and supervisors', function () {
    actingAs($this->auxiliarA)->get('/users/auxiliar')->assertForbidden();
    actingAs($this->supervisorA)->get('/users/auxiliar')->assertOk();
    actingAs($this->admin)->get('/users/supervisor')->assertOk();
});

it('scopes the shared entities and dependencies to the user', function () {
    $response = actingAs($this->supervisorA)->get('/')->assertOk();

    $props = $response->viewData('page')['props'];
    expect(collect($props['sheets'])->pluck('id')->all())->toBe([$this->sheetA->id])
        ->and(collect($props['dependencies'])->pluck('sheet_number_id')->unique()->values()->all())->toBe([$this->sheetA->id]);
});
