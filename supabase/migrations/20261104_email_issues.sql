-- Deliverability: tracks guest email addresses that have bounced or been marked as spam,
-- so the app can stop resending to them (which otherwise erodes the sending domain's
-- reputation and makes it MORE likely every other guest's email lands in spam).
-- Written only by the resend-webhook edge function (service role) — never directly by a
-- client, so there's no insert/update/delete policy for authenticated/anon roles.
create table if not exists email_issues (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references auth.users(id) on delete cascade,
  guest_id text not null,
  email text,
  kind text not null check (kind in ('bounced', 'complained')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists email_issues_couple_guest_idx on email_issues(couple_id, guest_id);

alter table email_issues enable row level security;

-- A couple can see their own guests' email issues (to merge into the guest list) and
-- remove one if they've resolved it another way (e.g. confirmed the correct address by
-- phone) — same ownership model as rsvp_responses/vendor_tokens elsewhere in this schema.
create policy "Couples read their own email issues"
  on email_issues for select
  using (auth.uid() = couple_id);

create policy "Couples delete their own email issues"
  on email_issues for delete
  using (auth.uid() = couple_id);
