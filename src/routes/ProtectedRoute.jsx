import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import Spinner from '../components/ui/Spinner';

function ProtectedRoute({ children }) {
    const { user, isLoading } = useAuthStore();
    const location = useLocation();

    if (isLoading) {
        return <Spinner.FullPage text="מאמת הרשאות..." />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}

export default ProtectedRoute;
