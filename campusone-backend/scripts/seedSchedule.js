// Seeds ScheduleConfig (singleton) and Room defaults matching Punjab Colleges block conventions.
// Run: node scripts/seedSchedule.js
import prisma from '../prisma/client.js';

const ROOMS = [
  // Commerce Block - Ground floor (110-119)
  { code: 'R110', type: 'LECTURE', building: 'Commerce Block', floor: 0, capacity: 40 },
  { code: 'R111', type: 'LECTURE', building: 'Commerce Block', floor: 0, capacity: 40 },
  { code: 'R112', type: 'LECTURE', building: 'Commerce Block', floor: 0, capacity: 40 },
  { code: 'R113', type: 'SEMINAR', building: 'Commerce Block', floor: 0, capacity: 60, name: 'Seminar Hall A' },
  // Commerce Block - 1st floor (120-129)
  { code: 'R120', type: 'LECTURE', building: 'Commerce Block', floor: 1, capacity: 40 },
  { code: 'R121', type: 'LECTURE', building: 'Commerce Block', floor: 1, capacity: 40 },
  { code: 'R125', type: 'LECTURE', building: 'Commerce Block', floor: 1, capacity: 50 },
  { code: 'R126', type: 'LECTURE', building: 'Commerce Block', floor: 1, capacity: 40 },
  // Commerce Block - 2nd floor (130-139)
  { code: 'R130', type: 'LECTURE', building: 'Commerce Block', floor: 2, capacity: 40 },
  { code: 'R131', type: 'LECTURE', building: 'Commerce Block', floor: 2, capacity: 40 },
  // Science Block - ground (10-19)
  { code: 'R10', type: 'LECTURE', building: 'Science Block', floor: 0, capacity: 40 },
  { code: 'R11', type: 'LAB', building: 'Science Block', floor: 0, capacity: 30, name: 'Programming Lab' },
  { code: 'R12', type: 'LAB', building: 'Science Block', floor: 0, capacity: 30, name: 'Networking Lab' },
  // Science Block - 1st (20-29)
  { code: 'R20', type: 'LECTURE', building: 'Science Block', floor: 1, capacity: 40 },
  { code: 'R21', type: 'LAB', building: 'Science Block', floor: 1, capacity: 30, name: 'Database Lab' },
  // Science Block - 2nd (30-39)
  { code: 'R30', type: 'LECTURE', building: 'Science Block', floor: 2, capacity: 40 },
  { code: 'R31', type: 'LAB', building: 'Science Block', floor: 2, capacity: 30, name: 'Mobile Dev Lab' },
];

const HOLIDAYS = [
  { date: '2026-03-23', name: 'Pakistan Day', isRecurring: true },
  { date: '2026-05-01', name: 'Labour Day', isRecurring: true },
  { date: '2026-08-14', name: 'Independence Day', isRecurring: true },
];

async function main() {
  console.log('Seeding ScheduleConfig...');
  await prisma.scheduleConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });
  console.log('  ✓ default config ready');

  console.log('Seeding Rooms...');
  for (const r of ROOMS) {
    await prisma.room.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    });
  }
  console.log(`  ✓ ${ROOMS.length} rooms`);

  console.log('Seeding Holidays...');
  for (const h of HOLIDAYS) {
    try {
      await prisma.holiday.create({
        data: { date: new Date(h.date), name: h.name, isRecurring: h.isRecurring },
      });
    } catch (e) {
      if (e.code !== 'P2002') throw e; // already exists
    }
  }
  console.log(`  ✓ ${HOLIDAYS.length} holidays`);

  // Auto-tag courses with sessionType based on title
  console.log('Tagging courses with sessionType...');
  const courses = await prisma.course.findMany();
  let labCount = 0, projectCount = 0, lectureCount = 0;
  for (const c of courses) {
    const t = c.title.toLowerCase();
    let sessionType = 'LECTURE';
    if (t.includes('lab')) { sessionType = 'LAB'; labCount++; }
    else if (t.includes('final year project') || t.includes('fyp') || t.includes('thesis')) { sessionType = 'PROJECT'; projectCount++; }
    else { lectureCount++; }
    await prisma.course.update({ where: { id: c.id }, data: { sessionType } });
  }
  console.log(`  ✓ ${lectureCount} LECTURE, ${labCount} LAB, ${projectCount} PROJECT`);

  console.log('\n✅ Schedule seed complete.');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
