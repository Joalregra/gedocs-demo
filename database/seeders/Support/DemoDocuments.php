<?php

namespace Database\Seeders\Support;

use App\Support\InstitutionIdentity;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Builds sample PDFs for the demo with the same Blade template the app uses for real documents.
 * Every document states that it is a sample with fictional data.
 */
class DemoDocuments
{
    private const NOTICE = 'Documento de ejemplo con datos ficticios.';

    /** @param array<string, mixed> $data */
    public static function render(array $data): string
    {
        $logo = InstitutionIdentity::logoFile();
        $logoDataUri = is_file($logo) ? 'data:image/png;base64,'.base64_encode(file_get_contents($logo)) : null;

        $data += ['footer_text' => InstitutionIdentity::defaultFooter()];

        return Pdf::loadView('pdf.template', [
            'data' => $data,
            'logoDataUri' => $logoDataUri,
            'signatureDataUri' => null,
            'qrCodeDataUri' => null,
        ])->setPaper('letter', 'portrait')->output();
    }

    public static function acta(string $title, string $date, string $code, string $filingNumber, string $place, array $attendees): array
    {
        return [
            'document_type' => 'acta',
            'titulo' => $title,
            'codigo' => $code,
            'fecha' => $date,
            'hora' => '09:00',
            'lugar' => $place,
            'no_radicado' => $filingNumber,
            'is_env' => true,
            'convocatoria' => 'Convocatoria ordinaria enviada con tres días hábiles de anticipación.',
            'acta_asistentes_json' => json_encode($attendees),
            'acta_invitados_json' => json_encode(['Invitado ficticio de la Sede Central']),
            'acta_ausentes_json' => json_encode([]),
            'acta_orden_dia_json' => json_encode(['Verificación del quórum', 'Lectura del acta anterior', 'Temas del día', 'Proposiciones y varios']),
            'acta_desarrollo_json' => json_encode([
                'Se verifica el quórum y se declara abierta la sesión.',
                'Se aprueba el acta de la sesión anterior sin modificaciones.',
                'Se presentan los avances del periodo y se registran los compromisos. '.self::NOTICE,
                'No se presentaron proposiciones. Se cierra la sesión.',
            ]),
            'acta_cuerpo_informe' => self::NOTICE,
            'firma_nombres' => $attendees[0] ?? 'Responsable ficticio',
            'firma_cargo' => 'Presidente de la sesión',
            'redactor' => 'Redactó: equipo de gestión documental (ficticio)',
        ];
    }

    public static function circular(string $title, string $date, string $code, string $filingNumber, string $place, string $signer): array
    {
        return [
            'document_type' => 'circular',
            'titulo' => $title,
            'codigo' => $code,
            'fecha' => $date,
            'lugar' => $place,
            'no_radicado' => $filingNumber,
            'is_env' => true,
            'grupo_destinatario' => 'Para: todas las dependencias de la entidad',
            'asunto' => 'Asunto: '.$title,
            'saludo' => 'Cordial saludo,',
            'texto' => "Se informa a las dependencias que, a partir de la fecha, se aplica el procedimiento actualizado de gestión documental.\n\n".self::NOTICE,
            'despedida1' => 'Atentamente,',
            'firma_nombres' => $signer,
            'firma_cargo' => 'Dirección administrativa',
        ];
    }

    public static function informe(string $title, string $date, string $code, string $filingNumber, string $place, string $author): array
    {
        return [
            'document_type' => 'informe',
            'titulo' => $title,
            'codigo' => $code,
            'fecha' => $date,
            'lugar' => $place,
            'no_radicado' => $filingNumber,
            'is_env' => true,
            'informe_titulo_actividad' => $title,
            'informe_elaborado_por_json' => json_encode([$author]),
            'informe_objetivos_json' => json_encode(['Consolidar el estado del archivo del periodo', 'Identificar documentos pendientes de transferencia']),
            'informe_cuerpo' => "Durante el periodo se recibieron y clasificaron los documentos de la entidad según la tabla de retención documental.\n\n".self::NOTICE,
            'informe_conclusiones_json' => json_encode(['El archivo se encuentra organizado y al día.']),
            'informe_recomendaciones_json' => json_encode(['Continuar con la digitalización de los expedientes activos.']),
            'firma_nombres' => $author,
            'firma_cargo' => 'Gestión documental',
        ];
    }

    public static function constancia(string $date, string $code, string $filingNumber, string $place, string $person, string $signer): array
    {
        return [
            'document_type' => 'constancia',
            'codigo' => $code,
            'fecha' => $date,
            'lugar' => $place,
            'no_radicado' => $filingNumber,
            'is_env' => true,
            'constancia_cargo_quien_consta' => 'El área de gestión documental',
            'constancia_cuerpo' => "Que {$person} presentó sus documentos y quedaron radicados y archivados conforme a la tabla de retención documental.\n\n".self::NOTICE,
            'firma_nombres' => $signer,
            'firma_cargo' => 'Gestión documental',
        ];
    }

    public static function carta(string $to, string $subject, string $body, string $date, string $code, string $filingNumber, string $place, string $signer, bool $isReceipt = false): array
    {
        return [
            'document_type' => 'carta',
            'codigo' => $code,
            'lugar' => $place,
            'fecha' => $date,
            'tratamiento' => 'Ciudadano(a)',
            'nombres' => $to,
            'cargo' => 'Solicitante',
            'empresa' => 'N/A',
            'direccion' => 'No proporcionado',
            'ciudad' => $place,
            'asunto' => $subject,
            'saludo' => 'Cordial saludo,',
            'texto' => $body."\n\n".self::NOTICE,
            'despedida1' => 'Atentamente,',
            'firma_nombres' => $signer,
            'firma_cargo' => 'Gestión documental',
            'no_radicado' => $filingNumber,
            'is_env' => ! $isReceipt,
            'atendido' => $isReceipt ? 'Sistema Automático' : null,
        ];
    }
}
