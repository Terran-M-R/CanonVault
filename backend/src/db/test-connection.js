/**
 * test-connection.js
 * Quick script to verify the DATABASE_URL is valid and the DB is reachable.
 * Usage: node src/db/test-connection.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testConnection() {
  console.log('Attempting to connect with DATABASE_URL:',
    process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':***@') : 'NOT SET'
  );
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    console.log('Database connection successful!');
    console.log('Server time:', result.rows[0].current_time);
  } catch (err) {
    console.error('Database connection failed:');
    console.error('  Message:', err.message);
    console.error('  Code:', err.code);
    console.error('  Detail:', err.detail || 'none');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();
