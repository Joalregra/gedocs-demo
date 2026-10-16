<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */

    // protected $with = ['roles', 'sheetNumbers'];

    protected $fillable = [
        'type_document',
        'document_number',
        'name',
        'email',
        'password',
        'status',
        'profile_photo',
        'pdf_logo_path',
        'dependency_id',
        'pdf_footer_text',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function sheetNumbers()
    {
        return $this->belongsToMany(Sheet_number::class, 'sheet_number_user', 'user_id', 'sheet_number_id');
    }

    //Relacion con table pqrs
    public function createdPqrs(){
        return $this->hasMany(PQR::class, 'user_id');
    }

    public function assignedPqrs(){
        return $this->hasMany(PQR::class, 'responsible_id');
    }

    //Relacion con la dependencia
    public function dependency(){
        return $this->belongsTo(Dependency::class);
    }
}
