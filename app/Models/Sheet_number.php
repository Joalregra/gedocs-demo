<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sheet_number extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        "number",
        'ventanilla_unica_id',
        "number",
        "active",
        "state"
    ];

    public function scopeActive($query)
    {
        return $query->whereNotIn('state', ['Cancelada', 'Finalizada']);
    }

    public function users()
    {
        return $this->belongsToMany(User::class, "sheet_number_user", "sheet_number_id", "user_id");
    }

    public function dependencies()
    {
        return $this->hasMany(Dependency::class);
    }

    public function folders()
    {
        return $this->hasMany(Folder::class);
    }
}
