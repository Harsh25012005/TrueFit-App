import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';

import { MoneyInput, MONEY_MAX, toRupees } from './MoneyInput';
import { PhoneInput, toPhoneDigits } from './PhoneInput';
import { SearchInput } from './SearchInput';

describe('toPhoneDigits', () => {
  it('keeps 10 digits and strips +91 / spaces from pastes', () => {
    expect(toPhoneDigits('98240 12345')).toBe('9824012345');
    expect(toPhoneDigits('+91 98240 12345')).toBe('9824012345');
    expect(toPhoneDigits('919824012345')).toBe('9824012345');
    expect(toPhoneDigits('98240123456789')).toBe('9824012345');
    expect(toPhoneDigits('abc')).toBe('');
  });
});

describe('toRupees', () => {
  it('returns whole rupees, null when empty, capped at the max', () => {
    expect(toRupees('650')).toBe(650);
    expect(toRupees('6.50')).toBe(650); // no paise in MVP: dots are dropped
    expect(toRupees('')).toBeNull();
    expect(toRupees('9999999')).toBe(MONEY_MAX);
    expect(toRupees('500', 400)).toBe(400);
  });
});

describe('PhoneInput', () => {
  it('shows +91, uses the number pad, and emits digits only', async () => {
    const onChangeText = jest.fn();
    await render(<PhoneInput label="Mobile" value="" onChangeText={onChangeText} testID="ph" />);
    expect(screen.getByText('+91')).toBeTruthy();
    expect(screen.getByTestId('ph')).toHaveProp('keyboardType', 'number-pad');
    await fireEvent.changeText(screen.getByTestId('ph'), '98-240 12345');
    expect(onChangeText).toHaveBeenCalledWith('9824012345');
  });
});

describe('MoneyInput', () => {
  it('shows ₹, starts empty (no default rate) and emits integers', async () => {
    const onChangeValue = jest.fn();
    await render(<MoneyInput label="Rate" value={null} onChangeValue={onChangeValue} testID="m" />);
    expect(screen.getByText('₹')).toBeTruthy();
    expect(screen.getByTestId('m')).toHaveProp('value', '');
    await fireEvent.changeText(screen.getByTestId('m'), '650');
    expect(onChangeValue).toHaveBeenCalledWith(650);
    await fireEvent.changeText(screen.getByTestId('m'), '');
    expect(onChangeValue).toHaveBeenLastCalledWith(null);
  });
});

describe('SearchInput', () => {
  it('is a labelled search field with no mic button (V2)', async () => {
    const onChangeText = jest.fn();
    await render(<SearchInput value="" onChangeText={onChangeText} testID="s" />);
    expect(screen.getByLabelText('Search')).toHaveProp('returnKeyType', 'search');
    expect(screen.queryByRole('button')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('s'), 'Amit');
    expect(onChangeText).toHaveBeenCalledWith('Amit');
  });
});
