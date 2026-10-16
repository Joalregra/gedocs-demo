<?php

namespace App\Http\Requests;

use App\DocumentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class StorePQRRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        //Permite que pase para que el controlador maneje la autorizacion
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
            'description' => 'required|string|max:1000',
            'affair' => 'required|string|max:255',
            'response_time' => 'required|date|after:today',
            'dependency_id' => 'required|exists:dependencies,id',
            'attachments' => 'nullable|array',
            'attachments.*' => 'file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120'
        ];
    }

    //Mensajes para validaciones
    public function messages():array{
        return [
            'description.required' => 'La descripción es obligatoria',
            'affair.required' => 'El asunto es obligatorio',
            'response_time.required' => 'El tiempo de respuesta es obligatorio',
            'response_time.after' => 'El tiempo de respuesta debe ser posterior a hoy',
            'dependency_id.required' => 'La dependencia es obligatoria',
            'dependency_id.exists' => 'La dependencia seleccionada no existe',
            'attachments.*.mimes' => 'Los archivos deben ser PDF, DOC, DOCX, JPG, JPEG o PNG',
            'attachments.*.max' => 'Cada archivo no debe superar los 5MB'
        ];
    }
}
