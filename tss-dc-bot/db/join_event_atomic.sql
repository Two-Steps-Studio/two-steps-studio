-- handleEventJoin (events/events.js) checked the participant count and
-- the event's max_participants as a separate SELECT before the INSERT,
-- with no lock between them. event_participants_schema.sql already added
-- a UNIQUE(event_id, user_id) constraint to close the double-join race,
-- but nothing stops the *capacity* from being oversold: two different
-- users joining an event at 19/20 within the same moment can both read
-- count = 19, both pass "count < max_participants", and both inserts
-- succeed - 21/20 participants.
--
-- join_event() moves the whole read-check-write into one function and
-- takes a row lock on the event first (`FOR UPDATE`), so concurrent joins
-- for the *same* event serialize on that lock (joins for different events
-- don't block each other). events.js now calls this instead of doing the
-- check and insert as separate round-trips.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once.
-- Idempotent (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION join_event(
    p_event_id INTEGER,
    p_user_id TEXT,
    p_username TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_max_participants INTEGER;
    v_count INTEGER;
BEGIN
    SELECT max_participants INTO v_max_participants
    FROM e_sport_events
    WHERE id = p_event_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'event_not_found';
    END IF;

    SELECT COUNT(*) INTO v_count FROM event_participants WHERE event_id = p_event_id;

    IF v_max_participants IS NOT NULL AND v_count >= v_max_participants THEN
        RAISE EXCEPTION 'event_full';
    END IF;

    INSERT INTO event_participants (event_id, user_id, username)
    VALUES (p_event_id, p_user_id, p_username);

    RETURN v_count + 1;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'already_joined';
END;
$$ LANGUAGE plpgsql;
