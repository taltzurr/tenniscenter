import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

function Modal({
    isOpen,
    onClose,
    title,
    size = 'medium',
    showCloseButton = true,
    closeOnOverlayClick = true,
    children,
}) {
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const modalContent = (
        <div
            className={styles.overlay}
            onClick={closeOnOverlayClick ? onClose : undefined}
        >
            <div
                className={`${styles.modal} ${styles[size]}`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {title && (
                    <div className={styles.header}>
                        <h2 id="modal-title" className={styles.title}>{title}</h2>
                        {showCloseButton && (
                            <button
                                className={styles.closeButton}
                                onClick={onClose}
                                aria-label="סגור"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}
                {children}
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

function ModalBody({ children, className = '' }) {
    return <div className={`${styles.body} ${className}`}>{children}</div>;
}

function ModalFooter({ children, className = '' }) {
    return <div className={`${styles.footer} ${className}`}>{children}</div>;
}

Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;
