<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\PQR;
use App\Models\comunication;
use Illuminate\Support\Facades\Storage;
use Illuminate\Mail\Mailables\Attachment;

class PQRResponseMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public $pqr;
    public $comunication;
    public $responseUrl;

    public function __construct(PQR $pqr, comunication $comunication = null, $responseUrl = null)
    {
        $this->pqr = $pqr;
        $this->comunication = $comunication;
        $this->responseUrl = $responseUrl;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        // Personalizar asunto según el caso
        if ($this->comunication) {
            // Email con link para subir documentos
            $subject = 'Documentos Requeridos - ' . $this->pqr->affair;
        } else {
            // RESPUESTA DIRECTA A LA PQR (Este es tu caso)
            $subject = 'Respuesta a tu ' . $this->pqr->request_type . ': ' . $this->pqr->affair;
        }

        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.pqr-response',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        $attachments = [];
        
        $responseFiles = $this->pqr->attachedSupports->whereIn('origin', ['ENV', 'response']);

        foreach ($responseFiles as $file) {
            $fullPath = Storage::disk('public')->path($file->path);
            
            if (file_exists($fullPath)) {
                $attachments[] = Attachment::fromPath($fullPath)
                    ->as($file->name);
            }
        }

        return $attachments;
    }
}
