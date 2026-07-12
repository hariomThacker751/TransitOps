/**
 * Database setup script.
 * Creates the transitops_db database if it doesn't exist.
 *
 * Run this ONCE before running seed:all
 * Usage: node src/seeds/setupDb.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql2 = require('mysql2/promise');

const setupDb = async () => {
  let conn;
  try {
    console.log('\n🔧 TransitOps Database Setup\n');

    const dbName = process.env.DB_NAME || 'transitops_db';

    // Connect without specifying a database
    conn = await mysql2.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    console.log('✅ Connected to MySQL server');

    // Create database if not exists
    await conn.execute(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database '${dbName}' is ready`);

    // Verify
    const [rows] = await conn.execute(`SHOW DATABASES LIKE '${dbName}'`);
    if (rows.length > 0) {
      console.log(`\n🎉 Database setup complete!`);
      console.log(`   Database: ${dbName}`);
      console.log(`\nNext steps:`);
      console.log(`   npm run seed:all   # Import CSV data and create demo users`);
      console.log(`   npm run dev        # Start development server\n`);
    }
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   → MySQL server is not running. Please start MySQL first.');
      console.error('   → Windows: net start MySQL80 (or your MySQL service name)');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   → Wrong username/password. Check DB_USER and DB_PASSWORD in .env');
    }
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
};

setupDb();
