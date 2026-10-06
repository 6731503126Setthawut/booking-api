DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS equipment;

CREATE TABLE equipment (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  location TEXT NOT NULL
);

CREATE TABLE bookings (
  id            TEXT PRIMARY KEY,
  equipment_id  TEXT NOT NULL REFERENCES equipment(id),
  borrower_name TEXT NOT NULL,
  start_at      TEXT NOT NULL,
  end_at        TEXT NOT NULL,
  purpose       TEXT NOT NULL DEFAULT '',
  CHECK (start_at < end_at)
);

CREATE INDEX idx_bookings_eq_time ON bookings (equipment_id, start_at, end_at);

INSERT INTO equipment (id, name, location) VALUES
  ('eq-1', 'Projector A', 'Building 1'),
  ('eq-2', 'Camera Canon R6', 'Media Lab'),
  ('eq-3', 'Meeting Room 301', 'Building 3');
