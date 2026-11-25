# IDS Colleges Queue Management System — Backend

This folder contains the Laravel API source files. The frontend remains in `frontend/` and its layout is not changed by this backend setup.

## Requirements
- PHP 8.2+
- Composer
- MySQL 8+
- Laravel 11 or 12
- Node.js is not required for the API itself

## Create the Laravel application

From the repository root:

```bash
composer create-project laravel/laravel backend-app
cd backend-app
php artisan install:api
```

The `install:api` command installs Laravel Sanctum and creates the API route setup. Copy the contents of this repository's `backend/app`, `backend/database`, and `backend/routes` into the matching folders in `backend-app/`, preserving the folder structure.

Configure `.env`:

```env
APP_NAME="IDS Colleges Queue"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=ids_queue
DB_USERNAME=root
DB_PASSWORD=
```

Create the MySQL database named `ids_queue`, then run:

```bash
php artisan migrate --seed
php artisan serve
```

The API will be available at `http://127.0.0.1:8000/api`.

## Create staff accounts

The seeder creates an optional initial admin account only when the corresponding environment variables are set:

```env
QUEUE_ADMIN_NAME="System Administrator"
QUEUE_ADMIN_EMAIL="admin@idscolleges.edu.ph"
QUEUE_ADMIN_PASSWORD="ChangeThisPassword123!"
```

Set these values in `.env` before running `php artisan db:seed`. Change the password immediately and do not commit real credentials.

Additional staff can be created through Tinker:

```bash
php artisan tinker
```

```php
App\\Models\\User::create([
    'name' => 'Registrar Staff',
    'email' => 'registrar@idscolleges.edu.ph',
    'password' => Illuminate\\Support\\Facades\\Hash::make('ChangeThisPassword123!'),
    'role' => 'staff',
    'department' => 'registrar',
]);
```

Use `department => 'cashier'` for Cashier staff. Admin accounts use `role => 'admin'` and may access both offices.

## API endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Staff login; returns Sanctum token |
| POST | `/api/auth/logout` | Authenticated | Revoke current token |
| GET | `/api/auth/session` | Authenticated | Current staff profile |
| GET | `/api/queue/summary` | Public | Waiting/serving counts by office |
| GET | `/api/tickets` | Public | Queue records; optional `?department=registrar` |
| POST | `/api/tickets` | Public | Create student ticket |
| POST | `/api/queue/call-next` | Authenticated | Call next waiting ticket for staff office |
| PUT | `/api/tickets/{id}` | Authenticated | Change status |
| DELETE | `/api/tickets/{id}` | Authenticated | Delete a queue record |

### Ticket creation payload

```json
{
  "name": "Juan Dela Cruz",
  "department": "registrar",
  "office": "registrar"
}
```

The server generates ticket numbers independently for each office: `R-001`, `R-002` for Registrar and `F-001`, `F-002` for Cashier. The sequence resets on a new calendar date in the configured application timezone.

### Ticket statuses
- `waiting`
- `serving`
- `skipped`
- `completed`

Ticket responses include the frontend-compatible fields `id`, `number`, `name`, `department`, `office`, `status`, and `createdAt`.

## Connect the existing frontend

In `frontend/js/api/api.js`, configure:

```js
baseUrl: 'http://127.0.0.1:8000/api',
endpoints: {
  queueSummary: '/queue/summary',
  tickets: '/tickets',
  ticketById: '/tickets/:id',
  callNext: '/queue/call-next',
  authLogin: '/auth/login',
  authLogout: '/auth/logout',
  authSession: '/auth/session',
},
```

For local development, serve the frontend over HTTP (for example, with the VS Code Live Server extension) rather than opening HTML files directly. Configure Laravel CORS to allow the frontend development origin if the browser blocks cross-origin requests.

## Important behavior
- Queue creation and sequence allocation run inside a database transaction.
- A dedicated counter row is locked while allocating a number to avoid duplicate ticket numbers when two students submit at nearly the same time.
- Only one ticket per office can be in `serving` status at a time.
- A staff account is restricted to its assigned office. Admin accounts can operate either office.
- Public ticket creation and display endpoints intentionally do not require staff authentication.

This is the first backend implementation layer. Verify it locally with the steps above before connecting the live frontend.