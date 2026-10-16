<?php

namespace Tests\Feature\Shared;

use App\Models\User;
use App\Models\Sheet_number;
use App\Models\Folder;
use App\Models\File;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    Storage::fake('public');

    $this->admin = User::factory()->create([
        'document_number' => '123456789'
    ]);
    $this->admin->assignRole('Admin');

    $this->sheet = Sheet_number::create(['number' => '999999', 'program_id' => 1]);
});

it('automatically creates and returns the current year folder for the electronic index when accessing root of a valid sheet', function () {
    $currentYear = date('Y');

    $response = $this->actingAs($this->admin)
        ->get('/explorer?sheet_id=' . $this->sheet->id);

    $response->assertStatus(200);

    $this->assertDatabaseHas('folders', [
        'sheet_number_id' => $this->sheet->id,
        'year' => $currentYear,
        'department' => 'Año',
        'active' => true,
    ]);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Explorer')
        ->has('folders', 1, fn (Assert $page) => $page
            ->where('year', (int)$currentYear)
            ->etc()
        )
    );
});

it('returns files associated with a specific year folder in the electronic index', function () {
    $currentYear = date('Y');

    $yearFolder = Folder::create([
        'name' => (string)$currentYear,
        'department' => 'Año',
        'sheet_number_id' => $this->sheet->id,
        'year' => $currentYear,
        'active' => true
    ]);

    $file = File::create([
        'name' => 'Documento-Electronico.pdf',
        'path' => "folders/{$yearFolder->id}/doc.pdf",
        'extension' => 'pdf',
        'mime_type' => 'application/pdf',
        'size' => 1024,
        'folder_id' => $yearFolder->id,
        'active' => true,
        'hash' => 'dummyhash123'
    ]);

    $response = $this->actingAs($this->admin)
        ->get("/explorer?sheet_id={$this->sheet->id}&folder_id={$yearFolder->id}");

    $response->assertStatus(200);

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Explorer')
        ->has('files', 1, fn (Assert $page) => $page
            ->where('id', $file->id)
            ->where('name', 'Documento-Electronico.pdf')
            ->where('hash', 'dummyhash123')
            ->etc()
        )
    );
});
