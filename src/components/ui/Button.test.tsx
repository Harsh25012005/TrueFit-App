import { fireEvent, render, screen } from '@testing-library/react-native';

import { palette } from '@/theme/tokens';

import { Button, IconButton } from './Button';

const c = palette.light;

describe('Button', () => {
  it('primary: default, pressed, then calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Create order" onPress={onPress} testID="b" />);
    const body = screen.getByTestId('b-body');
    expect(body).toHaveStyle({ backgroundColor: c.primary, height: 48, borderRadius: 4 });
    expect(screen.getByText('Create order')).toHaveStyle({ color: c['on-primary'] });

    await fireEvent(screen.getByRole('button'), 'pressIn');
    expect(screen.getByTestId('b-body')).toHaveStyle({
      backgroundColor: c['primary-pressed'],
      transform: [{ scale: 0.97 }],
    });
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('disabled: 40 % opacity, not pressable, announced as disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} disabled testID="b" />);
    expect(screen.getByTestId('b-body')).toHaveStyle({ opacity: 0.4 });
    expect(screen.getByRole('button')).toBeDisabled();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('loading: spinner replaces icon, label kept, busy and not pressable', async () => {
    const onPress = jest.fn();
    await render(<Button label="Send OTP" icon="phone" loading onPress={onPress} />);
    expect(screen.getByTestId('button-spinner', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Send OTP')).toBeTruthy();
    expect(screen.getByRole('button')).toBeBusy();
    expect(screen.getByRole('button')).toBeDisabled();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('focus: shows the focus ring without changing size', async () => {
    await render(<Button label="Next" testID="b" />);
    expect(screen.queryByTestId('focus-ring', { includeHiddenElements: true })).toBeNull();
    await fireEvent(screen.getByRole('button'), 'focus');
    expect(screen.getByTestId('focus-ring', { includeHiddenElements: true })).toHaveStyle({
      borderColor: c.primary,
      borderWidth: 2,
      position: 'absolute',
    });
    expect(screen.getByTestId('b-body')).toHaveStyle({ height: 48 });
  });

  it('secondary, ghost and destructive use their DESIGN.md colours', async () => {
    await render(<Button label="Skip" variant="secondary" size="sm" testID="s" />);
    expect(screen.getByTestId('s-body')).toHaveStyle({
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      height: 40,
    });

    await render(<Button label="Forgot?" variant="ghost" />);
    expect(screen.getByText('Forgot?')).toHaveStyle({ color: c.primary });

    await render(<Button label="Delete" variant="destructive" testID="d" />);
    expect(screen.getByTestId('d-body')).toHaveStyle({ borderColor: c['error-subtle'] });
    expect(screen.getByText('Delete')).toHaveStyle({ color: c.error });
  });

  it('secondary disabled uses faint text and subtle border', async () => {
    await render(<Button label="Skip" variant="secondary" disabled testID="s" />);
    expect(screen.getByTestId('s-body')).toHaveStyle({ borderColor: c['border-subtle'] });
    expect(screen.getByText('Skip')).toHaveStyle({ color: c['text-faint'] });
  });
});

describe('IconButton', () => {
  it('is 48×48, labelled, and shows pressed background', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon="search" accessibilityLabel="Search" onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Search' });
    expect(button).toHaveStyle({ width: 48, height: 48, backgroundColor: 'transparent' });
    await fireEvent(button, 'pressIn');
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: c['surface-muted'] });
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });
});
