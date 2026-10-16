<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Support\Facades\Hash;
use DB;


class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $authUser = $request->user();
        $query = User::with(['roles', 'sheetNumbers' => function ($q) {
            $q->active();
        }]);
        if ($authUser->hasRole(UserRole::Supervisor)) {
            $sheetIds = $authUser->sheetNumbers()->pluck('sheet_numbers.id')->toArray();
            $query->whereHas('sheetNumbers', function ($q) use ($sheetIds) {
                $q->whereIn('sheet_numbers.id', $sheetIds);
            });
            $query->whereDoesntHave('roles', function ($q) {
                $q->where('name', UserRole::Admin->value);
            });
        }
        $users = $query->get();
        return response()->json(['success' => true, 'data' => $users]);
    }


    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasRole(UserRole::Admin)) {
            return redirect()->back()->with(['success' => false, 'message' => 'No tienes permiso para crear usuarios']);
        }
        $validate = $request->validate([
            'type_document' => 'required|string|max:50',
            'document_number' => 'required|string|max:50|unique:users,document_number',
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'password' => "required|string",
            "status" => "required|string",
            "role" => ['required', Rule::enum(UserRole::class)],
        ]);
        $statuFilter = ["pending", "active"];
        if (!in_array($validate["status"], $statuFilter)) {
            return redirect()->back()->with(['success' => false, 'message' => 'Estado no permitido']);
        }
        $validate['password'] = Hash::make($validate['password']);
        $user = User::create($validate);
        $user->assignRole($validate["role"]);
        $user->load('roles');
        $user->load(['roles', 'sheetNumbers' => function ($q) {
            $q->active();
        }]);
        return response()->json(['success' => true, 'message' => 'Usuario creado correctamente', 'data' => $user]);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, string $id)
    {
        $authUser = $request->user();
        if (!$authUser->hasRole(UserRole::Admin) && !$authUser->hasRole(UserRole::Auxiliar)) {
            $user = User::role(UserRole::Auxiliar)->with(['roles', 'sheetNumbers' => function ($q) {
                $q->active();
            }])->find($id);
        } else {
            $user = User::with(['roles', 'sheetNumbers' => function ($q) {
                $q->active();
            }])->find($id);
        }
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Usuario no encontrado'], 404);
        }
        return response()->json(['success' => true, 'data' => $user]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $authUser = $request->user();
        $user = User::with(['sheetNumbers' => function ($q) {
            $q->active();
        }])->find($id);
        if (!$user) {
            return redirect()->back()->with(['success' => false, 'message' => 'Usuario no encontrado']);
        }
        if ($authUser->hasRole(UserRole::Supervisor)) {
            if (!$user->hasRole(UserRole::Auxiliar)) {
                return redirect()->back()->with(['success' => false, 'message' => 'No tienes permiso para editar este usuario']);
            }
        }
        $validate = $request->validate([
            'type_document' => 'sometimes|required|string|max:50',
            'document_number' => 'sometimes|required|string|max:50|unique:users,document_number,' . $user->id,
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $user->id,
            'role' => ['sometimes', 'nullable', Rule::in([UserRole::Auxiliar->value, UserRole::Supervisor->value])],
            'status' => 'sometimes|nullable|string|in:pending,active',
            'sheet_numbers' => 'sometimes|array',
            'sheet_numbers.*' => 'exists:sheet_numbers,id',
            'dependency_id' => 'sometimes|nullable|exists:dependencies,id',
            'password' => 'sometimes|required|string',
        ]);
        if (!empty($validate['password'])) {
            $validate['password'] = Hash::make($validate['password']);
        } else {
            unset($validate['password']);
        }
        $user->update($validate);
        if (!empty($validate['role'])) {
            $user->syncRoles([$validate['role']]);
        }
        if (isset($validate['sheet_numbers'])) {
            if ($authUser->hasRole(UserRole::Supervisor)) {
                $supervisorSheetIds = $authUser->sheetNumbers()->pluck('sheet_numbers.id')->toArray();
                $unauthorized = array_diff($validate['sheet_numbers'], $supervisorSheetIds);
                if (!empty($unauthorized)) {
                    return redirect()->back()->with(['success' => false, 'message' => 'No tienes permisos sobre una o más entidades seleccionadas']);
                }
            }
            $user->sheetNumbers()->sync($validate['sheet_numbers']);
        }
        $user->load(['roles', 'sheetNumbers' => function ($q) {
            $q->active();
        }, 'dependency']);
        return response()->json(['success' => true, 'message' => 'Usuario actualizado correctamente', 'data' => $user]);
    }

    public function userByFilter(Request $request)
    {
        if (!$request->query()) {
            return redirect()->back()->with(['success' => false, 'message' => 'No hay filtro seleccionado']);
        }
        $allowed = ["name", "email", "document_number"];
        foreach ($request->query() as $key => $value) {
            if (!in_array($key, $allowed)) {
                return redirect()->back()->with(['success' => false, 'message' => "Filtro '$key' no está permitido"]);
            }
        }
        $query = User::with(['roles', 'sheetNumbers' => function ($q) {
            $q->active();
        }]);
        foreach ($request->query() as $key => $value) {
            $query->where($key, "LIKE", "%{$value}%");
        }
        $authUser = $request->user();
        if (!$authUser->hasRole(UserRole::Admin)) {
            $query->role(UserRole::Auxiliar);
        }
        $users = $query->get();
        return response()->json(['success' => true, 'data' => $users]);
    }

    public function activate(User $user)
    {
        $user->update(['status' => "active"]);
        auth()->user()->notifications()
            ->where('data->user->id', $user->id)
            ->where('type', 'App\Notifications\NewUserRegistered')
            ->update(['read_at' => now()]);
        return redirect()->back()->with(['success' => true, 'message' => 'Usuario activado exitosamente']);
    }

    public function destroy(string $id)
    {
        return DB::transaction(function () use ($id) {
            $user = User::find($id);
            if (!$user) {
                return response()->json(['success' => false, 'message' => 'Usuario no encontrado'], 404);
            }
            auth()->user()->notifications()
                ->where('data->user->id', $user->id)
                ->delete();
            $user->delete();
            return response()->json(['success' => true, 'message' => 'Usuario eliminado correctamente']);
        });
    }
}
