<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Sheet_number;
use App\Models\Sheet_number_user;
use App\Models\User;
use Illuminate\Http\Request;

class SheetUserController extends Controller
{
    //
    public function index(Request $request){
        $user = $request->user();
        $sheets_id = null;
        if($user && $user->hasRole(UserRole::Supervisor)){
            $sheets_id = $user->sheetNumbers()->active()->get();
        }
        if (!$sheets_id) {
            return response()->json(['success' => false, 'message' => 'El usuario no tiene entidades asignadas'], 404);
        }
        return response()->json(['success' => true, 'message' => 'Entidades encontradas', 'entidades' => $sheets_id]);
    }


}
