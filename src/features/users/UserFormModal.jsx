import { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { ROLES } from '../../config/constants';
import useCentersStore from '../../stores/centersStore';

const ROLE_OPTIONS = [
    { value: ROLES.COACH, label: 'מאמן' },
    { value: ROLES.CENTER_MANAGER, label: 'מנהל מרכז' },
    { value: ROLES.SUPERVISOR, label: 'מנהל מקצועי / אדמין' },
];

function UserFormModal({ isOpen, onClose, user, onSubmit, isSubmitting, currentRole, managedCenterId }) {
    const { centers, fetchCenters, getSimpleCentersList } = useCentersStore();

    // Initial form state
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        phone: '',
        role: ROLES.COACH,
        centerId: '',
    });

    useEffect(() => {
        // Fetch centers if not available
        if (isOpen && centers.length === 0) {
            fetchCenters();
        }
    }, [isOpen, centers.length, fetchCenters]);

    useEffect(() => {
        // Populate form if editing
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                email: user.email || '',
                phone: user.phone || '',
                role: user.role || ROLES.COACH,
                centerId: user.centerIds && user.centerIds.length > 0 ? user.centerIds[0] : (user.managedCenterId || ''),
            });
        } else {
            // Reset form for new user
            // If Center Manager, lock values
            const isCenterManager = currentRole === ROLES.CENTER_MANAGER;

            setFormData({
                displayName: '',
                email: '',
                phone: '',
                role: isCenterManager ? ROLES.COACH : ROLES.COACH,
                centerId: isCenterManager ? managedCenterId : '',
            });
        }
    }, [user, isOpen, currentRole, managedCenterId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Convert single centerId to array format expected by store
        onSubmit({
            ...formData,
            centerIds: formData.centerId ? [formData.centerId] : []
        });
    };

    const dialogTitle = user ? 'עריכת משתמש' : 'הוספת משתמש חדש';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={dialogTitle}
            size="small"
        >
            <form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Input
                            name="displayName"
                            label="שם מלא"
                            value={formData.displayName}
                            onChange={handleChange}
                            required
                            autoFocus
                        />

                        <Input
                            type="email"
                            name="email"
                            label="אימייל"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        // If it's technically possible to edit email in Firestore, we allow it.
                        // But usually unique ID is linked to it.
                        />

                        <Input
                            type="tel"
                            name="phone"
                            label="טלפון"
                            value={formData.phone}
                            onChange={handleChange}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                תפקיד <span style={{ color: 'var(--error)' }}>*</span>
                            </label>
                            <select
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                                required
                                disabled={currentRole === ROLES.CENTER_MANAGER}
                            >
                                {ROLE_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Center Selection - Only relevant if NOT Supervisor? 
                            Or Supervisor can belong to a center? 
                            Usually Supervisor is global. 
                            But user said "Define to which center he belongs".
                            We will show it for everyone for flexibility, or maybe optional for Supervisor.
                        */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                מרכז <span style={{ color: 'var(--error)' }}>*</span>
                            </label>
                            <select
                                name="centerId"
                                value={formData.centerId}
                                onChange={handleChange}
                                style={{
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontFamily: 'inherit'
                                }}
                                required={formData.role !== ROLES.SUPERVISOR}
                                disabled={currentRole === ROLES.CENTER_MANAGER}
                            >
                                <option value="">בחר מרכז...</option>
                                {getSimpleCentersList().map(center => (
                                    <option key={center.value} value={center.value}>
                                        {center.label}
                                    </option>
                                ))}
                            </select>
                            {formData.role === ROLES.SUPERVISOR && (
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    אופציונלי למנהל מקצועי/אדמין
                                </span>
                            )}
                        </div>
                    </div>
                </Modal.Body>

                <Modal.Footer>
                    <Button type="button" variant="ghost" onClick={onClose}>
                        ביטול
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner size="small" color="white" /> : (user ? 'שמור שינויים' : 'צור משתמש')}
                    </Button>
                </Modal.Footer>
            </form>
        </Modal >
    );
}

export default UserFormModal;
