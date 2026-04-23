<?php

namespace App\Mail;

use App\Models\Task;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class TaskSharedMail extends Mailable
{
    use Queueable, SerializesModels;

    public $task;
    public $sender;
    public $recipientEmail;

    public function __construct(Task $task, User $sender, string $recipientEmail)
    {
        $this->task = $task;
        $this->sender = $sender;
        $this->recipientEmail = $recipientEmail;
    }

    public function build()
    {
        return $this->subject("Task Shared: {$this->task->title}")
                    ->markdown('emails.task.shared');
    }
}
