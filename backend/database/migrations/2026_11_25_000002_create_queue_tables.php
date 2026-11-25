<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('queue_counters', function (Blueprint $table) {
            $table->id();
            $table->string('department', 20);
            $table->date('queue_date');
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();
            $table->unique(['department', 'queue_date']);
        });

        Schema::create('queue_tickets', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number', 20);
            $table->string('student_name', 150);
            $table->string('department', 20);
            $table->date('queue_date');
            $table->unsignedInteger('sequence_number');
            $table->string('status', 20)->default('waiting');
            $table->timestamp('called_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['department', 'queue_date', 'sequence_number']);
            $table->index(['department', 'queue_date', 'status', 'sequence_number'], 'queue_ticket_serving_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_tickets');
        Schema::dropIfExists('queue_counters');
    }
};
