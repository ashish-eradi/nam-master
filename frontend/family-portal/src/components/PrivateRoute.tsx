
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectToken } from '../store/authSlice';

const PrivateRoute = () => {
  const token = useAppSelector(selectToken);

  return token ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
