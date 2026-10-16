<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Dependency extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'sheet_number_id'
    ];


    //Relaciones
    public function pqrs()
    {
        return $this->hasMany(PQR::class);
    }

    public function sheetNumber()
    {
        return $this->belongsTo(Sheet_number::class);
    }
}
