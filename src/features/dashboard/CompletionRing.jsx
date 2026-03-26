import styles from './CompletionRing.module.css';

/**
 * SVG progress ring for completion rate.
 * Shows a circular progress indicator with percentage.
 */
function CompletionRing({ completed, total, size = 56 }) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    // Color based on percentage
    let color = 'var(--gray-300)';
    if (total > 0) {
        if (percentage >= 80) color = 'var(--success-500)';
        else if (percentage >= 50) color = 'var(--primary-500)';
        else if (percentage >= 25) color = 'var(--warning-500)';
        else color = 'var(--error-400)';
    }

    return (
        <div className={styles.container} style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className={styles.svg}
            >
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--gray-100)"
                    strokeWidth={strokeWidth}
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    className={styles.progress}
                />
            </svg>
            <div className={styles.label}>
                <span className={styles.percentage}>{percentage}%</span>
            </div>
        </div>
    );
}

export default CompletionRing;
