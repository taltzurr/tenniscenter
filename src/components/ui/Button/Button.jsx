import { forwardRef } from 'react';
import styles from './Button.module.css';

const Button = forwardRef(({
    children,
    variant = 'primary',
    size = 'medium',
    fullWidth = false,
    iconOnly = false,
    disabled = false,
    type = 'button',
    onClick,
    className = '',
    ...props
}, ref) => {
    const classes = [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        iconOnly && styles.iconOnly,
        className,
    ].filter(Boolean).join(' ');

    return (
        <button
            ref={ref}
            type={type}
            className={classes}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
});

Button.displayName = 'Button';

export default Button;
