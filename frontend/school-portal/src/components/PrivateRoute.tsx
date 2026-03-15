
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectToken, selectLicenseExpired } from '../store/authSlice';

const PrivateRoute = () => {
  const token = useAppSelector(selectToken);
  const licenseExpired = useAppSelector(selectLicenseExpired);

  if (!token) return <Navigate to="/login" />;
  if (licenseExpired) return <Navigate to="/license-expired" />;

  return <Outlet />;
};

export default PrivateRoute;
