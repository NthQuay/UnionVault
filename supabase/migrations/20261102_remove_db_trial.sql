-- Remove DB auto-trial on signup; keep Stripe trial only.
-- Add granted_access_until for manual access grants.

-- ── 1. Change default tier from 'trial' to 'free' ─────────────────────────
ALTER TABLE user_profiles ALTER COLUMN tier SET DEFAULT 'free';

-- ── 2. Add granted_access_until column ─────────────────────────────────────
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS granted_access_until timestamptz;

-- ── 3. Update signup trigger to insert tier='free' ─────────────────────────
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, tier)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Migrate existing DB-trial users to free ─────────────────────────────
-- Safe: Stripe-trialing users have tier='full' (set by webhook), not 'trial'.
UPDATE user_profiles SET tier = 'free' WHERE tier = 'trial';

-- ── 5. Rewrite get_my_subscription() RPC ───────────────────────────────────
-- Priority: granted_access_until → Stripe active → Stripe trialing → free
CREATE OR REPLACE FUNCTION get_my_subscription()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _profile user_profiles;
  _sub     subscriptions;
  _tier    text;
  _trial_days_left int := 0;
BEGIN
  SELECT * INTO _profile FROM user_profiles WHERE user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN json_build_object('tier', 'free', 'trialDaysLeft', 0);
  END IF;

  -- 1. Check granted access
  IF _profile.granted_access_until IS NOT NULL
     AND _profile.granted_access_until > now() THEN
    RETURN json_build_object(
      'tier',          'full',
      'trialDaysLeft', 0,
      'grantedAccess', true,
      'grantedUntil',  _profile.granted_access_until
    );
  END IF;

  -- 2. Check Stripe subscription
  SELECT * INTO _sub FROM subscriptions WHERE user_id = auth.uid();

  IF _sub IS NOT NULL AND _sub.status = 'active' THEN
    _tier := 'full';
  ELSIF _sub IS NOT NULL AND _sub.status = 'trialing' THEN
    _tier := 'trial';
    IF _sub.trial_end IS NOT NULL THEN
      _trial_days_left := GREATEST(0,
        EXTRACT(EPOCH FROM (_sub.trial_end - now()))::int / 86400);
    END IF;
  ELSE
    _tier := 'free';
  END IF;

  RETURN json_build_object(
    'tier',               _tier,
    'trialDaysLeft',      _trial_days_left,
    'trialEnd',           _sub.trial_end,
    'subStatus',          _sub.status,
    'cancelAtPeriodEnd',  COALESCE(_sub.cancel_at_period_end, false),
    'currentPeriodEnd',   _sub.current_period_end,
    'priceId',            _sub.price_id
  );
END;
$$;
