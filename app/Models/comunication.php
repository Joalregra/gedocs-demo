<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Carbon\Carbon;
use App\Models\AttachedSupport;

class comunication extends Model
{
    use HasFactory;

    protected $table = 'comunications';

    protected $fillable = [
        'pqr_id',
        'message',
        'archived',
        'response_uuid',
        'response_expires_at',
        'response_used',
        'requires_response'
    ];

    //Casts para campos boolean y fechas
    protected $casts = [
        'archived' => 'boolean',
        'response_used' => 'boolean',
        'requires_response' => 'boolean',
        'response_expires_at' => 'datetime'
    ];

    //Generar respuesta de URL
    public function getResponseUrl()
    {
        if (!$this->response_uuid) {
            return null;
        }

        // CAMBIAR ESTA LÍNEA para que apunte al frontend:
        return url('/pqr/responder/' . $this->response_uuid);
        // En lugar de: return url('/api/pqr/responder/' . $this->response_uuid);
    }

    //Generar UUID para respuestas
    public function generateResponseUuid($expirationDays = 7){
        $this->response_uuid = Str::uuid();
        $this->response_expires_at = Carbon::now()->addDays($expirationDays);
        $this->response_used = false;

        return $this->response_uuid;
    }

    //Verificar si el UUID es valido
    public function isResponseValid()
    {
        return $this->response_uuid &&
               !$this->response_used &&
               $this->response_expires_at > Carbon::now();
    }

    //Marcar UUID como usado
    public function markResponseAsUsed()
    {
        $this->response_used = true;
        $this->save();
    }

    //Archivar comunicación
    public function archive(){
        $this-> archived = true;
        $this-> save();
    }

    //Desarchivar comunicacion
    public function unarchive(){
        $this->archived = false;
        $this->save();
    }

    //Scope para respuestas validas
    public function scopeValidResponses($query){
        return $query->where('response_used', false)
                    ->where('response_expires_at', '>', Carbon::now())
                    ->whereNotNull('response_uuid');
    }

    //Scope para comunicaciones no archivadas
    public function scopeNotArchive($query){
        return $query->where('archived', false);
    }

    //Scope para comunicaciones archivadas
    public function scopeArchive($query){
        return $query->where('archived', true);
    }

    public function pqr(){
        return $this->belongsTo(PQR::class, 'pqr_id');
    }

    public function attachedSupports(){
        return $this->hasMany(AttachedSupport::class,'comunication_id');
    }
}
