import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import useNotificationsStore from '../../../stores/notificationsStore';
import useAuthStore from '../../../stores/authStore';
import styles from './NotificationsBell.module.css';

const TYPE_ICONS = {
    info: <Info size={16} className={styles.iconInfo} />,
    success: <CheckCircle size={16} className={styles.iconSuccess} />,
    warning: <AlertTriangle size={16} className={styles.iconWarning} />,
    error: <XCircle size={16} className={styles.iconError} />
};

export default function NotificationsBell() {
    const { userData } = useAuthStore();
    const { notifications, unreadCount, initialize, cleanup, markRead, markAllRead, removeNotification } = useNotificationsStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (userData?.id) {
            initialize(userData.id);
        }
        return () => cleanup();
    }, [userData?.id]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = () => setIsOpen(!isOpen);

    const handleMarkAllRead = (e) => {
        e.stopPropagation();
        if (userData?.id) markAllRead(userData.id);
    };

    return (
        <div className={styles.container} ref={dropdownRef}>
            <button
                className={`${styles.bellButton} ${isOpen ? styles.active : ''}`}
                onClick={toggleOpen}
                aria-label="התראות"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <span className={styles.title}>התראות</span>
                        {unreadCount > 0 && (
                            <button className={styles.markAllButton} onClick={handleMarkAllRead}>
                                <Check size={14} />
                                סמן הכל כנקרא
                            </button>
                        )}
                    </div>

                    <div className={styles.list}>
                        {notifications.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Bell size={48} className={styles.emptyIcon} />
                                <div className={styles.emptyText}>אין התראות חדשות</div>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
                                    onClick={() => markRead(notification.id)}
                                >
                                    <div className={styles.itemIcon}>
                                        {TYPE_ICONS[notification.type] || TYPE_ICONS.info}
                                    </div>
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemTitle}>{notification.title}</div>
                                        <div className={styles.itemMessage}>{notification.message}</div>
                                        <div className={styles.itemTime}>
                                            {notification.createdAt?.toDate ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: he }) : 'עכשיו'}
                                        </div>
                                    </div>
                                    <button
                                        className={styles.deleteButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeNotification(notification.id);
                                        }}
                                        aria-label="מחק התראה"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
