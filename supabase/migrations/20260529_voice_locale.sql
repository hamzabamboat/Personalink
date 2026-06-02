-- Language mode for the post generator: applied additively on top of voice fingerprint.
alter table user_profiles
  add column if not exists voice_locale text not null default 'english'
  check (voice_locale in ('english', 'indian_english', 'hinglish'));
