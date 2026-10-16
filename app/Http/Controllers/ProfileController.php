<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/ProfileSettingsPage', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    public function updateProfilePhoto(Request $request)
    {

        //validate the file submitted to be a photo
        $request->validate([
            'profile_photo' => 'required|image|max:2048',
        ]);

        $user = $request->user();
        $file = $request->file('profile_photo');



        // delete the previous photo
        if ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
        }
        // Only name
        // Security: extension guessed from the file content, never from the client-supplied name.
        $fileName = Str::uuid() . "." . $file->extension();

        // store the new photo an relate it to the user
        $path = $file->storeAs(
            "profile/picture/user-$user->id",
            $fileName,
            'public'
        );

        $url =  Storage::disk('public')->url($path);
        $user->update([
            'profile_photo' => $url
        ]);

        return response()->json([
            "success" => true,
            'image' => $url,
        ]);
    }
}
