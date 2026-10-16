<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class AttachedSupport extends Model
{
    use HasFactory;

    protected $table = 'attached_supports';

    protected $fillable = [
        'name',
        'path',
        'type',
        'origin',
        'size',
        'pqr_id',
        'comunication_id',
        'hash',
        'no_radicado',
    ];

    public function pqr()
    {
        return $this->belongsTo(PQR::class, 'pqr_id');
    }

    protected $appends = ['url'];

    public function getUrlAttribute()
    {
        return Storage::url($this->path);
    }

    public function comunication(){
        return $this->belongsTo(comunication::class, 'comunication_id');
    }

}
