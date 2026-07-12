require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/db');
const User = require('../models/User');

const DEMO_USERS = [
  {
    name: 'Fleet Admin',
    email: 'fleet@transitops.com',
    password: 'Fleet@123',
    role: 'fleet_manager',
    driver_id: null,
  },
  {
    name: 'Driver Ops',
    email: 'driver@transitops.com',
    password: 'Driver@123',
    role: 'driver',
    driver_id: null,
  },
  {
    name: 'Safety Team',
    email: 'safety@transitops.com',
    password: 'Safety@123',
    role: 'safety_officer',
    driver_id: null,
  },
  {
    name: 'Finance Team',
    email: 'finance@transitops.com',
    password: 'Finance@123',
    role: 'financial_analyst',
    driver_id: null,
  },
];

const seedUsers = async () => {
  try {
    console.log('\n🔐 Starting user seeding...\n');

    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    // Sync users table only (create if not exists)
    await User.sync({ alter: false, force: false });
    console.log('✅ Users table ready.');

    let inserted = 0;
    let skipped = 0;

    for (const userData of DEMO_USERS) {
      const existing = await User.findOne({ where: { email: userData.email } });

      if (existing) {
        console.log(`   ⏭️  Skipping ${userData.email} (already exists)`);
        skipped++;
        continue;
      }

      const saltRounds = 12;
      const password_hash = await bcrypt.hash(userData.password, saltRounds);

      await User.create({
        name: userData.name,
        email: userData.email,
        password_hash,
        role: userData.role,
        driver_id: userData.driver_id,
      });

      console.log(`   ✅ Created: ${userData.email} (${userData.role})`);
      inserted++;
    }

    console.log(`\n📊 User seeding summary:`);
    console.log(`   Inserted : ${inserted}`);
    console.log(`   Skipped  : ${skipped}`);
    console.log(`   Total    : ${DEMO_USERS.length}`);

    console.log('\n📋 Demo Credentials:');
    console.log('   fleet@transitops.com  / Fleet@123    (fleet_manager)');
    console.log('   driver@transitops.com / Driver@123   (driver)');
    console.log('   safety@transitops.com / Safety@123   (safety_officer)');
    console.log('   finance@transitops.com/ Finance@123  (financial_analyst)');

    console.log('\n✅ User seeding complete!\n');
  } catch (error) {
    console.error('❌ User seeding failed:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

seedUsers();
