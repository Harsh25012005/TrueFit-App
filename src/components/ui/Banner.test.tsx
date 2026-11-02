import { fireEvent, render, screen } from '@testing-library/react-native';

import { palette } from '@/theme/tokens';

import { Avatar, initials } from './Avatar';
import { Banner } from './Banner';

const c = palette.light;

describe('Banner', () => {
  it.each([
    ['info', c['primary-subtle']],
    ['warning', c['warning-subtle']],
    ['error', c['error-subtle']],
  ] as const)('%s uses its subtle background and radius 4', async (variant, bg) => {
    await render(<Banner variant={variant} message="Trial ends in 3 days" testID="banner" />);
    expect(screen.getByTestId('banner')).toHaveStyle({ backgroundColor: bg, borderRadius: 4 });
    expect(screen.getByText('Trial ends in 3 days')).toBeTruthy();
  });

  it('error banner is announced assertively; optional action is pressable', async () => {
    const onPress = jest.fn();
    await render(
      <Banner
        variant="error"
        message="Sync failed"
        action={{ label: 'Try again', onPress }}
        testID="banner"
      />,
    );
    expect(screen.getByTestId('banner')).toHaveProp('accessibilityLiveRegion', 'assertive');
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe('Avatar', () => {
  it('builds initials in Latin, Gujarati and Hindi', () => {
    expect(initials('Karan Trivedi')).toBe('KT');
    expect(initials('  amit  ')).toBe('A');
    expect(initials('કિરણ પટેલ')).toBe('કિપ');
    expect(initials('ક્ષમા શાહ')).toBe('ક્ષશા');
    expect(initials('राहुल मेहता')).toBe('रामे');
    expect(initials('')).toBe('');
  });

  it('is a 40 square tile with radius 4, hidden from TalkBack', async () => {
    await render(<Avatar name="Priya Desai" testID="avatar" />);
    expect(screen.getByTestId('avatar', { includeHiddenElements: true })).toHaveStyle({
      width: 40,
      height: 40,
      borderRadius: 4,
      backgroundColor: c['surface-muted'],
    });
    expect(screen.getByText('PD', { includeHiddenElements: true })).toHaveStyle({
      color: c['text-muted'],
    });
  });
});
