import { fireEvent, render, screen } from '@testing-library/react-native';

import { palette } from '@/theme/tokens';

import { EmptyState } from './EmptyState';
import { Skeleton, SkeletonRows } from './Skeleton';

describe('EmptyState', () => {
  it('shows title as header, muted text and one action', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState
        icon="users"
        title="No customers yet"
        text="Add your first customer"
        action={{ label: 'Add customer', onPress }}
      />,
    );
    expect(screen.getByRole('header', { name: 'No customers yet' })).toBeTruthy();
    expect(screen.getByText('Add your first customer')).toHaveStyle({
      color: palette.light['text-muted'],
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Add customer' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders without an action', async () => {
    await render(<EmptyState icon="check" title="All caught up" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Skeleton', () => {
  it('is a surface-muted block with radius 4, hidden from TalkBack', async () => {
    await render(<Skeleton width={120} height={20} testID="sk" />);
    expect(screen.queryByTestId('sk')).toBeNull();
    expect(screen.getByTestId('sk', { includeHiddenElements: true })).toHaveStyle({
      width: 120,
      height: 20,
      borderRadius: 4,
      backgroundColor: palette.light['surface-muted'],
    });
  });

  it('SkeletonRows announces one loading label', async () => {
    await render(<SkeletonRows count={3} label="Loading…" />);
    expect(screen.getByLabelText('Loading…')).toBeTruthy();
  });
});
