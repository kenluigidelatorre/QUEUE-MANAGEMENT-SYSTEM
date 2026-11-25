<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class QueueTicket extends Model
{
    protected $fillable = [
        'ticket_number',
        'student_name',
        'department',
        'queue_date',
        'sequence_number',
        'status',
        'called_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'queue_date' => 'date',
            'called_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function toFrontendArray(): array
    {
        return [
            'id' => $this->id,
            'number' => $this->ticket_number,
            'queueNumber' => $this->ticket_number,
            'name' => $this->student_name,
            'fullName' => $this->student_name,
            'department' => $this->department,
            'office' => $this->department,
            'status' => $this->status,
            'createdAt' => $this->created_at?->toIso8601String(),
            'calledAt' => $this->called_at?->toIso8601String(),
            'completedAt' => $this->completed_at?->toIso8601String(),
        ];
    }
}
