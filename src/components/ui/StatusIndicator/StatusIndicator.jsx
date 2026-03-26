import React, { memo } from 'react';
import { CheckCircle, XCircle, Clock, FileText, AlertTriangle } from 'lucide-react';
import styles from './StatusIndicator.module.css';

/**
 * Unified StatusIndicator — single source of truth for ALL status displays.
 *
 * @param {'completed'|'planned'|'draft'|'submitted'|'approved'|'rejected'|'missing'} status
 * @param {'badge'|'dot'} variant - Display variant
 * @param {string} customText - Override default text
 * @param {boolean} showIcon - Whether to show the icon (default: true for badge)
 */

const STATUS_CONFIG = {
    completed: {
        text: 'בוצע',
        Icon: CheckCircle,
        className: 'completed',
    },
    planned: {
        text: 'מתוכנן',
        Icon: Clock,
        className: 'planned',
    },
    draft: {
        text: 'טיוטה',
        Icon: FileText,
        className: 'draft',
    },
    submitted: {
        text: 'ממתין לאישור',
        Icon: Clock,
        className: 'submitted',
    },
    approved: {
        text: 'הוגש',
        Icon: CheckCircle,
        className: 'approved',
    },
    rejected: {
        text: 'נדחה',
        Icon: XCircle,
        className: 'rejected',
    },
    missing: {
        text: 'טרם הוגש',
        Icon: AlertTriangle,
        className: 'missing',
    },
};

const StatusIndicator = memo(function StatusIndicator({
    status,
    variant = 'badge',
    customText,
    showIcon = true,
}) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.planned;
    const { Icon, className } = config;
    const text = customText || config.text;

    if (variant === 'dot') {
        return (
            <span className={`${styles.dot} ${styles[className]}`} title={text} />
        );
    }

    return (
        <span className={`${styles.badge} ${styles[className]}`}>
            {showIcon && Icon && <Icon size={14} />}
            <span>{text}</span>
        </span>
    );
});

export default StatusIndicator;
