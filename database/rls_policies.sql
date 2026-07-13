-- Row Level Security policies for Nexora.
--
-- The backend connects to Supabase using the service role key, which bypasses
-- RLS entirely. That means today every authorization boundary is enforced only
-- by application code (manually filtering .eq("user_id", ...) on each query).
-- Enabling these policies adds a second, database-level enforcement layer so a
-- missed filter in application code can no longer expose or modify another
-- user's data.
--
-- Run this in the Supabase SQL editor for your project. Review against your
-- actual column names/tables before applying to production data.

alter table documents enable row level security;
alter table investigations enable row level security;
alter table alerts enable row level security;

create policy "Users can manage their own documents"
  on documents
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own investigations"
  on investigations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own alerts"
  on alerts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
