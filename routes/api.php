<?php

use App\Enums\UserRole;
use App\Http\Controllers\Api\CommunicationController;
use App\Http\Controllers\Api\PQRController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DependencyController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SheetController;
use App\Http\Controllers\SheetUserController;
use App\Http\Controllers\PdfController;

Route::middleware('auth:sanctum')->group(function () {

    // --------- FOLDERS ---------
    Route::get("/folders-by-sheet", [FolderController::class, "getFoldersBySheet"]);

    // Upload one or more files to a specific folder
    Route::post("/folders/{id}/upload", [FolderController::class, "upload"]);

    // --------- NOTIFICATIONS ---------
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/{id}', [NotificationController::class, 'show']);
    Route::get('/notifications/filter/unread', [NotificationController::class, 'unread']);
    Route::get('/notifications/filter/read', [NotificationController::class, 'read']);
    Route::post('/notifications/{id}/mark-as-read', [NotificationController::class, 'markAsRead']);
    Route::put("/notifications/update/{idNotification}/{state}", [NotificationController::class, 'updateUserOfNotification']);

    // ============= USERS API (Admin e Supervisor) ==============
    Route::middleware(UserRole::middleware(UserRole::Admin, UserRole::Supervisor))->group(
        function () {
            Route::get('/users', [UserController::class, 'index']);
            Route::get('/users/{id}', [UserController::class, 'show']);
            Route::get('/users/search/filter', [UserController::class, 'userByFilter']);
            Route::put('/users/{id}', [UserController::class, 'update'])->middleware('demo.protect:target');

            // ================== FOLDERS ROUTES ==================
            // Creates a new folder
            Route::post("/folders", [FolderController::class, "store"]);

            // Logically deletes (moves to trash) a mixed selection of folders and files.
            Route::post('/folders/delete-mixed', [FolderController::class, 'deleteMixed']);

            //  Updates an existing folder.
            Route::put('/folders/{folderId}', [FolderController::class, 'updateFolder']);

            //   Downloads a single file.
            Route::get('/folders/file/download/{id}', [FolderController::class, 'download']);

            //  Downloads multiple folders and/or files as a ZIP archive.p
            Route::post('/folders/download-mixed-zip', [FolderController::class, 'downloadMixedZip']);

        
            // ============= SHEETS ==============
            Route::post('/sheets/add/user/{numberSheet}/{idUser}', [SheetController::class, 'addUserFromSheet']);
            Route::get('/sheets', [SheetController::class, 'index']);
            Route::get("/sheets/{id}", [SheetController::class, 'show']);
            Route::post('/dependency', [DependencyController::class, 'store']);
            Route::get('/dependency', [DependencyController::class, 'index']);
            Route::get('/dependency/{id}', [DependencyController::class, 'show']);
            Route::put('/dependency/{id}', [DependencyController::class, 'update']);
            Route::delete('/dependency/{id}', [DependencyController::class, 'destroy']);

            //Get sheets related with specific user
            Route::get("/sheetsNumber", [SheetUserController::class, 'index']);

            //Export an excel file with the report from the PQRS received and send
            Route::get("/export", [\App\Http\Controllers\ExcelEspreadSheetsReports::class, 'export']);
        }
    );


    Route::middleware(UserRole::middleware(UserRole::Admin, UserRole::Supervisor))->group(function () {
        Route::delete('/users/{id}', [UserController::class, 'destroy'])->middleware('demo.protect:target');
    });
    // ONLY ADMIN
    Route::middleware(UserRole::middleware(UserRole::Admin))->group(
        function () {
            Route::post('/users', [UserController::class, 'store']);

            // ============= SHEETS ==============
            Route::post('/sheets', [SheetController::class, 'store']);
            Route::put('/sheets/{id}', [SheetController::class, 'update']);
            Route::delete('/sheets/{id}', [SheetController::class, 'destroy']);
            Route::delete('/sheets/delete/user/{numberSheet}/{idUser}', [SheetController::class, 'deleteUserFromSheet']);
        }
    );

    // ============= PQRS ==============
    Route::post('pqrs/{id}/respond', [PQRController::class, 'respond']);

    // USER AUTH INFO
    Route::get(
        '/me',
        function (Request $request) {
            return response()->json([
                'user' => $request->user()->load(['roles', 'sheetNumbers' => function ($q) {
                    $q->active();
                }])
            ]);
        }
    );

    // LOGOUT
    Route::post(
        '/logout',
        function (Request $request) {
            $request->user()->tokens()->delete();
            return response()->json(['message' => 'Logout exitoso']);
        }
    );

    Route::patch('pqrs/{id}', [PQRController::class, 'update']);

    //Listar PQRS SUPERVISOR
    Route::get('pqrs/supervisor', [PQRController::class, 'sheetShow']);

    // Listar todas las PQRs
    Route::get('/pqrs', [PQRController::class, 'index']);

    // Security: a single PQR holds personal data and sequential IDs, so it requires a session and
    // is limited to users who can see it in their inbox (checked inside the controller).
    Route::get('pqrs/{id}', [PQRController::class, 'show'])->whereNumber('id');
    Route::get('pqr/response-details/{id}', [PQRController::class, 'getResponseData'])->whereNumber('id');

    // ----------- Editprofile -------------

    // Edit the profile photo
    Route::post('/profile/photo', [ProfileController::class, 'updateProfilePhoto'])->middleware('demo.protect:self');

    // ----------- RESPUESTA PQR -------------
    // Genera PDF de comunicación oficial, lo almacena y lo registra como adjunto
    Route::post('/pdf/generate-response', [PdfController::class, 'generateAndStore']);
});

// ----------- CREAR PQRS -------------

// Obtener dependencias (Público)
Route::get('dependencies', [DependencyController::class, 'index']);

// Crear una nueva PQR
// Security: public endpoint, so it is rate limited against spam.
Route::post('pqrs', [PQRController::class, 'store'])->middleware('throttle:10,1');


//Ruta para finalizar y cerrar PQR
Route::post('pqr/{id}/finalize', [PQRController::class, 'finalizeResponse'])->middleware('auth:sanctum');

// ----------- RESPUESTAS PQR -------------
Route::prefix('pqr')->group(function () {
    // Ruta para mostrar el formulario de respuesta (GET)
    Route::get('responder/{uuid}', [CommunicationController::class, 'showResponseForm'])->middleware('throttle:30,1')->name('pqr.show-response-form');

    // Ruta para procesar la respuesta con archivos (POST)
    Route::post('responder/{uuid}', [CommunicationController::class, 'processResponse'])->middleware('throttle:10,1')->name('pqr.upload-response');

    // Ruta para crear comunicaciones (para admins autenticados)
    Route::post('{id}/comunicaciones', [CommunicationController::class, 'createCommunication'])
        ->middleware('auth:sanctum')
        ->name('pqr.create-communication');

    //Ruta para archivar y desarchivar comunicaciones
    Route::patch('comunicaciones/{communicationId}/archive', [CommunicationController::class, 'archiveCommunication'])
        ->middleware('auth:sanctum');
});

// ----------- LOGIN -------------
// Security: throttled (brute force) and only for approved accounts, like the web login.
Route::middleware(["api", "throttle:5,1"])->post('/login', function (Request $request) {
    $request->validate([
        'email' => 'required|email',
        'password' => 'required'
    ]);

    $user = \App\Models\User::where('email', $request->email)->first();

    if (!$user || !\Illuminate\Support\Facades\Hash::check($request->password, $user->password)) {
        return response()->json(['message' => 'Credenciales inválidas'], 401);
    }

    if ($user->status !== 'active') {
        return response()->json(['message' => 'Tu cuenta aún no ha sido aprobada'], 403);
    }

    $token = $user->createToken('api_token')->plainTextToken;

    return response()->json([
        'success' => true,
        'token' => $token,
        'user' => $user
    ]);
});
