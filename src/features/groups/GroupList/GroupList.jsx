import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus,
    Search,
    Users,
    Calendar,
    Edit2,
    Trash2,
    UsersRound
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import useAuthStore from '../../../stores/authStore';
import useGroupsStore from '../../../stores/groupsStore';
import useUIStore from '../../../stores/uiStore';
import styles from './GroupList.module.css';

function GroupList() {
    const navigate = useNavigate();
    const { userData } = useAuthStore();
    const { groups, isLoading, error, fetchGroups, removeGroup } = useGroupsStore();
    const { addToast } = useUIStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('all');

    useEffect(() => {
        if (userData) {
            const isSupervisor = userData.role === 'supervisor';
            fetchGroups(userData.id, isSupervisor);
        }
    }, [userData, fetchGroups]);

    const handleDeleteGroup = async (e, group) => {
        e.preventDefault();
        e.stopPropagation();

        if (window.confirm(`האם למחוק את הקבוצה "${group.name}"?`)) {
            const result = await removeGroup(group.id);
            if (result.success) {
                addToast({ type: 'success', message: 'הקבוצה נמחקה בהצלחה' });
            } else {
                addToast({ type: 'error', message: 'שגיאה במחיקת הקבוצה' });
            }
        }
    };

    const handleEditGroup = (e, groupId) => {
        e.preventDefault();
        e.stopPropagation();
        navigate(`/groups/${groupId}/edit`);
    };

    // Filter groups
    const filteredGroups = groups.filter(group => {
        const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedType === 'all' || group.groupTypeName === selectedType;
        return matchesSearch && matchesType;
    });

    // Get unique group types for tabs
    const groupTypes = [...new Set(groups.map(g => g.groupTypeName))];

    if (isLoading && groups.length === 0) {
        return (
            <div className={styles.page}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>קבוצות</h1>
                        <p className={styles.subtitle}>טוען...</p>
                    </div>
                </div>
                <div className={styles.grid}>
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`${styles.skeleton} ${styles.skeletonCard}`} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>קבוצות</h1>
                    <p className={styles.subtitle}>
                        {groups.length} קבוצות פעילות
                    </p>
                </div>

                <Button onClick={() => navigate('/groups/new')}>
                    <Plus size={18} />
                    קבוצה חדשה
                </Button>
            </div>

            {/* Search */}
            <div className={styles.searchWrapper}>
                <Search size={18} className={styles.searchIcon} />
                <input
                    type="text"
                    className={styles.searchInput}
                    placeholder="חיפוש קבוצה..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Type Tabs */}
            {groupTypes.length > 0 && (
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${selectedType === 'all' ? styles.active : ''}`}
                        onClick={() => setSelectedType('all')}
                    >
                        הכל ({groups.length})
                    </button>
                    {groupTypes.map(type => (
                        <button
                            key={type}
                            className={`${styles.tab} ${selectedType === type ? styles.active : ''}`}
                            onClick={() => setSelectedType(type)}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            )}

            {/* Groups Grid */}
            {filteredGroups.length > 0 ? (
                <div className={styles.grid}>
                    {filteredGroups.map(group => (
                        <Link
                            key={group.id}
                            to={`/groups/${group.id}`}
                            className={styles.groupCard}
                        >
                            <div className={styles.cardHeader}>
                                <h3 className={styles.groupName}>{group.name}</h3>
                                <span className={styles.groupType}>{group.groupTypeName}</span>
                            </div>

                            <div className={styles.cardBody}>
                                <div className={styles.infoRow}>
                                    <Calendar size={14} className={styles.infoIcon} />
                                    <span>שנתונים: {group.birthYearFrom} - {group.birthYearTo}</span>
                                </div>
                                {group.notes && (
                                    <div className={styles.infoRow}>
                                        <span style={{ opacity: 0.7 }}>{group.notes}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.cardFooter}>
                                <div className={styles.playerCount}>
                                    <Users size={16} />
                                    <span className={styles.playerCountNumber}>{group.playerCount || 0}</span>
                                    <span>שחקנים</span>
                                </div>

                                <div className={styles.actions}>
                                    <button
                                        className={styles.actionButton}
                                        onClick={(e) => handleEditGroup(e, group.id)}
                                        aria-label="ערוך"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className={`${styles.actionButton} ${styles.delete}`}
                                        onClick={(e) => handleDeleteGroup(e, group)}
                                        aria-label="מחק"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <UsersRound className={styles.emptyIcon} />
                    <h3 className={styles.emptyTitle}>
                        {searchQuery ? 'לא נמצאו קבוצות' : 'אין קבוצות עדיין'}
                    </h3>
                    <p className={styles.emptyText}>
                        {searchQuery
                            ? 'נסה לחפש במילים אחרות'
                            : 'צור קבוצה חדשה כדי להתחיל לתכנן אימונים'
                        }
                    </p>
                    {!searchQuery && (
                        <Button onClick={() => navigate('/groups/new')}>
                            <Plus size={18} />
                            צור קבוצה ראשונה
                        </Button>
                    )}
                </div>
            )}

            {error && (
                <div style={{ color: 'var(--error-500)', marginTop: 'var(--space-4)' }}>
                    שגיאה: {error}
                </div>
            )}
        </div>
    );
}

export default GroupList;
