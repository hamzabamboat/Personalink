-- Private per-user token for the iCal/.ics subscription feed (Apple Calendar,
-- Outlook, Google, any calendar app). The token authenticates the anonymous
-- feed fetch that calendar clients make, so no login/OAuth is needed.
alter table users add column if not exists calendar_feed_token text;
create unique index if not exists users_calendar_feed_token_idx
  on users(calendar_feed_token) where calendar_feed_token is not null;
