import { useState } from 'react';
import { User, Bell, Shield, LogOut, ChevronRight } from 'lucide-react';
import Button from '../../components/ui/Button';
import useAuthStore from '../../stores/authStore';
import useUIStore from '../../stores/uiStore';
import useCentersStore from '../../stores/centersStore';
import ProfileForm from './ProfileForm';
import ChangePasswordModal from './ChangePasswordModal';
import styles from './SettingsPage.module.css';

function SettingsPage() {
    const { logout, user, userData, updateProfile } = useAuthStore();
    const { addToast } = useUIStore();
    const { getCenterName } = useCentersStore();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const handleNotificationToggle = async () => {
        // Optimistic update would be good, but for now simple await
        // If userData.settings doesn't exist, init it
        const currentSettings = userData?.settings || {};
        const newNotificationsState = !currentSettings.adminUpdates;

        try {
            await updateProfile({
                settings: {
                    ...currentSettings,
                    adminUpdates: newNotificationsState
                }
            });
            addToast({
                title: newNotificationsState ? 'התראות הופעלו' : 'התראות כובו',
                type: 'success'
            });
        } catch (error) {
            addToast({
                title: 'שגיאה בעדכון הגדרות',
                message: 'שגיאה בביצוע הפעולה',
                type: 'error'
            });
        }
    };

    const handlePasswordChange = () => {
        setIsChangingPassword(true);
    };

    return (
        <div className={styles.page}>
            <h1 className={styles.title}>הגדרות</h1>

            {/* Profile Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <User className={styles.sectionIcon} size={20} />
                    <h2 className={styles.sectionTitle}>פרופיל אישי</h2>
                </div>
                <div className={styles.sectionContent}>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>שם מלא</span>
                            <span className={styles.settingDescription}>{userData?.displayName || 'לא מוגדר'}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)}>ערוך</Button>
                    </div>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>טלפון</span>
                            <span className={styles.settingDescription}>{userData?.phone || 'לא מוגדר'}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)}>ערוך</Button>
                    </div>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>אימייל</span>
                            <span className={styles.settingDescription}>{userData?.email}</span>
                        </div>
                    </div>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>תפקיד</span>
                            <span className={styles.settingDescription}>
                                {userData?.role === 'coach' ? 'מאמן' :
                                    userData?.role === 'centerManager' ? 'מנהל מרכז' :
                                        userData?.role === 'supervisor' ? 'מנהל מקצועי (סופר אדמין)' : 'מנהל'}
                            </span>
                        </div>
                    </div>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>מרכז טניס</span>
                            <span className={styles.settingDescription}>
                                {userData?.centerName ||
                                    (userData?.centerIds?.length > 0 ? getCenterName(userData.centerIds[0]) :
                                        (userData?.managedCenterId ? getCenterName(userData.managedCenterId) : 'לא משויך'))}
                            </span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditingProfile(true)}>ערוך</Button>
                    </div>
                </div>
            </div>

            {/* Notifications Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <Bell className={styles.sectionIcon} size={20} />
                    <h2 className={styles.sectionTitle}>התראות</h2>
                </div>
                <div className={styles.sectionContent}>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>התראות מנהל</span>
                            <span className={styles.settingDescription}>קבל עדכונים על אישור תכניות</span>
                        </div>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={userData?.settings?.adminUpdates !== false} // Default to true if undefined
                                onChange={handleNotificationToggle}
                            />
                            <span className={styles.slider}></span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Account Section */}
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <Shield className={styles.sectionIcon} size={20} />
                    <h2 className={styles.sectionTitle}>פרטיות ואבטחה</h2>
                </div>
                <div className={styles.sectionContent}>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <span className={styles.settingLabel}>סיסמה</span>
                            <span className={styles.settingDescription}>שינוי סיסמה ישירות</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePasswordChange}
                        >
                            שנה
                        </Button>
                    </div>
                </div>
            </div>

            <Button
                className={styles.logoutButton}
                onClick={logout}
                variant="outline"
            >
                <LogOut size={18} />
                התנתק מהמערכת
            </Button>

            {isEditingProfile && (
                <ProfileForm onClose={() => setIsEditingProfile(false)} />
            )}

            {isChangingPassword && (
                <ChangePasswordModal onClose={() => setIsChangingPassword(false)} />
            )}
        </div>
    );
}

export default SettingsPage;
