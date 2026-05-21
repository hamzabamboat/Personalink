-- Add a dedicated `age` column to user_profiles.
-- Onboarding now collects "Current age" (replacing "years of experience").
alter table user_profiles add column if not exists age integer;
