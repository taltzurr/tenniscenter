import { Navigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';

/**
 * RoleRoute - Restricts access based on user role
 * @param {string[]} allowedRoles - Array of roles that can access this route
 * @param {React.ReactNode} children - Child components
 * @param {string} redirectTo - Where to redirect if not allowed (default: /dashboard)
 */
function RoleRoute({ allowedRoles, children, redirectTo = '/dashboard' }) {
    const { userData } = useAuthStore();

    if (!userData) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(userData.role)) {
        return <Navigate to={redirectTo} replace />;
    }

    return children;
}

export default RoleRoute;
