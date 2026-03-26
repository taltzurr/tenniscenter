import { useRef, useCallback } from 'react';

/**
 * Hook for swipe navigation on calendars.
 * RTL-aware: swipe right = next month, swipe left = previous month.
 * In RTL, "next" is to the right (time flows right-to-left).
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
            // RTL: swipe right (positive deltaX) = next month (forward in RTL)
            //      swipe left (negative deltaX) = previous month (backward in RTL)
            if (deltaX > 0) {
                onNext();
            } else {
                onPrev();
            }
        }

        touchStartX.current = null;
        touchStartY.current = null;
    }, [onNext, onPrev, threshold]);

    return { onTouchStart, onTouchEnd };
}
