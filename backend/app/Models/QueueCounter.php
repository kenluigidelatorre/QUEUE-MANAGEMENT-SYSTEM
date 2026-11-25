<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Model;

class QueueCounter extends Model
{
    protected $fillable = ['department', 'queue_date', 'last_number'];

    protected function casts(): array
    {
        return ['queue_date' => 'date'];
    }
}
