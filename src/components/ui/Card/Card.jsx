import styles from './Card.module.css';

function Card({
    children,
    padding = 'medium',
    interactive = false,
    onClick,
    className = '',
    ...props
}) {
    const classes = [
        styles.card,
        styles[`padding${padding.charAt(0).toUpperCase() + padding.slice(1)}`],
        interactive && styles.interactive,
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classes}
            onClick={interactive ? onClick : undefined}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            {...props}
        >
            {children}
        </div>
    );
}

function CardHeader({ title, subtitle, actions, className = '' }) {
    return (
        <div className={`${styles.header} ${className}`}>
            <div>
                <h3 className={styles.title}>{title}</h3>
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
            </div>
            {actions && <div>{actions}</div>}
        </div>
    );
}

function CardBody({ children, className = '' }) {
    return <div className={`${styles.body} ${className}`}>{children}</div>;
}

function CardFooter({ children, className = '' }) {
    return <div className={`${styles.footer} ${className}`}>{children}</div>;
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
