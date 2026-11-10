import { StaffChatUser } from '../../data/chat.api';

export function resolveSenderName(
  propName: string | undefined,
  displayName: string | undefined
): string {
  if (displayName) return displayName;
  if (propName && propName !== 'Dana Cruz' && propName !== 'FOH Expediter') {
    return propName;
  }
  return 'Miles (Manager)';
}

export function resolveSenderRole(propRole: string | undefined, role: string | undefined): string {
  if (role) {
    switch (role) {
      case 'barista':
      case 'station_cafe':
        return 'Barista';
      case 'bartender':
      case 'station_bar':
        return 'Bartender';
      case 'kitchen':
      case 'station_food':
        return 'Kitchen Chef';
      case 'foh_runner':
      case 'waiter':
        return 'Waiter';
      case 'cashier':
        return 'Cashier';
      case 'admin':
        return 'Manager';
      default:
        return 'Staff';
    }
  }
  if (propRole) return propRole;
  return 'Waiter / Cashier';
}

export function resolveUserInitials(senderName: string): string {
  const parts = senderName.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return senderName.slice(0, 2).toUpperCase();
}

export function getQuickPresets(senderRole: string): string[] {
  if (senderRole.includes('Bar')) {
    return [
      'Out of lime juice until 3 PM',
      'Running low on clean pint glasses',
      'Craft IPA keg tapped and ready',
      'Espresso bar orders expedited',
    ];
  }
  if (senderRole.includes('Chef') || senderRole.includes('Kitchen')) {
    return [
      'Kitchen ticket delayed 10 min',
      'Small plates line clear',
      'Allergy confirmed: Gluten-free prep',
      'Order up at pass counter!',
    ];
  }
  return [
    'Table A2 has a nut allergy. Please flag it to the kitchen.',
    'Reminder: Mid shift briefing at 2 PM by the host stand.',
    'Flat whites for Table B1 are up at the cafe pass.',
    'Need water carafes refilled on Floor A.',
  ];
}
