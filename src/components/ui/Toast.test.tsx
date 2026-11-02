import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { showToast, useUiStore } from '@/stores/ui.store';
import { palette } from '@/theme/tokens';

import { TOAST_DURATION, TOAST_DURATION_WITH_ACTION, ToastHost } from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useUiStore.setState({ toast: null });
  });
  afterEach(() => jest.useRealTimers());

  it('shows on secondary, announces, and hides after 2.5 s', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(<ToastHost />);
    await act(() => showToast({ message: 'Shirt measurement saved', kind: 'success' }));

    expect(screen.getByText('Shirt measurement saved')).toHaveStyle({
      color: palette.light['on-secondary'],
    });
    expect(screen.getByTestId('toast')).toHaveStyle({
      backgroundColor: palette.light.secondary,
      borderRadius: 4,
      maxWidth: 480,
    });
    expect(announce).toHaveBeenCalledWith('Shirt measurement saved');

    await act(() => jest.advanceTimersByTime(TOAST_DURATION));
    expect(screen.queryByText('Shirt measurement saved')).toBeNull();
  });

  it('newest replaces the current one', async () => {
    await render(<ToastHost />);
    await act(() => showToast({ message: 'First' }));
    await act(() => showToast({ message: 'Second' }));
    expect(screen.queryByText('First')).toBeNull();
    expect(screen.getByText('Second')).toBeTruthy();
  });

  it('action toast stays 5 s; pressing the action runs it and closes', async () => {
    const undo = jest.fn();
    await render(<ToastHost />);
    await act(() =>
      showToast({ message: 'Customer deleted', action: { label: 'Undo', onPress: undo } }),
    );

    await act(() => jest.advanceTimersByTime(TOAST_DURATION));
    expect(screen.getByText('Customer deleted')).toBeTruthy();

    expect(screen.getByText('Undo')).toHaveStyle({ color: palette.light['primary-subtle'] });
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalled();
    expect(screen.queryByText('Customer deleted')).toBeNull();

    await act(() => showToast({ message: 'Again', action: { label: 'Undo', onPress: undo } }));
    await act(() => jest.advanceTimersByTime(TOAST_DURATION_WITH_ACTION));
    expect(screen.queryByText('Again')).toBeNull();
  });
});
