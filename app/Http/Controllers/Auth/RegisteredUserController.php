<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Sheet_number;
use App\Models\User;
use App\Models\TechnicalSheet;
use App\Notifications\NewUserRegistered;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules;
use Inertia\Inertia;

class RegisteredUserController extends Controller
{
    public function create()
    {
        $sheets = Sheet_number::active()->whereHas('users', function ($q) {
            $q->whereHas('roles', function ($r) {
                $r->where('name', UserRole::Supervisor->value);
            });
        })->get();
        return Inertia::render('Auth/Register', [
            'sheets' => $sheets
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type_document' => 'required|string|max:50',
            'document_number' => 'required|string|max:50|unique:users,document_number',
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'role' => ['required', 'string', Rule::in(array_map(fn (UserRole $r) => $r->value, UserRole::selfRegistrable()))],
            'technical_sheet_id' => 'nullable|exists:sheet_numbers,id',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Crear usuario
        $user = User::create([
            'type_document' => $validated['type_document'],
            'document_number' => $validated['document_number'],
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'status' => "pending",
            'password' => Hash::make($validated['password']),
        ]);

        event(new Registered($user));


        $user->assignRole($validated['role']);

        if (!empty($validated['technical_sheet_id'])) {
            $sheet = Sheet_number::find($validated['technical_sheet_id']);
            $user->sheetNumbers()->attach($sheet);
        }

        if ($user->hasRole(UserRole::Supervisor)) {
            $admins = User::role(UserRole::Admin)->get();
            foreach ($admins as $admin) {
                $admin->notify(new NewUserRegistered($user));
            }
            if ($user->status === "pending") {
                Auth::logout();
                return redirect()->route('login')->with(["status" => "Supervisor. Tu cuenta sera revisada por el administrador"]);
            }
        }

        if ($user->hasRole(UserRole::Auxiliar)) {
            if (!empty($validated['technical_sheet_id'])) {
                $supervisors = User::role(UserRole::Supervisor)->whereHas('sheetNumbers', function ($q) use ($validated) {
                    $q->where('sheet_numbers.id', $validated['technical_sheet_id']);
                })->get();

                if ($supervisors->isEmpty()) {
                    $supervisors = User::role(UserRole::Supervisor)->get();
                }

                foreach ($supervisors as $supervisor) {
                    $supervisor->notify(new NewUserRegistered($user));
                }
            } else {
                $supervisor = User::role(UserRole::Supervisor)->first();
                if ($supervisor) {
                    $supervisor->notify(new NewUserRegistered($user));
                }
            }

            if ($user->status === "pending") {
                Auth::logout();
                return redirect()->route('login')->with(["status" => "Auxiliar. Tu cuenta sera revisada por el supervisor de la entidad que seleccionaste"]);

            }
        }


        Auth::login($user);

        return redirect("/");
    }
}