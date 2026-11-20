# MediBook: Clinic Appointment System

Node.js, Express, MySQL (mysql2, parameterized queries only), Redis. No ORM.

## Setup

Requirements: Node 18+, Docker (for MySQL 8 and Redis), or your own MySQL 8.0.16+ and Redis.

1. Start MySQL and Redis (replace the password with your own):

   docker run --name medibook-mysql -e 'MYSQL_ROOT_PASSWORD=your_password' -p 3306:3306 -d mysql:8
   docker run --name medibook-redis -p 6379:6379 -d redis:7

2. Create the database and load sample data.

   PowerShell:
   Get-Content database\schema.sql | docker exec -i -e 'MYSQL_PWD=your_password' medibook-mysql mysql -uroot
   Get-Content database\seed.sql | docker exec -i -e 'MYSQL_PWD=your_password' medibook-mysql mysql -uroot

   Bash:
   docker exec -i medibook-mysql mysql -uroot -pyour_password < database/schema.sql
   docker exec -i medibook-mysql mysql -uroot -pyour_password < database/seed.sql

3. Copy `.env.example` to `.env` and set `DB_PASSWORD`. `.env` is git-ignored.

4. Install and run:

   npm install
   npm start          # web server on http://localhost:3000
   npm run worker     # separate process: waitlist promotion and notifications
   npm test           # Jest unit tests (no MySQL or Redis needed)

### .env.example

PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=change_me
DB_NAME=medibook
REDIS_HOST=localhost
REDIS_PORT=6379

## Structure

database/      schema.sql, seed.sql
src/models/    all SQL (parameterized, `?` placeholders)
src/controllers/ validation and business logic, never touches the DB directly
src/routes/    URL and method mapping
src/utils/     pure functions (refund, slot validation), audit logger, queue helpers
src/workers/   worker process
locales/       en.json, fr.json
tests/         Jest tests
schema-diagram.png   Part A diagram

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET/POST | /api/patients | list, create |
| GET/PUT/DELETE | /api/patients/:id | read, update, delete |
| GET/POST | /api/doctors | list, create |
| GET/PUT/DELETE | /api/doctors/:id | read, update, delete |
| GET | /api/doctors/:id/stats | revenue, upcoming count, next 7 days, utilization |
| POST | /api/appointments | book |
| POST | /api/appointments/:id/cancel | cancel with refund |
| POST | /api/waitlist | join a waitlist |
| GET | /api/reports/doctors | every doctor's appointments and revenue |
| GET | /api/reports/busy-days | doctor-days above 80% capacity |
| GET | /feedback?lang=en\|fr | i18n feedback page |

Status codes: 201 created, 204 deleted, 400 bad input, 404 not found, 409 conflict (slot taken, day full, already cancelled, duplicate), 422 invalid slot (not on a 30-minute boundary, outside 09:00-17:00, in the past).

## Refund policy

More than 48 hours before the appointment: 100%. From 24 hours up to and including 48 hours: 50%. Under 24 hours: 0%. So exactly 48h gives 50% and exactly 24h gives 50%. The Jest tests assert both boundaries. The refund is computed on the server from the appointment time and the amount paid.

## Justifications

### Part C: API and business rules

- REST design: nouns for resources, HTTP verbs for actions. Cancel is `POST /appointments/:id/cancel` rather than DELETE, because cancelling keeps the row for refund history, so it is a state change, not a deletion. Doctor stats live under the doctor resource. Reports are under `/reports`.
- No double booking: `appointments` has a stored generated column `active_slot` that equals `appt_datetime` when status is `booked` and NULL when cancelled, with `UNIQUE(doctor_id, active_slot)`. MySQL allows many NULLs in a unique index, so cancelled rows never block a slot, yet two active bookings can never share a doctor and time. This holds even when two requests arrive at the same instant, because the database rejects the second insert (ER_DUP_ENTRY), which the API maps to 409.
- 12 per day cap: a unique index cannot enforce a count, so booking runs in a transaction that locks the doctor row with `SELECT ... FOR UPDATE`, counts that day's booked appointments, then inserts. Bookings for the same doctor are serialized, so the count cannot be raced.
- Cancel and refund are atomic: one transaction locks the appointment row, computes the refund and updates status, refund_amount and cancelled_at together. A second cancel returns 409.
- Reports: all aggregation is in SQL (LEFT JOIN so doctors with zero appointments appear, GROUP BY, HAVING for the 80% rule). Revenue is total amount paid minus total refunds.
- Prices are stored as DECIMAL, and refund maths is done in cents to avoid floating-point errors.

### Part D: audit log

`src/utils/auditLogger.js` uses `fs.promises` only (no `*Sync` in request handlers). It creates `logs/` on first write with `mkdir({ recursive: true })` and appends one JSON line per event. The function catches its own errors and is not awaited by the controllers, so a logging failure can never fail or slow the user's request.

### Part E: queues and Redis

- Waitlist: one Redis list per doctor and day (`waitlist:<doctorId>:<date>`). A full day or taken slot returns 409 with `waitlist_offered: true`, and the patient joins with `POST /api/waitlist`.
- Cancellation pushes a job on `queue:promote`. A separate worker process (`npm run worker`) blocks on it, so the web server never does promotion work.
- Patient never vanishes: the worker moves the first waitlisted entry with `LMOVE` into `waitlist:processing` instead of popping it, so the patient is always in one list or the other. On success the entry is removed from processing. If the slot was retaken, the day is full again or the database errors, the entry goes back to the front of the waitlist in one atomic MULTI. If the worker crashes mid-promotion, `recoverStuck()` returns processing entries to their waitlists on startup. Entries for deleted patients or doctors are dropped and logged.
- Failed jobs are retried up to 3 times, then logged as `job_failed`.
- Notifications: every confirmed booking (direct or promoted) enqueues a job on `queue:notify`. The worker writes the confirmation message to the audit log as a `notification` event.
- Limitation: the worker books the freed slot for the first waiting patient of that doctor and day, which may differ from the exact time they originally asked for.

## Tests

`npm test` runs 14 Jest tests: refund tiers and both boundaries, and slot validation (valid slot, 16:30, 17:00, 09:15, 08:30, malformed input, impossible date, past time). They need no database or Redis.