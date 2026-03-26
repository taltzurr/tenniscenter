import { useRef, useCallback } from 'react';

/**
 * Hook for swipe navigation on calendars.
 * RTL-aware: swipe left = next month, swipe right = previous month.
 * @param {function} onNext - Navigate to next month
 * @param {function} onPrev - Navigate to previous month
 * @param {number} threshold - Minimum swipe distance in pixels (default: 50)
 */
export default function useSwipeNavigation(onNext, onPrev, threshold = 50) {
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);

    const onTouchStart = useCallback((e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const onTouchEnd = useCallback((e) => {
        if (touchStartX.current === null) return;

        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;

        // Only trigger if horizontal swipe is dominant
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
            // RTL: swipe right (positive deltaX) = previous month
            //      swipe left (negative deltaX) = next month
            if (deltaX > 0) {
                onPrev();
            } else {
                onNext();
            }
        }

        touchStartX.current = null;
        touchStartY.current = null;
    }, [onNext, onPrev, threshold]);

    return { onTouchStart, onTouchEnd };
}
