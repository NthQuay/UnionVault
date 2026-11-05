-- Sent emails log: one row per email UnionVault sends for a couple (save-the-dates,
-- invites, reminders, vendor briefs, appointments, and the automatic RSVP-confirmation and
-- Wishing Well emails). Shown on Communications → Sent and in each guest's details.
-- Written only by the email edge functions (service role); delivery status is updated by
-- resend-webhook. Couples can read and delete their own rows, nothing else.
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('savedate','invite','reminder','vendor','appointment','confirm','ww','other')),
  automatic boolean not null default false,
  subject text,
  to_name text,
  to_email text not null,
  guest_id text,
  from_name text,
  resend_id text,
  status text not null default 'sent' check (status in ('sent','delivered','bounced','complained')),
  status_at timestamptz,
  status_reason text,
  html text
);

create index if not exists email_log_couple_created_idx on email_log (couple_id, created_at desc);
create index if not exists email_log_resend_id_idx on email_log (resend_id) where resend_id is not null;

alter table email_log enable row level security;

create policy "Couples read their own sent emails"
  on email_log for select to authenticated
  using ((select auth.uid()) = couple_id);

create policy "Couples delete their own sent emails"
  on email_log for delete to authenticated
  using ((select auth.uid()) = couple_id);
