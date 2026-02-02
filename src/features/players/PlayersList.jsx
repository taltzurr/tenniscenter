import { useState } from 'react';
import { Edit2, Trash2, Phone, User, Calendar } from 'lucide-react';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import styles from './PlayersList.module.css';

function PlayersList({ players, onEdit, onDelete }) {
    if (!players || players.length === 0) {
        return (
            <div className={styles.emptyState}>
                <p>אין שחקנים בקבוצה זו</p>
            </div>
        );
    }

    return (
        <div className={styles.list}>
            {players.map(player => (
                <div key={player.id} className={styles.item}>
                    <div className={styles.mainInfo}>
                        <Avatar name={player.displayName} size="small" />
                        <div>
                            <div className={styles.name}>{player.displayName}</div>
                            <div className={styles.subInfo}>
                                {player.birthDate && (
                                    <span title="תאריך לידה" className={styles.infoBadge}>
                                        <Calendar size={12} />
                                        {new Date(player.birthDate).getFullYear()}
                                    </span>
                                )}
                                {player.phone && (
                                    <span title="טלפון" className={styles.infoBadge}>
                                        <Phone size={12} />
                                        {player.phone}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={styles.actionButton}
                            onClick={() => onEdit(player)}
                            title="ערוך"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            className={`${styles.actionButton} ${styles.delete}`}
                            onClick={() => onDelete(player)}
                            title="מחק מהקבוצה"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default PlayersList;
