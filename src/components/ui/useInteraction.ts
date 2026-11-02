import { useMemo, useState } from 'react';

/**
 * Pressed / hovered / focused state for a pressable primitive (DESIGN.md §6 state tokens).
 * Spread `handlers` onto a Pressable; `active` is pressed-or-hovered (they share one style).
 */
export function useInteraction(disabled = false) {
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const handlers = useMemo(
    () => ({
      onPressIn: () => setPressed(true),
      onPressOut: () => setPressed(false),
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    }),
    [],
  );

  return {
    pressed: pressed && !disabled,
    active: (pressed || hovered) && !disabled,
    focused,
    handlers,
  };
}
