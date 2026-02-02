import { forwardRef } from 'react';
import styles from './Input.module.css';

const Input = forwardRef(({
    label,
    error,
    hint,
    required = false,
    size = 'medium',
    iconStart,
    iconEnd,
    multiline = false,
    className = '',
    ...props
}, ref) => {
    const InputComponent = multiline ? 'textarea' : 'input';

    const wrapperClasses = [
        styles.inputWrapper,
        styles[size],
        error && styles.hasError,
        iconStart && styles.hasIconStart,
        iconEnd && styles.hasIconEnd,
        className,
    ].filter(Boolean).join(' ');

    const inputClasses = [
        styles.input,
        multiline && styles.textarea,
    ].filter(Boolean).join(' ');

    return (
        <div className={wrapperClasses}>
            {label && (
                <label className={styles.label}>
                    {label}
                    {required && <span className={styles.required}>*</span>}
                </label>
            )}

            <div className={styles.inputContainer}>
                {iconStart && <span className={styles.iconStart}>{iconStart}</span>}

                <InputComponent
                    ref={ref}
                    className={inputClasses}
                    required={required}
                    {...props}
                />

                {iconEnd && <span className={styles.iconEnd}>{iconEnd}</span>}
            </div>

            {error && <span className={styles.error}>{error}</span>}
            {hint && !error && <span className={styles.hint}>{hint}</span>}
        </div>
    );
});

Input.displayName = 'Input';

export default Input;
