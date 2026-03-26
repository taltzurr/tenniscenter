import { useState } from 'react';
import { X, Eye, EyeOff, Lock } from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useUIStore from '../../stores/uiStore';
import styles from './ChangePasswordModal.module.css';

function ChangePasswordModal({ onClose }) {
    const { changePassword } = useAuthStore();
    const { addToast } = useUIStore();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('הסיסמה חייבת להכיל לפחות 6 תווים');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('הסיסמאות אינן תואמות');
            return;
        }

        setLoading(true);
        const result = await changePassword(currentPassword, newPassword);
        setLoading(false);

        if (result.success) {
            addToast({ type: 'success', message: 'הסיסמה שונתה בהצלחה' });
            onClose();
        } else {
            if (result.error === 'auth/wrong-password' || result.error === 'auth/invalid-credential') {
                setError('הסיסמה הנוכחית שגויה');
            } else if (result.error === 'auth/too-many-requests') {
                setError('יותר מדי ניסיונות, נסה שוב מאוחר יותר');
            } else {
                setError('שגיאה בשינוי הסיסמה');
            }
        }
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerTitle}>
                        <Lock size={20} />
                        <h2>שינוי סיסמה</h2>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label className={styles.label}>סיסמה נוכחית</label>
                        <div className={styles.inputWrap}>
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                className={styles.input}
                                required
                                autoFocus
                            />
                            <button type="button" className={styles.eyeBtn} onClick={() => setShowCurrent(!showCurrent)}>
                                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>סיסמה חדשה</label>
                        <div className={styles.inputWrap}>
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className={styles.input}
                                required
                                minLength={6}
                            />
                            <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(!showNew)}>
                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.label}>אישור סיסמה חדשה</label>
                        <div className={styles.inputWrap}>
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className={styles.input}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={onClose}>ביטול</button>
                        <button type="submit" className={styles.submitBtn} disabled={loading}>
                            {loading ? 'משנה...' : 'שנה סיסמה'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ChangePasswordModal;
