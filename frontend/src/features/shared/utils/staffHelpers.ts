/**
 * Staff Identity & Name Formatting Helpers
 * Monk's Dream Jazz Bar POS
 */

/**
 * Extracts a friendly first name from staff display names.
 * e.g., "Ella (Floor Waiter)" -> "Ella"
 *       "Miles (Manager)" -> "Miles"
 *       "Thelonious (Bartender)" -> "Thelonious"
 */
export function getStaffFirstName(displayName?: string | null): string {
  if (!displayName || !displayName.trim()) {
    return 'Staff';
  }
  const clean = displayName.trim();
  // If format is "Name (Role)", grab the Name part
  const parenthesisIndex = clean.indexOf('(');
  if (parenthesisIndex > 0) {
    const namePart = clean.substring(0, parenthesisIndex).trim();
    return namePart.split(' ')[0] || namePart;
  }
  // Otherwise split by space and take first word
  return clean.split(' ')[0] || clean;
}

/**
 * Returns clean human-readable role labels.
 */
export function getStaffRoleLabel(role?: string | null): string {
  if (!role) return 'Floor Staff';
  switch (role.toLowerCase()) {
    case 'admin':
    case 'manager':
    case 'administrator':
      return 'Manager';
    case 'cashier':
      return 'Cashier';
    case 'waiter':
      return 'Floor Waiter';
    case 'station_bar':
    case 'bartender':
      return 'Bartender';
    case 'station_cafe':
    case 'barista':
      return 'Barista';
    case 'station_food':
    case 'kitchen':
      return 'Kitchen Chef';
    case 'foh_runner':
      return 'FOH Runner';
    default:
      return 'Floor Staff';
  }
}

/**
 * Derives 2-letter uppercase initials for staff avatars.
 */
export function getStaffInitials(displayName?: string | null): string {
  if (!displayName || !displayName.trim()) return 'MD';
  const firstName = getStaffFirstName(displayName);
  if (firstName.length >= 2) {
    return firstName.substring(0, 2).toUpperCase();
  }
  return firstName.toUpperCase();
}
