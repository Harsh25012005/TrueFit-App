import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { palette } from '@/theme/tokens';

import { Input } from './Input';

const c = palette.light;

describe('Input', () => {
  it('default: visible label, 48 high, border token, muted placeholder', async () => {
    await render(<Input label="Full name" placeholder="Amit Shah" testID="name" />);
    expect(screen.getByText('Full name')).toHaveStyle({ color: c['text-muted'] });
    expect(screen.getByTestId('name-field')).toHaveStyle({
      minHeight: 48,
      borderColor: c.border,
      borderRadius: 4,
      backgroundColor: c.surface,
    });
    expect(screen.getByLabelText('Full name')).toHaveProp('placeholderTextColor', c['text-muted']);
    expect(screen.queryByTestId('name-halo', { includeHiddenElements: true })).toBeNull();
  });

  it('focus: primary border plus primary-subtle halo, then back on blur', async () => {
    const onFocus = jest.fn();
    await render(<Input label="Shop name" testID="shop" onFocus={onFocus} />);
    await fireEvent(screen.getByTestId('shop'), 'focus');
    expect(onFocus).toHaveBeenCalled();
    expect(screen.getByTestId('shop-field')).toHaveStyle({ borderColor: c.primary });
    expect(screen.getByTestId('shop-halo', { includeHiddenElements: true })).toHaveStyle({
      borderColor: c['primary-subtle'],
      borderWidth: 3,
    });
    await fireEvent(screen.getByTestId('shop'), 'blur');
    expect(screen.getByTestId('shop-field')).toHaveStyle({ borderColor: c.border });
  });

  it('typing calls onChangeText', async () => {
    const onChangeText = jest.fn();
    await render(<Input label="Area" onChangeText={onChangeText} testID="area" />);
    await fireEvent.changeText(screen.getByTestId('area'), 'Navrangpura');
    expect(onChangeText).toHaveBeenCalledWith('Navrangpura');
  });

  it('error: error border + halo, message with icon, announced', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(<Input label="Mobile" error="Enter 10-digit mobile number" testID="phone" />);
    expect(screen.getByTestId('phone-field')).toHaveStyle({ borderColor: c.error });
    expect(screen.getByTestId('phone-halo', { includeHiddenElements: true })).toHaveStyle({
      borderColor: c['error-subtle'],
    });
    expect(screen.getByText('Enter 10-digit mobile number')).toHaveStyle({ color: c.error });
    expect(announce).toHaveBeenCalledWith('Mobile: Enter 10-digit mobile number');
  });

  it('disabled: muted background and text, not editable', async () => {
    await render(<Input label="Book no." value="101" disabled testID="book" />);
    expect(screen.getByTestId('book-field')).toHaveStyle({ backgroundColor: c['surface-muted'] });
    expect(screen.getByTestId('book')).toHaveProp('editable', false);
    expect(screen.getByTestId('book')).toHaveStyle({ color: c['text-muted'] });
  });

  it('loading shows a trailing spinner; hint shows below', async () => {
    await render(<Input label="Phone" loading hint="We'll send a code" prefix="+91" />);
    expect(screen.getByTestId('input-spinner', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText("We'll send a code")).toBeTruthy();
    expect(screen.getByText('+91')).toBeTruthy();
  });

  it('textarea is at least 96 high', async () => {
    await render(<Input label="Note" multiline testID="note" />);
    expect(screen.getByTestId('note-field')).toHaveStyle({ minHeight: 96 });
  });
});
