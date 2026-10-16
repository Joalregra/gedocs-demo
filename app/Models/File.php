<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class File extends Model
{

    use HasFactory;

    protected $fillable = [
        'name',
        'path',
        'extension',
        'mime_type',
        'size',
        'active',
        'folder_id',
        'file_code',
        'hash'
    ];

     public function folder()
    {
        return $this->belongsTo(Folder::class);
    }
}
