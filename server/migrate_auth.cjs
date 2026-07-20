const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres:123@localhost:5432/erems_db' });

async function migrate() {
  await client.connect();
  
  try {
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS sales_id UUID REFERENCES sales(id) ON DELETE SET NULL;');
    console.log('Added sales_id to users');
  } catch (e) {
    console.log('sales_id may already exist');
  }
  
  try {
    await client.query('ALTER TABLE estimates ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;');
    console.log('Added is_locked to estimates');
  } catch (e) {
    console.log('is_locked may already exist');
  }
  
  const res = await client.query("SELECT username FROM users WHERE username = 'admin'");
  if (res.rows.length === 0) {
    await client.query("INSERT INTO users (username, password, full_name, role) VALUES ('admin', '123', 'Administrator', 'admin')");
    console.log('Inserted default admin');
  }
  
  await client.end();
}

migrate().catch(console.error);
