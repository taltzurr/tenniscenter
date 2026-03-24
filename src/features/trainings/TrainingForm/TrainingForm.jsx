import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, Users, Repeat, Activity, Target, Zap, Tag, Briefcase, FileText, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Combobox from '../../../components/ui/Combobox/Combobox';
import TopicsPicker from '../../../components/ui/TopicsPicker';
import RecurrencePicker from '../../../components/ui/RecurrencePicker/RecurrencePicker';
import Spinner from '../../../components/ui/Spinner';

import useAuthStore from '../../../stores/authStore';
import useTrainingsStore from '../../../stores/trainingsStore';
import useGroupsStore from '../../../stores/groupsStore';
import useUIStore from '../../../stores/uiStore';
import { NOTIFICATION_TYPES, notifyGroup } from '../../../services/notifications';

import { createRecurringTrainings } from '../../../services/trainings';
import styles from './TrainingForm.module.css';

// Placeholder options - these should ideally come from a constants file or service
const PERIOD_TYPES = ['הכנה כללית', 'הכנה ספציפית', 'תחרות', 'מעבר'];
const GAME_SITUATIONS = ['שחקן מגיש', 'שחקן מקבל', 'משחק רשת', 'משחק קו אחורי', 'התקפה', 'הגנה'];
const GAME_COMPONENTS = ['טכני', 'טקטי', 'פיזי', 'מנטלי'];

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
    const [errors, setErrors] = useState({});
    const [isEndTimeUserModified, setIsEndTimeUserModified] = useState(false);

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
        equipment: '',
        description: '',
        location: 'מגרש ראשי',
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

                    setIsEndTimeUserModified(true); // Don't auto-override stored end time in edit mode
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
                        equipment: training.equipment || '',
                        location: training.location || '',
                        recurrence: training.recurrence || prev.recurrence,
                        recurrenceGroupId: training.recurrenceGroupId || null,
                    }));
                }
            }

            setIsLoadingData(false);
        };

        loadData();
    }, [userData, groups.length, fetchGroups, isEditMode, id, fetchTraining]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === 'endTime') {
            setIsEndTimeUserModified(true);
        }
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleStartTimeChange = (e) => {
        const newStartTime = e.target.value;
        setFormData(prev => {
            const updated = { ...prev, startTime: newStartTime };
            if (!isEndTimeUserModified && newStartTime) {
                const [h, m] = newStartTime.split(':').map(Number);
                const endDate = new Date(2000, 0, 1, h, m + 60);
                const endH = String(endDate.getHours()).padStart(2, '0');
                const endM = String(endDate.getMinutes()).padStart(2, '0');
                updated.endTime = `${endH}:${endM}`;
            }
            return updated;
        });
        if (errors.startTime) setErrors(prev => ({ ...prev, startTime: null }));
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

            const newErrors = {};
            if (durationMinutes <= 0) {
                newErrors.endTime = 'שעת הסיום חייבת להיות אחרי שעת ההתחלה';
            }
            if (!formData.groupId) {
                newErrors.groupId = 'יש לבחור קבוצה';
            }
            if (!formData.topic) {
                newErrors.topic = 'נא למלא שם אימון';
            }
            if (!formData.date) {
                newErrors.date = 'יש לבחור תאריך';
            }
            // Prevent scheduling in the past (only for new trainings)
            if (!isEditMode && trainingDate < new Date()) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (trainingDate < today) {
                    newErrors.date = 'לא ניתן לתזמן אימון בעבר';
                }
            }
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors);
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
                equipment: formData.equipment,
                location: formData.location,
                exercises: [],
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
                    relatedEntityId: isEditMode ? id : (result.training?.id || 'unknown'),
                    relatedEntityType: 'training'
                });

                addToast({
                    type: 'success',
                    message: isEditMode
                        ? 'האימון עודכן בהצלחה'
                        : 'האימון נוצר בהצלחה! כעת ניתן להמשיך לערוך.'
                });

                navigate(-1);
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
                    {/* SECTION 1: Logistics */}
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <span>לוגיסטיקה ופרטים כלליים</span>
                        </div>

                        <div className={styles.definitionGrid}>
                            {/* Group Selection */}
                            <div className={styles.gridItem}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.blueBox}`}>
                                        <Users size={18} />
                                    </div>
                                    <span className={styles.labelText}>קבוצה *</span>
                                </div>
                                <select
                                    name="groupId"
                                    value={formData.groupId}
                                    onChange={handleChange}
                                    className={`${styles.selectStyled} ${errors.groupId ? styles.selectError : ''}`}
                                    required
                                >
                                    <option value="">בחר קבוצה...</option>
                                    {groups.map(group => (
                                        <option key={group.id} value={group.id}>
                                            {group.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.groupId && (
                                    <span className={styles.fieldError}>{errors.groupId}</span>
                                )}
                            </div>

                            {/* Training Name (Topic) */}
                            <div className={styles.gridItem}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.purpleBox}`}>
                                        <Activity size={18} />
                                    </div>
                                    <span className={styles.labelText}>שם האימון *</span>
                                </div>
                                <Input
                                    name="topic"
                                    value={formData.topic}
                                    onChange={handleChange}
                                    placeholder="למשל: אימון הכנה לתחרות ארצית"
                                    error={errors.topic}
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div className={styles.gridItem}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.blueBox}`}>
                                        <Calendar size={18} />
                                    </div>
                                    <span className={styles.labelText}>תאריך *</span>
                                </div>
                                <Input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {/* Time */}
                            <div className={styles.gridItem}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.blueBox}`}>
                                        <Clock size={18} />
                                    </div>
                                    <span className={styles.labelText}>שעות (התחלה - סיום) *</span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <Input
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleStartTimeChange}
                                        required
                                        containerStyle={{ flex: 1 }}
                                    />
                                    <Input
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                        required
                                        containerStyle={{ flex: 1 }}
                                        error={errors.endTime}
                                    />
                                </div>
                                {errors.endTime && (
                                    <span style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px', display: 'block' }}>{errors.endTime}</span>
                                )}
                            </div>

                            {/* Location */}
                            <div className={styles.gridItem}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.slateBox}`}>
                                        <MapPin size={18} />
                                    </div>
                                    <span className={styles.labelText}>שם המגרש</span>
                                </div>
                                <Input
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="מגרש ראשי"
                                />
                            </div>
                        </div>

                        {/* Recurrence */}
                        {!isEditMode ? (
                            <div style={{ marginTop: '24px' }}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.slateBox}`}>
                                        <Repeat size={18} />
                                    </div>
                                    <span className={styles.labelText}>חזרתיות</span>
                                </div>
                                <RecurrencePicker
                                    value={formData.recurrence}
                                    startDate={new Date(formData.date)}
                                    onChange={(newRecurrence) => setFormData(prev => ({ ...prev, recurrence: newRecurrence }))}
                                />
                            </div>
                        ) : formData.recurrenceGroupId && (
                            <div style={{ marginTop: '24px' }}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.slateBox}`}>
                                        <Repeat size={18} />
                                    </div>
                                    <span className={styles.labelText}>חזרתיות</span>
                                </div>
                                <div style={{
                                    padding: '10px 14px',
                                    backgroundColor: 'var(--gray-50)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--gray-200)'
                                }}>
                                    אימון זה הוא חלק מסדרת אימונים חוזרת
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SECTION 2: Professional Definitions */}
                    <div className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <span>מפרט מקצועי</span>
                        </div>

                        <div className={styles.definitionGrid}>
                            {/* Period Type */}
                            <div className={styles.gridItem}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.purpleBox}`}>
                                        <Calendar size={18} />
                                    </div>
                                    <span className={styles.labelText}>סוג תקופה</span>
                                </div>
                                <Combobox
                                    options={PERIOD_TYPES}
                                    value={formData.periodType}
                                    onChange={(val) => setFormData(prev => ({ ...prev, periodType: val }))}
                                    placeholder="בחר או הקלד..."
                                />
                            </div>

                            {/* Game Situation */}
                            <div className={styles.gridItem}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.orangeBox}`}>
                                        <Target size={18} />
                                    </div>
                                    <span className={styles.labelText}>מצב משחק</span>
                                </div>
                                <Combobox
                                    options={GAME_SITUATIONS}
                                    value={formData.gameSituation}
                                    onChange={(val) => setFormData(prev => ({ ...prev, gameSituation: val }))}
                                    placeholder="בחר או הקלד..."
                                />
                            </div>

                            {/* Game Component */}
                            <div className={styles.gridItem}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.orangeBox}`}>
                                        <Zap size={18} />
                                    </div>
                                    <span className={styles.labelText}>מרכיב משחק</span>
                                </div>
                                <Combobox
                                    options={GAME_COMPONENTS}
                                    value={formData.gameComponent}
                                    onChange={(val) => setFormData(prev => ({ ...prev, gameComponent: val }))}
                                    placeholder="בחר או הקלד..."
                                />
                            </div>

                            {/* Training Topics — TopicsPicker (full width, above equipment) */}
                            <div className={styles.gridItem} style={{ gridColumn: '1 / -1' }}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.greenBox}`}>
                                        <Tag size={18} />
                                    </div>
                                    <span className={styles.labelText}>נושאי האימון</span>
                                </div>
                                <TopicsPicker
                                    value={formData.trainingTopics}
                                    onChange={(topics) => setFormData(prev => ({ ...prev, trainingTopics: topics }))}
                                />
                            </div>

                            {/* Equipment */}
                            <div className={styles.gridItem}>
                                <div className={styles.labelWrapper}>
                                    <div className={`${styles.iconBox} ${styles.slateBox}`}>
                                        <Briefcase size={18} />
                                    </div>
                                    <span className={styles.labelText}>ציוד נדרש</span>
                                </div>
                                <Input
                                    name="equipment"
                                    value={formData.equipment || ''}
                                    onChange={handleChange}
                                    placeholder="קונוסים, סולמות..."
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div style={{ marginTop: '24px' }}>
                            <div className={styles.labelWrapper}>
                                <div className={`${styles.iconBox} ${styles.slateBox}`}>
                                    <FileText size={18} />
                                </div>
                                <span className={styles.labelText}>תיאור ומערך מלא</span>
                            </div>
                            <Input
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                multiline
                                rows={4}
                                placeholder="פירוט מהלך האימון, דגשים מיוחדים..."
                            />
                        </div>
                    </div>

                </div>

                <div className={styles.footer}>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => navigate(-1)}
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


        </div>
    );
}

export default TrainingForm;
