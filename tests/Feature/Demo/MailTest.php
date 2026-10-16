<?php

use App\Mail\PQRResponseMail;
use App\Models\Dependency;
use App\Models\PQR;
use App\Models\Sheet_number;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    $sheet = Sheet_number::create(['number' => '3001', 'active' => true, 'state' => 'Activa']);
    $dependency = Dependency::create(['name' => 'Ventanilla Unica', 'sheet_number_id' => $sheet->id]);

    $this->pqr = PQR::create([
        'sender_name' => 'Persona Ficticia',
        'email' => 'persona@demo.test',
        'description' => 'Solicitud de prueba',
        'affair' => 'Asunto de prueba',
        'request_type' => 'Peticion',
        'document_type' => 'CC',
        'response_status' => 'responded',
        'response_message' => 'Esta es la respuesta de prueba.',
        'dependency_id' => $dependency->id,
        'sheet_number_id' => $sheet->id,
    ]);
});

it('uses the configured identity in the response email', function () {
    config(['app.name' => 'Gedocs Demo', 'institution.name' => 'Entidad Ejemplo']);

    $html = (new PQRResponseMail($this->pqr, null, null))->render();

    expect($html)->toContain('Gedocs Demo')
        ->toContain('Entidad Ejemplo')
        ->toContain('Esta es la respuesta de prueba.');
});

it('sends demo email to the log driver, never to a real mail server', function () {
    expect(config('mail.default'))->not->toBe('smtp');
    Mail::fake();

    Mail::to($this->pqr->email)->send(new PQRResponseMail($this->pqr, null, null));

    Mail::assertSent(PQRResponseMail::class, fn ($mail) => $mail->hasTo('persona@demo.test'));
});
