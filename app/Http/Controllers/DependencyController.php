<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Folder;
use Illuminate\Http\Request;
use App\Models\Dependency;

class DependencyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $dependencies = Dependency::with('sheetNumber')->get();
        if (!$dependencies) {
            return response()->json([
                "status" => "error",
                "message" => "No hay dependencias",
            ], 404);
        }
        $dependencies = $request->user() ? (
            $request->user()->hasRole(UserRole::Supervisor) 
                ? Dependency::with('sheetNumber')->whereIn('sheet_number_id', $request->user()->sheetNumbers->pluck('id'))->get() 
                : Dependency::with('sheetNumber')->whereHas('sheetNumber')->get()
        ) : [];

        return response()->json([
            "message" => "Dependencias obtenidas exitosamente",
            "dependencies" => $dependencies
        ], 200);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validate = $request->validate([
            "name" => [
                "required",
                "string",
                "max:255",
                \Illuminate\Validation\Rule::unique('dependencies', 'name')->where(function ($query) use ($request) {
                    return $query->where('sheet_number_id', $request->input('sheet_number_id'));
                })
            ],
            "sheet_number_id" => [
                "nullable",
                "exists:sheet_numbers,id",
                function ($attribute, $value, $fail) use ($user) {
                    if ($value && $user->hasRole(UserRole::Supervisor)) {
                        if (!$user->sheetNumbers->contains('id', $value)) {
                            $fail('No tienes permisos para asignar dependencias a esta entidad.');
                        }
                    }
                }
            ],
            "folder_code" => "nullable|string|max:255"
        ]);

        //Obtener la entidad del usuario
        $sheet = $user->sheetNumbers()->first();

        // Prioridad: 1) Entidad del usuario, 2) Enviada en JSON
        if ($sheet) {
            $sheetId = $sheet->id;
        } elseif (isset($validate['sheet_number_id'])) {
            $sheetId = $validate['sheet_number_id'];
        } else {
            return response()->json([
                "success" => false,
                "message" => "Debe proporcionar un sheet_number_id o tener una entidad asignada"
            ], 422);
        }


        $dependency = Dependency::create([
            'name' => $validate['name'],
            'sheet_number_id' => $validate['sheet_number_id'],
        ]);

        // Find or create the current year folder for the sheet
        $yearFolder = Folder::firstOrCreate(
            [
                'sheet_number_id' => $sheetId,
                'year' => date('Y'),
                'parent_id' => null,
            ],
            [
                'name' => date('Y'),
                'active' => true,
                'department' => 'Año',
                'folder_code' => date('Y'),
            ]
        );

        // Create the folder for the dependency inside the year folder
      Folder::create([
            'name' => $dependency->name,
            'parent_id' => $yearFolder->id,
            'folder_code' => $validate['folder_code'] ?? null,
            'department' => 'sección',
            'sheet_number_id' => $sheetId,
            'active' => true,
        ]);

        return response()->json([
            "message" => "Dependencia creada con exito",
            "dependency" => $dependency
        ], 200);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //Encontrar dependencia por id
        $dependency = Dependency::with('sheetNumber')->find($id);

        if (!$dependency) {
            return response()->json([
                'success' => false,
                'message' => 'Dependencia no encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'dependency' => [
                'id' => $dependency->id,
                'name' => $dependency->name,
                'sheet_number_id' => $dependency->sheetNumber
            ]
        ], 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //Busca la dependencia con el id
        $dependency = Dependency::find($id);

        if (!$dependency) {
            return response()->json([
                "message" => "Depenedencia no encontrada"
            ], 404);
        }

        if ($dependency->name === 'Ventanilla Unica' && $request->input('name') !== 'Ventanilla Unica') {
            return response()->json([
                "message" => "El nombre de la dependencia Ventanilla Unica no puede ser modificado"
            ], 403);
        }

        $validate = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                \Illuminate\Validation\Rule::unique('dependencies', 'name')->where(function ($query) use ($dependency) {
                    return $query->where('sheet_number_id', $dependency->sheet_number_id);
                })->ignore($dependency->id)
            ]
        ]);

        $dependency->update($validate);
        return response()->json([
            "success" => true,
            "message" => "Dependencia actualizada exitosamente",
            "dependency" => $dependency
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
        $dependency = Dependency::find($id);
        if (!$dependency) {
            return response()->json([
                "status" => "error",
                "message" => "Dependencia no encontrada"
            ], 404);
        }

        if ($dependency->name === 'Ventanilla Unica') {
            return response()->json([
                "status" => "error",
                "message" => "La dependencia Ventanilla Unica no puede ser eliminada"
            ], 403);
        }

        $dependency->delete();

        return response()->json([
            "success" => true,
            "message" => "Dependencia eliminada"
        ], 200);
    }
}