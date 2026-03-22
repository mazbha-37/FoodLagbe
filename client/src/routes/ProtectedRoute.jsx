import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectIsLoading } from '../features/auth/authSlice';
import { FullscreenSpinner } from '../components/ui/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectIsLoading);

  if (isLoading) return <FullscreenSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
