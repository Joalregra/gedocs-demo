<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

//Validacion de los datos cuando se actualizan la pqr
class UpdatePQRRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Campos que puede actualizar el superadmin
            'response_time' => 'nullable|date|after:today',
            'dependency_id' => 'nullable|integer|exists:dependencies,id',

            // Campo que puede actualizar el encargado
            'state' => 'nullable|string|in:asignado,resuelto',
        ];
    }

     public function messages(): array
    {
        return [
            'response_time.date' => 'La fecha de respuesta debe ser una fecha válida.',
            'response_time.after' => 'La fecha de respuesta debe ser posterior a hoy.',
            'dependency_id.integer' => 'La dependencia debe ser un número válido.',
            'dependency_id.exists' => 'La dependencia seleccionada no existe.',
            'state.string' => 'El estado debe ser un texto.',
            'state.in' => 'El estado debe ser: asignado o resuelto.',
        ];
    }
}
