import prisma from '../prisma/client.js';

export const DEFAULT_ATTENDANCE_POLICY = {
  id: 'default',
  freeQuota: 4,
  fineQuota: 6,
  finePerAbsent: 500,
  lateWeight: 0.5,
  excusedAbsenceReducesTotal: true,
};

const finiteOrDefault = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const normalizeAttendancePolicy = (policy = {}) => ({
  id: policy.id || DEFAULT_ATTENDANCE_POLICY.id,
  freeQuota: finiteOrDefault(policy.freeQuota, DEFAULT_ATTENDANCE_POLICY.freeQuota),
  fineQuota: finiteOrDefault(policy.fineQuota, DEFAULT_ATTENDANCE_POLICY.fineQuota),
  finePerAbsent: finiteOrDefault(policy.finePerAbsent, DEFAULT_ATTENDANCE_POLICY.finePerAbsent),
  lateWeight: finiteOrDefault(policy.lateWeight, DEFAULT_ATTENDANCE_POLICY.lateWeight),
  excusedAbsenceReducesTotal: policy.excusedAbsenceReducesTotal ?? DEFAULT_ATTENDANCE_POLICY.excusedAbsenceReducesTotal,
  updatedBy: policy.updatedBy || null,
  createdAt: policy.createdAt || null,
  updatedAt: policy.updatedAt || null,
});

export const getAttendancePolicy = async (client = prisma) => {
  const existing = await client.attendancePolicy.findUnique({
    where: { id: DEFAULT_ATTENDANCE_POLICY.id },
  });
  if (existing) return normalizeAttendancePolicy(existing);

  const created = await client.attendancePolicy.create({
    data: DEFAULT_ATTENDANCE_POLICY,
  });
  return normalizeAttendancePolicy(created);
};

export const validateAttendancePolicyInput = (body = {}) => {
  const freeQuota = Number(body.freeQuota);
  const fineQuota = Number(body.fineQuota);
  const finePerAbsent = Number(body.finePerAbsent);
  const lateWeight = Number(body.lateWeight);

  if (!Number.isFinite(freeQuota) || freeQuota < 0) {
    return { error: 'Free leave quota must be 0 or greater' };
  }
  if (!Number.isFinite(fineQuota) || fineQuota < freeQuota) {
    return { error: 'Fine/drop threshold must be greater than or equal to free leave quota' };
  }
  if (!Number.isFinite(finePerAbsent) || finePerAbsent < 0) {
    return { error: 'Fine amount must be 0 or greater' };
  }
  if (!Number.isFinite(lateWeight) || lateWeight < 0 || lateWeight > 1) {
    return { error: 'Late weight must be between 0 and 1' };
  }

  return {
    data: {
      freeQuota,
      fineQuota,
      finePerAbsent,
      lateWeight,
      excusedAbsenceReducesTotal: body.excusedAbsenceReducesTotal !== false,
    },
  };
};
