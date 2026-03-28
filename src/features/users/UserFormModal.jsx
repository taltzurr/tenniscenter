import { useState, useEffect } from 'react';
import { Lock, Mail, Info, AlertTriangle } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { ROLES } from '../../config/constants';
import useCentersStore from '../../stores/centersStore';
import styles from './UserFormModal.module.css';

const ROLE_OPTIONS = [
    { value: ROLES.COACH, label: 'מאמן' },
    { value: ROLES.CENTER_MANAGER, label: 'מנהל מרכז' },
    { value: ROLES.SUPERVISOR, label: 'מנהל מקצועי / אדמין' },
];

function UserFormModal({ isOpen, onClose, user, onSubmit, isSubmitting, currentRole, managedCenterId }) {
    const { centers, fetchCenters, getSimpleCentersList, getCenterName } = useCentersStore();

    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        phone: '',
        role: ROLES.COACH,
        centerId: '',
        isActive: true,
    });

    // Onboarding state (new user only)
    const [onboardingMethod, setOnboardingMethod] = useState('invitation');
    const [initialPassword, setInitialPassword] = useState('');
    const [showPasswordOption, setShowPasswordOption] = useState(false);

    const isCenterManagerAdmin = currentRole === ROLES.CENTER_MANAGER;

    useEffect(() => {
        if (isOpen && centers.length === 0) {
            fetchCenters();
        }
    }, [isOpen, centers.length, fetchCenters]);

    useEffect(() => {
        if (user) {
            setFormData({
                displayName: user.displayName || '',
                email: user.email || '',
                phone: user.phone || '',
                role: user.role || ROLES.COACH,
                centerId: user.centerIds && user.centerIds.length > 0 ? user.centerIds[0] : (user.managedCenterId || ''),
                isActive: user.isActive !== false,
            });
        } else {
            setFormData({
                displayName: '',
                email: '',
                phone: '',
                role: ROLES.COACH,
                centerId: isCenterManagerAdmin ? managedCenterId : '',
                isActive: true,
            });
            setOnboardingMethod('invitation');
            setInitialPassword('');
            setShowPasswordOption(false);
        }
    }, [user, isOpen, isCenterManagerAdmin, managedCenterId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Center managers and coaches must be linked to a center
        if (formData.role !== ROLES.SUPERVISOR && !formData.centerId) {
            alert('חובה לבחור מרכז');
            return;
        }
        const { centerId, ...rest } = formData;
        const payload = {
            ...rest,
            centerIds: centerId ? [centerId] : [],
        };
        // Don't send email on edit — it can't be changed and may confuse Firestore
        if (user) {
            delete payload.email;
        }
        if (!user) {
            payload.email = formData.email;
            payload.onboardingMethod = onboardingMethod;
            if (onboardingMethod === 'password') {
                payload.initialPassword = initialPassword;
            }
        }
        onSubmit(payload);
    };

    const dialogTitle = user ? 'עריכת משתמש' : 'הוספת משתמש חדש';
    const centerName = isCenterManagerAdmin && managedCenterId ? getCenterName(managedCenterId) : '';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={dialogTitle}
            size="medium"
        >
            <form onSubmit={handleSubmit}>
                <Modal.Body>
                    <div className={styles.formFields}>
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
                            disabled={!!user}
                            hint={user ? 'לא ניתן לשנות אימייל' : ''}
                        />

                        <Input
                            type="tel"
                            name="phone"
                            label="טלפון"
                            value={formData.phone}
                            onChange={handleChange}
                        />

                        {/* Role selection */}
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>
                                תפקיד <span className={styles.required}>*</span>
                            </label>
                            {isCenterManagerAdmin ? (
                                <div className={styles.lockedValue}>
                                    <Lock size={14} className={styles.lockedIcon} />
                                    <span>מאמן</span>
                                </div>
                            ) : (
                                <select
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className={styles.select}
                                    required
                                >
                                    {ROLE_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Center selection */}
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>
                                מרכז {formData.role !== ROLES.SUPERVISOR && <span className={styles.required}>*</span>}
                            </label>
                            {isCenterManagerAdmin ? (
                                <div className={styles.lockedValue}>
                                    <Lock size={14} className={styles.lockedIcon} />
                                    <span>{centerName || 'המרכז שלך'}</span>
                                </div>
                            ) : (
                                <>
                                    <select
                                        name="centerId"
                                        value={formData.centerId}
                                        onChange={handleChange}
                                        className={styles.select}
                                        required={formData.role !== ROLES.SUPERVISOR}
                                    >
                                        <option value="">בחר מרכז...</option>
                                        {getSimpleCentersList().map(center => (
                                            <option key={center.value} value={center.value}>
                                                {center.label}
                                            </option>
                                        ))}
                                    </select>
                                    {formData.role === ROLES.SUPERVISOR && (
                                        <p className={styles.fieldHint}>אופציונלי למנהל מקצועי/אדמין</p>
                                    )}
                                </>
                            )}
                        </div>

                        {/* isActive toggle - edit mode only */}
                        {user && (
                            <div className={styles.statusSection}>
                                <div className={styles.toggleRow}>
                                    <div className={styles.toggleLabel}>
                                        <span className={styles.toggleLabelText}>סטטוס משתמש</span>
                                        <span className={styles.toggleLabelHint}>
                                            {formData.isActive ? 'המשתמש פעיל ויכול להתחבר' : 'המשתמש מושבת ולא יכול להתחבר'}
                                        </span>
                                    </div>
                                    <label className={styles.switch}>
                                        <input
                                            type="checkbox"
                                            className={styles.switchInput}
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                        />
                                        <span className={styles.slider} />
                                    </label>
                                </div>
                                {!formData.isActive && (
                                    <div className={styles.inactiveWarning}>
                                        <AlertTriangle size={14} />
                                        <span>המשתמש לא יוכל להתחבר למערכת</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Onboarding section — new users only */}
                    {!user && (
                        <div className={styles.onboardingSection}>
                            <p className={styles.onboardingTitle}>גישה ראשונית למשתמש</p>

                            {onboardingMethod === 'invitation' && (
                                <div className={styles.onboardingInfo}>
                                    <Mail size={14} className={styles.onboardingInfoIcon} />
                                    <span>
                                        המשתמש יקבל אימייל אוטומטי עם קישור להגדרת סיסמה וכניסה למערכת
                                    </span>
                                </div>
                            )}

                            {!showPasswordOption && onboardingMethod === 'invitation' && (
                                <button
                                    type="button"
                                    className={styles.advancedToggle}
                                    onClick={() => setShowPasswordOption(true)}
                                >
                                    העדפה לסיסמה ידנית?
                                </button>
                            )}

                            {showPasswordOption && (
                                <>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>שיטת גישה</label>
                                        <select
                                            value={onboardingMethod}
                                            onChange={(e) => setOnboardingMethod(e.target.value)}
                                            className={styles.select}
                                        >
                                            <option value="invitation">הזמנה באימייל (מומלץ)</option>
                                            <option value="password">סיסמה זמנית</option>
                                        </select>
                                    </div>

                                    {onboardingMethod === 'password' && (
                                        <div className={styles.passwordSection}>
                                            <Input
                                                type="password"
                                                label="סיסמה זמנית"
                                                placeholder="לפחות 6 תווים"
                                                value={initialPassword}
                                                onChange={(e) => setInitialPassword(e.target.value)}
                                                iconStart={<Lock size={16} />}
                                                required
                                                minLength={6}
                                            />
                                            <p className={styles.passwordHint}>
                                                העבר את הסיסמה למשתמש ידנית (SMS / WhatsApp)
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
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
        </Modal>
    );
}

export default UserFormModal;
