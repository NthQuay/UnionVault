-- Carry the submitting guest's stable id alongside the free-text guest_name,
-- so the admin sync (and the Online RSVPs card's own grouping) can match a
-- response to its guest record reliably instead of by exact name-string
-- equality — which silently fails for a plus-one whose stored name is still
-- the "+1 (Host Name)" placeholder at the moment they submit their real one.
-- Nullable, no FK: guest ids are client-generated (STATE.guests lives in
-- planner_data's jsonb, not its own Postgres-managed table).

ALTER TABLE rsvp_responses ADD COLUMN IF NOT EXISTS guest_id uuid;
