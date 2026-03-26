import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle, ChevronLeft, MapPin } from 'lucide-react';
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

/**
 * Returns a route path based on notification type/data.
 */
function getNotificationLink(notification) {
    // Use explicit link if stored
    if (notification.link) return notification.link;
    if (notification.route) return notification.route;

    // Use relatedEntityType + relatedEntityId for specific navigation
    if (notification.relatedEntityType === 'monthlyPlan') {
        const basePath = '/monthly-plans';
        // Append plan reference as hash fragment for scroll-to behavior
        if (notification.relatedEntityId) {
            return `${basePath}#plan-${notification.relatedEntityId}`;
        }
        return basePath;
    }

    const type = (notification.type || '').toLowerCase();
    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();
    const combined = `${type} ${title} ${message}`;

    if (combined.includes('training') || combined.includes('אימון')) return '/calendar';
    if (combined.includes('plan') || combined.includes('תכנית') || combined.includes('תוכנית')) return '/monthly-plans';
    if (combined.includes('event') || combined.includes('אירוע')) return '/events-calendar';
    if (combined.includes('goal') || combined.includes('יעד') || combined.includes('מטר')) return '/goals';
    if (combined.includes('exercise') || combined.includes('תרגיל')) return '/exercises';
    if (combined.includes('group') || combined.includes('קבוצ')) return '/groups';

    return '/dashboard';
}

export default function NotificationsBell() {
    const { userData } = useAuthStore();
    const { notifications, unreadCount, initialize, cleanup, markRead, markAllRead, removeNotification } = useNotificationsStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (userData?.id) {
            initialize(userData.id);
        }
        return () => cleanup();
    }, [userData?.id]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOpen = useCallback(() => {
        const willOpen = !isOpen;
        setIsOpen(willOpen);
        // Mark all as read when opening
        if (willOpen && userData?.id && unreadCount > 0) {
            markAllRead(userData.id);
        }
    }, [isOpen, userData?.id, unreadCount, markAllRead]);

    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markRead(notification.id);
        }
        const link = getNotificationLink(notification);
        setIsOpen(false);
        navigate(link);
    };

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
                                    onClick={() => handleNotificationClick(notification)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className={styles.itemIcon}>
                                        {TYPE_ICONS[notification.type] || TYPE_ICONS.info}
                                    </div>
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemTitle}>{notification.title}</div>
                                        <div className={styles.itemMessage}>{notification.message}</div>
                                        <div className={styles.itemMeta}>
                                            {notification.centerName && (
                                                <span className={styles.centerLabel}>
                                                    <MapPin size={10} />
                                                    {notification.centerName}
                                                </span>
                                            )}
                                            <span className={styles.itemTime}>
                                                {notification.createdAt?.toDate ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: he }) : 'עכשיו'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.itemActions}>
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
                                        <ChevronLeft size={14} className={styles.itemChevron} />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
