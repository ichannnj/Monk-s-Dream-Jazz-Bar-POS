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
    username: string;
    displayName: string;
    role: "admin" | "cashier" | "waiter" | "station_bar" | "station_cafe" | "station_food";
    isActive: boolean;
}, {
    id: string;
    username: string;
    displayName: string;
    role: "admin" | "cashier" | "waiter" | "station_bar" | "station_cafe" | "station_food";
    isActive?: boolean | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
