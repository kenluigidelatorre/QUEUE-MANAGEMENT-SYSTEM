<?php

namespace App\\Http\\Middleware;

use Closure;
use Illuminate\\Http\\Request;
use Symfony\\Component\\HttpFoundation\\Response;

class EnsureStaffOffice
{
    public function handle(Request $request, Closure $next, string $department): Response
    {
        $user = $request->user();

        if (! $user || ($user->role !== 'admin' && $user->department !== $department)) {
            return response()->json(['message' => 'You are not authorized for this office.'], 403);
        }

        return $next($request);
    }
}
