import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Avatar from '../../components/ui/Avatar';
import useUsersStore from '../../stores/usersStore';
import useCentersStore from '../../stores/centersStore';
import useAuthStore from '../../stores/authStore';
import useUIStore from '../../stores/uiStore';
import { ROLES } from '../../config/constants';
import UserFormModal from './UserFormModal';
import styles from './UsersPage.module.css';

const ROLE_LABELS = {
    [ROLES.SUPERVISOR]: 'מנהל מקצועי / אדמין',
    [ROLES.CENTER_MANAGER]: 'מנהל מרכז',
    [ROLES.COACH]: 'מאמן',
};

const getRoleClass = (role) => {
    switch (role) {
        case ROLES.SUPERVISOR: return styles.roleSupervisor;
        case ROLES.CENTER_MANAGER: return styles.roleCenterManager;
        case ROLES.COACH: return styles.roleCoach;
        default: return '';
    }
};

function UsersPage() {
    const { userData, isCenterManager, isSupervisor } = useAuthStore();
    const { users, isLoading, fetchUsers, addUser, updateUser, deleteUser } = useUsersStore();
    const { centers, fetchCenters, getCenterName } = useCentersStore();
    const { addToast } = useUIStore();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchCenters();
    }, [fetchUsers, fetchCenters]);

    const handleAddUser = () => {
        setSelectedUser(null);
        setIsFormOpen(true);
    };

    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsFormOpen(true);
    };

    const handleDeleteUser = async (user) => {
        if (window.confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${user.displayName}?`)) {
            const result = await deleteUser(user.id);
            if (result.success) {
                addToast({ type: 'success', message: 'המשתמש נמחק בהצלחה' });
            } else {
                addToast({ type: 'error', message: result.error });
            }
        }
    };

    const handleFormSubmit = async (formData) => {
        setIsSubmitting(true);
        let result;

        if (selectedUser) {
            result = await updateUser(selectedUser.id, formData);
        } else {
            result = await addUser(formData);
        }

        setIsSubmitting(false);

        if (result.success) {
            addToast({ type: 'success', message: selectedUser ? 'המשתמש עודכן בהצלחה' : 'המשתמש נוצר בהצלחה' });
            setIsFormOpen(false);
        } else {
            addToast({ type: 'error', message: result.error });
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesRole = true;
        if (isCenterManager()) {
            // Center Manager sees users in their center
            matchesRole = user.centerIds && user.centerIds.includes(userData.managedCenterId);
        }

        return matchesSearch && matchesRole;
    });

    if (isLoading && users.length === 0) {
        return <Spinner.FullPage />;
    }

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <h1 className={styles.title}>ניהול משתמשים</h1>
                <Button onClick={handleAddUser} icon={Plus}>
                    משתמש חדש
                </Button>
            </header>

            <div style={{ marginBottom: '24px', maxWidth: '400px' }}>
                <Input
                    placeholder="חיפוש לפי שם או אימייל..."
                    icon={Search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className={styles.tableContainer}>
                {filteredUsers.length === 0 ? (
                    <div className={styles.emptyState}>
                        <p>לא נמצאו משתמשים</p>
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>שם</th>
                                <th>תפקיד</th>
                                <th>מרכז</th>
                                <th>אימייל</th>
                                <th>טלפון</th>
                                <th>פעולות</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Avatar name={user.displayName} size="small" />
                                            <span style={{ fontWeight: '500' }}>{user.displayName}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.roleBadge} ${getRoleClass(user.role)}`}>
                                            {ROLE_LABELS[user.role] || user.role}
                                        </span>
                                    </td>
                                    <td>
                                        {/* Display Center(s) */}
                                        {user.centerIds && user.centerIds.length > 0
                                            ? user.centerIds.map(id => getCenterName(id)).join(', ')
                                            : (user.managedCenterId ? getCenterName(user.managedCenterId) : '-')
                                        }
                                    </td>
                                    <td>{user.email}</td>
                                    <td>{user.phone || '-'}</td>
                                    <td>
                                        <div className={styles.actions}>
                                            <Button
                                                variant="ghost"
                                                size="small"
                                                onClick={() => handleEditUser(user)}
                                                className="p-1"
                                                title="ערוך"
                                            >
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="small"
                                                onClick={() => handleDeleteUser(user)}
                                                className="p-1 text-red-500 hover:text-red-700"
                                                title="מחק"
                                            >
                                                <Trash2 size={16} color="var(--error)" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <UserFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                user={selectedUser}
                onSubmit={handleFormSubmit}
                centers={centers}
                isSubmitting={isSubmitting}
                currentRole={userData?.role}
                managedCenterId={userData?.managedCenterId}
            />
        </div>
    );
}

export default UsersPage;
