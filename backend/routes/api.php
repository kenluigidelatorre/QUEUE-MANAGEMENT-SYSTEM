<?php

use App\\Http\\Controllers\\Api\\AuthController;
use App\\Http\\Controllers\\Api\\QueueController;
use Illuminate\\Support\\Facades\\Route;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::get('/queue/summary', [QueueController::class, 'summary']);
Route::get('/tickets', [QueueController::class, 'index']);
Route::post('/tickets', [QueueController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/session', [AuthController::class, 'session']);

    Route::post('/queue/call-next', [QueueController::class, 'callNext']);
    Route::put('/tickets/{ticket}', [QueueController::class, 'update']);
    Route::delete('/tickets/{ticket}', [QueueController::class, 'destroy']);
});
