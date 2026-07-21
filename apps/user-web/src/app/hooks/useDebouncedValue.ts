import { useEffect, useState } from "react";

/** value가 delay(ms) 동안 더 바뀌지 않을 때만 반영되는 디바운스된 값을 반환 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
