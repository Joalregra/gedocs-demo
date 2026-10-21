import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useTimeout from '@/Hooks/useTimeout';

describe('useTimeout', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs the callback once the delay has passed, and not before', () => {
        const { result } = renderHook(() => useTimeout());
        const callback = vi.fn();

        result.current(callback, 100);
        vi.advanceTimersByTime(99);
        expect(callback).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('cancels every pending callback when the component unmounts', () => {
        const { result, unmount } = renderHook(() => useTimeout());
        const first = vi.fn();
        const second = vi.fn();

        result.current(first, 100);
        result.current(second, 1200);
        expect(vi.getTimerCount()).toBe(2);

        unmount();

        expect(vi.getTimerCount()).toBe(0);
        vi.advanceTimersByTime(5000);
        expect(first).not.toHaveBeenCalled();
        expect(second).not.toHaveBeenCalled();
    });

    it('does not keep a timer that has already run', () => {
        const { result } = renderHook(() => useTimeout());

        result.current(() => {}, 50);
        vi.advanceTimersByTime(50);

        expect(vi.getTimerCount()).toBe(0);
    });

    it('returns the same function on every render, so it can be a dependency', () => {
        const { result, rerender } = renderHook(() => useTimeout());
        const first = result.current;

        rerender();

        expect(result.current).toBe(first);
    });
});
