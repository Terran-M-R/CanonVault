-- Migration 001: Users table
-- Stores user account info linked to Firebase Auth

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) NOT NULL UNIQUE,
  email        VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
