# API Contract
Base URL: http://localhost:8787/api

## Assumptions
1. Overlap: newStart < existingEnd AND newEnd > existingStart (same equipment). Touching edges (11:00 end / 11:00 start) is NOT an overlap.
2. Times are ISO 8601 with timezone; stored and returned as UTC (toISOString).
3. Unknown equipmentId -> 400 (invalid data in the body, not a missing URL resource).
4. PATCH is partial: merge with existing values, re-validate the whole booking, re-check overlap (excluding itself).
5. purpose is optional (default "").

## Endpoints
| Method | Path | Success | Errors |
|---|---|---|---|
| GET | /equipment | 200 | - |
| GET | /bookings | 200 | - |
| GET | /bookings/:id | 200 | 404 |
| POST | /bookings | 201 | 400, 409 |
| PATCH | /bookings/:id | 200 | 400, 404, 409 |
| DELETE | /bookings/:id | 204 | 404 |

Booking payload/response: id, equipmentId, borrowerName, startAt, endAt, purpose.

## Status codes
- 400: missing/invalid field, bad date format, startAt >= endAt, unknown equipmentId, invalid JSON
- 404: booking id not found, or unknown route
- 409: request is valid but conflicts with an existing booking time for the same equipment
- 500: unexpected error (generic message, details only in server log)

## Error format
{ "error": "message" }
