-- Seed engagement prompts
INSERT INTO engagement_prompts (id, body, category, is_active, usage_count) VALUES
  (gen_random_uuid(), 'What''s something you''ve always wanted to tell me?', 'curiosity', true, 0),
  (gen_random_uuid(), 'Rate my vibe honestly', 'rating', true, 0),
  (gen_random_uuid(), 'What''s your first impression of me?', 'impression', true, 0),
  (gen_random_uuid(), 'Tell me something unexpected', 'open', true, 0),
  (gen_random_uuid(), 'What do you think my biggest strength is?', 'positive', true, 0),
  (gen_random_uuid(), 'What song do I give off?', 'fun', true, 0),
  (gen_random_uuid(), 'Be honest — what do you really think of me?', 'honest', true, 0),
  (gen_random_uuid(), 'What would you want to tell me if I couldn''t find out it was you?', 'anonymous', true, 0),
  (gen_random_uuid(), 'What''s something we should do together?', 'connection', true, 0),
  (gen_random_uuid(), 'What kind of energy do I bring to a room?', 'vibe', true, 0);
