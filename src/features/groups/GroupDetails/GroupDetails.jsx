import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../../stores/authStore';
import useGroupsStore from '../../../stores/groupsStore';
import usePlayersStore from '../../../stores/playersStore';
import useUsersStore from '../../../stores/usersStore';
import useUIStore from '../../../stores/uiStore';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import { Edit, Users, Calendar, ArrowRight, Plus } from 'lucide-react';
import styles from './GroupDetails.module.css';
import { DEFAULT_GROUP_TYPES } from '../../../config/constants';
import { PlayerFormModal, PlayersList } from '../../players';

export default function GroupDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuthStore();
    const {
        groups,
        selectedGroup,
        fetchGroup,
        isLoading,
        error
    } = useGroupsStore();

    const {
        players,
        fetchGroupPlayers,
        addPlayer,
        updatePlayer,
        deletePlayer,
        isLoading: isLoadingPlayers
    } = usePlayersStore();

    const { users, fetchUsers } = useUsersStore();
    const { addToast } = useUIStore();

    const [isPlayerFormOpen, setIsPlayerFormOpen] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [isSubmittingPlayer, setIsSubmittingPlayer] = useState(false);

    // Find group in list or use selectedGroup
    const group = groups.find(g => g.id === id) || selectedGroup;

    useEffect(() => {
        if (id) {
            fetchGroup(id);
            fetchGroupPlayers(id);
        }
        if (users.length === 0) {
            fetchUsers();
        }
    }, [id, fetchGroup, fetchGroupPlayers, users.length, fetchUsers]);

    const handleAddPlayer = () => {
        setSelectedPlayer(null);
        setIsPlayerFormOpen(true);
    };

    const handleEditPlayer = (player) => {
        setSelectedPlayer(player);
        setIsPlayerFormOpen(true);
    };

    const handleDeletePlayer = async (player) => {
        if (window.confirm(`האם אתה בטוח שברצונך למחוק את ${player.displayName} מהקבוצה?`)) {
            const result = await deletePlayer(player.id);
            if (result.success) {
                addToast({ type: 'success', message: 'השחקן נמחק בהצלחה' });
            } else {
                addToast({ type: 'error', message: result.error });
            }
        }
    };

    const handlePlayerSubmit = async (formData) => {
        setIsSubmittingPlayer(true);
        let result;

        if (selectedPlayer) {
            result = await updatePlayer(selectedPlayer.id, formData);
        } else {
            result = await addPlayer(formData, id);
        }

        setIsSubmittingPlayer(false);

        if (result.success) {
            addToast({ type: 'success', message: selectedPlayer ? 'השחקן עודכן בהצלחה' : 'השחקן נוסף בהצלחה' });
            setIsPlayerFormOpen(false);
        } else {
            addToast({ type: 'error', message: result.error });
        }
    };

    if (isLoading && !group) {
        return <Spinner.FullPage />;
    }

    if (error) {
        return (
            <div className={styles.emptyState}>
                <p>שגיאה בטעינת הקבוצה: {error}</p>
                <Button variant="outline" onClick={() => navigate('/groups')}>
                    חזרה לרשימה
                </Button>
            </div>
        );
    }

    if (!group) {
        return (
            <div className={styles.emptyState}>
                <p>הקבוצה לא נמצאה</p>
                <Button variant="outline" onClick={() => navigate('/groups')}>
                    חזרה לרשימה
                </Button>
            </div>
        );
    }

    const groupType = DEFAULT_GROUP_TYPES.find(t => t.id === group.groupTypeId)?.name || group.groupTypeId;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <div className={styles.meta}>
                        <Link to="/groups" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'inherit', textDecoration: 'none' }}>
                            <ArrowRight size={16} />
                            חזרה לרשימה
                        </Link>
                    </div>
                    <h1 className={styles.title}>{group.name}</h1>
                    <div className={styles.badges}>
                        <span className={`${styles.badge} ${styles.typeBadge}`}>{groupType}</span>
                        {group.isActive ? (
                            <span className={styles.badge} style={{ backgroundColor: 'var(--success-100)', color: 'var(--success-700)' }}>פעיל</span>
                        ) : (
                            <span className={styles.badge} style={{ backgroundColor: 'var(--gray-100)', color: 'var(--text-primary)' }}>לא פעיל</span>
                        )}
                    </div>
                </div>

                <div className={styles.actions}>
                    <Button
                        variant="outline"
                        onClick={() => navigate(`/groups/${id}/edit`)}
                        startIcon={<Edit size={16} />}
                    >
                        עריכה
                    </Button>
                </div>
            </header>

            {/* Info Grid */}
            <div className={styles.grid}>
                <div className={styles.infoCard}>
                    <span className={styles.label}>שנתונים</span>
                    <span className={styles.value}>
                        {group.birthYearFrom} - {group.birthYearTo}
                    </span>
                </div>

                <div className={styles.infoCard}>
                    <span className={styles.label}>מספר שחקנים</span>
                    <span className={styles.value}>
                        {group.playerCount || 0}
                    </span>
                </div>

                <div className={styles.infoCard}>
                    <span className={styles.label}>מאמן</span>
                    <span className={styles.value}>
                        {users.find(u => u.id === group.coachId)?.displayName || 'לא משויך'}
                    </span>
                </div>
            </div>

            {/* Notes Section */}
            {group.notes && (
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>הערות</h2>
                    <div className={styles.infoCard}>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{group.notes}</p>
                    </div>
                </section>
            )}

            {/* Players Section */}
            <section className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className={styles.sectionTitle}>שחקנים בקבוצה ({players.length})</h2>
                    <Button
                        variant="ghost"
                        size="small"
                        startIcon={<Plus size={16} />}
                        onClick={handleAddPlayer}
                    >
                        הוסף שחקן
                    </Button>
                </div>

                {isLoadingPlayers ? (
                    <Spinner />
                ) : (
                    <PlayersList
                        players={players}
                        onEdit={handleEditPlayer}
                        onDelete={handleDeletePlayer}
                    />
                )}
            </section>

            {/* Trainings Section - Placeholder */}
            <section className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 className={styles.sectionTitle}>אימונים קרובים</h2>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {(userData?.role === 'coach' && group?.coachId === userData?.id) && (
                            <Link to={`/trainings/new?groupId=${id}`}>
                                <Button variant="ghost" size="small" startIcon={<Plus size={16} />}>
                                    אימון חדש
                                </Button>
                            </Link>
                        )}
                        <Button variant="ghost" size="small" startIcon={<Calendar size={16} />}>
                            לוח שנה
                        </Button>
                    </div>
                </div>

                <div className={styles.emptyState}>
                    <p>אין אימונים מתוכננים</p>
                </div>
            </section>

            <PlayerFormModal
                isOpen={isPlayerFormOpen}
                onClose={() => setIsPlayerFormOpen(false)}
                player={selectedPlayer}
                groupId={id}
                onSubmit={handlePlayerSubmit}
                isSubmitting={isSubmittingPlayer}
            />
        </div>
    );
}
