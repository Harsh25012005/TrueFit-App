import { Input, type InputProps } from './Input';

export interface PhoneInputProps extends Omit<
  InputProps,
  'value' | 'onChangeText' | 'keyboardType' | 'prefix'
> {
  /** 10-digit Indian mobile number without the country code. */
  value: string;
  onChangeText: (digits: string) => void;
}

/** Keeps digits only, max 10 (paste of "+91 98240 12345" → "9824012345"). */
export function toPhoneDigits(text: string): string {
  const digits = text.replace(/\D/g, '');
  return (digits.length > 10 && digits.startsWith('91') ? digits.slice(2) : digits).slice(0, 10);
}

/** Phone input (DESIGN.md §6.2): fixed "+91", numeric keyboard, 10 digits. */
export function PhoneInput({ value, onChangeText, ...rest }: PhoneInputProps) {
  return (
    <Input
      prefix="+91"
      keyboardType="number-pad"
      textContentType="telephoneNumber"
      autoComplete="tel-national"
      value={value}
      onChangeText={(text) => onChangeText(toPhoneDigits(text))}
      {...rest}
    />
  );
}
