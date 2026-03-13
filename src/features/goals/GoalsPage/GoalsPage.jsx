import { useState, useEffect } from 'react';
import {
    Target,
    Heart,
    Plus,
    Edit2,
    Trash2,
    X,
    Users
} from 'lucide-react';
import useGoalsStore from '../../../stores/goalsStore';
import useGroupsStore from '../../../stores/groupsStore';
import useAuthStore from '../../../stores/authStore';
import useUIStore from '../../../stores/uiStore';
import { GOAL_CATEGORIES, VALUE_CATEGORIES } from '../../../services/goals';
import { HEBREW_MONTHS } from '../../../services/monthlyThemes';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import styles from './GoalsPage.module.css';

function GoalsPage() {
    const { userData } = useAuthStore();
    const { centerValues, groupGoals, fetchCenterValues, fetchGroupGoals, saveGoal, deleteGoal, isLoading } = useGoalsStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { addToast } = useUIStore();

    const [activeTab, setActiveTab] = useState('groups');
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'technical',
        icon: '🎯',
        month: ''
    });

    useEffect(() => {
        fetchCenterValues();
        if (userData?.id) {
            fetchGroups(userData.id, userData.role === 'supervisor');
        }
    }, [fetchCenterValues, fetchGroups, userData]);

    useEffect(() => {
        if (selectedGroupId) {
            fetchGroupGoals(selectedGroupId);
        }
    }, [selectedGroupId, fetchGroupGoals]);

    const isValueTab = activeTab === 'values';

    const handleOpenModal = (goal = null) => {
        if (goal) {
            setEditingGoal(goal);
            setFormData({
                title: goal.title,
                description: goal.description,
                category: goal.category || (isValueTab ? 'respect' : 'technical'),
                icon: goal.icon || (isValueTab ? '❤️' : '🎯'),
                month: goal.month ?? ''
            });
        } else {
            setEditingGoal(null);
            setFormData({
                title: '',
                description: '',
                category: isValueTab ? 'respect' : 'technical',
                icon: isValueTab ? '❤️' : '🎯',
                month: ''
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingGoal(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const goalData = {
            ...formData,
            month: formData.month === '' ? null : parseInt(formData.month),
            type: isValueTab ? 'value' : 'group',
            groupId: isValueTab ? null : selectedGroupId,
            order: editingGoal?.order ?? (
                isValueTab ? centerValues.length :
                (groupGoals[selectedGroupId] || []).length
            )
        };

        if (editingGoal) {
            goalData.id = editingGoal.id;
            goalData.createdAt = editingGoal.createdAt;
        }

        const result = await saveGoal(goalData);

        if (result.success) {
            const label = isValueTab ? 'הערך' : 'המטרה';
            addToast({ type: 'success', message: editingGoal ? `${label} עודכן` : `${label} נוסף` });
            handleCloseModal();
        } else {
            addToast({ type: 'error', message: isValueTab ? 'שגיאה בשמירת הערך' : 'שגיאה בשמירת המטרה' });
        }
    };

    const handleDelete = async (goal) => {
        const label = goal.type === 'value' ? 'הערך' : 'המטרה';
        if (!confirm(`האם למחוק את ${label}?`)) return;

        const result = await deleteGoal(goal.id, goal.type, goal.groupId);
        if (result.success) {
            addToast({ type: 'success', message: `${label} נמחק` });
        } else {
            addToast({ type: 'error', message: 'שגיאה במחיקה' });
        }
    };

    const currentGoals = selectedGroupId ? groupGoals[selectedGroupId] || [] : [];

    const canEdit = userData?.role === 'supervisor';

    const currentCategories = isValueTab ? VALUE_CATEGORIES : GOAL_CATEGORIES;

    if (isLoading && centerValues.length === 0) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <h1 className={styles.title}>מטרות וערכים</h1>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'groups' ? styles.active : ''}`}
                    onClick={() => setActiveTab('groups')}
                >
                    <Target size={18} />
                    מטרות
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'values' ? styles.active : ''}`}
                    onClick={() => setActiveTab('values')}
                >
                    <Heart size={18} />
                    ערכים
                </button>
            </div>

            {/* Content */}
            {isValueTab ? (
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>
                            <Heart size={20} />
                            ערכים
                        </h2>
                        {canEdit && (
                            <Button size="small" onClick={() => handleOpenModal()}>
                                <Plus size={16} />
                                הוסף ערך
                            </Button>
                        )}
                    </div>
                    {centerValues.length > 0 ? (
                        <div className={styles.valuesGrid}>
                            {centerValues.map(value => (
                                <div key={value.id} className={styles.valueCard}>
                                    <div className={styles.valueCardHeader}>
                                        <div className={styles.valueIcon}>{value.icon || '❤️'}</div>
                                        {canEdit && (
                                            <div className={styles.goalActions}>
                                                <button
                                                    className={styles.iconButton}
                                                    onClick={() => handleOpenModal(value)}
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    className={`${styles.iconButton} ${styles.delete}`}
                                                    onClick={() => handleDelete(value)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className={styles.valueTitle}>{value.title}</div>
                                    <div className={styles.valueDescription}>{value.description}</div>
                                    {value.month != null && (
                                        <span className={styles.goalCategory}>
                                            {HEBREW_MONTHS[value.month]}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <Heart className={styles.emptyIcon} />
                            <div className={styles.emptyTitle}>אין ערכים עדיין</div>
                            <div className={styles.emptyDescription}>הגדר ערכים עבור המרכז</div>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {activeTab === 'groups' && (
                        <div className={styles.formGroup} style={{ marginBottom: '24px' }}>
                            <label className={styles.label}>בחר קבוצה</label>
                            <select
                                className={styles.select}
                                value={selectedGroupId || ''}
                                onChange={(e) => setSelectedGroupId(e.target.value)}
                            >
                                <option value="">-- בחר קבוצה --</option>
                                {groups.map(group => (
                                    <option key={group.id} value={group.id}>{group.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                <Target size={20} />
                                מטרות
                            </h2>
                            {canEdit && selectedGroupId && (
                                <Button size="small" onClick={() => handleOpenModal()}>
                                    <Plus size={16} />
                                    הוסף מטרה
                                </Button>
                            )}
                        </div>

                        {currentGoals.length > 0 ? (
                            <div className={styles.goalsGrid}>
                                {currentGoals.map(goal => (
                                    <div key={goal.id} className={styles.goalCard}>
                                        <div className={styles.goalCardHeader}>
                                            <div className={styles.goalIcon}>{goal.icon || '🎯'}</div>
                                            {canEdit && (
                                                <div className={styles.goalActions}>
                                                    <button
                                                        className={styles.iconButton}
                                                        onClick={() => handleOpenModal(goal)}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        className={`${styles.iconButton} ${styles.delete}`}
                                                        onClick={() => handleDelete(goal)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className={styles.goalTitle}>{goal.title}</h3>
                                        <p className={styles.goalDescription}>{goal.description}</p>
                                        {goal.category && (
                                            <span className={styles.goalCategory}>
                                                {GOAL_CATEGORIES[goal.category]?.label || goal.category}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <Target className={styles.emptyIcon} />
                                <div className={styles.emptyTitle}>
                                    {activeTab === 'groups' && !selectedGroupId
                                        ? 'בחר קבוצה כדי לראות מטרות'
                                        : 'אין מטרות עדיין'}
                                </div>
                                <div className={styles.emptyDescription}>
                                    {activeTab === 'groups' && !selectedGroupId
                                        ? 'בחר קבוצה מהרשימה למעלה'
                                        : 'הגדר מטרות כדי לעקוב אחרי ההתקדמות'}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className={styles.modalOverlay} onClick={handleCloseModal}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                {editingGoal
                                    ? (isValueTab ? 'עריכת ערך' : 'עריכת מטרה')
                                    : (isValueTab ? 'הוספת ערך' : 'הוספת מטרה')
                                }
                            </h3>
                            <button className={styles.modalClose} onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.modalBody}>
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
                                        {Object.values(currentCategories).map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>אייקון</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        placeholder={isValueTab ? '❤️' : '🎯'}
                                    />
                                </div>
                                {isValueTab && (
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>חודש (אופציונלי)</label>
                                        <select
                                            className={styles.select}
                                            value={formData.month}
                                            onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                        >
                                            <option value="">כל השנה</option>
                                            {HEBREW_MONTHS.map((name, idx) => (
                                                <option key={idx} value={idx}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className={styles.modalFooter}>
                                <Button type="button" variant="ghost" onClick={handleCloseModal}>
                                    ביטול
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {editingGoal ? 'שמור' : 'הוסף'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GoalsPage;
