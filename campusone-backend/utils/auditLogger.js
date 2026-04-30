import prisma from '../prisma/client.js';

/**
 * Fire-and-forget audit log writer.
 * Call after a successful mutation — never await, never block the response.
 *
 * @param {object} opts
 * @param {string} opts.action          e.g. 'CREATE_USER'
 * @param {string} opts.category        e.g. 'USER_MANAGEMENT'
 * @param {string} opts.performedBy     userId from req.user.id
 * @param {string} opts.performedByRole role from req.user.role
 * @param {string} opts.targetModel     e.g. 'User'
 * @param {string} opts.targetId        id of the affected record
 * @param {string} [opts.description]   human-readable summary
 * @param {any}    [opts.previousValue] snapshot before change
 * @param {any}    [opts.newValue]      snapshot after change
 */
export const auditLog = ({ action, category, performedBy, performedByRole, targetModel, targetId, description, previousValue, newValue } = {}) => {
  prisma.auditLog.create({
    data: {
      action,
      category,
      performedBy,
      performedByRole,
      targetModel,
      targetId: targetId ?? 'N/A',
      description: description ?? null,
      previousValue: previousValue ?? undefined,
      newValue: newValue ?? undefined,
    },
  }).catch((err) => console.error('[AuditLog] write failed:', err.message));
};
