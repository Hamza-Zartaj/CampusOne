// Reads the current user from localStorage and returns true if they have
// the given permission (or are a super admin, who bypasses every check).
export const hasPermission = (permission) => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || user.role !== 'admin') return false;
    if (user.isSuperAdmin) return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  } catch {
    return false;
  }
};

// Convenience: pass an array, returns true if the user has *any* of them.
export const hasAnyPermission = (permissions) => {
  if (!Array.isArray(permissions) || permissions.length === 0) return true;
  return permissions.some(hasPermission);
};

export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};
