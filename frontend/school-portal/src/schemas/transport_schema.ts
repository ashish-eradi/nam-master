
import { z } from 'zod';

export const RouteSchema = z.object({
  id: z.string(),
  route_name: z.string(),
  route_number: z.string(),
  pickup_points: z.array(z.string()),
  distance_km: z.number(),
});

export const RouteCreateSchema = RouteSchema.omit({ id: true });
export const RouteUpdateSchema = RouteSchema.partial();

export type Route = z.infer<typeof RouteSchema>;
export type RouteCreate = z.infer<typeof RouteCreateSchema>;
export type RouteUpdate = z.infer<typeof RouteUpdateSchema>;

export const VehicleSchema = z.object({
  id: z.string(),
  vehicle_number: z.string(),
  vehicle_type: z.string(),
  capacity: z.number(),
  route_id: z.string(),
  driver_name: z.string(),
  driver_phone: z.string(),
});

export const VehicleCreateSchema = VehicleSchema.omit({ id: true });
export const VehicleUpdateSchema = VehicleSchema.partial();

export type Vehicle = z.infer<typeof VehicleSchema>;
export type VehicleCreate = z.infer<typeof VehicleCreateSchema>;
export type VehicleUpdate = z.infer<typeof VehicleUpdateSchema>;
