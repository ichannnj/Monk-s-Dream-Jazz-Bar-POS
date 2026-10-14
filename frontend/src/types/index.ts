export type UserRole =
  | 'admin'
  | 'waiter'
  | 'cashier'
  | 'barista'
  | 'kitchen'
  | 'bartender';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive?: boolean;
}
