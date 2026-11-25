<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Models\\QueueCounter;
use App\\Models\\QueueTicket;
use Illuminate\\Database\\QueryException;
use Illuminate\\Http\\JsonResponse;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Validation\\Rule;

class QueueController extends Controller
{
    private const DEPARTMENTS = ['registrar', 'cashier'];
    private const STATUSES = ['waiting', 'serving', 'skipped', 'completed'];

    private function normalizeDepartment(?string $department): ?string
    {
        $value = strtolower(trim((string) $department));

        return in_array($value, self::DEPARTMENTS, true) ? $value : null;
    }

    private function staffDepartment(Request $request, ?string $requested = null): ?string
    {
        $user = $request->user();

        if ($user->role === 'admin') {
            return $requested ? $this->normalizeDepartment($requested) : null;
        }

        return $user->department;
    }

    public function summary(): JsonResponse
    {
        $today = now()->toDateString();
        $summary = [];

        foreach (self::DEPARTMENTS as $department) {
            $tickets = QueueTicket::whereDate('queue_date', $today)
                ->where('department', $department);

            $summary[$department] = [
                'waiting' => (clone $tickets)->where('status', 'waiting')->count(),
                'serving' => (clone $tickets)->where('status', 'serving')->count(),
                'completed' => (clone $tickets)->where('status', 'completed')->count(),
                'skipped' => (clone $tickets)->where('status', 'skipped')->count(),
            ];
        }

        return response()->json($summary);
    }

    public function index(Request $request): JsonResponse
    {
        $query = QueueTicket::query()->orderByDesc('queue_date')->orderBy('sequence_number');

        if ($department = $this->normalizeDepartment($request->query('department'))) {
            $query->where('department', $department);
        }

        if ($request->boolean('today')) {
            $query->whereDate('queue_date', now()->toDateString());
        }

        return response()->json($query->limit(500)->get()->map(
            fn (QueueTicket $ticket) => $ticket->toFrontendArray()
        )->values());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'department' => ['required', 'string', Rule::in(self::DEPARTMENTS)],
            'office' => ['nullable', 'string'],
        ]);

        $department = $this->normalizeDepartment($validated['department']);
        $date = now()->toDateString();
        $prefix = $department === 'registrar' ? 'R' : 'F';

        $ticket = DB::transaction(function () use ($department, $date, $prefix, $validated) {
            QueueCounter::query()->insertOrIgnore([
                'department' => $department,
                'queue_date' => $date,
                'last_number' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $counter = QueueCounter::query()
                ->where('department', $department)
                ->whereDate('queue_date', $date)
                ->lockForUpdate()
                ->firstOrFail();

            $next = $counter->last_number + 1;
            $counter->update(['last_number' => $next]);

            return QueueTicket::create([
                'ticket_number' => $prefix . '-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT),
                'student_name' => trim($validated['name']),
                'department' => $department,
                'queue_date' => $date,
                'sequence_number' => $next,
                'status' => 'waiting',
            ]);
        }, 3);

        return response()->json($ticket->toFrontendArray(), 201);
    }

    public function callNext(Request $request): JsonResponse
    {
        $requested = $request->validate([
            'department' => ['nullable', 'string', Rule::in(self::DEPARTMENTS)],
        ])['department'] ?? null;

        $department = $this->staffDepartment($request, $requested);

        if (! $department) {
            return response()->json(['message' => 'Select a valid office.'], 422);
        }

        $ticket = DB::transaction(function () use ($department) {
            $alreadyServing = QueueTicket::query()
                ->whereDate('queue_date', now()->toDateString())
                ->where('department', $department)
                ->where('status', 'serving')
                ->lockForUpdate()
                ->exists();

            if ($alreadyServing) {
                return null;
            }

            $next = QueueTicket::query()
                ->whereDate('queue_date', now()->toDateString())
                ->where('department', $department)
                ->where('status', 'waiting')
                ->orderBy('sequence_number')
                ->lockForUpdate()
                ->first();

            if (! $next) {
                return null;
            }

            $next->update(['status' => 'serving', 'called_at' => now()]);

            return $next->fresh();
        }, 3);

        if (! $ticket) {
            return response()->json(['ticket' => null, 'message' => 'No waiting ticket is available.']);
        }

        return response()->json(['ticket' => $ticket->toFrontendArray()]);
    }

    public function update(Request $request, QueueTicket $ticket): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(self::STATUSES)],
        ]);

        $department = $this->staffDepartment($request);

        if ($department && $ticket->department !== $department) {
            return response()->json(['message' => 'You are not allowed to manage this office queue.'], 403);
        }

        if ($validated['status'] === 'serving') {
            $hasServing = QueueTicket::query()
                ->where('department', $ticket->department)
                ->whereDate('queue_date', $ticket->queue_date)
                ->where('status', 'serving')
                ->whereKeyNot($ticket->id)
                ->exists();

            if ($hasServing) {
                return response()->json(['message' => 'Another ticket is already being served in this office.'], 409);
            }
        }

        $changes = ['status' => $validated['status']];
        if ($validated['status'] === 'serving') {
            $changes['called_at'] = now();
        }
        if (in_array($validated['status'], ['completed', 'skipped'], true)) {
            $changes['completed_at'] = now();
        }
        if ($validated['status'] === 'waiting') {
            $changes['called_at'] = null;
            $changes['completed_at'] = null;
        }

        $ticket->update($changes);

        return response()->json($ticket->fresh()->toFrontendArray());
    }

    public function destroy(Request $request, QueueTicket $ticket): JsonResponse
    {
        $department = $this->staffDepartment($request);

        if ($department && $ticket->department !== $department) {
            return response()->json(['message' => 'You are not allowed to delete this office queue record.'], 403);
        }

        $ticket->delete();

        return response()->json(['message' => 'Queue record deleted.']);
    }
}
