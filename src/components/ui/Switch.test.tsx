import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import { palette } from '@/theme/tokens';

import { Segmented } from './Segmented';
import { Stepper } from './Stepper';
import { Switch } from './Switch';

const c = palette.light;

describe('Switch', () => {
  it('off/on track colours, toggles, announces checked', async () => {
    const onValueChange = jest.fn();
    const { rerender } = await render(
      <Switch
        value={false}
        onValueChange={onValueChange}
        accessibilityLabel="Dark mode"
        testID="sw"
      />,
    );
    expect(screen.getByTestId('sw-track')).toHaveStyle({
      width: 44,
      height: 26,
      borderRadius: 2,
      backgroundColor: c.border,
    });
    await fireEvent.press(screen.getByRole('switch', { name: 'Dark mode' }));
    expect(onValueChange).toHaveBeenCalledWith(true);

    await rerender(
      <Switch value onValueChange={onValueChange} accessibilityLabel="Dark mode" testID="sw" />,
    );
    expect(screen.getByTestId('sw-track')).toHaveStyle({ backgroundColor: c.primary });
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('disabled does not toggle', async () => {
    const onValueChange = jest.fn();
    await render(
      <Switch value={false} onValueChange={onValueChange} accessibilityLabel="PIN" disabled />,
    );
    await fireEvent.press(screen.getByRole('switch'));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('Segmented', () => {
  const options = [
    { value: 'cash', label: 'Cash' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
  ] as const;

  it('selected segment is raised with primary 600 text; others muted', async () => {
    const onChange = jest.fn();
    await render(
      <Segmented
        options={options}
        value="upi"
        onChange={onChange}
        accessibilityLabel="Payment mode"
        testID="seg"
      />,
    );
    expect(screen.getByTestId('seg')).toHaveStyle({
      backgroundColor: c['surface-muted'],
      padding: 3,
    });
    expect(screen.getByTestId('seg-upi')).toHaveStyle({
      backgroundColor: c.surface,
      borderColor: c.border,
    });
    expect(screen.getByText('UPI')).toHaveStyle({
      color: c.primary,
      fontFamily: 'PlusJakartaSans_600SemiBold',
    });
    expect(screen.getByText('Cash')).toHaveStyle({ color: c['text-muted'] });
    expect(screen.getByRole('radio', { name: 'UPI' })).toBeSelected();

    await fireEvent.press(screen.getByRole('radio', { name: 'Card' }));
    expect(onChange).toHaveBeenCalledWith('card');
  });
});

describe('Stepper', () => {
  it('increments and decrements; minus disabled at the minimum', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(
      <Stepper value={0} onChange={onChange} accessibilityLabel="Shirt" testID="st" />,
    );
    expect(screen.getByTestId('st')).toHaveStyle({
      height: 40,
      borderColor: c.border,
      borderRadius: 4,
    });
    expect(screen.getByRole('button', { name: 'Decrease Shirt' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Increase Shirt' }));
    expect(onChange).toHaveBeenLastCalledWith(1);

    await rerender(<Stepper value={2} onChange={onChange} accessibilityLabel="Shirt" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Decrease Shirt' }));
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByText('2')).toHaveStyle({ fontVariant: ['tabular-nums'] });
  });

  it('plus disabled at the maximum (qty 1–50)', async () => {
    await render(<Stepper value={50} max={50} onChange={jest.fn()} accessibilityLabel="Pant" />);
    expect(screen.getByRole('button', { name: 'Increase Pant' })).toBeDisabled();
  });
});
