import { z } from 'zod';
export declare const RoleEnum: z.ZodEnum<["admin", "cashier", "waiter", "station_bar", "station_cafe", "station_food"]>;
export type Role = z.infer<typeof RoleEnum>;
export declare const PinLoginSchema: z.ZodObject<{
    pin: z.ZodString;
}, "strip", z.ZodTypeAny, {
    pin: string;
}, {
    pin: string;
}>;
export type PinLogin = z.infer<typeof PinLoginSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    username: z.ZodString;
    displayName: z.ZodString;
    role: z.ZodEnum<["admin", "cashier", "waiter", "station_bar", "station_cafe", "station_food"]>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id: string;
    role: "admin" | "cashier" | "waiter" | "station_bar" | "station_cafe" | "station_food";
    username: string;
    displayName: string;
    isActive: boolean;
}, {
    id: string;
    role: "admin" | "cashier" | "waiter" | "station_bar" | "station_cafe" | "station_food";
    username: string;
    displayName: string;
    isActive?: boolean | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare const StationTargetEnum: z.ZodEnum<["bar", "kitchen"]>;
export type StationTarget = z.infer<typeof StationTargetEnum>;
export declare const ProductSchema: z.ZodObject<{
    id: z.ZodString;
    categoryId: z.ZodString;
    name: z.ZodString;
    imageUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    basePrice: z.ZodNumber;
    stationTarget: z.ZodEnum<["bar", "kitchen"]>;
    isResoldOutsideFood: z.ZodDefault<z.ZodBoolean>;
    originalCost: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    auto86: z.ZodDefault<z.ZodBoolean>;
    allergens: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    categoryId: string;
    name: string;
    basePrice: number;
    stationTarget: "bar" | "kitchen";
    isResoldOutsideFood: boolean;
    auto86: boolean;
    allergens: string[];
    imageUrl?: string | null | undefined;
    originalCost?: number | null | undefined;
}, {
    id: string;
    categoryId: string;
    name: string;
    basePrice: number;
    stationTarget: "bar" | "kitchen";
    imageUrl?: string | null | undefined;
    isResoldOutsideFood?: boolean | undefined;
    originalCost?: number | null | undefined;
    auto86?: boolean | undefined;
    allergens?: string[] | undefined;
}>;
export type Product = z.infer<typeof ProductSchema>;
export * from './database.types.js';
export * from './hlc.js';
