<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <title>Documento</title>
    <style>
        @page { margin: 2cm; }

        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 11pt;
            line-height: 1.6;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
        }

        .logo-wrapper {
            margin-bottom: 22px;
            text-align: left;
        }

        .document-logo {
            height: 56px;
            width: auto;
            max-width: 220px;
            display: block;
            object-fit: contain;
        }

        .centered { text-align: center; }
        .bold { font-weight: bold; }
        .section { margin-bottom: 18px; }
        .line { display: block; }
        .large-text { text-align: justify; margin-top: 10px; white-space: pre-line; }

        .signature-container {
            margin-top: 50px;
            width: 100%;
        }

        .signature-line {
            width: 250px;
            border-top: 1px solid #000;
            padding-top: 6px;
        }

        .signature-stamp {
            height: 48px;
            width: auto;
            max-width: 220px;
            display: block;
            object-fit: contain;
            margin-bottom: 6px;
        }

        .signature-blank {
            height: 48px;
            margin-bottom: 6px;
        }

        .footer {
            text-align: center;
            font-size: 10pt;
            color: #555;
            margin-top: 40px;
        }

        .small-note {
            font-size: 10pt;
            margin-top: 4px;
        }

        ol {
            margin-top: 8px;
            padding-left: 22px;
        }

        ul {
            margin-top: 8px;
            padding-left: 18px;
        }

        li { margin-bottom: 6px; }
        
        /* QR CODE */
        .qr-wrapper {
            position: absolute;
            top: 10px;
            right: 0px;
            width: 170px;
            background-color: white;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            text-align: center;
        }

        .qr-code {
            width: 70px;
            height: 70px;
            display: block;
            margin: 0 auto;
        }
    </style>
</head>
<body>
@php
    $documentType = $data['document_type'] ?? 'carta';

    $decodeList = function ($key) use ($data) {
        $raw = $data[$key] ?? '[]';
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return [];
        }

        return array_values(array_filter(array_map(function ($item) {
            return trim((string) $item);
        }, $decoded), function ($item) {
            return $item !== '';
        }));
    };

    $actaAsistentes = $decodeList('acta_asistentes_json');
    $actaInvitados = $decodeList('acta_invitados_json');
    $actaAusentes = $decodeList('acta_ausentes_json');
    $actaOrdenDia = $decodeList('acta_orden_dia_json');
    $actaDesarrollo = $decodeList('acta_desarrollo_json');

    $informeElaboradoPor = $decodeList('informe_elaborado_por_json');
    $informeObjetivos = $decodeList('informe_objetivos_json');
    $informeConclusiones = $decodeList('informe_conclusiones_json');
    $informeRecomendaciones = $decodeList('informe_recomendaciones_json');
@endphp

@php
    $footerText = $data['footer_text'] ?? \App\Support\InstitutionIdentity::defaultFooter();
@endphp

@if(empty($data['is_env']))
<div class="qr-wrapper">
    @if(!empty($qrCodeDataUri))
        <img src="{{ $qrCodeDataUri }}" alt="QR Code" class="qr-code">
    @endif
    <div style="font-size: 7.5pt; margin-top: 5px; text-align: left; line-height: 1.2;">
        <div><b>Radicado No.:</b> {{ \App\Support\InstitutionIdentity::formatFiling($data['no_radicado'] ?? 'N/A') }}</div>
        @if(!empty($data['atendido']))
            <div><b>Atendido:</b> {{ $data['atendido'] }}</div>
        @endif
        @if(!empty($data['hora']))
            <div><b>Hora:</b> {{ $data['hora'] }}</div>
        @endif
        @if(!empty($data['archivado_en']))
            <div style="font-size: 6.5pt;"><b>Ubicación:</b> {{ $data['archivado_en'] }}</div>
        @endif
    </div>
</div>
@endif

@if(!empty($logoDataUri))
    <div class="logo-wrapper">
        <img src="{{ $logoDataUri }}" alt="Logo institucional" class="document-logo">
    </div>
@endif

@if(!empty($data['is_env']))
    <div style="margin-bottom: 15px; font-size: 11pt;">
        <b>Radicado No:</b> {{ \App\Support\InstitutionIdentity::formatFiling($data['no_radicado'] ?? '') }}
    </div>
@endif

@if($documentType === 'carta')
    <div class="section">
        <div class="line">{{ $data['lugar'] ?? '' }} {{ !empty($data['fecha']) ? ' - ' . $data['fecha'] : '' }}</div>
    </div>

    <div class="section">
        <div class="line">{{ $data['tratamiento'] ?? '' }}</div>
        <div class="line bold">{{ $data['nombres'] ?? '' }}</div>
        <div class="line">{{ $data['cargo'] ?? '' }}</div>
        <div class="line">{{ $data['empresa'] ?? '' }}</div>
        <div class="line">{{ $data['direccion'] ?? '' }}</div>
        <div class="line">{{ $data['ciudad'] ?? '' }}</div>
    </div>

    <div class="section"><div class="line"><span class="bold">Asunto:</span> {{ $data['asunto'] ?? '' }}</div></div>

    <div class="section">
        <div class="line">{{ $data['saludo'] ?? '' }}</div>
        <div class="large-text"><span class="bold">Respuesta:</span><br>{!! nl2br(e($data['texto'] ?? '')) !!}</div>
    </div>

    <div class="section"><div class="line">{{ $data['despedida1'] ?? '' }}</div></div>

    <div class="signature-container">
        @if(!empty($signatureDataUri))
            <img src="{{ $signatureDataUri }}" alt="Firma" class="signature-stamp">
        @else
            <div class="signature-blank"></div>
        @endif
        <div class="signature-line">
            <div class="line bold">{{ $data['firma_nombres'] ?? '' }}</div>
            <div class="line">{{ $data['firma_cargo'] ?? '' }}</div>
        </div>
    </div>

    <div class="section small-note">
        <div class="line">{{ $data['anexo'] ?? '' }}</div>
        <div class="line">{{ $data['copia'] ?? '' }}</div>
        <div class="line">{{ $data['redactor'] ?? '' }}</div>
        <div class="line">{{ $data['transcriptor'] ?? '' }}</div>
    </div>
@endif

@if($documentType === 'circular')
    <div class="section centered bold" style="font-size: 13pt;">
        {{ $data['titulo'] ?? '' }}
    </div>

    <div class="section">
        <div class="line">{{ $data['codigo'] ?? '' }}</div>
        <div class="line">{{ $data['lugar'] ?? '' }} {{ !empty($data['fecha']) ? ' - ' . $data['fecha'] : '' }}</div>
    </div>

    <div class="section"><div class="line">{{ $data['grupo_destinatario'] ?? '' }}</div></div>
    <div class="section"><div class="line">{{ $data['asunto'] ?? '' }}</div></div>
    <div class="section"><div class="line">{{ $data['saludo'] ?? '' }}</div></div>

    <div class="section"><div class="large-text">{!! nl2br(e($data['texto'] ?? '')) !!}</div></div>
    <div class="section"><div class="line">{{ $data['despedida1'] ?? '' }}</div></div>

    <div class="signature-container">
        @if(!empty($signatureDataUri))
            <img src="{{ $signatureDataUri }}" alt="Firma" class="signature-stamp">
        @else
            <div class="signature-blank"></div>
        @endif
        <div class="signature-line">
            <div class="line bold">{{ $data['firma_nombres'] ?? '' }}</div>
            <div class="line">{{ $data['firma_cargo'] ?? '' }}</div>
        </div>
    </div>

    <div class="section small-note">
        <div class="line">{{ $data['anexo'] ?? '' }}</div>
        <div class="line">{{ $data['copia'] ?? '' }}</div>
        <div class="line">{{ $data['redactor'] ?? '' }}</div>
        <div class="line">{{ $data['transcriptor'] ?? '' }}</div>
    </div>
@endif

@if($documentType === 'acta')
    <div class="section centered bold" style="font-size: 13pt;">
        {{ $data['titulo'] ?? '' }}
    </div>

    <div class="section">
        <div class="line">{{ $data['fecha'] ?? '' }}</div>
        <div class="line">{{ $data['hora'] ?? '' }}</div>
        <div class="line">{{ $data['lugar'] ?? '' }}</div>
    </div>

    <div class="section">
        @if(!empty($actaAsistentes))
            <div class="bold">Asistentes</div>
            <ul>
                @foreach($actaAsistentes as $item)
                    <li>{{ $item }}</li>
                @endforeach
            </ul>
        @endif

        @if(!empty($actaInvitados))
            <div class="bold">Invitados</div>
            <ul>
                @foreach($actaInvitados as $item)
                    <li>{{ $item }}</li>
                @endforeach
            </ul>
        @endif

        @if(!empty($actaAusentes))
            <div class="bold">Ausentes</div>
            <ul>
                @foreach($actaAusentes as $item)
                    <li>{{ $item }}</li>
                @endforeach
            </ul>
        @endif
    </div>

    @if(!empty($actaOrdenDia))
        <div class="section">
            <div class="bold">Orden del dia</div>
            <ol>
                @foreach($actaOrdenDia as $item)
                    <li>{{ $item }}</li>
                @endforeach
            </ol>
        </div>

        <div class="section">
            <div class="bold">Desarrollo</div>
            @foreach($actaOrdenDia as $index => $item)
                <div style="margin-top: 8px;">
                    <div class="bold">{{ $item }}</div>
                    <div>{!! nl2br(e($actaDesarrollo[$index] ?? '')) !!}</div>
                </div>
            @endforeach
        </div>
    @endif

    <div class="section"><div class="large-text">{!! nl2br(e($data['acta_cuerpo_informe'] ?? '')) !!}</div></div>
    <div class="section"><div class="line">{{ $data['convocatoria'] ?? '' }}</div></div>

    <div class="signature-container">
        @if(!empty($signatureDataUri))
            <img src="{{ $signatureDataUri }}" alt="Firma" class="signature-stamp">
        @else
            <div class="signature-blank"></div>
        @endif
        <div class="signature-line">
            <div class="line bold">{{ $data['firma_nombres'] ?? '' }}</div>
            <div class="line">{{ $data['firma_cargo'] ?? '' }}</div>
        </div>
    </div>

    <div class="section small-note">
        <div class="line">{{ $data['anexo'] ?? '' }}</div>
        <div class="line">{{ $data['transcriptor'] ?? '' }}</div>
    </div>
@endif

@if($documentType === 'informe')
    <div class="section"><div class="line">{{ $data['codigo'] ?? '' }}</div></div>

    <div class="section centered bold" style="font-size: 13pt;">
        {{ $data['titulo'] ?? '' }}
    </div>

    <div class="section"><div class="line">{{ $data['fecha'] ?? '' }}</div></div>

    @if(!empty($informeElaboradoPor))
        <div class="section">
            <div class="bold">Elaborado por</div>
            <ul>
                @foreach($informeElaboradoPor as $item)
                    <li>{{ $item }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    @if(!empty($informeObjetivos))
        <div class="section">
            <div class="bold">Objetivos</div>
            <ol>
                @foreach($informeObjetivos as $item)
                    <li>{{ $item }}</li>
                @endforeach
            </ol>
        </div>
    @endif

    <div class="section">
        <div class="bold">{{ $data['informe_titulo_actividad'] ?? '' }}</div>
        <div class="large-text">{!! nl2br(e($data['informe_cuerpo'] ?? '')) !!}</div>
    </div>

    @if(!empty($informeConclusiones))
        <div class="section">
            <div class="bold">Conclusiones</div>
            <ol>
                @foreach($informeConclusiones as $item)
                    <li>{!! nl2br(e($item)) !!}</li>
                @endforeach
            </ol>
        </div>
    @endif

    @if(!empty($informeRecomendaciones))
        <div class="section">
            <div class="bold">Recomendaciones</div>
            <ol>
                @foreach($informeRecomendaciones as $item)
                    <li>{!! nl2br(e($item)) !!}</li>
                @endforeach
            </ol>
        </div>
    @endif

    <div class="signature-container">
        @if(!empty($signatureDataUri))
            <img src="{{ $signatureDataUri }}" alt="Firma" class="signature-stamp">
        @else
            <div class="signature-blank"></div>
        @endif
        <div class="signature-line">
            <div class="line bold">{{ $data['firma_nombres'] ?? '' }}</div>
            <div class="line">{{ $data['firma_cargo'] ?? '' }}</div>
        </div>
    </div>

    <div class="section small-note">
        <div class="line">{{ $data['anexo'] ?? '' }}</div>
        <div class="line">{{ $data['transcriptor'] ?? '' }}</div>
    </div>
@endif

@if($documentType === 'constancia')
    <div class="section"><div class="line">{{ $data['codigo'] ?? '' }}</div></div>

    <div class="section centered bold" style="font-size: 13pt;">
        {{ $data['constancia_cargo_quien_consta'] ?? '' }}
    </div>

    <div class="section centered bold" style="font-size: 14pt; margin-top: 20px; margin-bottom: 20px;">
        HACE CONSTAR
    </div>

    <div class="section"><div class="large-text">{!! nl2br(e($data['constancia_cuerpo'] ?? '')) !!}</div></div>

    <div class="signature-container">
        @if(!empty($signatureDataUri))
            <img src="{{ $signatureDataUri }}" alt="Firma" class="signature-stamp">
        @else
            <div class="signature-blank"></div>
        @endif
        <div class="signature-line">
            <div class="line bold">{{ $data['firma_nombres'] ?? '' }}</div>
        </div>
    </div>

    <div class="section small-note">
        <div class="line">{{ $data['anexo'] ?? '' }}</div>
        <div class="line">{{ $data['transcriptor'] ?? '' }}</div>
    </div>
@endif

<div class="footer">
    {!! nl2br(e($footerText)) !!}
</div>

</body>
</html>
