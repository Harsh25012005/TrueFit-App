import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { setLanguage } from '@/i18n';
import { palette } from '@/theme/tokens';

import { IconButton } from './Button';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';

const c = palette.light;

describe('TabBar', () => {
  afterEach(() => act(() => setLanguage('en')));

  it('marks the active tab and switches tabs', async () => {
    const onTabPress = jest.fn();
    await render(<TabBar active="orders" onTabPress={onTabPress} onAddPress={jest.fn()} />);
    const orders = screen.getByRole('tab', { name: 'Orders' });
    expect(orders).toBeSelected();
    expect(orders).toHaveStyle({ backgroundColor: c['primary-subtle'] });
    expect(screen.getByText('Orders')).toHaveStyle({ color: c.primary });
    // Inactive labels use text-muted (DESIGN.md §6.6, changed from text-faint for contrast).
    expect(screen.getByText('Home')).toHaveStyle({ color: c['text-muted'] });

    await fireEvent.press(screen.getByRole('tab', { name: 'Customers' }));
    expect(onTabPress).toHaveBeenCalledWith('customers');
  });

  it('shows the late badge in error / on-error at 12 dp', async () => {
    await render(
      <TabBar active="home" onTabPress={jest.fn()} onAddPress={jest.fn()} badges={{ orders: 3 }} />,
    );
    expect(screen.getByRole('tab', { name: 'Orders, 3' })).toBeTruthy();
    expect(screen.getByTestId('tab-orders-badge', { includeHiddenElements: true })).toHaveStyle({
      backgroundColor: c.error,
      height: 18,
      borderRadius: 2,
    });
    expect(screen.getByText('3', { includeHiddenElements: true })).toHaveStyle({
      color: c['on-error'],
      fontSize: 12,
    });
  });

  it('Add button is 64×64 primary and pressable', async () => {
    const onAddPress = jest.fn();
    await render(<TabBar active="home" onTabPress={jest.fn()} onAddPress={onAddPress} />);
    const add = screen.getByRole('button', { name: 'Create' });
    expect(add).toHaveStyle({ width: 64, height: 64, borderRadius: 4, backgroundColor: c.primary });
    await fireEvent(add, 'pressIn');
    expect(screen.getByRole('button', { name: 'Create' })).toHaveStyle({
      backgroundColor: c['primary-pressed'],
      transform: [{ scale: 0.94 }],
    });
    await fireEvent.press(add);
    expect(onAddPress).toHaveBeenCalled();
  });

  it('labels follow the app language', async () => {
    await render(<TabBar active="home" onTabPress={jest.fn()} onAddPress={jest.fn()} />);
    await act(() => setLanguage('gu'));
    expect(screen.getByRole('tab', { name: 'ઓર્ડર' })).toBeTruthy();
  });
});

describe('TopBar', () => {
  it('root bar is 64 high with a title-1 header', async () => {
    await render(<TopBar root title="Orders" testID="tb" />);
    expect(screen.getByTestId('tb-bar')).toHaveStyle({ height: 64 });
    expect(screen.getByRole('header', { name: 'Orders' })).toHaveStyle({ fontSize: 24 });
  });

  it('non-root bar is 56 with back, max 2 actions, border after scroll', async () => {
    const onBack = jest.fn();
    await render(
      <TopBar
        title="Order #1234"
        onBack={onBack}
        scrolled
        testID="tb"
        actions={[
          <IconButton key="a" icon="phone" accessibilityLabel="Call" />,
          <IconButton key="b" icon="brand-whatsapp" accessibilityLabel="WhatsApp" />,
        ]}
      />,
    );
    expect(screen.getByTestId('tb-bar')).toHaveStyle({ height: 56 });
    expect(screen.getByTestId('tb')).toHaveStyle({ borderBottomColor: c.border });
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeTruthy();
  });
});
