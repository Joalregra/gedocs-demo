import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a `setTimeout` that is cancelled when the component unmounts.
 *
 * A timer that outlives its component runs against a page that may be gone: it can touch a dialog
 * that no longer exists, or call `document` after a test environment was already torn down. That
 * made the unit tests exit with "ReferenceError: document is not defined" even though every test
 * passed. Use it for any delayed callback that reads the DOM or sets state.
 */
export default function useTimeout() {
    const timers = useRef(new Set());

    useEffect(() => {
        const pending = timers.current;
        return () => {
            pending.forEach((id) => clearTimeout(id));
            pending.clear();
        };
    }, []);

    return useCallback((callback, delay) => {
        const id = setTimeout(() => {
            timers.current.delete(id);
            callback();
        }, delay);
        timers.current.add(id);
        return id;
    }, []);
}
