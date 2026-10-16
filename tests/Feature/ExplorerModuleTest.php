<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Sheet_number;
use App\Models\Folder;
use App\Models\File;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    Storage::fake('public');

    $this->admin = User::factory()->create([
        'document_number' => '123456789'
    ]);
    $this->admin->assignRole('Admin');

    $this->supervisor = User::factory()->create([
        'document_number' => '987654321'
    ]);
    $this->supervisor->assignRole('Supervisor');

    $this->auxiliar = User::factory()->create([
        'document_number' => '112233445'
    ]);
    $this->auxiliar->assignRole('Auxiliar');

    $this->sheet1 = Sheet_number::create(['number' => '111111', 'program_id' => 1]);
    $this->sheet2 = Sheet_number::create(['number' => '222222', 'program_id' => 1]);

    $this->supervisor->sheetNumbers()->attach($this->sheet1->id);
    $this->auxiliar->sheetNumbers()->attach($this->sheet1->id);

    $this->rootFolderSheet1 = Folder::create([
        'name' => '2024',
        'department' => 'Año',
        'sheet_number_id' => $this->sheet1->id,
        'year' => 2024,
        'active' => true
    ]);

    $this->rootFolderSheet2 = Folder::create([
        'name' => '2024',
        'department' => 'Año',
        'sheet_number_id' => $this->sheet2->id,
        'year' => 2024,
        'active' => true
    ]);

    $this->subFolderSheet1 = Folder::create([
        'name' => 'Ventanilla unica',
        'parent_id' => $this->rootFolderSheet1->id,
        'sheet_number_id' => $this->sheet1->id,
        'department' => 'sección',
        'active' => true
    ]);
});

it('allows Admin to see all folders in the explorer regardless of sheet', function () {
    $response = $this->actingAs($this->admin)->get('/explorer?sheet_id=' . $this->sheet2->id);
    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Explorer')
        ->has('folders')
    );
});

it('allows Supervisor to see folders for assigned sheets', function () {
    $response = $this->actingAs($this->supervisor)->get('/explorer?sheet_id=' . $this->sheet1->id);
    $response->assertStatus(200);
});

it('prevents Supervisor from seeing folders for unassigned sheets', function () {
    $response = $this->actingAs($this->supervisor)->get('/explorer?sheet_id=' . $this->sheet2->id);

    if ($response->status() !== 403) {

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Explorer')
            ->where('folders', [])
        );
    } else {
        $response->assertForbidden();
    }
});

it('prevents Assistant from seeing folders for unassigned sheets', function () {
    $response = $this->actingAs($this->auxiliar)->get('/explorer?sheet_id=' . $this->sheet2->id);
    if ($response->status() !== 403) {
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Explorer')
            ->where('folders', [])
        );
    } else {
        $response->assertForbidden();
    }
});

it('automatically creates a Year folder when parent is null and sheet_number_id is provided', function () {
    $response = $this->actingAs($this->admin)->post('/api/folders', [
        'name' => '2025',
        'department' => 'Año',
        'sheet_number_id' => $this->sheet1->id,
        'parent_id' => null
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('folders', [
        'name' => '2025',
        'department' => 'Año',
        'year' => 2025,
        'sheet_number_id' => $this->sheet1->id
    ]);
});

it('updates a folder successfully', function () {
    $response = $this->actingAs($this->admin)->put('/api/folders/' . $this->subFolderSheet1->id, [
        'name' => 'Nueva Ventanilla',
        'department' => 'sección'
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('folders', [
        'id' => $this->subFolderSheet1->id,
        'name' => 'Nueva Ventanilla'
    ]);
});

it('uploads files and returns unique hash properties without failing', function () {

    $file = UploadedFile::fake()->create('documento.pdf', 100);

    $response = $this->actingAs($this->admin)->post("/api/folders/{$this->subFolderSheet1->id}/upload", [
        'files' => [$file]
    ]);

    $response->assertSessionHasNoErrors();

    $this->assertDatabaseHas('files', [
        'folder_id' => $this->subFolderSheet1->id,
        'extension' => 'pdf'
    ]);

    $explorerResponse = $this->actingAs($this->admin)->get("/explorer?folder_id={$this->subFolderSheet1->id}");

    $explorerResponse->assertInertia(fn (Assert $page) => $page
        ->component('Explorer')
        ->has('files', 1, fn (Assert $page) => $page
            ->has('hash')
            ->etc()
        )
    );
});

it('downloads a specific file', function () {
    $file = UploadedFile::fake()->create('test_download.pdf', 100);
    Storage::disk('public')->put("folders/{$this->subFolderSheet1->id}/test_download.pdf", $file->getContent());

    $dbFile = File::create([
        'name' => 'test_download.pdf',
        'path' => "folders/{$this->subFolderSheet1->id}/test_download.pdf",
        'extension' => 'pdf',
        'mime_type' => 'application/pdf',
        'size' => 100,
        'folder_id' => $this->subFolderSheet1->id,
        'active' => true,
        'file_code' => '001',
        'hash' => 'dummyhash123'
    ]);

    $response = $this->actingAs($this->admin)->get("/api/folders/file/download/{$dbFile->id}");
    $response->assertStatus(200);
    $response->assertDownload('test_download.pdf');
});

it('downloads multiple items as a mixed ZIP archive', function () {
    $response = $this->actingAs($this->admin)->post('/api/folders/download-mixed-zip', [
        'folders' => [$this->subFolderSheet1->id],
        'files' => []
    ]);

    $response->assertStatus(200);

    $this->assertTrue(str_contains($response->headers->get('Content-Disposition'), '.zip'));
});

it('logically deletes folders and files', function () {
    $response = $this->actingAs($this->admin)->post('/api/folders/delete-mixed', [
        'folders' => [$this->subFolderSheet1->id]
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('folders', [
        'id' => $this->subFolderSheet1->id,
        'active' => 0
    ]);
});

it('lists archived (trashed) items correctly', function () {

    $this->subFolderSheet1->update(['active' => false]);

    $response = $this->actingAs($this->admin)->get('/folders/archived?sheet_id=' . $this->sheet1->id);

    $response->assertStatus(200);
    $data = $response->json();
    $this->assertTrue($data['success']);

    $this->assertCount(1, $data['folders']);
    $this->assertEquals($this->subFolderSheet1->id, $data['folders'][0]['id']);
});

it('restores folders from trash', function () {
    $this->subFolderSheet1->update(['active' => false]);

    $response = $this->actingAs($this->admin)->post('/folders/restore-mixed', [
        'folders' => [$this->subFolderSheet1->id]
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('folders', [
        'id' => $this->subFolderSheet1->id,
        'active' => 1
    ]);
});

it('moves mixed items to another target folder', function () {
    $targetFolder = Folder::create([
        'name' => 'Target',
        'department' => 'sección',
        'sheet_number_id' => $this->sheet1->id,
        'active' => true
    ]);

    $response = $this->actingAs($this->admin)->post('/folders/move-mixed', [
        'folders' => [$this->subFolderSheet1->id],
        'target_folder_id' => $targetFolder->id
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('folders', [
        'id' => $this->subFolderSheet1->id,
        'parent_id' => $targetFolder->id
    ]);
});

