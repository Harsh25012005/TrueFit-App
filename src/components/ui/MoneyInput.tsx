import { Input, type InputProps } from './Input';

/** AUTH_SECURITY.md §5: money is an integer number of rupees, 0–10,00,000. */
export const MONEY_MAX = 1_000_000;

export interface MoneyInputProps extends Omit<
  InputProps,
  'value' | 'onChangeText' | 'keyboardType' | 'prefix'
> {
  /** Integer rupees, or null when empty (no default: PRD M7 "rate is typed every time"). */
  value: number | null;
  onChangeValue: (rupees: number | null) => void;
  max?: number;
}

/** Digits only → integer rupees; empty → null; capped at `max`. */
export function toRupees(text: string, max = MONEY_MAX): number | null {
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  return Math.min(Number(digits), max);
}

/** Money input (DESIGN.md §6.2): "₹" prefix, numeric keyboard, whole rupees. */
export function MoneyInput({ value, onChangeValue, max = MONEY_MAX, ...rest }: MoneyInputProps) {
  return (
    <Input
      prefix="₹"
      keyboardType="number-pad"
      value={value === null ? '' : String(value)}
      onChangeText={(text) => onChangeValue(toRupees(text, max))}
      {...rest}
    />
  );
}
