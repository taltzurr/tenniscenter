import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Spinner from '../../../components/ui/Spinner';
import useAuthStore from '../../../stores/authStore';
import { resetPassword } from '../../../services/auth';
import styles from './LoginPage.module.css';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetSent, setResetSent] = useState(false);

    const { login, user, userData } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || '/dashboard';

    // Redirect if already authenticated (handles race condition on first login)
    if (user && userData) {
        return <Navigate to={from} replace />;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(email, password);

        if (!result.success) {
            setError(getErrorMessage(result.error));
        }

        // No need to navigate manually - the Navigate component above 
        // will redirect automatically when user/userData state updates

        setIsLoading(false);
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('נא להזין כתובת אימייל');
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            await resetPassword(email);
            setResetSent(true);
        } catch (err) {
            setError(getErrorMessage(err.code));
        }

        setIsLoading(false);
    };

    const getErrorMessage = (code) => {
        const messages = {
            'auth/invalid-email': 'כתובת אימייל לא תקינה',
            'auth/user-disabled': 'המשתמש הושבת',
            'auth/user-not-found': 'משתמש לא נמצא',
            'auth/wrong-password': 'סיסמה שגויה',
            'auth/too-many-requests': 'יותר מדי ניסיונות, נסה שוב מאוחר יותר',
            'auth/invalid-credential': 'פרטי התחברות שגויים',
        };
        return messages[code] || 'שגיאה בהתחברות, נסה שוב';
    };

    if (showForgotPassword) {
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
                            <h1 className={styles.title}>איפוס סיסמה</h1>
                            <p className={styles.subtitle}>הזן את האימייל שלך לקבלת קישור לאיפוס</p>
                        </div>

                        {resetSent ? (
                            <div className={styles.successMessage}>
                                <CheckCircle size={18} />
                                קישור לאיפוס סיסמה נשלח לאימייל שלך
                            </div>
                        ) : (
                            <form className={styles.form} onSubmit={handleForgotPassword}>
                                {error && (
                                    <div className={styles.error}>
                                        <AlertCircle size={18} />
                                        {error}
                                    </div>
                                )}

                                <Input
                                    type="email"
                                    label="אימייל"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    iconStart={<Mail size={18} />}
                                    required
                                    disabled={isLoading}
                                />

                                <Button type="submit" fullWidth disabled={isLoading}>
                                    {isLoading ? <Spinner size="small" color="white" /> : 'שלח קישור לאיפוס'}
                                </Button>
                            </form>
                        )}

                        <div className={styles.backToLogin}>
                            <button
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setResetSent(false);
                                    setError('');
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <span style={{ color: 'var(--primary-600)' }}>חזרה להתחברות</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                        <h1 className={styles.title}>מרכזי הטניס</h1>
                        <p className={styles.subtitle}>מערכת ניהול אימונים</p>
                    </div>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        {error && (
                            <div className={styles.error}>
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <Input
                            type="email"
                            label="אימייל"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            iconStart={<Mail size={18} />}
                            required
                            disabled={isLoading}
                        />

                        <div>
                            <Input
                                type="password"
                                label="סיסמה"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                iconStart={<Lock size={18} />}
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                className={styles.forgotPassword}
                                onClick={() => setShowForgotPassword(true)}
                            >
                                שכחת סיסמה?
                            </button>
                        </div>

                        <Button type="submit" fullWidth disabled={isLoading}>
                            {isLoading ? <Spinner size="small" color="white" /> : 'התחברות'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
