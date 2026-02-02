import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a file to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The storage path (e.g., 'exercises/videos/filename.mp4')
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<string>} - Download URL
 */
export const uploadFile = (file, path, onProgress) => {
    return new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) {
                    onProgress(Math.round(progress));
                }
            },
            (error) => {
                console.error('Upload error:', error);
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
};

/**
 * Upload a video file
 * @param {File} file - Video file
 * @param {string} exerciseId - Exercise ID for path organization
 * @param {function} onProgress - Progress callback
 */
export const uploadVideo = async (file, exerciseId, onProgress) => {
    const extension = file.name.split('.').pop();
    const filename = `${Date.now()}.${extension}`;
    const path = `exercises/${exerciseId}/videos/${filename}`;

    return uploadFile(file, path, onProgress);
};

/**
 * Upload a thumbnail image
 * @param {File} file - Image file
 * @param {string} exerciseId - Exercise ID for path organization
 */
export const uploadThumbnail = async (file, exerciseId) => {
    const extension = file.name.split('.').pop();
    const filename = `thumbnail_${Date.now()}.${extension}`;
    const path = `exercises/${exerciseId}/thumbnails/${filename}`;

    return uploadFile(file, path);
};

/**
 * Delete a file from storage
 * @param {string} url - The file's download URL
 */
export const deleteFile = async (url) => {
    try {
        const fileRef = ref(storage, url);
        await deleteObject(fileRef);
        return true;
    } catch (error) {
        console.error('Delete error:', error);
        // File might not exist, which is okay
        return false;
    }
};

// Allowed video types
export const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/webm',
    'video/quicktime'
];

// Allowed image types
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp'
];

// Max file sizes (in bytes)
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Validate a file before upload
 */
export const validateFile = (file, allowedTypes, maxSize) => {
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'סוג קובץ לא נתמך' };
    }
    if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024));
        return { valid: false, error: `הקובץ גדול מדי (מקסימום ${maxMB}MB)` };
    }
    return { valid: true };
};
