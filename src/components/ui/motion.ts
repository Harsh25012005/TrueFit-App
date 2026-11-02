import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { motion } from '@/theme/tokens';

/** OS "Reduce motion" (DESIGN.md §4/§8.7): when true, only opacity changes are allowed. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setReduced(value));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/**
 * Transform for a pressed control (button 0.97, card 0.99); scale 1 when not pressed or when
 * motion is reduced. Always an array: switching `transform` from an array to `undefined`
 * crashes RN's native style diff ("Cannot read property 'forEach' of null").
 */
export function pressTransform(
  pressed: boolean,
  reduced: boolean,
  scale: number = motion.pressScale,
): [{ scale: number }] {
  return [{ scale: pressed && !reduced ? scale : 1 }];
}
