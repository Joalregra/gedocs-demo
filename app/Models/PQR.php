<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\DocumentType;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PQR extends Model
{
    use HasFactory;

    protected $table = 'p_q_r_s';
    protected $fillable = [
        'sender_name',
        'description',
        'affair',
        'response_time',
        'response_days',
        'state',
        'archived',
        'user_id',
        'responsible_id',
        'dependency_id',
        'response_message',
        'response_date',
        'response_status',
        'request_type',
        'sheet_number_id',
        'email',
        'document_type',
        'document'
    ];


    protected $casts = [
        'state' => 'boolean',
        'archived' => 'boolean',
        'response_time' => 'date',
        'response_date' => 'datetime',
    ];

    //Relaciones
     public function creator()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function responsible()
    {
        return $this->belongsTo(User::class, 'responsible_id');
    }

    public function dependency()
    {
        return $this->belongsTo(Dependency::class);
    }

    public function attachedSupports(){
        return $this->hasMany(AttachedSupport::class, 'pqr_id');
    }

    public function isResponded()
    {
        return $this->response_status === 'responded';
    }

    public function isPending()
    {
        return $this->response_status === 'pending';
    }

    public function isClosed()
    {
        return $this->response_status === 'closed';
    }

    public function sheetNumber(){
        return $this->belongsTo(Sheet_number::class);
    }

    public function comunications(){
        return $this->hasMany(comunication::class, 'pqr_id');
    }
}
