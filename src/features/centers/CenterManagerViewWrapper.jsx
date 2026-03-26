import { useParams } from 'react-router-dom';
import CenterManagerDashboard from '../dashboard/CenterManagerDashboard';

function CenterManagerViewWrapper() {
    const { centerId } = useParams();
    return <CenterManagerDashboard overrideCenterId={centerId} />;
}

export default CenterManagerViewWrapper;
