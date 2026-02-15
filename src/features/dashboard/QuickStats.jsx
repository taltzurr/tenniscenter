import { useNavigate } from 'react-router-dom';
import styles from './QuickStats.module.css';

function QuickStats({ stats }) {
    const navigate = useNavigate();

    return (
        <div className={styles.grid}>
            {stats.map((stat) => {
                const isAttention = stat.attention && stat.value > 0;

                return (
                    <div
                        key={stat.label}
                        className={`${styles.card} ${isAttention ? styles.attention : ''}`}
                        onClick={() => navigate(stat.path)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${stat.label}: ${stat.value}`}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(stat.path)}
                    >
                        {/* isAttention && <span className={styles.dot} /> */}
                        <div className={`${styles.icon} ${styles[stat.color]}`}>
                            <stat.icon size={16} />
                        </div>
                        <div className={styles.info}>
                            <div className={styles.value}>{stat.value}</div>
                            <div className={styles.label}>{stat.label}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default QuickStats;
