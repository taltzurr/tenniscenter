import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle, X, ChevronLeft } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import useNotificationsStore from '../../../stores/notificationsStore';
import useAuthStore from '../../../stores/authStore';
import styles from './NotificationsBell.module.css';

const TYPE_ICONS = {
    info: <Info size={18} className={styles.iconInfo} />,
    success: <CheckCircle size={18} className={styles.iconSuccess} />,
    warning: <AlertTriangle size={18} className={styles.iconWarning} />,
    error: <XCircle size={18} className={styles.iconError} />
};

/**
 * Returns a route path based on notification type/data.
 */
function getNotificationLink(notification) {
    if (notification.link) return notification.link;
    if (notification.route) return notification.route;

    const type = (notification.type || '').toLowerCase();
    const title = (notification.title || '').toLowerCase();
    const message = (notification.message || '').toLowerCase();
    const combined = `${type} ${title} ${message}`;

    if (combined.includes('training') || combined.includes('אימון')) return '/calendar';
    if (combined.includes('plan') || combined.includes('תוכנית')) return '/plans';
    if (combined.includes('event') || combined.includes('אירוע')) return '/events-calendar';
    if (combined.includes('goal') || combined.includes('יעד')) return '/goals';
    if (combined.includes('exercise') || combined.includes('תרגיל')) return '/exercises';
    if (combined.includes('group') || combined.includes('קבוצ')) return '/groups';

    return '/dashboard';
}

/**
 * Hook to detect if we're on a mobile viewport.
 */
function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        setIsMobile(mq.matches);
        return () => mq.removeEventListener('change', handler);
    }, [breakpoint]);

    return isMobile;
}

export default function NotificationsBell() {
    const { userData } = useAuthStore();
    const { notifications, unreadCount, initialize, cleanup, markRead, markAllRead, removeNotification } = useNotificationsStore();
    const [isOpen, setIsOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    // Touch tracking for swipe-to-dismiss on individual items
    const touchStartRef = useRef({});

    useEffect(() => {
        if (userData?.id) {
            initialize(userData.id);
        }
        return () => cleanup();
    }, [userData?.id]);

    // Close dropdown on click outside (desktop only)
    useEffect(() => {
        if (isMobile) return;
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile]);

    // Lock body scroll when mobile panel is open
    useEffect(() => {
        if (isMobile && isOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isMobile, isOpen]);

    const openPanel = useCallback(() => {
        setIsClosing(false);
        setIsOpen(true);
        // Mark all as read when opening
        if (userData?.id && unreadCount > 0) {
            markAllRead(userData.id);
        }
    }, [userData?.id, unreadCount, markAllRead]);

    const closePanel = useCallback(() => {
        if (isMobile) {
            setIsClosing(true);
            setTimeout(() => {
                setIsOpen(false);
                setIsClosing(false);
            }, 300);
        } else {
            setIsOpen(false);
        }
    }, [isMobile]);

    const toggleOpen = () => {
        if (isOpen) {
            closePanel();
        } else {
            openPanel();
        }
    };

    const handleNotificationClick = (notification) => {
        // Mark as read
        if (!notification.isRead) {
            markRead(notification.id);
        }
        // Navigate
        const link = getNotificationLink(notification);
        closePanel();
        navigate(link);
    };

    const handleDelete = (e, notificationId) => {
        e.stopPropagation();
        removeNotification(notificationId);
    };

    // Swipe-to-dismiss handlers for mobile
    const handleTouchStart = (e, notificationId) => {
        touchStartRef.current[notificationId] = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY,
            el: e.currentTarget,
            swiping: false
        };
    };

    const handleTouchMove = (e, notificationId) => {
        const start = touchStartRef.current[notificationId];
        if (!start) return;

        const deltaX = e.touches[0].clientX - start.x;
        const deltaY = Math.abs(e.touches[0].clientY - start.y);

        // Only swipe horizontally, and only to the left (in RTL that means positive deltaX is "left" visually)
        // In RTL, swiping finger to the right (positive deltaX) should dismiss
        if (deltaY > 30 && !start.swiping) {
            // Vertical scroll, cancel swipe
            delete touchStartRef.current[notificationId];
            return;
        }

        const absDeltaX = Math.abs(deltaX);
        if (absDeltaX > 10) {
            start.swiping = true;
            // Translate in the swipe direction
            start.el.style.transform = `translateX(${deltaX}px)`;
            start.el.style.opacity = Math.max(0, 1 - absDeltaX / 200);
        }
    };

    const handleTouchEnd = (e, notificationId) => {
        const start = touchStartRef.current[notificationId];
        if (!start) return;

        const deltaX = e.changedTouches[0].clientX - start.x;
        const absDeltaX = Math.abs(deltaX);

        if (absDeltaX > 100) {
            // Dismiss
            start.el.style.transform = `translateX(${deltaX > 0 ? '100%' : '-100%'})`;
            start.el.style.opacity = '0';
            start.el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            setTimeout(() => removeNotification(notificationId), 200);
        } else {
            // Snap back
            start.el.style.transform = '';
            start.el.style.opacity = '';
            start.el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            setTimeout(() => {
                if (start.el) {
                    start.el.style.transition = '';
                }
            }, 200);
        }

        delete touchStartRef.current[notificationId];
    };

    const renderNotificationItem = (notification) => (
        <div
            key={notification.id}
            className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
            onClick={() => handleNotificationClick(notification)}
            onTouchStart={isMobile ? (e) => handleTouchStart(e, notification.id) : undefined}
            onTouchMove={isMobile ? (e) => handleTouchMove(e, notification.id) : undefined}
            onTouchEnd={isMobile ? (e) => handleTouchEnd(e, notification.id) : undefined}
            role="button"
            tabIndex={0}
        >
            <div className={styles.itemIcon}>
                {TYPE_ICONS[notification.type] || TYPE_ICONS.info}
            </div>
            <div className={styles.itemContent}>
                <div className={styles.itemTitle}>{notification.title}</div>
                <div className={styles.itemMessage}>{notification.message}</div>
                <div className={styles.itemTime}>
                    {notification.createdAt?.toDate
                        ? formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true, locale: he })
                        : 'עכשיו'}
                </div>
            </div>
            <div className={styles.itemActions}>
                <button
                    className={styles.deleteButton}
                    onClick={(e) => handleDelete(e, notification.id)}
                    aria-label="מחק התראה"
                >
                    <Trash2 size={16} />
                </button>
                <ChevronLeft size={16} className={styles.itemChevron} />
            </div>
        </div>
    );

    const panelContent = (
        <>
            <div className={styles.header}>
                <span className={styles.title}>התראות</span>
                <div className={styles.headerActions}>
                    {notifications.length > 0 && unreadCount > 0 && (
                        <button
                            className={styles.markAllButton}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (userData?.id) markAllRead(userData.id);
                            }}
                        >
                            <Check size={14} />
                            סמן הכל כנקרא
                        </button>
                    )}
                    {isMobile && (
                        <button
                            className={styles.closeButton}
                            onClick={closePanel}
                            aria-label="סגור התראות"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.list}>
                {notifications.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Bell size={48} className={styles.emptyIcon} />
                        <div className={styles.emptyText}>אין התראות חדשות</div>
                    </div>
                ) : (
                    notifications.map(renderNotificationItem)
                )}
            </div>

            {isMobile && notifications.length > 0 && (
                <div className={styles.swipeHint}>
                    החלק הצידה כדי למחוק התראה
                </div>
            )}
        </>
    );

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
                <>
                    {/* Backdrop for mobile */}
                    {isMobile && (
                        <div
                            className={`${styles.backdrop} ${isClosing ? styles.backdropClosing : ''}`}
                            onClick={closePanel}
                        />
                    )}

                    <div className={`${styles.panel} ${isMobile ? styles.mobilePanel : styles.desktopDropdown} ${isClosing ? styles.panelClosing : ''}`}>
                        {isMobile && <div className={styles.dragHandle} />}
                        {panelContent}
                    </div>
                </>
            )}
        </div>
    );
}
