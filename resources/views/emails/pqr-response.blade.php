<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Respuesta PQR</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #23395B; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background: #f7fafc; }
        .response-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #23395B; }
        .btn { display: inline-block; padding: 12px 30px; background: #23395B; color: white; text-decoration: none; border-radius: 5px; }
        .btn:hover { background: #1a2c48; }
        .footer { text-align: center; padding: 20px; color: #718096; font-size: 12px; }
        .alert { background: #fef5e7; border-left: 4px solid #f39c12; padding: 15px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{ config("app.name") }}</h1>
    </div>

    <div class="content">
        <h2>Hola, {{ $pqr->creator?->name ?? '' }}</h2>

        <p>Tenemos una actualización sobre tu PQR:</p>

        <div class="response-box">
            <p><strong>Asunto:</strong> {{ $pqr->affair }}</p>
            <p><strong>Tipo:</strong> {{ $pqr->request_type }}</p>
            <p><strong>Fecha de solicitud:</strong> {{ $pqr->created_at->format('d/m/Y H:i') }}</p>
        </div>

        <div class="response-box">
            <h3>Respuesta Oficial:</h3>
            <p>{{ $pqr->response_message ?? ($comunication ? $comunication->message : 'No hay mensaje de respuesta disponible') }}</p>

            @if($pqr->response_time)
                <p><strong>Fecha de respuesta:</strong> {{ \Carbon\Carbon::parse($pqr->response_time)->format('d/m/Y H:i') }}</p>
            @endif

            {{-- Sección de Adjuntos de Respuesta --}}
            @php
                $responseAttachments = $pqr->attachedSupports->whereIn('origin', ['ENV', 'response']);
            @endphp

            @if($responseAttachments->count() > 0)
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #eee;">
                    <p><strong>Documentos adjuntos:</strong></p>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        @foreach($responseAttachments as $file)
                            <li style="font-size: 13px; color: #23395B; margin-bottom: 5px;">
                                Adjunto: {{ $file->name }}
                            </li>
                        @endforeach
                    </ul>
                </div>
            @endif
        </div>
    </div>

    <div class="footer">
        <p>Este es un correo automático, por favor no responder.</p>
        <p>&copy; {{ date("Y") }} {{ config("institution.name") }}</p>
    </div>
</body>
</html>
