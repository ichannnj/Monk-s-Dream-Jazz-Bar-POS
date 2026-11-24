import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseAsyncActionOptions<TArgs extends any[], TResult> {
  onSuccess?: (result: TResult, ...args: TArgs) => void;
  onError?: (error: unknown, ...args: TArgs) => void;
  cooldownMs?: number;
}

export interface AsyncActionResult<TArgs extends any[], TResult> {
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  isLoading: boolean;
  error: unknown | null;
  reset: () => void;
}

/**
 * useAsyncAction
 * Provides an immediate synchronous ref lock + React loading state
 * to completely eliminate race conditions and rapid double-taps on action triggers.
 */
export function useAsyncAction<TArgs extends any[] = [], TResult = unknown>(
  action: (...args: TArgs) => Promise<TResult> | TResult,
  options: UseAsyncActionOptions<TArgs, TResult> = {}
): AsyncActionResult<TArgs, TResult> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const isRunningRef = useRef(false);
  const isMountedRef = useRef(true);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    isRunningRef.current = false;
    if (isMountedRef.current) {
      setIsLoading(false);
      setError(null);
    }
  }, []);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      // Synchronous lock: blocks invocation even before next React render tick
      if (isRunningRef.current) {
        return undefined;
      }

      isRunningRef.current = true;
      if (isMountedRef.current) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const result = await action(...args);
        if (options.onSuccess && isMountedRef.current) {
          options.onSuccess(result, ...args);
        }

        if (options.cooldownMs && options.cooldownMs > 0) {
          cooldownTimerRef.current = setTimeout(() => {
            isRunningRef.current = false;
            if (isMountedRef.current) {
              setIsLoading(false);
            }
          }, options.cooldownMs);
        } else {
          isRunningRef.current = false;
          if (isMountedRef.current) {
            setIsLoading(false);
          }
        }

        return result;
      } catch (err) {
        isRunningRef.current = false;
        if (isMountedRef.current) {
          setError(err);
          setIsLoading(false);
        }
        if (options.onError) {
          options.onError(err, ...args);
        } else {
          throw err;
        }
      }
    },
    [action, options]
  );

  return {
    execute,
    isLoading,
    error,
    reset,
  };
}

/**
 * useKeyedCooldown
 * For optimistic actions (like KDS Start/Ready or Takeout/Delivery card chips)
 * where state updates optimistically and callers want to drop repeat taps on the same item key.
 */
export function useKeyedCooldown(defaultCooldownMs = 500) {
  const lockedKeysRef = useRef<Map<string, number>>(new Map());

  const isLocked = useCallback((key: string): boolean => {
    const lockedUntil = lockedKeysRef.current.get(key);
    if (!lockedUntil) return false;
    if (Date.now() >= lockedUntil) {
      lockedKeysRef.current.delete(key);
      return false;
    }
    return true;
  }, []);

  const lock = useCallback(
    (key: string, cooldownMs = defaultCooldownMs): boolean => {
      if (isLocked(key)) {
        return false; // Already locked, caller should drop duplicate action
      }
      lockedKeysRef.current.set(key, Date.now() + cooldownMs);
      return true; // Successfully locked, caller should proceed
    },
    [defaultCooldownMs, isLocked]
  );

  const clear = useCallback((key?: string) => {
    if (key) {
      lockedKeysRef.current.delete(key);
    } else {
      lockedKeysRef.current.clear();
    }
  }, []);

  return { isLocked, lock, clear };
}
