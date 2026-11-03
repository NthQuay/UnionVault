-- guest_id (added in 20261103_rsvp_response_guest_id.sql) was created as uuid, but this
-- app's guest ids are generated client-side by uid() (js/utils.js:
-- 'id'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)), which is not valid
-- UUID syntax. Every insert that included a guest_id was rejected by Postgres with 22P02
-- ("invalid input syntax for type uuid"), silently breaking every public RSVP submission
-- since the column was added — the "Send my RSVP" button looked like it did nothing.
ALTER TABLE rsvp_responses ALTER COLUMN guest_id TYPE text;
