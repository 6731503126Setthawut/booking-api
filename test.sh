#!/usr/bin/env bash
BASE_URL=${BASE_URL:-http://localhost:8787/api}
H='Content-Type: application/json'
echo "BASE_URL: $BASE_URL"
show() { echo; echo "### $1"; }
idof() { grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4; }

show "1. GET /equipment -> 200"
curl -si "$BASE_URL/equipment"

show "2. POST booking 09-11 -> 201"
OUT=$(curl -si -X POST "$BASE_URL/bookings" -H "$H" -d '{"equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}')
echo "$OUT"; A=$(echo "$OUT" | idof)

show "3. GET /bookings -> 200"
curl -si "$BASE_URL/bookings"

show "4. GET /bookings/:id -> 200"
curl -si "$BASE_URL/bookings/$A"

show "5. PATCH move to 12-14 -> 200"
curl -si -X PATCH "$BASE_URL/bookings/$A" -H "$H" -d '{"startAt":"2026-10-20T12:00:00.000Z","endAt":"2026-10-20T14:00:00.000Z","purpose":"Updated class presentation"}'

show "6. POST start >= end -> 400"
curl -si -X POST "$BASE_URL/bookings" -H "$H" -d '{"equipmentId":"eq-1","borrowerName":"X","startAt":"2026-10-21T11:00:00.000Z","endAt":"2026-10-21T09:00:00.000Z"}'

show "7. POST overlap 12:30-13:30 -> 409"
curl -si -X POST "$BASE_URL/bookings" -H "$H" -d '{"equipmentId":"eq-1","borrowerName":"Suda Dee","startAt":"2026-10-20T12:30:00.000Z","endAt":"2026-10-20T13:30:00.000Z"}'

show "8. GET not-found -> 404"
curl -si "$BASE_URL/bookings/not-found"

show "9. missing borrowerName -> 400"
curl -si -X POST "$BASE_URL/bookings" -H "$H" -d '{"equipmentId":"eq-1","startAt":"2026-10-22T09:00:00.000Z","endAt":"2026-10-22T10:00:00.000Z"}'

show "10. equipmentId not found -> 400"
curl -si -X POST "$BASE_URL/bookings" -H "$H" -d '{"equipmentId":"eq-999","borrowerName":"X","startAt":"2026-10-22T09:00:00.000Z","endAt":"2026-10-22T10:00:00.000Z"}'

show "11. invalid JSON -> 400"
curl -si -X POST "$BASE_URL/bookings" -H "$H" -d '{bad json'

show "12. timezone overlap 16:00+07:00 (=09Z) vs booking 12-14Z -> 201 (no overlap)"
OUT=$(curl -si -X POST "$BASE_URL/bookings" -H "$H" -d '{"equipmentId":"eq-1","borrowerName":"TZ","startAt":"2026-10-20T16:00:00+07:00","endAt":"2026-10-20T18:00:00+07:00"}')
echo "$OUT"; B=$(echo "$OUT" | idof)

show "13. timezone overlap 19:00+07:00 (=12Z) vs 12-14Z -> 409"
curl -si -X POST "$BASE_URL/bookings" -H "$H" -d '{"equipmentId":"eq-1","borrowerName":"TZ2","startAt":"2026-10-20T19:00:00+07:00","endAt":"2026-10-20T20:00:00+07:00"}'

show "14. PATCH B into booking A time -> 409"
curl -si -X PATCH "$BASE_URL/bookings/$B" -H "$H" -d '{"startAt":"2026-10-20T12:30:00.000Z","endAt":"2026-10-20T13:30:00.000Z"}'

show "15. PATCH B purpose only (no self-conflict) -> 200"
curl -si -X PATCH "$BASE_URL/bookings/$B" -H "$H" -d '{"purpose":"no self-conflict"}'

show "16. SQL injection in borrowerName -> 201 stored as plain text"
OUT=$(curl -si -X POST "$BASE_URL/bookings" -H "$H" -d "{\"equipmentId\":\"eq-2\",\"borrowerName\":\"' OR 1=1; DROP TABLE bookings; --\",\"startAt\":\"2026-10-23T09:00:00.000Z\",\"endAt\":\"2026-10-23T10:00:00.000Z\"}")
echo "$OUT"; C=$(echo "$OUT" | idof)
echo "--- table still exists:"; curl -si "$BASE_URL/bookings/$C"

show "17. DELETE A -> 204"
curl -si -X DELETE "$BASE_URL/bookings/$A"

show "18. DELETE A again -> 404"
curl -si -X DELETE "$BASE_URL/bookings/$A"

show "19. unknown route -> 404 JSON"
curl -si "$BASE_URL/nothing"
