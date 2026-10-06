import { Hono } from 'hono'
import type { Context } from 'hono'

type Env = { Bindings: { DB: D1Database } }

class HttpError extends Error {
  constructor(public status: 400 | 404 | 409, message: string) {
    super(message)
  }
}

type BookingRow = {
  id: string
  equipment_id: string
  borrower_name: string
  start_at: string
  end_at: string
  purpose: string
}

type BookingInput = {
  equipmentId: string
  borrowerName: string
  startAt: string
  endAt: string
  purpose: string
}

const FIELDS = ['equipmentId', 'borrowerName', 'startAt', 'endAt', 'purpose'] as const

const toBooking = (r: BookingRow) => ({
  id: r.id,
  equipmentId: r.equipment_id,
  borrowerName: r.borrower_name,
  startAt: r.start_at,
  endAt: r.end_at,
  purpose: r.purpose,
})

// ---------- validation helpers ----------
function str(v: unknown, field: string, required = true): string {
  if (v === undefined || v === null) {
    if (required) throw new HttpError(400, `${field} is required`)
    return ''
  }
  if (typeof v !== 'string') throw new HttpError(400, `${field} must be a string`)
  const t = v.trim()
  if (required && t === '') throw new HttpError(400, `${field} must not be empty`)
  return t
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/

function date(v: unknown, field: string): string {
  const s = str(v, field)
  const d = new Date(s)
  if (!ISO_RE.test(s) || Number.isNaN(d.getTime())) {
    throw new HttpError(
      400,
      `${field} must be an ISO 8601 date with timezone, e.g. 2026-10-20T09:00:00.000Z`,
    )
  }
  return d.toISOString()
}

function validateBooking(b: Record<string, unknown>): BookingInput {
  const startAt = date(b.startAt, 'startAt')
  const endAt = date(b.endAt, 'endAt')
  if (new Date(startAt).getTime() >= new Date(endAt).getTime()) {
    throw new HttpError(400, 'startAt must be before endAt')
  }
  return {
    equipmentId: str(b.equipmentId, 'equipmentId'),
    borrowerName: str(b.borrowerName, 'borrowerName'),
    startAt,
    endAt,
    purpose: str(b.purpose, 'purpose', false),
  }
}

async function readJson(c: Context<Env>): Promise<Record<string, unknown>> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON')
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object')
  }
  return body as Record<string, unknown>
}

// ---------- db helpers (ทุก query ใช้ bind) ----------
async function findBooking(db: D1Database, id: string): Promise<BookingRow> {
  const row = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first<BookingRow>()
  if (!row) throw new HttpError(404, 'Booking not found')
  return row
}

async function assertEquipmentExists(db: D1Database, equipmentId: string) {
  const row = await db.prepare('SELECT id FROM equipment WHERE id = ?').bind(equipmentId).first()
  if (!row) throw new HttpError(400, `equipmentId "${equipmentId}" does not exist`)
}

async function assertNoOverlap(
  db: D1Database,
  equipmentId: string,
  startAt: string,
  endAt: string,
  excludeId = '',
) {
  const row = await db
    .prepare(
      `SELECT id FROM bookings
       WHERE equipment_id = ? AND start_at < ? AND end_at > ? AND id != ?
       LIMIT 1`,
    )
    .bind(equipmentId, endAt, startAt, excludeId)
    .first()
  if (row) throw new HttpError(409, 'Booking time overlaps with an existing booking')
}

// ---------- app ----------
const app = new Hono<Env>().basePath('/api')

app.get('/equipment', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, location FROM equipment ORDER BY id',
  ).all()
  return c.json(results)
})

app.get('/bookings', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM bookings ORDER BY start_at',
  ).all<BookingRow>()
  return c.json(results.map(toBooking))
})

app.get('/bookings/:id', async (c) => {
  const row = await findBooking(c.env.DB, c.req.param('id'))
  return c.json(toBooking(row))
})

app.post('/bookings', async (c) => {
  const input = validateBooking(await readJson(c))
  await assertEquipmentExists(c.env.DB, input.equipmentId)
  await assertNoOverlap(c.env.DB, input.equipmentId, input.startAt, input.endAt)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO bookings (id, equipment_id, borrower_name, start_at, end_at, purpose)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, input.equipmentId, input.borrowerName, input.startAt, input.endAt, input.purpose)
    .run()

  return c.json({ id, ...input }, 201)
})

app.patch('/bookings/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await findBooking(c.env.DB, id)
  const body = await readJson(c)
  if (!FIELDS.some((f) => f in body)) throw new HttpError(400, 'No updatable fields provided')

  const input = validateBooking({
    equipmentId: existing.equipment_id,
    borrowerName: existing.borrower_name,
    startAt: existing.start_at,
    endAt: existing.end_at,
    purpose: existing.purpose,
    ...Object.fromEntries(FIELDS.filter((f) => f in body).map((f) => [f, body[f]])),
  })

  await assertEquipmentExists(c.env.DB, input.equipmentId)
  await assertNoOverlap(c.env.DB, input.equipmentId, input.startAt, input.endAt, id)

  await c.env.DB.prepare(
    `UPDATE bookings
     SET equipment_id = ?, borrower_name = ?, start_at = ?, end_at = ?, purpose = ?
     WHERE id = ?`,
  )
    .bind(input.equipmentId, input.borrowerName, input.startAt, input.endAt, input.purpose, id)
    .run()

  return c.json({ id, ...input })
})

app.delete('/bookings/:id', async (c) => {
  const id = c.req.param('id')
  await findBooking(c.env.DB, id)
  await c.env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(id).run()
  return c.body(null, 204)
})

// ---------- error handling (JSON เสมอ) ----------
app.notFound((c) => c.json({ error: 'Route not found' }, 404))

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message }, err.status)
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
