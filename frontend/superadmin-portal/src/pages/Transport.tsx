
import React from 'react';
import { Grid, Typography, Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { useGetRoutesQuery } from '../services/routesApi';
import { useGetVehiclesQuery } from '../services/vehiclesApi';
import { Route } from '../services/routesApi';
import { Vehicle } from '../services/vehiclesApi';

const Transport = () => {
  const { data: routes, isLoading: routesLoading } = useGetRoutesQuery();
  const { data: vehicles, isLoading: vehiclesLoading } = useGetVehiclesQuery();

  const routeColumns: GridColDef<Route>[] = [
    { field: 'route_name', headerName: 'Route Name', width: 200 },
    { field: 'route_number', headerName: 'Route Number', width: 150 },
    { field: 'school_id', headerName: 'School ID', width: 250 },
    { field: 'distance_km', headerName: 'Distance (km)', width: 150 },
  ];

  const vehicleColumns: GridColDef<Vehicle>[] = [
    { field: 'vehicle_number', headerName: 'Vehicle Number', width: 200 },
    { field: 'vehicle_type', headerName: 'Type', width: 150 },
    { field: 'capacity', headerName: 'Capacity', width: 120 },
    { field: 'school_id', headerName: 'School ID', width: 250 },
    { field: 'driver_name', headerName: 'Driver Name', width: 200 },
  ];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4" gutterBottom>
          Global Transport Management
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ height: 400, width: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Routes
          </Typography>
          <DataGrid
            rows={routes || []}
            columns={routeColumns}
            loading={routesLoading}
            rowHeight={52}
          />
        </Box>
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ height: 400, width: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Vehicles
          </Typography>
          <DataGrid
            rows={vehicles || []}
            columns={vehicleColumns}
            loading={vehiclesLoading}
            rowHeight={52}
          />
        </Box>
      </Grid>
    </Grid>
  );
};

export default Transport;
