import prisma from '../prisma/client.js';

/**
 * Awaitable audit log writer.
 * Await this for critical mutations where the audit row is part of the success contract.
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
export const auditLog = async ({ action, category, performedBy, performedByRole, targetModel, targetId, description, previousValue, newValue } = {}) => {
  try {
    return await prisma.auditLog.create({
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
    });
  } catch (err) {
    console.error('[AuditLog] write failed:', err.message);
    return null;
  }
};
