import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Target, Calendar, Save, Trash2, AlertTriangle, Send, Clock } from 'lucide-react';
import useAuthStore from '../../../stores/authStore';
import useGroupsStore from '../../../stores/groupsStore';
import useMonthlyPlansStore from '../../../stores/monthlyPlansStore';
import useUIStore from '../../../stores/uiStore';
import { HEBREW_MONTHS, WEEK_STRUCTURE } from '../../../services/monthlyPlans';
import { PLAN_STATUS } from '../../../config/constants';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import StatusIndicator from '../../../components/ui/StatusIndicator/StatusIndicator';
import styles from './PlanForm.module.css';

// Maps plan status to StatusIndicator status key
const getPlanStatusKey = (status) => {
    switch (status) {
        case PLAN_STATUS.APPROVED: return 'approved';
        case PLAN_STATUS.SUBMITTED: return 'submitted';
        case 'rejected': return 'rejected';
        default: return 'draft';
    }
};

function PlanForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { userData } = useAuthStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { currentPlan, fetchPlan, savePlan, submitPlan, removePlan, isLoading } = useMonthlyPlansStore();
    const { addToast } = useUIStore();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const [selectedGroup, setSelectedGroup] = useState(searchParams.get('groupId') || '');
    const [selectedYear, setSelectedYear] = useState(parseInt(searchParams.get('year')) || currentYear);
    const [selectedMonth, setSelectedMonth] = useState(parseInt(searchParams.get('month')) || currentMonth);
    const [isEditing, setIsEditing] = useState(!searchParams.get('view'));

    // State to track if we are effectively overwriting an existing plan (even if started as "New")
    const [existingPlanId, setExistingPlanId] = useState(null);
    const [planStatus, setPlanStatus] = useState(PLAN_STATUS.DRAFT);
    const [managerFeedback, setManagerFeedback] = useState('');

    const [formData, setFormData] = useState({
        monthlyGoals: '',
        focusPoints: '',
        weeks: {
            week1: { theme: '', notes: '' },
            week2: { theme: '', notes: '' },
            week3: { theme: '', notes: '' },
            week4: { theme: '', notes: '' },
            week5: { theme: '', notes: '' }
        }
    });

    // Check if plan is locked for editing (Submitted or Approved)
    const isLocked = planStatus === PLAN_STATUS.SUBMITTED || planStatus === PLAN_STATUS.APPROVED;

    // Fetch groups
    useEffect(() => {
        if (userData?.id) {
            fetchGroups(userData.id);
        }
    }, [userData, fetchGroups]);

    // Fetch existing plan when selection changes
    useEffect(() => {
        const loadPlan = async () => {
            if (selectedGroup && selectedYear && selectedMonth !== undefined) {
                const plan = await fetchPlan(selectedGroup, selectedYear, selectedMonth);
                if (plan) {
                    setExistingPlanId(plan.id);
                    setPlanStatus(plan.status || PLAN_STATUS.DRAFT);
                    setManagerFeedback(plan.managerFeedback || '');

                    // Specific logic: if plan exists and is locked, ensure we are not in editing mode initially unless explicit override?
                    // Actually, if it is locked, we force isEditing to false mostly, or we keep it true but input disabled.
                    // Better UX: keep viewing.
                } else {
                    setExistingPlanId(null);
                    setPlanStatus(PLAN_STATUS.DRAFT);
                    setManagerFeedback('');
                }
            }
        };
        loadPlan();
    }, [selectedGroup, selectedYear, selectedMonth, fetchPlan]);

    // Populate form with existing plan
    useEffect(() => {
        if (currentPlan) {
            setFormData({
                monthlyGoals: currentPlan.monthlyGoals || '',
                focusPoints: currentPlan.focusPoints || '',
                weeks: currentPlan.weeks || {
                    week1: { theme: '', notes: '' },
                    week2: { theme: '', notes: '' },
                    week3: { theme: '', notes: '' },
                    week4: { theme: '', notes: '' },
                    week5: { theme: '', notes: '' }
                }
            });
        } else {
            // Only reset if we truly don't have a plan (avoid clearing if we just switched to view mode)
            if (!existingPlanId) {
                setFormData({
                    monthlyGoals: '',
                    focusPoints: '',
                    weeks: {
                        week1: { theme: '', notes: '' },
                        week2: { theme: '', notes: '' },
                        week3: { theme: '', notes: '' },
                        week4: { theme: '', notes: '' },
                        week5: { theme: '', notes: '' }
                    }
                });
            }
        }
    }, [currentPlan, existingPlanId]);

    const handleWeekChange = (weekKey, field, value) => {
        if (isLocked) return;
        setFormData(prev => ({
            ...prev,
            weeks: {
                ...prev.weeks,
                [weekKey]: {
                    ...prev.weeks[weekKey],
                    [field]: value
                }
            }
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!selectedGroup) {
            addToast({ type: 'error', message: 'נא לבחור קבוצה' });
            return;
        }

        // Validate plan has at least some content
        const hasGoals = formData.monthlyGoals?.some(g => g.trim());
        const hasWeeklyContent = Object.values(formData.weeks || {}).some(week =>
            week.topic?.trim() || week.drills?.trim() || week.focus?.trim()
        );
        if (!hasGoals && !hasWeeklyContent) {
            addToast({ type: 'error', message: 'נא למלא לפחות מטרה אחת או תוכן שבועי' });
            return;
        }

        const group = groups.find(g => g.id === selectedGroup);

        const result = await savePlan({
            ...formData,
            groupId: selectedGroup,
            groupName: group?.name || '',
            year: selectedYear,
            month: selectedMonth,
            coachId: userData?.id,
            coachName: userData?.displayName || userData?.email,
            status: planStatus // Preserve current status (e.g. if draft/rejected)
        });

        if (result.success) {
            addToast({ type: 'success', message: 'התכנית נשמרה כטיוטה' });
            // Update local ID if new
            if (result.plan?.id) setExistingPlanId(result.plan.id);
        } else {
            addToast({ type: 'error', message: 'שגיאה בשמירת התכנית' });
        }
    };

    const handleSubmitForApproval = async () => {
        if (!existingPlanId) {
            addToast({ type: 'error', message: 'יש לשמור את התכנית לפני השליחה' });
            return;
        }

        if (window.confirm('האם אתה בטוח שברצונך להגיש את התכנית לאישור? לא ניתן יהיה לערוך אותה לאחר מכן.')) {
            const group = groups.find(g => g.id === selectedGroup);
            const result = await submitPlan(existingPlanId, group?.name);

            if (result.success) {
                addToast({ type: 'success', message: 'התכנית הוגשה לאישור בהצלחה' });
                setPlanStatus(PLAN_STATUS.SUBMITTED);
                setIsEditing(false);
            } else {
                addToast({ type: 'error', message: 'שגיאה בהגשת התכנית' });
            }
        }
    };

    const handleDelete = async () => {
        if (!existingPlanId) return;

        if (window.confirm('האם אתה בטוח שברצונך למחוק תכנית זו? פעולה זו אינה הפיכה.')) {
            const result = await removePlan(existingPlanId);
            if (result.success) {
                addToast({ type: 'success', message: 'התכנית נמחקה בהצלחה' });
                navigate('/monthly-plans');
            } else {
                addToast({ type: 'error', message: 'שגיאה במחיקת התכנית' });
            }
        }
    };

    const years = [currentYear - 1, currentYear, currentYear + 1];

    if (isLoading && groups.length === 0) {
        return <Spinner.FullPage />;
    }

    const selectedGroupData = groups.find(g => g.id === selectedGroup);

    // Determine page title
    const getPageTitle = () => {
        if (existingPlanId) return isEditing ? 'עריכת תכנית קיימת' : 'פרטי תכנית';
        return 'יצירת תכנית חדשה';
    };

    const statusKey = getPlanStatusKey(planStatus);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={() => navigate('/monthly-plans')}
                    type="button"
                >
                    <ArrowRight size={20} />
                    חזרה לתכניות
                </button>

                {existingPlanId && planStatus && (
                    <StatusIndicator status={statusKey} />
                )}
            </div>

            <h1 className={styles.title}>
                {getPageTitle()}
            </h1>

            {/* Locked Warning */}
            {isLocked && (
                <div className={styles.alertInfo} style={{ marginBottom: '16px', backgroundColor: 'var(--primary-50)', color: 'var(--primary-700)', padding: '12px', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Clock size={20} />
                    <span>תכנית זו נמצאת בסטטוס <strong><StatusIndicator status={statusKey} /></strong> ואינה ניתנת לעריכה כרגע.</span>
                </div>
            )}

            {/* Manager Feedback */}
            {planStatus === PLAN_STATUS.REJECTED && managerFeedback && (
                <div className={styles.alertError} style={{ marginBottom: '16px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', padding: '12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', fontWeight: 'bold' }}>
                        <XCircle size={20} />
                        <span>הערות המנהל לדחייה:</span>
                    </div>
                    <p>{managerFeedback}</p>
                </div>
            )}

            {/* Overwrite Warning */}
            {isEditing && existingPlanId && !searchParams.get('year') && !isLocked && (
                <div className={styles.alertWarning}>
                    <AlertTriangle size={20} className={styles.alertIcon} />
                    <span>שים לב: קיימת כבר תכנית לקבוצה ולחודש שנבחרו. השינויים שתבצע יעדכנו את התכנית הקיימת.</span>
                </div>
            )}

            {/* Group Selector - Swipeable Chips */}
            <div className={styles.groupSection}>
                <label className={styles.selectorLabel}>קבוצה</label>
                <div className={styles.groupChips}>
                    {groups.map(group => (
                        <button
                            key={group.id}
                            type="button"
                            className={`${styles.groupChip} ${selectedGroup === group.id ? styles.activeChip : ''}`}
                            onClick={() => {
                                if ((!isEditing && existingPlanId) || isLocked) return;
                                setSelectedGroup(group.id);
                            }}
                            disabled={(!isEditing && existingPlanId) || isLocked}
                            style={selectedGroup === group.id ? {
                                borderColor: group.color || 'var(--primary-600)',
                                backgroundColor: group.color ? `${group.color}15` : 'var(--primary-50)'
                            } : undefined}
                        >
                            <span
                                className={styles.groupDot}
                                style={{ backgroundColor: group.color || 'var(--primary-600)' }}
                            />
                            {group.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Year & Month Selection */}
            <div className={styles.selectors}>
                <div className={styles.selector}>
                    <label className={styles.selectorLabel}>שנה</label>
                    <select
                        className={styles.selectorSelect}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        disabled={(!isEditing && existingPlanId) || isLocked}
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className={styles.selector}>
                    <label className={styles.selectorLabel}>חודש</label>
                    <select
                        className={styles.selectorSelect}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        disabled={(!isEditing && existingPlanId) || isLocked}
                    >
                        {HEBREW_MONTHS.map((month, idx) => (
                            <option key={idx} value={idx}>{month}</option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedGroup ? (
                <form onSubmit={handleSave}>
                    {/* Monthly Goals */}
                    <div className={styles.planCard}>
                        <h2 className={styles.cardTitle}>
                            <Target size={18} />
                            מטרות לחודש {HEBREW_MONTHS[selectedMonth]} {selectedYear}
                            {selectedGroupData && ` - ${selectedGroupData.name}`}
                        </h2>

                        {isEditing && !isLocked ? (
                            <textarea
                                className={styles.goalsInput}
                                placeholder="מהן המטרות העיקריות לחודש זה? (טכניקה, טקטיקה, כושר, מנטליות...)"
                                value={formData.monthlyGoals}
                                onChange={(e) => setFormData(prev => ({ ...prev, monthlyGoals: e.target.value }))}
                            />
                        ) : (
                            <div className={styles.viewGoals}>
                                {formData.monthlyGoals || 'לא הוגדרו מטרות'}
                            </div>
                        )}
                    </div>

                    {/* Weekly Themes */}
                    <div className={styles.planCard}>
                        <h2 className={styles.cardTitle}>
                            <Calendar size={18} />
                            נושאים שבועיים
                        </h2>

                        <div className={styles.weeksGrid}>
                            {Object.entries(WEEK_STRUCTURE).map(([weekKey, weekInfo]) => (
                                <div key={weekKey} className={styles.weekCard}>
                                    <div className={styles.weekHeader}>
                                        <span className={styles.weekTitle}>{weekInfo.label}</span>
                                        <span className={styles.weekDays}>({weekInfo.days})</span>
                                    </div>

                                    {isEditing && !isLocked ? (
                                        <>
                                            <input
                                                type="text"
                                                className={styles.weekThemeInput}
                                                placeholder="נושא/דגש עיקרי"
                                                value={formData.weeks[weekKey]?.theme || ''}
                                                onChange={(e) => handleWeekChange(weekKey, 'theme', e.target.value)}
                                            />
                                            <textarea
                                                className={styles.weekNotesInput}
                                                placeholder="הערות נוספות..."
                                                value={formData.weeks[weekKey]?.notes || ''}
                                                onChange={(e) => handleWeekChange(weekKey, 'notes', e.target.value)}
                                            />
                                        </>
                                    ) : (
                                        formData.weeks[weekKey]?.theme ? (
                                            <>
                                                <div className={styles.viewWeekTheme}>
                                                    {formData.weeks[weekKey].theme}
                                                </div>
                                                {formData.weeks[weekKey].notes && (
                                                    <div className={styles.viewWeekNotes}>
                                                        {formData.weeks[weekKey].notes}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className={styles.emptyWeek}>לא הוגדר נושא</div>
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={styles.actions}>
                        {!isLocked && (
                            <>
                                {isEditing ? (
                                    <>
                                        {existingPlanId && (
                                            <div className={styles.deleteButton}>
                                                <Button
                                                    type="button"
                                                    variant="danger"
                                                    onClick={handleDelete}
                                                    startIcon={<Trash2 size={18} />}
                                                >
                                                    מחק תכנית
                                                </Button>
                                            </div>
                                        )}

                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => existingPlanId ? setIsEditing(false) : navigate('/monthly-plans')}
                                        >
                                            ביטול
                                        </Button>

                                        <Button type="submit" disabled={isLoading} variant="secondary">
                                            {isLoading ? <Spinner size="small" color="white" /> : (
                                                <>
                                                    <Save size={18} />
                                                    שמור כטיוטה
                                                </>
                                            )}
                                        </Button>

                                        {/* Submit Button - Only if saved (has ID) */}
                                        {existingPlanId && (
                                            <Button
                                                type="button"
                                                onClick={handleSubmitForApproval}
                                                disabled={isLoading}
                                                style={{ backgroundColor: 'var(--primary-600)', color: 'white' }}
                                            >
                                                <Send size={18} />
                                                הגש לאישור
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <Button onClick={() => setIsEditing(true)}>
                                        ערוך תכנית
                                    </Button>
                                )}
                            </>
                        )}

                        {/* If locked, maybe show "Back" or nothing special */}
                        {isLocked && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/monthly-plans')}
                            >
                                חזרה
                            </Button>
                        )}
                    </div>
                </form>
            ) : (
                <div className={styles.planCard} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <p>בחר קבוצה כדי להציג או ליצור תכנית חודשית</p>
                </div>
            )}
        </div>
    );
}

export default PlanForm;
