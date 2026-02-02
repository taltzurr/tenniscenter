import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import useUIStore from '../../../stores/uiStore';
import styles from './Toast.module.css';

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

function Toast({ toast }) {
    const { removeToast } = useUIStore();
    const Icon = ICONS[toast.type] || Info;

    useEffect(() => {
        const timer = setTimeout(() => {
            removeToast(toast.id);
        }, toast.duration || 4000);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, removeToast]);

    return (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
            <Icon size={18} />
            <span className={styles.message}>{toast.message}</span>
            <button
                className={styles.closeButton}
                onClick={() => removeToast(toast.id)}
                aria-label="סגור"
            >
                <X size={16} />
            </button>
        </div>
    );
}

function ToastContainer() {
    const { toasts } = useUIStore();

    if (toasts.length === 0) return null;

    return createPortal(
        <div className={styles.toastContainer}>
            {toasts.map(toast => (
                <Toast key={toast.id} toast={toast} />
            ))}
        </div>,
        document.body
    );
}

export default ToastContainer;
