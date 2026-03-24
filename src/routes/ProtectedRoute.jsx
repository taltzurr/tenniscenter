import { Navigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import Spinner from '../components/ui/Spinner';

function ProtectedRoute({ children }) {
    const { user, userData, isLoading } = useAuthStore();

    if (isLoading) {
        return <Spinner.FullPage text="מאמת הרשאות..." />;
    }

    // Ensure both user and userData exist before allowing access
    // This prevents accessing protected routes before user data is fully loaded
    if (!user || !userData) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;
