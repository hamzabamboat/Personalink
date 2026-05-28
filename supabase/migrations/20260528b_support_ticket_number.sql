ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS ticket_number text;

CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_ticket_number_idx
  ON support_tickets (ticket_number);
