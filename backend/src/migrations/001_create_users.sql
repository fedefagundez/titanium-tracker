CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  eve_character_id BIGINT UNIQUE NOT NULL,
  character_name VARCHAR(255) NOT NULL,
  corporation_id BIGINT,
  corporation_name VARCHAR(255),
  role VARCHAR(20) DEFAULT 'member',
  avatar_url TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
