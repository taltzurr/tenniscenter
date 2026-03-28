import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Target,
    Heart,
    Plus,
    Edit2,
    Trash2,
    ChevronRight,
    ChevronLeft,
    Settings,
    Check
} from 'lucide-react';
import useGoalsStore from '../../../stores/goalsStore';
import useAuthStore from '../../../stores/authStore';
import useGroupsStore from '../../../stores/groupsStore';
import useUIStore from '../../../stores/uiStore';
import { GOAL_CATEGORIES, VALUE_CATEGORIES } from '../../../services/goals';
import { HEBREW_MONTHS, DEFAULT_GROUP_TYPES, ROLES } from '../../../config/constants';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import styles from './GoalsPage.module.css';

function GoalsPage() {
    const { userData } = useAuthStore();
    const {
        goals, values, currentAssignment,
        fetchGoals, fetchValues, fetchMonthlyAssignment,
        saveMonthlyAssignment, saveGoal, deleteGoal,
        saveValue, deleteValue, isLoading
    } = useGoalsStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { addToast } = useUIStore();

    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

    // Modal states
    const [assignGoalsOpen, setAssignGoalsOpen] = useState(false);
    const [assignValuesOpen, setAssignValuesOpen] = useState(false);
    const [manageGoalsOpen, setManageGoalsOpen] = useState(false);
    const [manageValuesOpen, setManageValuesOpen] = useState(false);

    // Assignment selection
    const [selectedGoalsByType, setSelectedGoalsByType] = useState({});
    const [selectedValueIds, setSelectedValueIds] = useState([]);
    const [activeGroupType, setActiveGroupType] = useState(null);

    // Definition form
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({ title: '', description: '', category: '' });
    const [showDefinitionForm, setShowDefinitionForm] = useState(false);

    const canEdit = userData?.role === ROLES.SUPERVISOR;
    const isCoach = userData?.role === ROLES.COACH;

    // Fetch groups for coach filtering
    useEffect(() => {
        if (!userData) return;
        if (isCoach) {
            fetchGroups(userData.id);
        } else if (userData.role === ROLES.CENTER_MANAGER) {
            fetchGroups(null, false, userData.managedCenterId);
        } else {
            fetchGroups(null, true);
        }
    }, [userData, isCoach, fetchGroups]);

    // Get group types relevant to the current user
    const relevantGroupTypes = useMemo(() => {
        if (isCoach) {
            // Coach: only group types from their groups
            const typeIds = [...new Set(groups.map(g => g.groupTypeId).filter(Boolean))];
            return DEFAULT_GROUP_TYPES.filter(gt => typeIds.includes(gt.id));
        }
        // Supervisor/Manager: all group types
        return DEFAULT_GROUP_TYPES;
    }, [groups, isCoach]);

    // Fetch definitions on mount
    useEffect(() => {
        fetchGoals();
        fetchValues();
    }, [fetchGoals, fetchValues]);

    // Fetch assignment when month changes
    useEffect(() => {
        fetchMonthlyAssignment(selectedYear, selectedMonth);
    }, [fetchMonthlyAssignment, selectedYear, selectedMonth]);

    // Month navigation
    const navigateMonth = useCallback((direction) => {
        let newMonth = selectedMonth + direction;
        let newYear = selectedYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
    }, [selectedMonth, selectedYear]);

    // Get goalsByType from assignment (support old format too)
    const assignmentGoalsByType = useMemo(() => {
        if (!currentAssignment) return {};
        if (currentAssignment.goalsByType) return currentAssignment.goalsByType;
        // Backward compat: old format had flat goalIds — show under first group type
        if (currentAssignment.goalIds?.length > 0 && relevantGroupTypes.length > 0) {
            return { [relevantGroupTypes[0].id]: currentAssignment.goalIds };
        }
        return {};
    }, [currentAssignment, relevantGroupTypes]);

    // Resolve assigned values
    const assignedValues = useMemo(() => {
        const ids = currentAssignment?.valueIds || [];
        return ids.map(id => values.find(v => v.id === id)).filter(Boolean);
    }, [currentAssignment, values]);

    // ==========================================
    // Assign Goals Modal (per group type)
    // ==========================================
    const openAssignGoals = () => {
        setSelectedGoalsByType(assignmentGoalsByType || {});
        setActiveGroupType(relevantGroupTypes[0]?.id || null);
        setAssignGoalsOpen(true);
    };

    const toggleGoalForType = (goalId) => {
        if (!activeGroupType) return;
        setSelectedGoalsByType(prev => {
            const current = prev[activeGroupType] || [];
            if (current.includes(goalId)) {
                const updated = current.filter(id => id !== goalId);
                const newState = { ...prev };
                if (updated.length === 0) {
                    delete newState[activeGroupType];
                } else {
                    newState[activeGroupType] = updated;
                }
                return newState;
            }
            if (current.length >= 3) return prev;
            return { ...prev, [activeGroupType]: [...current, goalId] };
        });
    };

    const handleSaveGoalAssignment = async () => {
        const result = await saveMonthlyAssignment(
            selectedYear, selectedMonth,
            selectedGoalsByType,
            currentAssignment?.valueIds || []
        );
        if (result.success) {
            addToast({ type: 'success', message: 'המטרות שובצו בהצלחה' });
            setAssignGoalsOpen(false);
        } else {
            addToast({ type: 'error', message: 'שגיאה בשיבוץ המטרות' });
        }
    };

    // ==========================================
    // Assign Values Modal
    // ==========================================
    const openAssignValues = () => {
        setSelectedValueIds(currentAssignment?.valueIds || []);
        setAssignValuesOpen(true);
    };

    const toggleValueSelection = (id) => {
        setSelectedValueIds(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 3) return prev;
            return [...prev, id];
        });
    };

    const handleSaveValueAssignment = async () => {
        const result = await saveMonthlyAssignment(
            selectedYear, selectedMonth,
            currentAssignment?.goalsByType || assignmentGoalsByType,
            selectedValueIds
        );
        if (result.success) {
            addToast({ type: 'success', message: 'הערכים שובצו בהצלחה' });
            setAssignValuesOpen(false);
        } else {
            addToast({ type: 'error', message: 'שגיאה בשיבוץ הערכים' });
        }
    };

    // ==========================================
    // Manage Definitions (Goals / Values)
    // ==========================================
    const openDefinitionForm = (item = null, isValue = false) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                title: item.title || '',
                description: item.description || '',
                category: item.category || (isValue ? 'respect' : 'technical')
            });
        } else {
            setEditingItem(null);
            setFormData({
                title: '',
                description: '',
                category: isValue ? 'respect' : 'technical'
            });
        }
        setShowDefinitionForm(true);
    };

    const closeDefinitionForm = () => {
        setShowDefinitionForm(false);
        setEditingItem(null);
    };

    const handleSaveGoalDefinition = async (e) => {
        e.preventDefault();
        const data = { ...formData };
        if (editingItem) {
            data.id = editingItem.id;
            data.createdAt = editingItem.createdAt;
        }
        const result = await saveGoal(data);
        if (result.success) {
            addToast({ type: 'success', message: editingItem ? 'המטרה עודכנה' : 'המטרה נוספה' });
            closeDefinitionForm();
        } else {
            addToast({ type: 'error', message: 'שגיאה בשמירת המטרה' });
        }
    };

    const handleSaveValueDefinition = async (e) => {
        e.preventDefault();
        const data = { ...formData };
        if (editingItem) {
            data.id = editingItem.id;
            data.createdAt = editingItem.createdAt;
        }
        const result = await saveValue(data);
        if (result.success) {
            addToast({ type: 'success', message: editingItem ? 'הערך עודכן' : 'הערך נוסף' });
            closeDefinitionForm();
        } else {
            addToast({ type: 'error', message: 'שגיאה בשמירת הערך' });
        }
    };

    const handleDeleteGoal = async (goal) => {
        if (!confirm('האם למחוק את המטרה?')) return;
        const result = await deleteGoal(goal.id);
        if (result.success) {
            addToast({ type: 'success', message: 'המטרה נמחקה' });
        } else {
            addToast({ type: 'error', message: 'שגיאה במחיקה' });
        }
    };

    const handleDeleteValue = async (value) => {
        if (!confirm('האם למחוק את הערך?')) return;
        const result = await deleteValue(value.id);
        if (result.success) {
            addToast({ type: 'success', message: 'הערך נמחק' });
        } else {
            addToast({ type: 'error', message: 'שגיאה במחיקה' });
        }
    };

    // Check if any goals are assigned for relevant group types
    const hasAssignedGoals = relevantGroupTypes.some(
        gt => (assignmentGoalsByType[gt.id] || []).length > 0
    );

    if (isLoading && goals.length === 0 && values.length === 0) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>מטרות וערכים</h1>
            </div>

            {/* Month Navigator */}
            <div className={styles.monthNav}>
                <button
                    className={styles.monthNavBtn}
                    onClick={() => navigateMonth(-1)}
                    aria-label="חודש קודם"
                >
                    <ChevronRight size={20} />
                </button>
                <span className={styles.monthLabel}>
                    {HEBREW_MONTHS[selectedMonth]} {selectedYear}
                </span>
                <button
                    className={styles.monthNavBtn}
                    onClick={() => navigateMonth(1)}
                    aria-label="חודש הבא"
                >
                    <ChevronLeft size={20} />
                </button>
            </div>

            {/* Two sections */}
            <div className={styles.sectionsGrid}>
                {/* Values Section */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleRow}>
                            <Heart size={18} className={styles.sectionIcon} />
                            <h2 className={styles.sectionTitle}>ערכי החודש</h2>
                        </div>
                        {canEdit && (
                            <div className={styles.adminButtons}>
                                <Button size="small" onClick={openAssignValues}>
                                    שבץ ערכים
                                </Button>
                                <Button size="small" variant="ghost" onClick={() => setManageValuesOpen(true)}>
                                    <Settings size={16} />
                                    נהל ערכים
                                </Button>
                            </div>
                        )}
                    </div>
                    {assignedValues.length > 0 ? (
                        <div className={styles.cardsGrid}>
                            {assignedValues.map(value => (
                                <div key={value.id} className={styles.valueCard}>
                                    <h3 className={styles.cardTitle}>{value.title}</h3>
                                    {value.description && (
                                        <p className={styles.cardDescription}>{value.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <Heart className={styles.emptyIcon} />
                            <div className={styles.emptyTitle}>לא שובצו ערכים לחודש זה</div>
                        </div>
                    )}
                </div>

                {/* Goals Section - organized by group type */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleRow}>
                            <Target size={18} className={styles.sectionIcon} />
                            <h2 className={styles.sectionTitle}>מטרות החודש</h2>
                        </div>
                        {canEdit && (
                            <div className={styles.adminButtons}>
                                <Button size="small" onClick={openAssignGoals}>
                                    שבץ מטרות
                                </Button>
                                <Button size="small" variant="ghost" onClick={() => setManageGoalsOpen(true)}>
                                    <Settings size={16} />
                                    נהל מטרות
                                </Button>
                            </div>
                        )}
                    </div>
                    {hasAssignedGoals ? (
                        <div className={styles.goalsByType}>
                            {relevantGroupTypes.map(groupType => {
                                const typeGoalIds = assignmentGoalsByType[groupType.id] || [];
                                if (typeGoalIds.length === 0) return null;
                                const typeGoals = typeGoalIds
                                    .map(id => goals.find(g => g.id === id))
                                    .filter(Boolean);
                                if (typeGoals.length === 0) return null;

                                return (
                                    <div key={groupType.id} className={styles.groupTypeSection}>
                                        <div className={styles.groupTypeHeader}>
                                            {groupType.name}
                                        </div>
                                        <div className={styles.cardsGrid}>
                                            {typeGoals.map(goal => (
                                                <div key={goal.id} className={styles.goalCard}>
                                                    <h3 className={styles.cardTitle}>{goal.title}</h3>
                                                    {goal.description && (
                                                        <p className={styles.cardDescription}>{goal.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <Target className={styles.emptyIcon} />
                            <div className={styles.emptyTitle}>לא שובצו מטרות לחודש זה</div>
                        </div>
                    )}
                </div>
            </div>

            {/* ==========================================
                MODAL: Assign Goals (per group type)
            ========================================== */}
            <Modal
                isOpen={assignGoalsOpen}
                onClose={() => setAssignGoalsOpen(false)}
                title="שבץ מטרות לפי סוג קבוצה"
                size="large"
            >
                <Modal.Body>
                    <p className={styles.modalHint}>
                        בחר סוג קבוצה ושבץ עד 3 מטרות עבור {HEBREW_MONTHS[selectedMonth]} {selectedYear}
                    </p>

                    {/* Group type tabs */}
                    <div className={styles.groupTypeTabs}>
                        {DEFAULT_GROUP_TYPES.map(gt => {
                            const count = (selectedGoalsByType[gt.id] || []).length;
                            return (
                                <button
                                    key={gt.id}
                                    className={`${styles.groupTypeTab} ${activeGroupType === gt.id ? styles.activeTab : ''}`}
                                    onClick={() => setActiveGroupType(gt.id)}
                                >
                                    {gt.name}
                                    {count > 0 && <span className={styles.tabBadge}>{count}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Goals selection for active group type */}
                    {activeGroupType && (
                        <>
                            <div className={styles.activeTypeLabel}>
                                מטרות עבור: <strong>{DEFAULT_GROUP_TYPES.find(gt => gt.id === activeGroupType)?.name}</strong>
                            </div>
                            {goals.length > 0 ? (
                                <div className={styles.selectionList}>
                                    {goals.map(goal => {
                                        const isSelected = (selectedGoalsByType[activeGroupType] || []).includes(goal.id);
                                        const currentCount = (selectedGoalsByType[activeGroupType] || []).length;
                                        return (
                                            <button
                                                key={goal.id}
                                                className={`${styles.selectionItem} ${isSelected ? styles.selected : ''}`}
                                                onClick={() => toggleGoalForType(goal.id)}
                                                disabled={!isSelected && currentCount >= 3}
                                            >
                                                <div className={styles.selectionInfo}>
                                                    <div>
                                                        <div className={styles.selectionTitle}>{goal.title}</div>
                                                        {goal.description && (
                                                            <div className={styles.selectionDesc}>{goal.description}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className={styles.checkMark}>
                                                        <Check size={16} />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className={styles.noItems}>
                                    אין מטרות מוגדרות. הוסף מטרות דרך &quot;נהל מטרות&quot;.
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="ghost" onClick={() => setAssignGoalsOpen(false)}>ביטול</Button>
                    <Button onClick={handleSaveGoalAssignment} disabled={isLoading}>שמור</Button>
                </Modal.Footer>
            </Modal>

            {/* ==========================================
                MODAL: Assign Values
            ========================================== */}
            <Modal
                isOpen={assignValuesOpen}
                onClose={() => setAssignValuesOpen(false)}
                title="שבץ ערכים"
                size="medium"
            >
                <Modal.Body>
                    <p className={styles.modalHint}>בחר עד 3 ערכים עבור {HEBREW_MONTHS[selectedMonth]} {selectedYear}</p>
                    {values.length > 0 ? (
                        <div className={styles.selectionList}>
                            {values.map(value => {
                                const isSelected = selectedValueIds.includes(value.id);
                                return (
                                    <button
                                        key={value.id}
                                        className={`${styles.selectionItem} ${isSelected ? styles.selected : ''}`}
                                        onClick={() => toggleValueSelection(value.id)}
                                        disabled={!isSelected && selectedValueIds.length >= 3}
                                    >
                                        <div className={styles.selectionInfo}>
                                            <div>
                                                <div className={styles.selectionTitle}>{value.title}</div>
                                                {value.description && (
                                                    <div className={styles.selectionDesc}>{value.description}</div>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className={styles.checkMark}>
                                                <Check size={16} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.noItems}>
                            אין ערכים מוגדרים. הוסף ערכים דרך &quot;נהל ערכים&quot;.
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="ghost" onClick={() => setAssignValuesOpen(false)}>ביטול</Button>
                    <Button onClick={handleSaveValueAssignment} disabled={isLoading}>שמור</Button>
                </Modal.Footer>
            </Modal>

            {/* ==========================================
                MODAL: Manage Goal Definitions
            ========================================== */}
            <Modal
                isOpen={manageGoalsOpen}
                onClose={() => { setManageGoalsOpen(false); closeDefinitionForm(); }}
                title="נהל מטרות"
                size="large"
            >
                <Modal.Body>
                    {!showDefinitionForm ? (
                        <>
                            <div className={styles.manageHeader}>
                                <Button size="small" onClick={() => openDefinitionForm(null, false)}>
                                    <Plus size={16} />
                                    הוסף מטרה
                                </Button>
                            </div>
                            {goals.length > 0 ? (
                                <div className={styles.manageList}>
                                    {goals.map(goal => (
                                        <div key={goal.id} className={styles.manageItem}>
                                            <div className={styles.manageItemInfo}>
                                                <div>
                                                    <div className={styles.manageItemTitle}>{goal.title}</div>
                                                    {goal.description && (
                                                        <div className={styles.manageItemDesc}>{goal.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.manageItemActions}>
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => openDefinitionForm(goal, false)}
                                                    aria-label="ערוך"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className={`${styles.iconButton} ${styles.deleteBtn}`}
                                                    onClick={() => handleDeleteGoal(goal)}
                                                    aria-label="מחק"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.noItems}>אין מטרות מוגדרות עדיין</div>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleSaveGoalDefinition}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>כותרת</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>תיאור</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>קטגוריה</label>
                                <select
                                    className={styles.select}
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {Object.values(GOAL_CATEGORIES).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formActions}>
                                <Button type="button" variant="ghost" onClick={closeDefinitionForm}>ביטול</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {editingItem ? 'שמור' : 'הוסף'}
                                </Button>
                            </div>
                        </form>
                    )}
                </Modal.Body>
            </Modal>

            {/* ==========================================
                MODAL: Manage Value Definitions
            ========================================== */}
            <Modal
                isOpen={manageValuesOpen}
                onClose={() => { setManageValuesOpen(false); closeDefinitionForm(); }}
                title="נהל ערכים"
                size="large"
            >
                <Modal.Body>
                    {!showDefinitionForm ? (
                        <>
                            <div className={styles.manageHeader}>
                                <Button size="small" onClick={() => openDefinitionForm(null, true)}>
                                    <Plus size={16} />
                                    הוסף ערך
                                </Button>
                            </div>
                            {values.length > 0 ? (
                                <div className={styles.manageList}>
                                    {values.map(value => (
                                        <div key={value.id} className={styles.manageItem}>
                                            <div className={styles.manageItemInfo}>
                                                <div>
                                                    <div className={styles.manageItemTitle}>{value.title}</div>
                                                    {value.description && (
                                                        <div className={styles.manageItemDesc}>{value.description}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.manageItemActions}>
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => openDefinitionForm(value, true)}
                                                    aria-label="ערוך"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className={`${styles.iconButton} ${styles.deleteBtn}`}
                                                    onClick={() => handleDeleteValue(value)}
                                                    aria-label="מחק"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.noItems}>אין ערכים מוגדרים עדיין</div>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleSaveValueDefinition}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>כותרת</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>תיאור</label>
                                <textarea
                                    className={styles.textarea}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>קטגוריה</label>
                                <select
                                    className={styles.select}
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {Object.values(VALUE_CATEGORIES).map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formActions}>
                                <Button type="button" variant="ghost" onClick={closeDefinitionForm}>ביטול</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {editingItem ? 'שמור' : 'הוסף'}
                                </Button>
                            </div>
                        </form>
                    )}
                </Modal.Body>
            </Modal>
        </div>
    );
}

export default GoalsPage;
