<?php

namespace App\Services;

use App\Models\Folder;

class FolderStructureService
{
    /**
     * Crea la estructura inicial de carpetas para una entidad (sheetId)
     * Opcionalmente dentro de un año específico o un padre pre-existente.
     */
    public static function createDefaultStructure(int $sheetId, ?int $year = null, ?int $parentId = null): void
    {
        $map = [];
        $rootParentId = $parentId;

        // Si se especifica un año y no tenemos un padre, creamos la carpeta del año primero
        if ($year && !$rootParentId) {
            $yearFolder = Folder::create([
                'name' => (string)$year,
                'year' => $year,
                'department' => 'Año',
                'sheet_number_id' => $sheetId,
                'active' => true,
                'parent_id' => null
            ]);
            $rootParentId = $yearFolder->id;
        }

        $folders = [
            [1, 'Gerencia General', null, 100, 'sección'],
            [2, 'Oficina de Control Interno', null, 101, 'sección'],
            [3, 'Oficina Jurídica', null, 102, 'sección'],
            [4, 'Dirección administrativa y Financiera', 1, 110, 'Subsección'],
            [5, 'Dirección Técnica', 1, 120, 'Subsección'],
            [6, 'ACTAS', 4, 2, 'Serie'],
            [7, 'CIRCULARES', 4, 4, 'Serie'],
            [8, 'CONSECUTIVOS DE COMUNICACIONES OFICIALES', 4, 9, 'Serie'],
            [9, 'INFORMES', 4, 16, 'Serie'],
            [10, 'INSTRUMENTOS ARCHIVÍSTICOS', 4, 17, 'Serie'],
            [11, 'NOMINA', 4, 24, 'Serie'],
            [12, 'ACTAS', 5, 2, 'Serie'],
            [13, 'DERECHOS DE PETICIÓN', 5, 12, 'Serie'],
            [14, 'PROYECTOS', 5, 29, 'Serie'],
            [15, 'REPORTES DE VISITAS DE CAMPO', 5, 31, 'Serie'],
            [16, 'Actas de comité Técnico a la Contratación', 12, 8, 'Subserie'],
            [17, 'Proyectos de Inversión', 14, 1, 'Subserie'],
            [18, 'Actas de Comité Institucional de Gestión y Desempeño', 6, 6, 'Subserie'],
            [19, 'Actas de Eliminacón Documental', 6, 9, 'Subserie'],
            [20, 'Circulares Informativas', 7, 2, 'Subserie'],
            [21, 'Consecutivos de Comunicaciones Oficiales Enviadas', 8, 1, 'Subserie'],
            [22, 'Consecutivos de Comunicaciones Oficiales Recibidas', 8, 2, 'Subserie'],
            [23, 'Informes de Ejecución Presupuestal', 9, 3, 'Subserie'],
            [24, 'Informes Trimestrales de Seguimiento al Modelo Integrado de Planeación y COntrol MIPG', 9, 5, 'Subserie'],
            [25, 'Bancos Terminológicos de Series Y Subseries Documentales', 10, 1, 'Subserie'],
            [26, 'Cuadros de Clasificación Documental', 10, 2, 'Subserie'],
            [27, 'Inventarios Documentales de Archivo Cental', 10, 3, 'Subserie'],
            [28, 'Planes Institucionales de Archivos - PINAR', 10, 4, 'Subserie'],
            [29, 'Programas de Gestión Documental PGD', 10, 5, 'Subserie'],
            [30, 'Tablas de Control de Acceso', 10, 6, 'Subserie'],
            [31, 'Tabla de Retención Documental TRD', 10, 7, 'Subserie'],
            [32, 'Tablas de Valoración Documental TVD', 10, 8, 'Subserie'],
            [33, 'ACCIONES CONSTITUCIONALES', 3, 1, 'Serie'],
            [34, 'ACTAS', 3, 2, 'Serie'],
            [35, 'CONCEPTOS', 3, 7, 'Serie'],
            [36, 'DERECHOS DE PETICIÓN', 3, 12, 'Serie'],
            [37, 'Acciones de Cumplimiento', 33, 1, 'SubSerie'],
            [38, 'Acciones de Tutela', 33, 2, 'SubSerie'],
            [39, 'Actas de Comité de Conciliación y Defensa Jurídica', 34, 2, 'SubSerie'],
            [40, 'Conceptos Juríridicos', 35, 1, 'SubSerie'],
            [41, 'ACTAS', 2, 2, 'Serie'],
            [42, 'INFORMES', 2, 16, 'Serie'],
            [43, 'PLANES', 2, 25, 'Serie'],
            [44, 'Actas de Comité de Coordicación del Sistema de Control Interno', 41, 4, 'Subserie'],
            [45, 'Informes a Entes de Control', 42, 1, 'Subserie'],
            [46, 'Informes de Audiroría del Sistema de Gestión de Calidad', 42, 2, 'Subserie'],
            [47, 'Planes de Auditoría', 43, 4, 'Subserie'],
            [48, 'Planes de Mejoramiento Institucional', 43, 6, 'Subserie'],
            [49, 'ACTAS', 1, 2, 'Serie'],
            [50, 'ACTOS ADMINISTRATIVOS', 1, 3, 'Serie'],
            [51, 'CICULARES', 1, 4, 'Serie'],
            [52, 'CONTRATOS', 1, 10, 'Serie'],
            [53, 'CONVENIOS', 1, 11, 'Serie'],
            [54, 'DERECHOS DE PETICIÓN', 1, 12, 'Serie'],
            [55, 'INFORMES', 1, 16, 'Serie'],
            [56, 'Actas de Cómite de Gerencia', 49, 5, 'Subserie'],
            [57, 'Actas Junta Directiva', 49, 10, 'Subserie'],
            [58, 'Acuerdos de Junta Directiva', 50, 1, 'Subserie'],
            [59, 'Resoluciones', 50, 2, 'Subserie'],
            [60, 'Circulares Dispositivas', 51, 1, 'Subserie'],
            [61, 'Contratos de Servicios Públicos', 52, 1, 'Subserie'],
            [62, 'Convenios Interinstitucionales', 53, 1, 'Subserie'],
            [63, 'Informes a Entes de Control', 55, 1, 'Subserie'],
        ];

        foreach ($folders as [$tempKey, $name, $parentTempKey, $folderCode, $department]) {
            $parentId = $parentTempKey ? ($map[$parentTempKey] ?? $rootParentId) : $rootParentId;
            
            $folder = Folder::create([
                'name' => $name,
                'parent_id' => $parentId,
                'folder_code' => $folderCode,
                'department' => $department,
                'sheet_number_id' => $sheetId,
                'active' => true,
            ]);
            $map[$tempKey] = $folder->id;
        }
    }
}
