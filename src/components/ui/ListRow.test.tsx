import { fireEvent, render, screen } from '@testing-library/react-native';

import { palette } from '@/theme/tokens';

import { ListRow, SectionHeader } from './ListRow';

const c = palette.light;

describe('ListRow', () => {
  it('reads as one sentence and keeps the 56 dp minimum', async () => {
    await render(
      <ListRow title="Karan Trivedi" subtitle="Book no. 101" value="₹950 due" testID="row" />,
    );
    expect(screen.getByLabelText('Karan Trivedi, Book no. 101, ₹950 due')).toBeTruthy();
    expect(screen.getByTestId('row-body')).toHaveStyle({
      minHeight: 56,
      paddingVertical: 12,
      paddingHorizontal: 16,
    });
    expect(screen.getByText('₹950 due')).toHaveStyle({ fontVariant: ['tabular-nums'] });
  });

  it('pressable: button role, pressed background, onPress', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Amit Shah" onPress={onPress} testID="row" />);
    await fireEvent(screen.getByRole('button'), 'pressIn');
    expect(screen.getByTestId('row-body')).toHaveStyle({ backgroundColor: c['surface-muted'] });
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('disabled: not pressable, dimmed', async () => {
    const onPress = jest.fn();
    await render(<ListRow title="Old" onPress={onPress} disabled testID="row" />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('row-body')).toHaveStyle({ opacity: 0.5 });
  });
});

describe('SectionHeader', () => {
  it('is a muted overline header', async () => {
    await render(<SectionHeader title="Late" />);
    const header = screen.getByRole('header');
    expect(header).toHaveStyle({
      color: c['text-muted'],
      fontSize: 12,
      textTransform: 'uppercase',
    });
  });
});
