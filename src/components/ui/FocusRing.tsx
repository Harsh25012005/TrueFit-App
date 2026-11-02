import { View } from 'react-native';

import { useColors } from '@/theme/colors';
import { radius, type ColorToken } from '@/theme/tokens';

const RING = 2;
const GAP = 2;

/**
 * Keyboard / D-pad / switch-access focus ring (DESIGN.md §6): 2 dp outline with a 2 dp gap.
 * Drawn outside the control so focusing never changes its size.
 */
export function FocusRing({
  visible,
  color = 'primary',
}: {
  visible: boolean;
  color?: ColorToken;
}) {
  const colors = useColors();
  if (!visible) return null;
  const inset = -(RING + GAP);
  return (
    <View
      pointerEvents="none"
      testID="focus-ring"
      style={{
        position: 'absolute',
        top: inset,
        left: inset,
        right: inset,
        bottom: inset,
        borderWidth: RING,
        borderColor: colors[color],
        borderRadius: radius.md,
      }}
    />
  );
}
