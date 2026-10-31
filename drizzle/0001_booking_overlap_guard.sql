-- Garantie absolue anti double-réservation : deux réservations « bloquantes »
-- (PENDING, RESCHEDULE_PROPOSED, CONFIRMED) ne peuvent jamais se chevaucher,
-- même en cas de requêtes simultanées. Postgres rejette la seconde (code 23P01).
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (tstzrange("start_at", "end_at", '[)') WITH &&)
  WHERE ("status" IN ('PENDING', 'RESCHEDULE_PROPOSED', 'CONFIRMED'));
