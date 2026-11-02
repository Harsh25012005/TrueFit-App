import { fireEvent, render, screen } from '@testing-library/react-native';

import '@/i18n';

import { FieldRow } from './FieldRow';

const base = {
  number: 2,
  name: 'Chest',
  measurementCount: 8,
  canMoveUp: true,
  canMoveDown: true,
  onMoveUp: jest.fn(),
  onMoveDown: jest.fn(),
  onEdit: jest.fn(),
};

describe('FieldRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads as one sentence and shows number, name and count', async () => {
    await render(<FieldRow {...base} />);
    expect(screen.getByLabelText('2, Chest, 8 measurements')).toBeTruthy();
    expect(screen.getByText('Chest')).toBeTruthy();
  });

  it('buttons are named per field and fire their callbacks', async () => {
    await render(<FieldRow {...base} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Move up: Chest' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Move down: Chest' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Edit: Chest' }));
    expect(base.onMoveUp).toHaveBeenCalled();
    expect(base.onMoveDown).toHaveBeenCalled();
    expect(base.onEdit).toHaveBeenCalled();
  });

  it('disables ↑ on the first row', async () => {
    await render(<FieldRow {...base} canMoveUp={false} />);
    expect(screen.getByRole('button', { name: 'Move up: Chest' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move down: Chest' })).not.toBeDisabled();
  });

  it('disables ↓ on the last row', async () => {
    await render(<FieldRow {...base} canMoveDown={false} />);
    expect(screen.getByRole('button', { name: 'Move down: Chest' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move up: Chest' })).not.toBeDisabled();
  });
});
