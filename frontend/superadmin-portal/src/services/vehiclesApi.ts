
import { api } from './api';

export interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: number;
  school_id: string;
  route_id: string;
  driver_name: string;
  driver_phone: string;
}

export const vehiclesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getVehicles: builder.query<Vehicle[], void>({
      query: () => 'transport/vehicles',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Vehicle' as const, id })), { type: 'Vehicle', id: 'LIST' }]
          : [{ type: 'Vehicle', id: 'LIST' }],
    }),
    createVehicle: builder.mutation<Vehicle, Partial<Vehicle>>({
      query: (body) => ({
        url: 'transport/vehicles',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Vehicle', id: 'LIST' }],
    }),
    updateVehicle: builder.mutation<Vehicle, { id: string; body: Partial<Vehicle> }>({
      query: ({ id, body }) => ({
        url: `transport/vehicles/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result) => result ? [{ type: 'Vehicle', id: result.id }] : [],
    }),
    deleteVehicle: builder.mutation<void, string>({
      query: (id) => ({
        url: `transport/vehicles/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (id) => id ? [{ type: 'Vehicle', id }] : [],
    }),
  }),
});

export const {
  useGetVehiclesQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
} = vehiclesApi;
