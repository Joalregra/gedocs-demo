<?php

use App\Models\User;
use App\Models\Dependency;
use App\Models\Sheet_number;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use function Pest\Laravel\actingAs;

beforeEach(function () {

    Storage::fake('public');

    $this->sheet = Sheet_number::create([
        'number' => '1234567',
        'start_date' => now()->subMonths(6),
        'end_date' => now()->addMonths(6),
        'state' => 'Activa',
        'ventanilla_unica_id' => 1
    ]);

    $this->dependency = Dependency::create([
        'name' => 'Ventanilla Única Base',
        'sheet_number_id' => $this->sheet->id
    ]);

    $this->sheet->update(['ventanilla_unica_id' => $this->dependency->id]);
});

test('it validates required fields for PQR creation', function () {
    $response = $this->postJson('/api/pqrs', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors([
        'sender_name',
        'description',
        'affair',
        'request_type',
        'number',
        'document_type'
    ]);
});

test('it rejects non-active sheets in backend validation', function () {
    // Backend validates that only sheets allowed by ->active() scope can be used.
    // Currently, sheets with state Cancelada or Finalizada are excluded.

    $inactiveSheet = Sheet_number::create([
        'number' => '9999999',
        'start_date' => now()->subMonths(12),
        'end_date' => now()->subMonths(6),
        'state' => 'Finalizada',
        'ventanilla_unica_id' => $this->dependency->id
    ]);

    $payload = [
        'sender_name' => 'John Doe',
        'description' => 'Test description',
        'affair' => 'Test Affair',
        'request_type' => 'Peticion',
        'number' => $inactiveSheet->number,
        'document_type' => 'CC',
        'document' => '123456789',
        'email' => 'test@example.com'
    ];

    $response = $this->postJson('/api/pqrs', $payload);

    $response->assertStatus(404)
        ->assertJsonPath('error', 'Entidad técnica no encontrada o no se encuentra activa');
});

test('it limits attachment files to specific types and size', function () {

    $exeFile = UploadedFile::fake()->create('virus.exe', 1024, 'application/x-msdownload');

    $responseExe = $this->postJson('/api/pqrs', [
        'sender_name' => 'John Doe',
        'description' => 'Test description',
        'affair' => 'Test Affair',
        'request_type' => 'Peticion',
        'number' => $this->sheet->number,
        'document_type' => 'CC',
        'attachments' => [$exeFile]
    ]);

    $responseExe->assertStatus(422)
        ->assertJsonValidationErrors(['attachments.0']);

    $largeDoc = UploadedFile::fake()->create('document_big.pdf', 6000, 'application/pdf');

    $responseSize = $this->postJson('/api/pqrs', [
        'sender_name' => 'John Doe',
        'description' => 'Test description',
        'affair' => 'Test Affair',
        'request_type' => 'Peticion',
        'number' => $this->sheet->number,
        'document_type' => 'CC',
        'attachments' => [$largeDoc]
    ]);

    $responseSize->assertStatus(422)
        ->assertJsonValidationErrors(['attachments.0']);
});

test('it successfully creates a PQR with valid data and supported files', function () {
    $pdfFile = UploadedFile::fake()->create('document.pdf', 1024, 'application/pdf');

    $payload = [
        'sender_name' => 'Maria Gonzalez',
        'description' => 'Tengo un reclamo importante sbre los recursos.',
        'affair' => 'Reclamo Recursos',
        'request_type' => 'Reclamo',
        'number' => $this->sheet->number,
        'document_type' => 'CC',
        'document' => '987654321',
        'email' => 'maria@example.com',
        'attachments' => [$pdfFile]
    ];

    $response = $this->postJson('/api/pqrs', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('message', 'PQR creada exitosamente')
        ->assertJsonPath('data.sender_name', 'Maria Gonzalez');

    $this->assertDatabaseHas('p_q_r_s', [
        'sender_name' => 'Maria Gonzalez',
        'affair' => 'Reclamo Recursos',
    ]);
});
