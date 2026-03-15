import { api } from './api';

export interface TransportInfo {
  id: string;
  route: {
    id: string;
    name: string;
    route_number: string;
  };
  vehicle: {
    id: string;
    vehicle_number: string;
    driver_name: string;
    driver_phone: string;
  };
  pickup_point: string;
  drop_point: string;
  pickup_time: string;
  drop_time: string;
}

export const transportApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Get transport info for a child
    getChildTransport: builder.query<TransportInfo, string>({
      query: (child_id) => `parents/children/${child_id}/transport`,
      providesTags: ['Transport'],
    }),
  }),
});

export const {
  useGetChildTransportQuery,
  useLazyGetChildTransportQuery,
} = transportApi;
