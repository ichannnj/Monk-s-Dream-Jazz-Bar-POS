import { z } from 'zod';

export const RoleEnum = z.enum([
  'admin',
  'cashier',
  'waiter',
  'station_bar',
  'station_cafe',
  'station_food',
]);
export type Role = z.infer<typeof RoleEnum>;

// Staff PIN Login
export const PinLoginSchema = z.object({
  pin: z.string().length(4, 'PIN must be exactly 4 digits'),
});
export type PinLogin = z.infer<typeof PinLoginSchema>;

// Staff User Profile
export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  displayName: z.string(),
  role: RoleEnum,
  isActive: z.boolean().default(true),
});
export type User = z.infer<typeof UserSchema>;
