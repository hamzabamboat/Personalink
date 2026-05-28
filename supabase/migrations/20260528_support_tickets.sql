CREATE TABLE IF NOT EXISTS support_tickets (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  sender_email   text        NOT NULL,
  subject        text        NOT NULL DEFAULT '',
  body_text      text        NOT NULL DEFAULT '',
  intent         text,
  confidence     float       CHECK (confidence >= 0 AND confidence <= 1),
  ai_reply       text,
  action         text        CHECK (action IN ('auto_sent', 'escalated')),
  user_plan      text,
  user_id        uuid        REFERENCES users(id) ON DELETE SET NULL,
  resolved_at    timestamptz
);

CREATE INDEX support_tickets_sender_idx     ON support_tickets (sender_email);
CREATE INDEX support_tickets_created_idx    ON support_tickets (created_at DESC);
CREATE INDEX support_tickets_action_idx     ON support_tickets (action);
CREATE INDEX support_tickets_unresolved_idx ON support_tickets (action, resolved_at)
  WHERE resolved_at IS NULL;
