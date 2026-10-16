<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewUserRegistered extends Notification
{
    use Queueable;

    public $newUser;
    /**
     * Create a new notification instance.
     */
    public function __construct($newUser)
    {
        if (!$newUser->relationLoaded('roles')) {
            $newUser->load('roles');
        }
        $this->newUser = $newUser;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toDatabase($notifiable): array
    {
        $user = $this->newUser;
        $userData = $user->toArray();
        // Asegurarse de que los roles estén incluidos para el filtro del frontend
        $userData['roles'] = $user->roles->toArray();

        return [
            'role' => $user->roles->first() ? $user->roles->first()->name : 'Usuario',
            'user' => $userData,
        ];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            //
        ];
    }
}
