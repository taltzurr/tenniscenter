import styles from './Spinner.module.css';

function Spinner({
    size = 'medium',
    color = 'primary',
    className = '',
}) {
    const classes = [
        styles.spinner,
        styles[size],
        styles[color],
        className,
    ].filter(Boolean).join(' ');

    return <div className={classes} role="status" aria-label="טוען..." />;
}

function FullPageSpinner({ text = 'טוען...' }) {
    return (
        <div className={styles.fullPage}>
            <div className={styles.container}>
                <Spinner size="large" />
                {text && <span className={styles.text}>{text}</span>}
            </div>
        </div>
    );
}

Spinner.FullPage = FullPageSpinner;

export default Spinner;
