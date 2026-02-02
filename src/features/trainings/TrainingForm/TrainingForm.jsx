import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, Users, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Combobox from '../../../components/ui/Combobox/Combobox';
import MultiSelect from '../../../components/ui/MultiSelect/MultiSelect';
import RecurrencePicker from '../../../components/ui/RecurrencePicker/RecurrencePicker';
import Spinner from '../../../components/ui/Spinner';
import Comments from '../../../components/ui/Comments';
import ExercisePicker from '../ExercisePicker';
import useAuthStore from '../../../stores/authStore';
import useTrainingsStore from '../../../stores/trainingsStore';
import useGroupsStore from '../../../stores/groupsStore';
import useUIStore from '../../../stores/uiStore';
import { NOTIFICATION_TYPES, notifyGroup } from '../../../services/notifications';
import { ENTITY_TYPES } from '../../../services/comments';
import { createRecurringTrainings } from '../../../services/trainings';
import styles from './TrainingForm.module.css';

// Placeholder options - these should ideally come from a constants file or service
const PERIOD_TYPES = ['הכנה כללית', 'הכנה ספציפית', 'תחרות', 'מעבר'];
const GAME_SITUATIONS = ['שחקן מגיש', 'שחקן מקבל', 'משחק רשת', 'משחק קו אחורי', 'התקפה', 'הגנה'];
const GAME_COMPONENTS = ['טכני', 'טקטי', 'פיזי', 'מנטלי'];
const TOPIC_SUGGESTIONS = ['פורהנד', 'בקהנד', 'הגשה', 'וולי', 'סמאש', 'תנועת רגליים', 'יציבות', 'ריכוז', 'עקביות'];

function TrainingForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const isEditMode = Boolean(id);

    const { userData } = useAuthStore();
    const { addTraining, editTraining, fetchTraining } = useTrainingsStore();
    const { groups, fetchGroups } = useGroupsStore();
    const { addToast } = useUIStore();

    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);



    const [formData, setFormData] = useState({
        groupId: searchParams.get('groupId') || '',
        date: searchParams.get('date') || format(new Date(), 'yyyy-MM-dd'),
        startTime: format(new Date(), 'HH:mm'),
        endTime: format(new Date(new Date().setHours(new Date().getHours() + 1)), 'HH:mm'),
        topic: '', // Main Title
        periodType: '',
        gameSituation: '',
        gameComponent: '',
        trainingTopics: [], // Tags
        description: '',
        location: 'מגרש ראשי',
        exercises: [],
        recurrence: {
            frequency: 'NONE',
            interval: 1,
            days: [],
            endDate: null,
            endType: 'date',
            count: 13
        }
    });

    useEffect(() => {
        const loadData = async () => {
            setIsLoadingData(true);

            if (userData?.id && groups.length === 0) {
                await fetchGroups(userData.id, userData.role === 'supervisor');
            }

            if (isEditMode && id) {
                const training = await fetchTraining(id);
                if (training) {
                    // Parse existing date/time
                    const trainingDateObj = training.date ? new Date(training.date) : new Date();
                    const dateStr = format(trainingDateObj, 'yyyy-MM-dd');
                    const startTimeStr = training.startTime || format(trainingDateObj, 'HH:mm');
                    // Calculate end time from duration if no endTime stored
                    let endTimeStr = training.endTime;
                    if (!endTimeStr && training.durationMinutes) {
                        const endDate = new Date(trainingDateObj.getTime() + training.durationMinutes * 60000);
                        endTimeStr = format(endDate, 'HH:mm');
                    } else if (!endTimeStr) {
                        endTimeStr = format(new Date(trainingDateObj.getTime() + 60 * 60000), 'HH:mm');
                    }

                    setFormData(prev => ({
                        ...prev,
                        groupId: training.groupId,
                        date: dateStr,
                        startTime: startTimeStr,
                        endTime: endTimeStr,
                        topic: training.topic || '',
                        periodType: training.periodType || '',
                        gameSituation: training.gameSituation || '',
                        gameComponent: training.gameComponent || '',
                        trainingTopics: training.trainingTopics || [],
                        description: training.description || '',
                        location: training.location || '',
                        exercises: training.exercises || []
                    }));
                }
            }

            setIsLoadingData(false);
        };

        loadData();
    }, [userData, groups.length, fetchGroups, isEditMode, id, fetchTraining]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleCommentAdded = async () => {
        if (!formData.groupId) return;

        await notifyGroup(formData.groupId, {
            type: NOTIFICATION_TYPES.INFO,
            title: 'הערה חדשה באימון',
            message: `נוספה הערה חדשה לאימון ${formData.topic || ''} בתאריך ${format(new Date(formData.date), 'dd/MM/yyyy')}`,
            relatedEntityId: id,
            relatedEntityType: 'training'
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Combine date and startTime
            const trainingDate = new Date(`${formData.date}T${formData.startTime}`);

            // Calculate duration from start and end time
            const [startH, startM] = formData.startTime.split(':').map(Number);
            const [endH, endM] = formData.endTime.split(':').map(Number);
            const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

            const selectedGroup = groups.find(g => g.id === formData.groupId);

            // Validation relies on form required attributes mostly, but good to check
            if (!formData.topic || !formData.groupId) {
                addToast({ type: 'error', message: 'נא למלא שדות חובה' });
                setIsSubmitting(false);
                return;
            }

            const basePayload = {
                groupId: formData.groupId,
                date: trainingDate,
                durationMinutes: durationMinutes > 0 ? durationMinutes : 60,
                startTime: formData.startTime,
                endTime: formData.endTime,
                topic: formData.topic,
                periodType: formData.periodType,
                gameSituation: formData.gameSituation,
                gameComponent: formData.gameComponent,
                trainingTopics: formData.trainingTopics,
                description: formData.description,
                location: formData.location,
                exercises: formData.exercises,
                coachId: userData.id,
                coachName: userData.displayName || '', // Denormalize coach name
                groupName: selectedGroup?.name || '', // Denormalize group name
                status: 'planned'
            };

            let result;

            if (isEditMode) {
                result = await editTraining(id, basePayload);
            } else {
                if (formData.recurrence && formData.recurrence.frequency !== 'NONE') {
                    try {
                        await createRecurringTrainings(basePayload, formData.recurrence);
                        result = { success: true };
                    } catch (error) {
                        result = { success: false, error: error.message };
                    }
                } else {
                    result = await addTraining(basePayload);
                }
            }

            if (result.success) {
                const notificationTitle = isEditMode ? 'עדכון אימון' : 'אימון חדש';
                const notificationMessage = isEditMode
                    ? `האימון בנושא "${formData.topic}" בתאריך ${format(trainingDate, 'dd/MM/yyyy')} עודכן.`
                    : `נקבע אימון חדש בנושא "${formData.topic}" בתאריך ${format(trainingDate, 'dd/MM/yyyy')}.`;

                await notifyGroup(formData.groupId, {
                    type: NOTIFICATION_TYPES.INFO,
                    title: notificationTitle,
                    message: notificationMessage,
                    relatedEntityId: isEditMode ? id : (result.id || 'unknown'),
                    relatedEntityType: 'training'
                });

                addToast({
                    type: 'success',
                    message: isEditMode
                        ? 'האימון עודכן בהצלחה'
                        : 'האימון נוצר בהצלחה! כעת ניתן להמשיך לערוך.'
                });

                if (!isEditMode && result.id) {
                    // Redirect to edit mode of the new training to stay on "same page"
                    navigate(`/trainings/${result.id}/edit`, { replace: true });
                } else if (isEditMode) {
                    // Stay on page (do nothing or refresh data if needed, but react state updates handle it)
                }
            } else {
                addToast({ type: 'error', message: result.error || 'שגיאה בשמירה' });
            }
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', message: 'שגיאה לא צפויה' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.formContainer}>
            <header className={styles.header}>
                <Link to="/calendar" className={styles.backButton}>
                    <ArrowRight size={16} />
                    חזרה ליומן
                </Link>
                <h1 className={styles.title}>
                    {isEditMode ? formData.topic || 'עריכת אימון' : 'תכנון אימון חדש'}
                </h1>
                <div className={styles.headerMeta}>
                    {/* Can add more meta info here if needed */}
                </div>
            </header>

            <form onSubmit={handleSubmit} className={styles.card}>
                <div className={styles.formGrid}>
                    {/* Top Section: Date, Time & Group */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>פרטים כלליים</h2>

                        {/* Row 1: Group Selection */}
                        <div className={styles.row}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>קבוצה *</label>
                                <select
                                    name="groupId"
                                    value={formData.groupId}
                                    onChange={handleChange}
                                    className={styles.selectStyled}
                                    required
                                >
                                    <option value="">בחר קבוצה...</option>
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Row 2: Date */}
                        <div className={styles.row}>
                            <div className={styles.fieldGroup}>
                                <Input
                                    type="date"
                                    name="date"
                                    label="תאריך *"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Row 3: Start & End Time */}
                        <div className={styles.row}>
                            <div className={styles.fieldGroup}>
                                <Input
                                    type="time"
                                    name="startTime"
                                    label="שעת התחלה *"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <Input
                                    type="time"
                                    name="endTime"
                                    label="שעת סיום *"
                                    value={formData.endTime}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        {/* Row 4: Recurrence (Create Only) */}
                        {!isEditMode && (
                            <div className={styles.row}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>חזרתיות</label>
                                    <RecurrencePicker
                                        value={formData.recurrence}
                                        startDate={new Date(formData.date)}
                                        onChange={(newRecurrence) => setFormData(prev => ({ ...prev, recurrence: newRecurrence }))}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Row 5: Training Name */}
                        <div className={styles.row}>
                            <div className={styles.fieldGroup}>
                                <Input
                                    name="topic"
                                    label="שם האימון *"
                                    value={formData.topic}
                                    onChange={handleChange}
                                    placeholder="למשל: אימון הכנה לתחרות ארצית"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Definition Section: Matching User Design */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>הגדרות אימון</h2>

                        <div className={styles.definitionGrid}>
                            <div className={styles.gridItem}>
                                <Combobox
                                    label="סוג תקופה"
                                    options={PERIOD_TYPES}
                                    value={formData.periodType}
                                    onChange={(val) => setFormData(prev => ({ ...prev, periodType: val }))}
                                    placeholder="בחר או הקלד..."
                                />
                            </div>

                            <div className={styles.gridItem}>
                                <Combobox
                                    label="מצב משחק"
                                    options={GAME_SITUATIONS}
                                    value={formData.gameSituation}
                                    onChange={(val) => setFormData(prev => ({ ...prev, gameSituation: val }))}
                                    placeholder="בחר או הקלד..."
                                />
                            </div>

                            <div className={styles.gridItem}>
                                <Combobox
                                    label="מרכיב משחק"
                                    options={GAME_COMPONENTS}
                                    value={formData.gameComponent}
                                    onChange={(val) => setFormData(prev => ({ ...prev, gameComponent: val }))}
                                    placeholder="בחר או הקלד..."
                                />
                            </div>

                            <div className={styles.gridItem} style={{ gridColumn: 'span 2' }}>
                                <MultiSelect
                                    label="נושא האימון (תגיות)"
                                    options={TOPIC_SUGGESTIONS}
                                    value={formData.trainingTopics}
                                    onChange={(tags) => setFormData(prev => ({ ...prev, trainingTopics: tags }))}
                                    placeholder="הוסף נושאים..."
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <Input
                                name="description"
                                label="פירוט"
                                value={formData.description}
                                onChange={handleChange}
                                multiline
                                rows={3}
                                placeholder="עבודה על וולי..."
                            />
                        </div>
                    </div>

                    {/* Exercises Section */}
                    <div className={styles.section} style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                        <h2 className={styles.sectionTitle}>תרגילי האימון</h2>
                        <ExercisePicker
                            selectedExercises={formData.exercises}
                            onChange={(exercises) => setFormData(prev => ({ ...prev, exercises }))}
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate('/calendar')}
                    >
                        ביטול
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Spinner size="small" color="white" /> : (isEditMode ? 'שמור שינויים' : 'צור אימון')}
                    </Button>
                </div>
            </form>

            {/* Comments Section - only in edit mode */}
            {isEditMode && id && (
                <div className={styles.commentsSection}>
                    <Comments
                        entityType={ENTITY_TYPES.TRAINING}
                        entityId={id}
                        title="הערות לאימון"
                        onCommentAdded={handleCommentAdded}
                    />
                </div>
            )}
        </div>
    );
}

export default TrainingForm;
