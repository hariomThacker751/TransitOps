/**
 * Seed the four demo users (the users table is NOT imported from CSV).
 * Passwords are bcrypt-hashed. Idempotent: re-running updates existing users.
 *
 * Usage:
 *   node src/seeds/seedUsers.js
 */
const bcrypt = require('bcrypt')
const User = require('../models/User')
const { initSchema } = require('../models')

const DEMO_USERS = [
  { name: 'Fleet Admin', email: 'fleet@transitops.com', password: 'Fleet@123', role: 'fleet_manager', driver_id: null },
  { name: 'Driver Ops', email: 'driver@transitops.com', password: 'Driver@123', role: 'driver', driver_id: 'DRV-01' },
  { name: 'Safety Team', email: 'safety@transitops.com', password: 'Safety@123', role: 'safety_officer', driver_id: null },
  { name: 'Finance Team', email: 'finance@transitops.com', password: 'Finance@123', role: 'financial_analyst', driver_id: null },
]

async function main() {
  console.log('[seed] Ensuring database + users table exist...')
  await initSchema()

  console.log('[seed] Upserting demo users...')
  for (const u of DEMO_USERS) {
    const password_hash = await bcrypt.hash(u.password, 10)
    const saved = await User.upsert({
      name: u.name,
      email: u.email.toLowerCase(),
      password_hash,
      role: u.role,
      driver_id: u.driver_id,
    })
    console.log(`  ${saved.id}. ${saved.email} (${saved.role})`)
  }

  console.log('\n[seed] Demo users ready.')
  process.exit(0)
}

main().catch((err) => {
  console.error('[seed] User seeding failed:', err)
  process.exit(1)
})