import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Award, Star, Building2 } from 'lucide-react';
import useMonthlyOutstandingStore from '../../stores/monthlyOutstandingStore';
import useAuthStore from '../../stores/authStore';
import styles from './MonthlyOutstandingCard.module.css';

const CATEGORIES = [
    {
        type: 'centerCoach',
        label: 'מאמן מצטיין',
        iconClass: 'coach',
        Icon: Award
    },
    {
        type: 'overallCoach',
        label: 'מצטיין כלל-מרכזי',
        iconClass: 'overallCoach',
        Icon: Star
    },
    {
        type: 'outstandingCenter',
        label: 'מרכז מצטיין',
        iconClass: 'center',
        Icon: Building2
    }
];

function MonthlyOutstandingCard() {
    const { items, fetchOutstanding } = useMonthlyOutstandingStore();
    const { userData, isSupervisor, isCenterManager } = useAuthStore();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    useEffect(() => {
        fetchOutstanding(year, month);
    }, [fetchOutstanding, year, month]);

    const canManage = isSupervisor() || isCenterManager();

    // Check if any category has a selected name
    const hasAnySelection = useMemo(() => {
        return CATEGORIES.some(({ type }) => {
            if (type === 'centerCoach' && isCenterManager() && userData?.managedCenterId) {
                return items.some(i => i.type === type && i.centerId === userData.managedCenterId && i.selectedName);
            }
            return items.some(i => i.type === type && i.selectedName);
        });
    }, [items, userData, isCenterManager]);

    const getSelectedName = (type) => {
        if (type === 'centerCoach' && isCenterManager() && userData?.managedCenterId) {
            const match = items.find(
                i => i.type === type && i.centerId === userData.managedCenterId
            );
            return match?.selectedName || null;
        }
        const match = items.find(i => i.type === type);
        return match?.selectedName || null;
    };

    // Get first letter for avatar
    const getInitial = (name) => {
        if (!name) return null;
        return name.charAt(0);
    };

    // Filter categories based on role:
    // - Supervisor sees all 3 categories
    // - Center Manager sees only centerCoach (their center's outstanding coach)
    // - Coach sees all visible categories (read-only)
    const roleFilteredCategories = isCenterManager()
        ? CATEGORIES.filter(({ type }) => type === 'centerCoach')
        : CATEGORIES;

    const visibleCategories = roleFilteredCategories.filter(({ type }) => !!getSelectedName(type));

    // Hide entirely if no selections exist and user cannot manage
    if (visibleCategories.length === 0 && !canManage) {
        return null;
    }

    return (
        <div className={styles.outstandingCard}>
            <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                    מצטייני החודש
                </div>
                {canManage && (
                    <Link to="/monthly-outstanding" className={styles.manageLink}>
                        ניהול
                    </Link>
                )}
            </div>

            <div className={styles.categoriesRow} style={{ justifyContent: visibleCategories.length > 0 ? 'space-around' : 'center' }}>
                {visibleCategories.length > 0 ? (
                    visibleCategories.map(({ type, label, iconClass, Icon }) => {
                        const name = getSelectedName(type);
                        const initial = getInitial(name);

                        return (
                            <div key={type} className={styles.categoryItem}>
                                <div className={`${styles.categoryCircle} ${styles[iconClass]}`}>
                                    {initial}
                                </div>
                                <div className={styles.categoryLabel}>{label}</div>
                                <div className={styles.categoryName}>{name}</div>
                            </div>
                        );
                    })
                ) : (
                    <div className={styles.emptyName} style={{ padding: '10px 0', width: '100%' }}>
                        טרם נבחרו מצטיינים החודש
                    </div>
                )}
            </div>
        </div>
    );
}

export default MonthlyOutstandingCard;
