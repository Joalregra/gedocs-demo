<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Folder extends Model
{
    use hasFactory;

    /** Name of the section folder that receives incoming PQRs (one per entity and year). */
    public const VENTANILLA_NAME = 'Ventanilla Única';

    protected $fillable = [
        'name',
        'parent_id',
        'active',
        'folder_code',
        'department',
        'sheet_number_id',
        'year',
    ];

    public function parent()
    {
        return $this->belongsTo(Folder::class, 'parent_id');
    }
    public function children()
    {
        return $this->hasMany(Folder::class, 'parent_id');
    }
    public function files()
    {
        return $this->hasMany(File::class);
    }

    public function sheetNumber()
    {
        return $this->belongsTo(Sheet_number::class);
    }

    public function folder()
    {
        return $this->belongsTo(Folder::class);
    }

    public function getFullHierarchyCode()
    {
        $segments = [];
        $current = $this;

        while ($current) {
            $segments[] = [
                'code' => $current->folder_code ?? '000',
                'dept' => strtolower($current->department ?? '')
            ];
            $current = $current->parent;
        }

        $segments = array_reverse($segments);
        $fullCode = "";

        // The user wants to omit the sheet number and any level corresponding to the Year (dept 'año')
        $first = true;
        foreach ($segments as $segment) {
            if ($segment['dept'] === 'año') {
                continue;
            }

            if ($first) {
                $fullCode .= $segment['code'];
                $first = false;
            } else {
                // Use "." for serie/subserie, "-" for others
                $sep = in_array($segment['dept'], ['serie', 'subserie']) ? '.' : '-';
                $fullCode .= $sep . $segment['code'];
            }
        }

        return $fullCode;
    }
}
