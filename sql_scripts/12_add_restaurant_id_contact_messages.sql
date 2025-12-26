ALTER TABLE contact_messages
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurant_settings(id);

-- While we are at it, let's index it for performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_restaurant_id ON contact_messages(restaurant_id);
