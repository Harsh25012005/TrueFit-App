import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import '@/i18n';
import { palette } from '@/theme/tokens';

import { PinDots, PinPad } from './PinPad';

function Harness({ onComplete, onBiometric }: { onComplete: jest.Mock; onBiometric?: () => void }) {
  const [pin, setPin] = useState('');
  return (
    <>
      <PinDots count={pin.length} />
      <PinPad value={pin} onChange={setPin} onComplete={onComplete} onBiometric={onBiometric} />
    </>
  );
}

describe('PinPad', () => {
  it('fills dots as digits are typed and completes at 4', async () => {
    const onComplete = jest.fn();
    await render(<Harness onComplete={onComplete} />);
    for (const d of ['1', '9', '0']) await fireEvent.press(screen.getByRole('button', { name: d }));
    expect(screen.getByLabelText('3 of 4 digits entered')).toBeTruthy();
    expect(screen.getAllByTestId('pin-dot-filled', { includeHiddenElements: true })).toHaveLength(
      3,
    );

    await fireEvent.press(screen.getByRole('button', { name: '7' }));
    expect(onComplete).toHaveBeenCalledWith('1907');

    // A fifth digit is ignored.
    await fireEvent.press(screen.getByRole('button', { name: '5' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('delete removes the last digit and is disabled when empty', async () => {
    await render(<Harness onComplete={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Delete digit' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: '4' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Delete digit' }));
    expect(screen.getByLabelText('0 of 4 digits entered')).toBeTruthy();
  });

  it('shows the fingerprint key only when biometrics are offered', async () => {
    await render(<Harness onComplete={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Use fingerprint' })).toBeNull();

    const onBiometric = jest.fn();
    await render(<Harness onComplete={jest.fn()} onBiometric={onBiometric} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Use fingerprint' }));
    expect(onBiometric).toHaveBeenCalled();
  });

  it('keys are 72×64 with radius 4 and a border; dots are 14 dp squares', async () => {
    await render(<Harness onComplete={jest.fn()} />);
    expect(screen.getByRole('button', { name: '1' })).toHaveStyle({
      width: 72,
      height: 64,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: palette.light.border,
    });
    expect(screen.getAllByTestId('pin-dot-empty', { includeHiddenElements: true })[0]).toHaveStyle({
      width: 14,
      height: 14,
      borderRadius: 2,
    });
  });
});
