ALTER TABLE device_state ADD COLUMN format_version INTEGER DEFAULT 1;
-- Readers accept versions 1 and 2 before writers begin emitting version 2.
