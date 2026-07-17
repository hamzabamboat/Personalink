-- OAuth 2.1 authorization server tables.

create table if not exists oauth_clients (
  client_id                  text primary key,
  client_secret              text,
  client_name                text,
  redirect_uris              text[]      not null,
  grant_types                text[]      not null default '{authorization_code,refresh_token}',
  token_endpoint_auth_method text        not null default 'none',
  created_at                 timestamptz not null default now()
);

create table if not exists oauth_auth_codes (
  code            text primary key,          -- sha256(raw code) hex
  client_id       text        not null references oauth_clients(client_id),
  user_id         uuid        not null,
  redirect_uri    text        not null,
  scope           text        not null,
  code_challenge  text        not null,      -- PKCE S256 challenge
  expires_at      timestamptz not null,
  consumed_at     timestamptz
);

create table if not exists oauth_tokens (
  id                 uuid        primary key default gen_random_uuid(),
  access_token       text        not null,   -- sha256(raw token) hex
  refresh_token      text,                    -- sha256(raw token) hex
  client_id          text        not null references oauth_clients(client_id),
  user_id            uuid        not null,
  scope              text        not null,
  access_expires_at  timestamptz not null,
  refresh_expires_at timestamptz,
  revoked_at         timestamptz,
  last_used_at       timestamptz,
  created_at         timestamptz not null default now()
);

create index if not exists oauth_tokens_access_idx  on oauth_tokens (access_token);
create index if not exists oauth_tokens_refresh_idx on oauth_tokens (refresh_token);
create index if not exists oauth_tokens_user_idx    on oauth_tokens (user_id);
