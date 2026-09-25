-- api/stripe/webhook/route.ts's beat-purchase branch used to check
-- "does a beat_sales row for this stripe_session_id already exist?" and
-- then, if not, update beats + insert beat_sales as two separate
-- statements - a check-then-write race. Stripe can and does redeliver
-- checkout.session.completed / async_payment_succeeded for the same
-- session (its own documented retry behavior), and two webhook
-- invocations landing close together could both pass the "not found"
-- check before either insert committed, producing two beat_sales rows
-- for one payment.
--
-- A UNIQUE constraint makes the second INSERT fail instead of duplicating
-- the row; the webhook code now inserts first and treats a 23505 unique
-- violation as "already processed" (see route.ts), the same idempotency
-- pattern events.js already uses for event_participants.
--
-- HOW TO APPLY: paste into the Supabase SQL Editor and run once. Idempotent
-- (ADD CONSTRAINT IF NOT EXISTS isn't valid Postgres syntax for constraints,
-- so this uses a DO block to skip if it already exists). Deduplicates first
-- in case this exact race already produced duplicate rows for the same
-- session - otherwise the ALTER TABLE below would fail outright.

DELETE FROM beat_sales a
    USING beat_sales b
    WHERE a.id > b.id
      AND a.stripe_session_id = b.stripe_session_id;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'beat_sales_stripe_session_id_key'
    ) THEN
        ALTER TABLE beat_sales
            ADD CONSTRAINT beat_sales_stripe_session_id_key UNIQUE (stripe_session_id);
    END IF;
END $$;
