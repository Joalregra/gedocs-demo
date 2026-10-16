<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Folder;
use App\Models\Sheet_number;
use App\Models\User;
use Illuminate\Http\Request;
use App\Models\Dependency;
use Illuminate\Support\Facades\DB;
use App\Services\FolderStructureService;

class SheetController extends Controller
{
    /**
     * Display a listing of the resource.
     * Retrieves all training sheets along with their related users.
     * Users are separated into "Supervisors" and "Auxiliares" (Students)
     * based on their assigned Spatie roles.
     */
    public function index(Request $request)
    {
        $query = Sheet_number::withCount(['users as assistants_count' => function ($query) {
            $query->whereHas('roles', function($q){
                $q->where('name', UserRole::Auxiliar->value);
            });
        }]);

        if ($request->has('active_only')) {
            $query->active();
        }

        $sheets = $query->get();

        return response()->json([
            "success" => true,
            "sheets" => $sheets
        ], 200);
    }


    /**
     * Store a newly created resource in storage.
     * Validates and creates a new training sheet.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'number' => 'required|numeric|unique:sheet_numbers,number',
        ]);

        return DB::transaction(function () use ($validated) {
            // Crear la entidad sin ventanilla_unica_id
            $sheetNumber = Sheet_number::create([
                'number' => $validated['number'],
                // 'ventanilla_unica_id' => null
            ]);

            // Crear la dependencia "Ventanilla Unica" relacionada a la entidad
            $ventanilla = Dependency::create([
                'name' => 'Ventanilla Unica',
                'sheet_number_id' => $sheetNumber->id,
            ]);

            // Actualizar la entidad con el id de la ventanilla unica
            $sheetNumber->ventanilla_unica_id = $ventanilla->id;
            $sheetNumber->save();

            // Crear carpeta del año por defecto para la entidad
            $yearFolder = Folder::create([
                'name' => date('Y'),
                'year' => date('Y'),
                'sheet_number_id' => $sheetNumber->id,
                'parent_id' => null,
                'active' => true,
                'department' => 'Año',
                'folder_code' => date('Y'),
            ]);

            // Crear carpeta ventanilla unica dentro del año
            Folder::create([
                'name' => Folder::VENTANILLA_NAME,
                'parent_id' => $yearFolder->id,
                'folder_code' => '000',
                'department' => 'sección',
                'sheet_number_id' => $sheetNumber->id,
                'active' => true,
            ]);
            // Retornar la entidad con la relación cargada
            return response()->json($sheetNumber->load('dependencies'), 201);
        });
    }

    /**
     * Display the specified resource.
     * Searches sheets by number using a LIKE query.
     * Returns users grouped by role (Supervisor, Auxiliar).
     */
    public function show(string $id)
    {
        // Search sheet(s) by partial sheet number
        $sheet = Sheet_number::withCount(['users as assistants_count' => function ($query) {
            $query->whereHas('roles', function($q){
                $q->where('name', UserRole::Auxiliar->value);
            });
        }])->find($id);

        if (!$sheet) {
            return response()->json([
                "success" => false,
                "message" => "Entidad no encontrada"
            ], 404);
        }

        
        return response()->json([
            "success" => true,
            "message" => "Entidad encontrada exitosamente",
            "sheet" => $sheet
        ], 200);
    }

    /**
     * Update the specified resource in storage.
     * Updates the sheet number if the sheet exists.
     */
   public function update(Request $request, $id)
{
    $sheet = Sheet_number::find($id);

    if (!$sheet) {
        return response()->json([
            "success" => false,
            "message" => "Entidad no encontrada"
        ], 404);
    }

    $validate = $request->validate([
        "number" => "sometimes|numeric",
        "active" => "sometimes|boolean",
        "state" => "sometimes|string"
    ]);

    // Si esta entidad se activa, desactivar las demás
    if (isset($validate["active"]) && $validate["active"] == true) {
        Sheet_number::where("id", "!=", $sheet->id)
            ->update(["active" => false]);
    }

    $sheet->update($validate);

    return response()->json([
        "success" => true,
        "message" => "Entidad actualizada con éxito"
    ], 200);
}

    /**
     * Remove the specified resource from storage.
     * Deletes a sheet by ID if it exists.
     */
    public function destroy(string $id)
    {
        $sheet = Sheet_number::find($id);

        if (!$sheet) {
            return response()->json([
                "success" => false,
                "message" => "Entidad no encontrada"
            ], 404);
        }

        $sheet->delete();

        return response()->json([
            "success" => true,
            "message" => "Entidad eliminada con exito"
        ], 200);
    }

    /**
     * Removes a user from a sheet (many-to-many relationship).
     * Looks up a sheet by its number and checks if the user belongs to it.
     * If found, it detaches the user from the pivot table.
     */
    public function deleteUserFromSheet(string $numberSheet, string $idUser)
    {
        // Find sheet by number
        $sheet = Sheet_number::where("number", $numberSheet)->first();

        if (!$sheet) {
            return response()->json([
                "success" => false,
                "message" => "Entidad no encontrada"
            ], 404);
        }

        // Check if the user is attached to the sheet
        $user = $sheet->users()->where("users.id", $idUser)->first();

        if (!$user) {
            return response()->json([
                "success" => false,
                "message" => "Usuario no encontrado en la entidad"
            ], 404);
        }

        // Remove relationship in pivot table
        $sheet->users()->detach($user->id);

        return response()->json([
            "success" => true,
            "message" => "Usuario eliminado de la entidad con exito"
        ], 200);
    }


    public function addUserFromSheet(Request $request, string $numberSheet, string $idUser)
    {
        $sheet = Sheet_number::where("number", $numberSheet)->first();

        if (!$sheet) {
            return response()->json([
                "success" => false,
                "message" => "Entidad no encontrada"
            ], 404);
        }

        $user = User::find($idUser);

        if (!$user) {
            return response()->json([
                "success" => false,
                "message" => "Usuario no encontrado"
            ], 404);
        }

        if ($user->hasRole(UserRole::Admin)) {
            return response()->json([
                "success" => false,
                "message" => "No puedes agregar a este usuario"
            ], 500);
        }

        $authUser = $request->user();

        $authUser->load("sheetNumbers");

        if ($authUser->hasRole(UserRole::Supervisor) && !$authUser->sheetNumbers->contains("id", $sheet->id)) {
            return response()->json([
                "success" => false,
                "message" => "No tienes permisos sobre esta entidad"
            ], 403);
        }

        $sheet->load("users");

        if ($sheet->users->contains("id", $user->id)) {
            return response()->json([
                "success" => false,
                "message" => "Este usuario ya está asignado a esta entidad"
            ], 409); // 409 Conflict
        }

        $sheet->users()->attach($user->id);

        return response()->json([
            "success" => true,
            "message" => "Usuario agregado correctamente a la entidad",
        ]);
    }
}
