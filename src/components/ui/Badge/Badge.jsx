import PropTypes from 'prop-types';
import styles from './Badge.module.css';

const Badge = ({ children, variant = 'default', className = '', ...props }) => {
    // Map status/variant strings to CSS classes
    const variantClass = styles[variant] || styles.default;

    return (
        <span
            className={`${styles.badge} ${variantClass} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
};

Badge.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf([
        'default',
        'primary',
        'success', 'approved',
        'warning', 'pending', 'submitted',
        'danger', 'rejected',
        'outline'
    ]),
    className: PropTypes.string
};

export default Badge;
