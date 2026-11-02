import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import '@/i18n';
import { palette } from '@/theme/tokens';

import { Button } from './Button';
import { Dialog } from './Dialog';
import { Sheet } from './Sheet';

const c = palette.light;

describe('Sheet', () => {
  it('shows title, body and sticky footer; close button closes', async () => {
    const onClose = jest.fn();
    await render(
      <Sheet
        visible
        title="Add payment"
        onClose={onClose}
        footer={<Button label="Save payment" />}
        testID="sh"
      >
        <Text>Body</Text>
      </Sheet>,
    );
    expect(screen.getByRole('header', { name: 'Add payment' })).toBeTruthy();
    expect(screen.getByText('Body')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save payment' })).toBeTruthy();
    expect(screen.getByTestId('sh')).toHaveStyle({
      backgroundColor: c.surface,
      borderTopLeftRadius: 4,
      borderTopWidth: 1,
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('dirty form asks to discard before closing', async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible dirty title="New customer" onClose={onClose}>
        <Text>Form</Text>
      </Sheet>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Discard changes?')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Keep editing' }));
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Discard' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('busy sheet cannot be dismissed; error shows a banner', async () => {
    const onClose = jest.fn();
    await render(
      <Sheet visible busy error="Couldn't save" title="Add payment" onClose={onClose}>
        <Text>Form</Text>
      </Sheet>,
    );
    expect(screen.getByText("Couldn't save")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  });
  // Drag-to-close (> 110 dp) is a PanResponder gesture and is checked manually on a device.
});

describe('Dialog', () => {
  it('stacks main action first and cancel last; back = cancel', async () => {
    const onDelete = jest.fn();
    const onCancel = jest.fn();
    await render(
      <Dialog
        visible
        title="Delete customer?"
        message="Their orders stay saved."
        actions={[{ label: 'Delete', variant: 'destructive', onPress: onDelete }]}
        cancelLabel="Cancel"
        onCancel={onCancel}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.props.accessibilityLabel)).toEqual(['Delete', 'Cancel']);
    await fireEvent.press(buttons[0]!);
    expect(onDelete).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('a loading action disables the others', async () => {
    await render(
      <Dialog
        visible
        title="Deliver?"
        actions={[
          { label: 'Collect cash & deliver', onPress: jest.fn(), loading: true },
          { label: 'Deliver without payment', onPress: jest.fn(), variant: 'secondary' },
        ]}
        cancelLabel="Cancel"
        onCancel={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Collect cash & deliver' })).toBeBusy();
    expect(screen.getByRole('button', { name: 'Deliver without payment' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
