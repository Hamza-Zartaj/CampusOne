import { parseDateOnly, toDateOnlyString } from './dateOnly.js';

export const expandDateRange = (from, to) => {
  const dates = [];
  const start = parseDateOnly(toDateOnlyString(from));
  const end = parseDateOnly(toDateOnlyString(to));
  if (!start || !end) return dates;

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(toDateOnlyString(d));
  }
  return dates;
};

export const buildApprovedLeaveDateSet = (approvedApplications = []) => {
  const approvedDates = new Set();
  for (const application of approvedApplications) {
    for (const dateString of expandDateRange(application.fromDate, application.toDate)) {
      approvedDates.add(dateString);
    }
  }
  return approvedDates;
};

export const isExcusedAbsence = (attendanceRecord, approvedDates) => (
  attendanceRecord?.status === 'ABSENT'
  && approvedDates.has(toDateOnlyString(attendanceRecord.date))
);

export const summarizeAttendanceRecords = ({
  records = [],
  approvedApplications = [],
  totalSessions = records.length,
  emptyPercentage = null,
  excusedOnlyPercentage = emptyPercentage,
  excusedAbsenceReducesTotal = true,
} = {}) => {
  const approvedDates = buildApprovedLeaveDateSet(approvedApplications);
  let present = 0;
  let late = 0;
  let rawAbsent = 0;
  let excusedAbsent = 0;

  for (const record of records) {
    if (record.status === 'PRESENT') present += 1;
    else if (record.status === 'LATE') late += 1;
    else if (record.status === 'ABSENT') {
      rawAbsent += 1;
      if (isExcusedAbsence(record, approvedDates)) excusedAbsent += 1;
    }
  }

  const countedAbsent = rawAbsent - excusedAbsent;
  const effectiveTotalSessions = Math.max(
    0,
    excusedAbsenceReducesTotal ? totalSessions - excusedAbsent : totalSessions,
  );
  const attended = present + late;
  const percentage = effectiveTotalSessions > 0
    ? Math.round((attended / effectiveTotalSessions) * 100)
    : totalSessions > 0 && excusedAbsent > 0
      ? excusedOnlyPercentage
      : emptyPercentage;

  return {
    totalSessions,
    effectiveTotalSessions,
    present,
    late,
    absent: countedAbsent,
    rawAbsent,
    excusedAbsent,
    countedAbsent,
    approvedLeaveDays: approvedDates.size,
    attended,
    percentage,
    approvedDates,
  };
};
