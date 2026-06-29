import prisma from '../prisma/client.js';
import { toDateOnlyString } from './dateOnly.js';

const termHolidayScope = (termId) => (
  termId
    ? [{ termId: null }, { termId }]
    : [{ termId: null }]
);

export const findHolidayForDate = async ({ dateString, dateValue, termId }) => {
  const scopedWhere = { OR: termHolidayScope(termId) };
  const exactHoliday = await prisma.holiday.findFirst({
    where: {
      ...scopedWhere,
      date: dateValue,
    },
    orderBy: { createdAt: 'asc' },
  });

  if (exactHoliday) return exactHoliday;

  const monthDay = dateString.slice(5);
  const recurringHolidays = await prisma.holiday.findMany({
    where: {
      ...scopedWhere,
      isRecurring: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return recurringHolidays.find((holiday) => toDateOnlyString(holiday.date)?.slice(5) === monthDay) || null;
};
