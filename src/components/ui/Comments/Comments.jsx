import { useState, useEffect } from 'react';
import { MessageCircle, Send, Edit2, Trash2, X, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import useAuthStore from '../../../stores/authStore';
import useCommentsStore from '../../../stores/commentsStore';
import useUIStore from '../../../stores/uiStore';
import Avatar from '../Avatar';
import Button from '../Button';
import styles from './Comments.module.css';

function Comments({ entityType, entityId, title = 'הערות', onCommentAdded }) {
    const { userData } = useAuthStore();
    const { comments, fetchComments, add, update, remove, isLoading } = useCommentsStore();
    const { addToast } = useUIStore();

    const [newComment, setNewComment] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');

    useEffect(() => {
        if (entityType && entityId) {
            fetchComments(entityType, entityId);
        }
    }, [entityType, entityId, fetchComments]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const result = await add({
            entityType,
            entityId,
            text: newComment,
            authorId: userData?.id,
            authorName: userData?.displayName || userData?.email,
            authorAvatar: userData?.avatarUrl
        });

        if (result.success) {
            setNewComment('');
            if (onCommentAdded) onCommentAdded(result.comment);
        } else {
            addToast({ type: 'error', message: 'שגיאה בהוספת הערה' });
        }
    };

    const handleEdit = (comment) => {
        setEditingId(comment.id);
        setEditText(comment.text);
    };

    const handleSaveEdit = async () => {
        if (!editText.trim()) return;

        const result = await update(editingId, editText);
        if (result.success) {
            setEditingId(null);
            setEditText('');
        } else {
            addToast({ type: 'error', message: 'שגיאה בעדכון הערה' });
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    const handleDelete = async (id) => {
        if (!confirm('האם למחוק את ההערה?')) return;

        const result = await remove(id);
        if (!result.success) {
            addToast({ type: 'error', message: 'שגיאה במחיקת הערה' });
        }
    };

    return (
        <div className={styles.commentsSection}>
            <div className={styles.commentsHeader}>
                <MessageCircle size={20} />
                <h3 className={styles.commentsTitle}>{title}</h3>
                {comments.length > 0 && (
                    <span className={styles.commentsCount}>{comments.length}</span>
                )}
            </div>

            {/* Add Comment Form */}
            <form className={styles.commentForm} onSubmit={handleSubmit}>
                <textarea
                    className={styles.commentInput}
                    placeholder="הוסף הערה..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                />
                <div className={styles.commentSubmit}>
                    <Button
                        type="submit"
                        size="small"
                        disabled={!newComment.trim() || isLoading}
                    >
                        <Send size={16} />
                    </Button>
                </div>
            </form>

            {/* Comments List */}
            {comments.length > 0 ? (
                <div className={styles.commentsList}>
                    {comments.map(comment => (
                        <div key={comment.id} className={styles.commentItem}>
                            <div className={styles.commentAvatar}>
                                <Avatar
                                    name={comment.authorName}
                                    src={comment.authorAvatar}
                                    size="small"
                                />
                            </div>
                            <div className={styles.commentContent}>
                                <div className={styles.commentHeader}>
                                    <span className={styles.commentAuthor}>
                                        {comment.authorName}
                                    </span>
                                    <span className={styles.commentTime}>
                                        {comment.createdAt && formatDistanceToNow(comment.createdAt, {
                                            addSuffix: true,
                                            locale: he
                                        })}
                                    </span>
                                </div>

                                {editingId === comment.id ? (
                                    <>
                                        <textarea
                                            className={styles.editTextarea}
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            autoFocus
                                        />
                                        <div className={styles.editActions}>
                                            <Button
                                                size="small"
                                                onClick={handleSaveEdit}
                                                disabled={isLoading}
                                            >
                                                <Check size={14} />
                                                שמור
                                            </Button>
                                            <Button
                                                size="small"
                                                variant="outline"
                                                onClick={handleCancelEdit}
                                            >
                                                <X size={14} />
                                                ביטול
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className={styles.commentText}>
                                            {comment.text}
                                        </p>
                                        {comment.authorId === userData?.id && (
                                            <div className={styles.commentActions}>
                                                <button
                                                    className={styles.commentAction}
                                                    onClick={() => handleEdit(comment)}
                                                >
                                                    <Edit2 size={12} />
                                                    ערוך
                                                </button>
                                                <button
                                                    className={`${styles.commentAction} ${styles.delete}`}
                                                    onClick={() => handleDelete(comment.id)}
                                                >
                                                    <Trash2 size={12} />
                                                    מחק
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyComments}>
                    אין הערות עדיין. היה הראשון להוסיף!
                </div>
            )}
        </div>
    );
}

export default Comments;
