import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "../store/hooks";

const FLASH_DURATION_MS = 600;

/**
 * Returns true for a brief period after an external cross-tab message
 * is received for the given topic. Pass null to disable.
 */
export function useExternalFlash(topic: string | null): boolean {
  const lastReceive = useAppSelector((state) =>
    topic ? state.context.lastExternalReceive[topic] : undefined
  );
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(lastReceive);

  useEffect(() => {
    if (lastReceive !== undefined && lastReceive !== prevRef.current) {
      prevRef.current = lastReceive;
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), FLASH_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [lastReceive]);

  return flashing;
}
