import { useState, useRef } from 'react';
import { Upload, X, Video, AlertCircle } from 'lucide-react';
import {
    uploadVideo,
    ALLOWED_VIDEO_TYPES,
    MAX_VIDEO_SIZE,
    validateFile
} from '../../../services/storage';
import styles from './VideoUploader.module.css';

function VideoUploader({ value, onChange, exerciseId = 'temp' }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFile(file);
        }
    };

    const handleFile = async (file) => {
        setError(null);

        // Validate file
        const validation = validateFile(file, ALLOWED_VIDEO_TYPES, MAX_VIDEO_SIZE);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setIsUploading(true);
        setProgress(0);

        try {
            const url = await uploadVideo(file, exerciseId, (p) => setProgress(p));
            onChange(url);
            setIsUploading(false);
        } catch (err) {
            console.error('Upload failed:', err);
            setError('שגיאה בהעלאת הקובץ');
            setIsUploading(false);
        }
    };

    const handleRemove = () => {
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Show preview if we have a video URL
    if (value && !isUploading) {
        return (
            <div className={styles.preview}>
                <video
                    src={value}
                    className={styles.videoPreview}
                    muted
                />
                <div className={styles.previewInfo}>
                    <span className={styles.fileName}>
                        <Video size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                        וידאו הועלה בהצלחה
                    </span>
                    <span className={styles.fileSize}>לחץ להסרה ולהעלאה מחדש</span>
                </div>
                <button
                    type="button"
                    className={styles.removeButton}
                    onClick={handleRemove}
                >
                    <X size={20} />
                </button>
            </div>
        );
    }

    return (
        <div>
            <div
                className={`${styles.uploader} ${isDragOver ? styles.dragOver : ''} ${isUploading ? styles.uploading : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept={ALLOWED_VIDEO_TYPES.join(',')}
                    onChange={handleFileSelect}
                    className={styles.hiddenInput}
                    disabled={isUploading}
                />

                {isUploading ? (
                    <>
                        <Upload className={styles.icon} />
                        <div className={styles.text}>מעלה וידאו...</div>
                        <div className={styles.progressContainer}>
                            <div className={styles.progressBar}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className={styles.progressText}>
                                <span>{progress}%</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <Video className={styles.icon} />
                        <div className={styles.text}>גרור וידאו לכאן או לחץ לבחירה</div>
                        <div className={styles.subtext}>MP4, WebM עד 100MB</div>
                    </>
                )}
            </div>

            {error && (
                <div className={styles.error}>
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
        </div>
    );
}

export default VideoUploader;
