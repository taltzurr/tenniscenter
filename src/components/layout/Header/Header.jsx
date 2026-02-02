import { Menu, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../ui/Avatar';
import useAuthStore from '../../../stores/authStore';
import useUIStore from '../../../stores/uiStore';
import { NotificationsBell } from '../../../features/notifications';
import styles from './Header.module.css';

function Header({ title }) {
    const { userData } = useAuthStore();
    const { toggleSidebar } = useUIStore();
    const navigate = useNavigate();

    return (
        <header className={styles.header}>
            <div className={styles.rightSection}>
                <button
                    className={styles.menuButton}
                    onClick={toggleSidebar}
                    aria-label="פתח תפריט"
                >
                    <Menu size={24} />
                </button>

                {title ? (
                    <h1 className={styles.pageTitle}>{title}</h1>
                ) : (
                    <div
                        className={styles.logo}
                        onClick={() => navigate('/dashboard')}
                        style={{ cursor: 'pointer' }}
                    >
                        <img
                            src="/logo.png"
                            alt="מרכזי הטניס"
                            className={styles.logoImage}
                            onError={(e) => e.target.style.display = 'none'}
                        />
                        <span className={styles.logoText}>מרכזי הטניס</span>
                    </div>
                )}
            </div>

            <div className={styles.leftSection}>


                <NotificationsBell />

                <button
                    className={styles.userButton}
                    aria-label="פרופיל"
                    onClick={() => navigate('/settings')}
                    style={{ cursor: 'pointer' }}
                >
                    <Avatar
                        name={userData?.displayName || userData?.name}
                        src={userData?.avatarUrl}
                        size="small"
                    />
                    <span className={styles.userName}>{userData?.displayName || userData?.name}</span>
                </button>
            </div>
        </header>
    );
}

export default Header;
