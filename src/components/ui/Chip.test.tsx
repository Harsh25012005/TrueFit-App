import { fireEvent, render, screen } from '@testing-library/react-native';

import { palette } from '@/theme/tokens';

import { Chip } from './Chip';

const c = palette.light;

describe('Chip', () => {
  it('default: 36 high, border, muted label with count', async () => {
    await render(<Chip label="Overdue" count={3} testID="chip" />);
    expect(screen.getByTestId('chip-body')).toHaveStyle({
      height: 36,
      borderColor: c.border,
      borderRadius: 4,
      backgroundColor: c.surface,
    });
    expect(screen.getByText('Overdue')).toHaveStyle({ color: c['text-muted'] });
    expect(screen.getByRole('button', { name: 'Overdue, 3' })).toBeTruthy();
  });

  it('selected: secondary fill, on-secondary text, announced as selected', async () => {
    await render(<Chip label="Active" selected testID="chip" />);
    expect(screen.getByTestId('chip-body')).toHaveStyle({ backgroundColor: c.secondary });
    expect(screen.getByText('Active')).toHaveStyle({ color: c['on-secondary'] });
    expect(screen.getByRole('button')).toBeSelected();
  });

  it('press calls onPress; disabled does not', async () => {
    const onPress = jest.fn();
    await render(<Chip label="All" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);

    await render(<Chip label="Ready" onPress={onPress} disabled />);
    expect(screen.getByText('Ready')).toHaveStyle({ color: c['text-faint'] });
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
