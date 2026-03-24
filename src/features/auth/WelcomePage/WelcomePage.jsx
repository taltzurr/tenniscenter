import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff, PartyPopper } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import { verifyResetCode, confirmReset } from '../../../services/auth';
import styles from './WelcomePage.module.css';

function WelcomePage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode');

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [codeError, setCodeError] = useState('');

    // Verify the reset code on mount
    useEffect(() => {
        if (!oobCode || mode !== 'resetPassword') {
            setCodeError('קישור לא תקין. נסה לבקש הזמנה מחדש מהמנהל.');
            setIsVerifying(false);
            return;
        }

        const verify = async () => {
            try {
                const userEmail = await verifyResetCode(oobCode);
                setEmail(userEmail);
            } catch (err) {
                setCodeError(getCodeErrorMessage(err.code));
            } finally {
                setIsVerifying(false);
            }
        };

        verify();
    }, [oobCode, mode]);

    const getCodeErrorMessage = (code) => {
        const messages = {
            'auth/expired-action-code': 'הקישור פג תוקף. בקש הזמנה חדשה מהמנהל.',
            'auth/invalid-action-code': 'הקישור אינו תקין או שכבר נעשה בו שימוש.',
            'auth/user-disabled': 'המשתמש הושבת. פנה למנהל המערכת.',
            'auth/user-not-found': 'המשתמש לא נמצא.',
        };
        return messages[code] || 'שגיאה באימות הקישור. נסה שוב.';
    };

    const getSubmitErrorMessage = (code) => {
        const messages = {
            'auth/weak-password': 'הסיסמה חלשה מדי. נדרשות לפחות 6 תווים.',
            'auth/expired-action-code': 'הקישור פג תוקף. בקש הזמנה חדשה מהמנהל.',
            'auth/invalid-action-code': 'הקישור אינו תקין. בקש הזמנה חדשה מהמנהל.',
        };
        return messages[code] || 'שגיאה בהגדרת הסיסמה. נסה שוב.';
    };

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

        setIsSubmitting(true);

        try {
            await confirmReset(oobCode, newPassword);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(getSubmitErrorMessage(err.code));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Loading state - verifying code
    if (isVerifying) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.header}>
                            <Spinner size="large" />
                            <p className={styles.subtitle}>מאמת הזמנה...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Invalid/expired code
    if (codeError) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.header}>
                            <img
                                src="/logo.png"
                                alt="מרכזי הטניס"
                                className={styles.logo}
                                onError={(e) => e.target.style.display = 'none'}
                            />
                            <h1 className={styles.title}>שגיאה בהזמנה</h1>
                        </div>

                        <div className={styles.error}>
                            <AlertCircle size={18} />
                            {codeError}
                        </div>

                        <div className={styles.actions}>
                            <Button fullWidth onClick={() => navigate('/login')}>
                                חזרה להתחברות
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (success) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.header}>
                            <img
                                src="/logo.png"
                                alt="מרכזי הטניס"
                                className={styles.logo}
                                onError={(e) => e.target.style.display = 'none'}
                            />
                            <h1 className={styles.title}>הכל מוכן!</h1>
                        </div>

                        <div className={styles.successMessage}>
                            <CheckCircle size={18} />
                            הסיסמה הוגדרה בהצלחה! מעביר להתחברות...
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Welcome / set password form
    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <img
                            src="/logo.png"
                            alt="מרכזי הטניס"
                            className={styles.logo}
                            onError={(e) => e.target.style.display = 'none'}
                        />
                        <div className={styles.welcomeBadge}>
                            <PartyPopper size={20} />
                        </div>
                        <h1 className={styles.title}>ברוכים הבאים!</h1>
                        <p className={styles.inviteText}>הוזמנת למערכת מרכזי הטניס</p>
                        <p className={styles.subtitle}>הגדר סיסמה כדי להתחיל עבור {email}</p>
                    </div>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        {error && (
                            <div className={styles.error}>
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <div className={styles.passwordField}>
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                label="סיסמה"
                                placeholder="לפחות 6 תווים"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                iconStart={<Lock size={18} />}
                                required
                                disabled={isSubmitting}
                                minLength={6}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <Input
                            type={showPassword ? 'text' : 'password'}
                            label="אישור סיסמה"
                            placeholder="הזן שוב את הסיסמה"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            iconStart={<Lock size={18} />}
                            required
                            disabled={isSubmitting}
                            minLength={6}
                        />

                        <Button type="submit" fullWidth disabled={isSubmitting}>
                            {isSubmitting ? <Spinner size="small" color="white" /> : 'הגדר סיסמה והתחל'}
                        </Button>
                    </form>

                    <div className={styles.backToLogin}>
                        <button
                            onClick={() => navigate('/login')}
                            className={styles.backButton}
                        >
                            <span>יש לך כבר חשבון? התחבר</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WelcomePage;
