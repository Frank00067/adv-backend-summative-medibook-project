# MediBook: Clinic Appointment System

A clinic appointment booking backend built with Node.js, Express, MySQL and Redis.

**Technology stack:** Node.js, Express, MySQL (`mysql2` with parameterized queries only), Redis. No ORM.

## Setup

### Requirements

- Node.js 18+
- Docker (for MySQL 8 and Redis), or your own MySQL 8.0.16+ and Redis installation.

### 1. Start MySQL and Redis

Replace the password with your own:

```bash
docker run --name medibook-mysql -e MYSQL_ROOT_PASSWORD=your_password -p 3306:3306 -d mysql:8

docker run --name medibook-redis -p 6379:6379 -d redis:7
```

### 2. Create the database and load sample data

**PowerShell:**

```powershell
Get-Content database\schema.sql | docker exec -i -e MYSQL_PWD=your_password medibook-mysql mysql -uroot

Get-Content database\seed.sql | docker exec -i -e MYSQL_PWD=your_password medibook-mysql mysql -uroot
```

**Bash:**

```bash
docker exec -i medibook-mysql mysql -uroot -pyour_password < database/schema.sql

docker exec -i medibook-mysql mysql -uroot -pyour_password < database/seed.sql
```

### 3. Configure environment variables

Copy `.env.example` to `.env` and configure `DB_PASSWORD`.

The `.env` file is git-ignored.

### 4. Install and run

```bash
npm install

npm start          # Web server on http://localhost:3000

npm run worker     # Separate process: waitlist promotion and notifications

npm test           # Jest unit tests (no MySQL or Redis needed)
```

## Environment configuration

### `.env.example`

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=change_me
DB_NAME=medibook
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Project structure

```text
database/       schema.sql, seed.sql
src/models/     All SQL (parameterized, ? placeholders)
src/controllers/ Validation and business logic
src/routes/     URL and method mapping
src/utils/      Pure functions, audit logger, queue helpers
src/workers/    Worker process
locales/        en.json, fr.json
tests/          Jest tests
schema-diagram.png  Database schema diagram
```

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET/POST | `/api/patients` | List and create patients |
| GET/PUT/DELETE | `/api/patients/:id` | Read, update and delete patients |
| GET/POST | `/api/doctors` | List and create doctors |
| GET/PUT/DELETE | `/api/doctors/:id` | Read, update and delete doctors |
| GET | `/api/doctors/:id/stats` | Revenue, upcoming appointments, next 7 days and utilization |
| POST | `/api/appointments` | Book an appointment |
| POST | `/api/appointments/:id/cancel` | Cancel an appointment with refund |
| POST | `/api/waitlist` | Join a waitlist |
| GET | `/api/reports/doctors` | Every doctor's appointments and revenue |
| GET | `/api/reports/busy-days` | Doctor-days above 80% capacity |
| GET | `/feedback?lang=en\|fr` | Internationalized feedback page |

### HTTP status codes

- `201` – Resource created.
- `204` – Resource deleted.
- `400` – Invalid input.
- `404` – Resource not found.
- `409` – Conflict (slot taken, day full, already cancelled or duplicate).
- `422` – Invalid appointment slot (not on a 30-minute boundary, outside 09:00–17:00 or in the past).

## Refund policy

| Cancellation notice | Refund |
|---|---:|
| More than 48 hours | 100% |
| From 24 hours up to and including 48 hours | 50% |
| Under 24 hours | 0% |

Exactly 48 hours gives 50%, and exactly 24 hours gives 50%.

The refund is calculated on the server using the appointment time and amount paid. Jest tests cover both boundaries.

## Design justifications

### Part C: API and business rules

- **REST design:** Nouns represent resources and HTTP verbs represent actions. Cancellation uses `POST /appointments/:id/cancel` rather than DELETE because the appointment row is retained for refund history. Doctor statistics are nested under the doctor resource, while reports are under `/reports`.

- **Preventing double booking:** The `appointments` table uses a stored generated column, `active_slot`, which equals `appt_datetime` when status is `booked` and NULL when cancelled. A `UNIQUE(doctor_id, active_slot)` constraint prevents two active bookings from sharing the same doctor and time. MySQL permits multiple NULL values in a unique index, so cancelled appointments do not block slots. Duplicate insert errors (`ER_DUP_ENTRY`) are mapped to HTTP 409.

- **12 appointments per day:** Booking runs in a transaction that locks the doctor row using `SELECT ... FOR UPDATE`, counts that day's booked appointments, and then inserts the new appointment. This serializes bookings for the same doctor and prevents concurrent requests from exceeding the daily limit.

- **Atomic cancellation and refund:** A single transaction locks the appointment row, calculates the refund and updates the status, refund amount and cancellation timestamp together. A second cancellation returns HTTP 409.

- **Reports:** Aggregation happens in SQL using `LEFT JOIN`, `GROUP BY` and `HAVING`. Doctors with zero appointments are included. Revenue is total amount paid minus total refunds.

- **Financial precision:** Prices are stored as DECIMAL, and refund calculations use cents to avoid floating-point errors.

### Part D: Audit logging

`src/utils/auditLogger.js` uses `fs.promises` only, avoiding synchronous filesystem operations in request handlers.

It creates the `logs/` directory on the first write using `mkdir({ recursive: true })` and appends one JSON line per event.

The logger handles its own errors and is not awaited by controllers, ensuring that logging failures cannot fail or slow down a user's request.

### Part E: Queues and Redis

- **Waitlist:** One Redis list per doctor and day (`waitlist:<doctorId>:<date>`). A fully booked slot or day returns HTTP 409 with `waitlist_offered: true`. Patients can join using `POST /api/waitlist`.

- **Background promotion:** Cancellation pushes a job onto `queue:promote`. A separate worker process (`npm run worker`) processes jobs, keeping promotion work outside the web server.

- **Patient safety:** The worker moves the first waitlisted entry using `LMOVE` into `waitlist:processing` instead of simply popping it. This ensures that the patient remains in one list or the other. After successful promotion, the entry is removed from processing.

- **Failed promotion:** If the slot has been retaken, the day is full, or the database operation fails, the entry is returned to the front of the waitlist using an atomic `MULTI` operation.

- **Crash recovery:** If the worker crashes during promotion, `recoverStuck()` returns processing entries to their waitlists on startup. Entries belonging to deleted patients or doctors are dropped and logged.

- **Job retries:** Failed jobs are retried up to three times and then logged as `job_failed`.

- **Notifications:** Every confirmed booking, whether direct or promoted, enqueues a job on `queue:notify`. The worker writes the confirmation message to the audit log as a `notification` event.

- **Limitation:** The worker books the freed slot for the first waiting patient of that doctor and day, which may differ from the exact time they originally requested.

## Tests

Run:

```bash
npm test
```

The Jest suite contains 14 tests covering:

- Refund calculation across all three tiers.
- Both refund boundaries (24 and 48 hours).
- Valid appointment slots.
- Working-hours boundaries (16:30 and 17:00).
- Invalid slot alignment (09:15).
- Outside working hours (08:30).
- Malformed input.
- Impossible dates.
- Past appointment times.

Tests do not require a live MySQL or Redis connection.