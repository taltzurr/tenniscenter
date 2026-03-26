import { useState, useEffect, useMemo, useCallback } from 'react';
import useSwipeNavigation from '../../hooks/useSwipeNavigation';
import { Link } from 'react-router-dom';
import {
    ChevronRight, ChevronLeft, Award, Star, Building2,
    Save, Trash2, CheckCircle, Trophy
} from 'lucide-react';
import useAuthStore from '../../stores/authStore';
import useMonthlyOutstandingStore from '../../stores/monthlyOutstandingStore';
import useUsersStore from '../../stores/usersStore';
import useCentersStore from '../../stores/centersStore';
import { HEBREW_MONTHS } from '../../config/constants';
import { ROLES } from '../../config/constants';
import styles from './MonthlyOutstandingPage.module.css';

const CATEGORY_CONFIG = [
    {
        type: 'centerCoach',
        label: 'מאמן מצטיין מרכז',
        description: 'בחר מאמן מצטיין מתוך המרכז שלך',
        iconClass: 'coach',
        Icon: Award,
        allowedRoles: ['centerManager', 'supervisor']
    },
    {
        type: 'overallCoach',
        label: 'מאמן מצטיין כלל-מרכזי',
        description: 'בחר מאמן מצטיין מכלל המרכזים',
        iconClass: 'overallCoach',
        Icon: Star,
        allowedRoles: ['supervisor']
    },
    {
        type: 'outstandingCenter',
        label: 'מרכז מצטיין',
        description: 'בחר את המרכז המצטיין של החודש',
        iconClass: 'center',
        Icon: Building2,
        allowedRoles: ['supervisor']
    }
];

function MonthlyOutstandingPage() {
    const { userData, isSupervisor, isCenterManager } = useAuthStore();
    const { items, fetchOutstanding, saveOutstanding, removeOutstanding, isLoading } = useMonthlyOutstandingStore();
    const { users, fetchUsers } = useUsersStore();
    const { centers, fetchCenters } = useCentersStore();

    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selections, setSelections] = useState({});
    const [savedMessages, setSavedMessages] = useState({});

    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

    useEffect(() => {
        fetchUsers();
        fetchCenters();
    }, [fetchUsers, fetchCenters]);

    useEffect(() => {
        fetchOutstanding(selectedYear, selectedMonth);
    }, [fetchOutstanding, selectedYear, selectedMonth]);

    // Sync selections from loaded items
    useEffect(() => {
        const newSelections = {};
        items.forEach(item => {
            const key = item.centerId ? `${item.type}-${item.centerId}` : item.type;
            newSelections[key] = item.selectedId || '';
        });
        setSelections(newSelections);
    }, [items]);

    const navigateMonth = useCallback((direction) => {
        setSelectedMonth(prev => {
            let newMonth = prev + direction;
            let newYear = selectedYear;
            if (newMonth < 0) {
                newMonth = 11;
                newYear--;
            } else if (newMonth > 11) {
                newMonth = 0;
                newYear++;
            }
            setSelectedYear(newYear);
            return newMonth;
        });
    }, [selectedYear]);

    const handleNextMonth = useCallback(() => navigateMonth(1), [navigateMonth]);
    const handlePrevMonth = useCallback(() => navigateMonth(-1), [navigateMonth]);
    const swipeHandlers = useSwipeNavigation(handleNextMonth, handlePrevMonth);

    // Filter categories by role
    const visibleCategories = useMemo(() => {
        const role = userData?.role;
        return CATEGORY_CONFIG.filter(cat => cat.allowedRoles.includes(role));
    }, [userData]);

    // Get coaches list for selection
    const coachOptions = useMemo(() => {
        const coaches = users.filter(u => u.role === ROLES.COACH && u.isActive !== false);

        if (isCenterManager() && userData?.managedCenterId) {
            // Center manager sees only their center's coaches
            return coaches.filter(c =>
                c.centerIds?.includes(userData.managedCenterId)
            );
        }
        return coaches;
    }, [users, isCenterManager, userData]);

    // Get center options (for supervisor)
    const centerOptions = useMemo(() => {
        return centers.map(c => ({ id: c.id, name: c.name }));
    }, [centers]);

    const getOptionsForCategory = (type) => {
        if (type === 'centerCoach') {
            return coachOptions.map(c => ({ id: c.id, name: c.displayName || c.name }));
        }
        if (type === 'overallCoach') {
            const allCoaches = users.filter(u => u.role === ROLES.COACH && u.isActive !== false);
            return allCoaches.map(c => ({ id: c.id, name: c.displayName || c.name }));
        }
        if (type === 'outstandingCenter') {
            return centerOptions;
        }
        return [];
    };

    const getSelectionKey = (type) => {
        if (type === 'centerCoach' && isCenterManager() && userData?.managedCenterId) {
            return `${type}-${userData.managedCenterId}`;
        }
        return type;
    };

    const handleSelectionChange = (type, value) => {
        const key = getSelectionKey(type);
        setSelections(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (type) => {
        const key = getSelectionKey(type);
        const selectedId = selections[key];
        if (!selectedId) return;

        const options = getOptionsForCategory(type);
        const selected = options.find(o => o.id === selectedId);
        if (!selected) return;

        const data = {
            year: selectedYear,
            month: selectedMonth,
            type,
            selectedId,
            selectedName: selected.name,
            selectedBy: userData?.id,
            selectedByName: userData?.displayName || userData?.name
        };

        // Add centerId for centerCoach
        if (type === 'centerCoach') {
            data.centerId = userData?.managedCenterId || '';
        }

        const result = await saveOutstanding(data);
        if (result.success) {
            setSavedMessages(prev => ({ ...prev, [key]: true }));
            setTimeout(() => {
                setSavedMessages(prev => ({ ...prev, [key]: false }));
            }, 3000);
        }
    };

    const handleClear = async (type) => {
        const key = getSelectionKey(type);
        const existing = items.find(i => {
            if (type === 'centerCoach' && isCenterManager() && userData?.managedCenterId) {
                return i.type === type && i.centerId === userData.managedCenterId;
            }
            return i.type === type;
        });

        if (existing) {
            await removeOutstanding(existing.id);
            setSelections(prev => ({ ...prev, [key]: '' }));
        }
    };

    return (
        <div className={styles.page} {...swipeHandlers}>
            <div className={styles.header}>
                <Link to="/dashboard" className={styles.backLink}>
                    <ChevronRight size={16} />
                    חזרה לדשבורד
                </Link>
                <h1 className={styles.title}>
                    <span>🏆</span>
                    מצטייני החודש
                </h1>
                <p className={styles.subtitle}>
                    בחר את המצטיינים של כל חודש
                </p>
            </div>

            {/* Month Navigation */}
            <div className={styles.monthNav}>
                <button
                    className={styles.monthNavBtn}
                    onClick={() => navigateMonth(-1)}
                    title="חודש קודם"
                >
                    <ChevronRight size={20} />
                </button>
                <div className={styles.monthLabel}>
                    {isCurrentMonth && <span className={styles.currentBadge}>נוכחי</span>}
                    {HEBREW_MONTHS[selectedMonth]} {selectedYear}
                </div>
                <button
                    className={styles.monthNavBtn}
                    onClick={() => navigateMonth(1)}
                    title="חודש הבא"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>

            {/* Category Cards */}
            {isLoading ? (
                <div className={styles.loading}>טוען...</div>
            ) : (
                <div className={styles.categoriesList}>
                    {visibleCategories.map(({ type, label, description, iconClass, Icon }) => {
                        const key = getSelectionKey(type);
                        const currentValue = selections[key] || '';
                        const options = getOptionsForCategory(type);
                        const showSaved = savedMessages[key];

                        return (
                            <div key={type} className={styles.categoryCard}>
                                <div className={styles.categoryHeader}>
                                    <div className={`${styles.categoryIcon} ${styles[iconClass]}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <div className={styles.categoryTitle}>{label}</div>
                                        <div className={styles.categoryDesc}>{description}</div>
                                    </div>
                                </div>

                                <div className={styles.selectionArea}>
                                    <div className={styles.selectWrapper}>
                                        <select
                                            className={styles.selectInput}
                                            value={currentValue}
                                            onChange={(e) => handleSelectionChange(type, e.target.value)}
                                        >
                                            <option value="">-- בחר --</option>
                                            {options.map(opt => (
                                                <option key={opt.id} value={opt.id}>
                                                    {opt.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.actions}>
                                        <button
                                            className={styles.saveBtn}
                                            onClick={() => handleSave(type)}
                                            disabled={!currentValue || isLoading}
                                        >
                                            <Save size={16} />
                                            שמור
                                        </button>

                                        {currentValue && (
                                            <button
                                                className={styles.clearBtn}
                                                onClick={() => handleClear(type)}
                                            >
                                                <Trash2 size={14} />
                                                נקה
                                            </button>
                                        )}

                                        {showSaved && (
                                            <span className={styles.successMessage}>
                                                <CheckCircle size={14} />
                                                נשמר!
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default MonthlyOutstandingPage;
