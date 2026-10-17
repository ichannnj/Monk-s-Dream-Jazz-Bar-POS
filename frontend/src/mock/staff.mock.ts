import type { StaffUser } from '../types/floor';

export const SEED_STAFF_USERS: StaffUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'admin',
    displayName: 'Miles (Manager)',
    role: 'admin',
    pin: '999999',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'cashier1',
    displayName: 'Coltrane (Cashier)',
    role: 'cashier',
    pin: '111111',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'waiter1',
    displayName: 'Ella (Floor Waiter)',
    role: 'waiter',
    pin: '222222',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    username: 'bar1',
    displayName: 'Thelonious (Bartender)',
    role: 'bartender',
    pin: '000001',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    username: 'cafe1',
    displayName: 'Bill (Barista)',
    role: 'barista',
    pin: '000002',
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    username: 'kitchen1',
    displayName: 'Chet (Chef)',
    role: 'kitchen',
    pin: '000003',
  },
];
