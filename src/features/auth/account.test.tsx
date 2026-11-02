import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';
import AccountScreen from '../../../app/(app)/settings/account';

const mockDeleteAccount = jest.fn();
jest.mock('@/features/auth/account', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
  signOutAndWipe: jest.fn(),
}));
jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn() } }));

describe('S29 Account — delete account (A9)', () => {
  it('stays disabled until DELETE is typed exactly', async () => {
    await render(<AccountScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));

    const confirm = screen.getByTestId('confirm-delete');
    expect(confirm).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('delete-confirm-input'), 'delete');
    expect(screen.getByTestId('confirm-delete')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('delete-confirm-input'), 'DELETE');
    expect(screen.getByTestId('confirm-delete')).not.toBeDisabled();

    mockDeleteAccount.mockResolvedValue({ status: 'scheduled', purge_at: '2026-11-09T00:00:00Z' });
    await fireEvent.press(screen.getByTestId('confirm-delete'));
    expect(mockDeleteAccount).toHaveBeenCalledWith('DELETE');
  });
});
