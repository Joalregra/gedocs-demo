<?php

use App\Enums\UserRole;
use App\Http\Controllers\ExplorerController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\PdfController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


Route::middleware('auth')->group(function () {

    // routes/web.php
    Route::post('/generate-pdf', [PdfController::class, 'generate'])->name('pdf.generate');
    Route::post('/generate-pdf-to-explorer', [PdfController::class, 'generateToExplorer'])->name('pdf.generateToExplorer');
    Route::post('/pdf/footer-preference', [PdfController::class, 'saveFooterPreference'])->name('pdf.footer-preference');
    Route::post('/pdf/logo-preference', [PdfController::class, 'saveLogoPreference'])->name('pdf.logo-preference');
    Route::delete('/pdf/logo-preference', [PdfController::class, 'resetLogoPreference'])->name('pdf.logo-preference.reset');
    Route::get('/create-pdf', function (\Illuminate\Http\Request $request) {
        return Inertia::render('CreatePDF', [
            'targetFolderId' => $request->query('folder_id') ? (int) $request->query('folder_id') : null,
            'targetSheetId' => $request->query('sheet_id') ? (int) $request->query('sheet_id') : null,
        ]);
    })->name('create-pdf');


    // Inbox principal

    Route::get('/', fn() => Inertia::render('Inbox'))
        ->name('inbox');
        
    Route::get('/outbox', fn() => Inertia::render('Outbox'))
        ->name('outbox');


    //Vista de notificaciones pasando el id
    Route::get(
        '/notifications',
        fn() => Inertia::render('Notifications', [
            'notificationId' => null
        ])
    )->name('notifications.index');

    //Gestion Admin General

    // Gestion de Auxiliares
    Route::get(
        '/users/auxiliar',
        fn() => Inertia::render('Users')
    )->name('auxiliar')->middleware(UserRole::middleware(UserRole::Admin, UserRole::Supervisor));

    //Vista de notificaciones de los auxiliares
    Route::get(
        '/notifications/auxiliar',
        fn() => Inertia::render('Notifications', [
            'notificationId' => null
        ])
    )->name('notifications.auxiliar');

    //Gestion Admin General

    // Gestion de Supervisor
    Route::get(
        '/users/supervisor',
        fn() => Inertia::render('Users')
    )->name('supervisor')->middleware(UserRole::middleware(UserRole::Admin, UserRole::Supervisor));

    //Vista de una sola notificacion pasando el id
    Route::get(
        '/notifications/{id}',
        fn($id) => Inertia::render('Notifications', [
            'notificationId' => $id
        ])
    )->name('notifications.show');


    //VISTA DE EXPLORADOR
    Route::get('/explorer', [ExplorerController::class, 'index'])
        ->name('explorer');

    Route::post('/folders', [FolderController::class, 'store'])
        ->name('folders.store');

    Route::post('/folders/{folder}/upload', [FolderController::class, 'upload'])
        ->name('folders.upload');

    Route::put('/folders/{folderId}', [FolderController::class, 'updateFolder'])
        ->name('folders.update');

    Route::get('/folders/file/download/{file}', [FolderController::class, 'download'])
        ->name('folders.download');

    Route::put('/files/{fileId}', [FolderController::class, 'updateFile'])
        ->name('files.update');

    Route::post('/folders/delete-mixed', [FolderController::class, 'deleteMixed'])
        ->name('folders.deleteMixed');

    Route::post('/folders/download-mixed-zip', [FolderController::class, 'downloadMixedZip'])
        ->name('folders.downloadMixedZip');

    Route::get('/folders/archived', [FolderController::class, 'archived'])
        ->name('folders.archived');

    Route::post('/folders/move-mixed', [FolderController::class, 'moveMixed'])
        ->name('folders.moveMixed');

    Route::post('/folders/restore-mixed', [FolderController::class, 'restoreMixed'])
        ->name('folders.restoreMixed');

    Route::get('/archive', fn() => Inertia::render('Archive'))
        ->name('archive');

    //Direccion a Formulario
    Route::get('/form', function () {
        $dependencies = \App\Models\Dependency::select('id', 'name')->get();
        return Inertia::render('Form', [
            'dependencies' => $dependencies,
        ]);

    })->name('form');

    //Vistas de Entidades
    Route::get('/sheets', fn() => Inertia::render('Sheets'))
        ->name('sheets')
        ->middleware(["roleCheck", UserRole::middleware(UserRole::Admin, UserRole::Supervisor)]);

    //Vistas Dependencias
    Route::get('/dependencies', fn() => Inertia::render('Dependencies'))
        ->name('dependencies');

    // Vistas de perfil
    Route::get('/profile', [ProfileController::class, 'edit'])
        ->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])
        ->middleware('demo.protect:self')
        ->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])
        ->middleware('demo.protect:self')
        ->name('profile.destroy');

    //Vistas indice Electronico
    Route::get('/electronic-index', fn() => Inertia::render('ElectronicIndex'))
        ->name('electronic-index');
});




require __DIR__ . '/auth.php';
