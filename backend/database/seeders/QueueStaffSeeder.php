<?php

namespace Database\\Seeders;

use App\\Models\\User;
use Illuminate\\Database\\Seeder;
use Illuminate\\Support\\Facades\\Hash;

class QueueStaffSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('QUEUE_ADMIN_EMAIL');
        $password = env('QUEUE_ADMIN_PASSWORD');

        if (! $email || ! $password) {
            $this->command?->warn('Queue admin was not created. Set QUEUE_ADMIN_EMAIL and QUEUE_ADMIN_PASSWORD in .env to seed it.');
            return;
        }

        User::updateOrCreate(
            ['email' => $email],
            [
                'name' => env('QUEUE_ADMIN_NAME', 'System Administrator'),
                'password' => Hash::make($password),
                'role' => 'admin',
                'department' => null,
            ]
        );
    }
}
