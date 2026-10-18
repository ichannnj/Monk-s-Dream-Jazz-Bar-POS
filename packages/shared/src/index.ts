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

// Product / Menu Item
export const StationTargetEnum = z.enum(['bar', 'kitchen']);
export type StationTarget = z.infer<typeof StationTargetEnum>;

export const ProductSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  name: z.string().min(1),
  imageUrl: z.string().url().optional().nullable(),
  basePrice: z.number().positive(),
  stationTarget: StationTargetEnum,
  isResoldOutsideFood: z.boolean().default(false),
  originalCost: z.number().positive().optional().nullable(),
  auto86: z.boolean().default(false),
  allergens: z.array(z.string()).default([]),
});
export type Product = z.infer<typeof ProductSchema>;

export * from './database.types.js';
export * from './hlc.js';
