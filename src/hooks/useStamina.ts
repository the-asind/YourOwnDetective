import { useState, useEffect, useRef } from 'react';

const MAX_STAMINA = 300; // 3 segments, 100 each
const REGEN_RATE_PER_SECOND = 15; // Takes 20 seconds to regen full 300 (or ~6.6 seconds per charge)

export function useStamina() {
  const [stamina, setStamina] = useState(MAX_STAMINA);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    let animationFrameId: number;

    const tick = () => {
      const now = Date.now();
      const deltaMs = now - lastUpdateRef.current;
      
      if (deltaMs > 0) {
        const deltaStamina = (deltaMs / 1000) * REGEN_RATE_PER_SECOND;
        
        setStamina(prev => {
          if (prev >= MAX_STAMINA) {
            lastUpdateRef.current = now;
            return MAX_STAMINA;
          }
          const next = Math.min(MAX_STAMINA, prev + deltaStamina);
          return next;
        });
        
        lastUpdateRef.current = now;
      }
      
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const consumeStamina = (amount: number = 100) => {
    if (stamina >= amount) {
      setStamina(prev => Math.max(0, prev - amount));
      return true;
    }
    return false;
  };

  return { stamina, consumeStamina, maxStamina: MAX_STAMINA };
}
