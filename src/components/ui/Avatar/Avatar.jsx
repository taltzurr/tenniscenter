import styles from './Avatar.module.css';

function getInitials(name) {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length === 1) {
        return words[0].charAt(0);
    }
    return words[0].charAt(0) + words[words.length - 1].charAt(0);
}

function getColorIndex(name) {
    if (!name) return 0;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 6;
}

function Avatar({
    src,
    name,
    size = 'medium',
    className = '',
}) {
    const initials = getInitials(name);
    const colorIndex = getColorIndex(name);

    const classes = [
        styles.avatar,
        styles[size],
        !src && styles[`color${colorIndex}`],
        className,
    ].filter(Boolean).join(' ');

    return (
        <div className={classes} title={name}>
            {src ? (
                <img
                    src={src}
                    alt={name || 'Avatar'}
                    className={styles.image}
                />
            ) : (
                initials
            )}
        </div>
    );
}

export default Avatar;
