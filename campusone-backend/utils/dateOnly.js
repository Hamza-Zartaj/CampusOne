const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const toDateOnlyString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
};

export const parseDateOnly = (value) => {
  const match = DATE_ONLY_RE.exec(value || '');
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

export const assertDateWithinTerm = (dateString, term) => {
  const startDate = toDateOnlyString(term?.startDate);
  const endDate = toDateOnlyString(term?.endDate);
  if (!startDate || !endDate) return true;
  return dateString >= startDate && dateString <= endDate;
};

export const serializeDateFields = (record, fields) => {
  if (!record) return record;
  const next = { ...record };
  for (const field of fields) {
    if (next[field]) next[field] = toDateOnlyString(next[field]);
  }
  return next;
};
