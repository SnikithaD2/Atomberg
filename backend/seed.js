require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Goal = require('./models/Goal');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing
  await User.deleteMany({});
  await Goal.deleteMany({});

  // Create Admin
  const admin = await User.create({
    name: 'Rekha Nair',
    email: 'admin@atomquest.com',
    password: 'Admin@123',
    role: 'admin',
    department: 'HR',
  });

  // Create Manager
  const manager = await User.create({
    name: 'Arjun Mehta',
    email: 'manager@atomquest.com',
    password: 'Manager@123',
    role: 'manager',
    department: 'Engineering',
  });

  // Create Employees
  const emp1 = await User.create({
    name: 'Priya Sharma',
    email: 'priya@atomquest.com',
    password: 'Employee@123',
    role: 'employee',
    department: 'Engineering',
    managerId: manager._id,
  });

  const emp2 = await User.create({
    name: 'Rahul Kumar',
    email: 'rahul@atomquest.com',
    password: 'Employee@123',
    role: 'employee',
    department: 'Engineering',
    managerId: manager._id,
  });

  const emp3 = await User.create({
    name: 'Sneha Patel',
    email: 'sneha@atomquest.com',
    password: 'Employee@123',
    role: 'employee',
    department: 'Engineering',
    managerId: manager._id,
  });

  // Sample goals for Priya
  await Goal.create([
    {
      employeeId: emp1._id,
      thrustArea: 'Revenue Growth',
      title: 'Increase API throughput by 40%',
      description: 'Optimize backend APIs to handle 40% more requests',
      uom: 'Percentage (Min)',
      target: 40,
      weightage: 30,
      status: 'approved',
      cycle: '2025',
      achievements: {
        Q1: { actual: 22, status: 'On Track', comment: '' },
        Q2: { actual: 38, status: 'On Track', comment: '' },
      },
      checkIns: {
        Q1: { managerComment: 'Good start, keep pushing.', date: new Date('2025-07-20') },
      },
    },
    {
      employeeId: emp1._id,
      thrustArea: 'Operational Excellence',
      title: 'Reduce incident response TAT',
      description: 'Bring avg response time under 2 hours',
      uom: 'Numeric (Max)',
      target: 2,
      weightage: 25,
      status: 'approved',
      cycle: '2025',
      achievements: {
        Q1: { actual: 2.8, status: 'On Track', comment: '' },
        Q2: { actual: 2.1, status: 'On Track', comment: '' },
      },
    },
    {
      employeeId: emp1._id,
      thrustArea: 'People Development',
      title: 'Complete 3 certifications',
      description: 'AWS, Kubernetes and Security certs',
      uom: 'Numeric (Min)',
      target: 3,
      weightage: 20,
      status: 'approved',
      cycle: '2025',
    },
    {
      employeeId: emp1._id,
      thrustArea: 'Quality & Compliance',
      title: 'Zero critical security incidents',
      description: 'Maintain zero critical security incidents in production',
      uom: 'Zero-based',
      target: 0,
      weightage: 15,
      status: 'approved',
      sharedGoal: true,
      cycle: '2025',
      achievements: {
        Q1: { actual: 0, status: 'Completed', comment: '' },
        Q2: { actual: 0, status: 'Completed', comment: '' },
      },
    },
    {
      employeeId: emp1._id,
      thrustArea: 'Digital Transformation',
      title: 'Launch self-service dashboard',
      description: 'Build and deploy internal metrics dashboard',
      uom: 'Timeline',
      target: '2025-09-30',
      weightage: 10,
      status: 'approved',
      cycle: '2025',
    },
  ]);

  // Rahul has one submitted goal
  await Goal.create({
    employeeId: emp2._id,
    thrustArea: 'Revenue Growth',
    title: 'Improve sales pipeline conversion by 15%',
    description: 'Work with sales team to optimize conversion funnel',
    uom: 'Percentage (Min)',
    target: 15,
    weightage: 30,
    status: 'submitted',
    cycle: '2025',
  });

  console.log('✅ Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin:    admin@atomquest.com    / Admin@123');
  console.log('  Manager:  manager@atomquest.com  / Manager@123');
  console.log('  Employee: priya@atomquest.com    / Employee@123');
  console.log('  Employee: rahul@atomquest.com    / Employee@123');
  console.log('  Employee: sneha@atomquest.com    / Employee@123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });