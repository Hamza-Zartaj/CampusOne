import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import prisma from '../prisma/client.js';
import readline from 'readline';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Create Super Admin Account
 * This script creates the first Super Admin account in the system
 */
const createSuperAdmin = async () => {
  try {
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected to PostgreSQL');

    // Check if super admin already exists
    const existingSuperAdmin = await prisma.admin.findFirst({ where: { isSuperAdmin: true }, include: { user: true } });
    if (existingSuperAdmin) {
      console.log('\n⚠️  A Super Admin already exists in the system.');
      console.log(`   Username: ${existingSuperAdmin.user.username}`);
      console.log(`   Email: ${existingSuperAdmin.user.email}`);
      console.log(`   Employee ID: ${existingSuperAdmin.employeeId}`);

      const overwrite = await question('\nDo you want to create another Super Admin? (yes/no): ');
      if (overwrite.toLowerCase() !== 'yes' && overwrite.toLowerCase() !== 'y') {
        console.log('Operation cancelled.');
        rl.close();
        await prisma.$disconnect();
        process.exit(0);
      }
    }

    console.log('\n📝 Create Super Admin Account');
    console.log('================================\n');

    // Get user input
    const name = await question('Enter name: ');
    const employeeId = await question('Enter employee ID (will be used as username): ');
    const password = await question('Enter password (min 6 characters): ');

    // Validate input
    if (!name || !employeeId || !password) {
      console.error('❌ Name, employee ID, and password are required');
      rl.close();
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('❌ Password must be at least 6 characters long');
      rl.close();
      process.exit(1);
    }

    // Generate default email from employee ID
    const email = `${employeeId.toLowerCase()}@campusone.edu`;
    const department = 'Administration';

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase() }, { username: employeeId.toLowerCase() }] }
    });

    if (existingUser) {
      console.error('❌ User with this employee ID already exists');
      rl.close();
      process.exit(1);
    }

    // Check if employee ID is already taken
    const existingAdmin = await prisma.admin.findFirst({ where: { employeeId } });
    if (existingAdmin) {
      console.error('❌ Employee ID already exists');
      rl.close();
      process.exit(1);
    }

    console.log('\n⏳ Creating Super Admin account...');

    const hashedPassword = await bcrypt.hash(password, 10);

    const { user, admin } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          username: employeeId.toLowerCase(),
          password: hashedPassword,
          role: 'admin',
          isFirstLogin: true,
          isFirstLogin: true
        }
      });

      const admin = await tx.admin.create({
        data: {
          userId: user.id,
          employeeId,
          department,
          designation: 'Super Administrator',
          isSuperAdmin: true,
          permissions: [
            'manage_users', 'manage_courses', 'manage_assignments',
            'manage_attendance', 'manage_announcements', 'view_reports',
            'system_config', 'manage_ta_eligibility', 'manage_quiz'
          ]
        }
      });

      return { user, admin };
    });

    console.log('\n✅ Super Admin account created successfully!');
    console.log('\n📋 Account Details:');
    console.log('================================');
    console.log(`Name: ${user.name}`);
    console.log(`Username: ${user.username}`);
    console.log(`Employee ID: ${admin.employeeId}`);
    console.log(`Email: ${user.email} (temporary - can be updated later)`);
    console.log(`Department: ${admin.department}`);
    console.log(`Role: Super Administrator`);
    console.log('================================\n');
    console.log('⚠️  Please save these credentials securely!');
    console.log('⚠️  You will be required to change password and set email on first login.\n');

    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating Super Admin:', error.message);
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Run the script
createSuperAdmin();
