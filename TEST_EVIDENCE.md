BASE_URL: http://localhost:8787/api

### 1. GET /equipment -> 200
HTTP/1.1 200 OK
Content-Length: 186
Content-Type: application/json

[{"id":"eq-1","name":"Projector A","location":"Building 1"},{"id":"eq-2","name":"Camera Canon R6","location":"Media Lab"},{"id":"eq-3","name":"Meeting Room 301","location":"Building 3"}]
### 2. POST booking 09-11 -> 201
HTTP/1.1 201 Created
Content-Length: 201
Content-Type: application/json

{"id":"b08d44a9-b38e-47fa-b756-c8b3b03f8a0e","equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}

### 3. GET /bookings -> 200
HTTP/1.1 200 OK
Content-Length: 203
Content-Type: application/json

[{"id":"b08d44a9-b38e-47fa-b756-c8b3b03f8a0e","equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}]
### 4. GET /bookings/:id -> 200
HTTP/1.1 200 OK
Content-Length: 201
Content-Type: application/json

{"id":"b08d44a9-b38e-47fa-b756-c8b3b03f8a0e","equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}
### 5. PATCH move to 12-14 -> 200
HTTP/1.1 200 OK
Content-Length: 209
Content-Type: application/json

{"id":"b08d44a9-b38e-47fa-b756-c8b3b03f8a0e","equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T12:00:00.000Z","endAt":"2026-10-20T14:00:00.000Z","purpose":"Updated class presentation"}
### 6. POST start >= end -> 400
HTTP/1.1 400 Bad Request
Content-Length: 40
Content-Type: application/json

{"error":"startAt must be before endAt"}
### 7. POST overlap 12:30-13:30 -> 409
HTTP/1.1 409 Conflict
Content-Length: 58
Content-Type: application/json

{"error":"Booking time overlaps with an existing booking"}
### 8. GET not-found -> 404
HTTP/1.1 404 Not Found
Content-Length: 29
Content-Type: application/json

{"error":"Booking not found"}
### 9. missing borrowerName -> 400
HTTP/1.1 400 Bad Request
Content-Length: 36
Content-Type: application/json

{"error":"borrowerName is required"}
### 10. equipmentId not found -> 400
HTTP/1.1 400 Bad Request
Content-Length: 49
Content-Type: application/json

{"error":"equipmentId \"eq-999\" does not exist"}
### 11. invalid JSON -> 400
HTTP/1.1 400 Bad Request
Content-Length: 43
Content-Type: application/json

{"error":"Request body must be valid JSON"}
### 12. timezone overlap 16:00+07:00 (=09Z) vs booking 12-14Z -> 201 (no overlap)
HTTP/1.1 201 Created
Content-Length: 171
Content-Type: application/json

{"id":"08cbe595-dded-4ae4-a997-594d08552ca7","equipmentId":"eq-1","borrowerName":"TZ","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":""}

### 13. timezone overlap 19:00+07:00 (=12Z) vs 12-14Z -> 409
HTTP/1.1 409 Conflict
Content-Length: 58
Content-Type: application/json

{"error":"Booking time overlaps with an existing booking"}
### 14. PATCH B into booking A time -> 409
HTTP/1.1 409 Conflict
Content-Length: 58
Content-Type: application/json

{"error":"Booking time overlaps with an existing booking"}
### 15. PATCH B purpose only (no self-conflict) -> 200
HTTP/1.1 200 OK
Content-Length: 187
Content-Type: application/json

{"id":"08cbe595-dded-4ae4-a997-594d08552ca7","equipmentId":"eq-1","borrowerName":"TZ","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"no self-conflict"}
### 16. SQL injection in borrowerName -> 201 stored as plain text
HTTP/1.1 201 Created
Content-Length: 202
Content-Type: application/json

{"id":"643ffa58-977b-48f6-a78c-fb691522b0da","equipmentId":"eq-2","borrowerName":"' OR 1=1; DROP TABLE bookings; --","startAt":"2026-10-23T09:00:00.000Z","endAt":"2026-10-23T10:00:00.000Z","purpose":""}
--- table still exists:
HTTP/1.1 200 OK
Content-Length: 202
Content-Type: application/json

{"id":"643ffa58-977b-48f6-a78c-fb691522b0da","equipmentId":"eq-2","borrowerName":"' OR 1=1; DROP TABLE bookings; --","startAt":"2026-10-23T09:00:00.000Z","endAt":"2026-10-23T10:00:00.000Z","purpose":""}
### 17. DELETE A -> 204
HTTP/1.1 204 No Content


### 18. DELETE A again -> 404
HTTP/1.1 404 Not Found
Content-Length: 29
Content-Type: application/json

{"error":"Booking not found"}
### 19. unknown route -> 404 JSON
HTTP/1.1 404 Not Found
Content-Length: 27
Content-Type: application/json

{"error":"Route not found"}