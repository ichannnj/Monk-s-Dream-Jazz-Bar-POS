import { Role } from '@prisma/client';

export const SEED_USERS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'admin',
    displayName: 'Miles (Manager)',
    role: Role.admin,
    pin: '9999',
    isActive: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'cashier1',
    displayName: 'Coltrane (Cashier)',
    role: Role.cashier,
    pin: '1111',
    isActive: true,
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'waiter1',
    displayName: 'Ella (Floor Waiter)',
    role: Role.waiter,
    pin: '2222',
    isActive: true,
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    username: 'bar1',
    displayName: 'Thelonious (Bartender)',
    role: Role.station_bar,
    pin: '0001',
    isActive: true,
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    username: 'cafe1',
    displayName: 'Bill (Barista)',
    role: Role.station_cafe,
    pin: '0002',
    isActive: true,
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    username: 'kitchen1',
    displayName: 'Chet (Chef)',
    role: Role.station_food,
    pin: '0003',
    isActive: true,
  },
];
