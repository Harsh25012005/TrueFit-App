import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import '@/i18n';
import { palette } from '@/theme/tokens';

import { Card } from './Card';

const c = palette.light;

describe('Card', () => {
  it('default: surface, 1 px border, radius 4, padding 16, no shadow', async () => {
    await render(
      <Card testID="card">
        <Text>Body</Text>
      </Card>,
    );
    const card = screen.getByTestId('card');
    expect(card).toHaveStyle({
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 4,
      padding: 16,
    });
    expect(card.props.style).not.toHaveProperty('elevation');
    expect(card.props.style).not.toHaveProperty('shadowOpacity');
  });

  it('inset: muted background, no border', async () => {
    await render(<Card variant="inset" testID="card" />);
    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: c['surface-muted'],
      borderWidth: 0,
    });
  });

  it('list: separates rows with border-subtle dividers, no outer padding', async () => {
    const { toJSON } = await render(
      <Card variant="list" testID="card">
        <Text>Row 1</Text>
        <Text>Row 2</Text>
        <Text>Row 3</Text>
      </Card>,
    );
    expect(screen.getByTestId('card')).toHaveStyle({ padding: 0 });
    const dividers = JSON.stringify(toJSON()).match(new RegExp(c['border-subtle'], 'g')) ?? [];
    expect(dividers).toHaveLength(2);
  });

  it('pressable: pressed background + scale, onPress, disabled at 50 %', async () => {
    const onPress = jest.fn();
    await render(<Card onPress={onPress} accessibilityLabel="Open order" />);
    const button = screen.getByRole('button', { name: 'Open order' });
    await fireEvent(button, 'pressIn');
    expect(screen.getByRole('button').children[0]).toHaveStyle({
      backgroundColor: c['surface-muted'],
      transform: [{ scale: 0.99 }],
    });
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();

    await render(<Card onPress={onPress} disabled accessibilityLabel="Disabled card" />);
    expect(screen.getByRole('button', { name: 'Disabled card' }).children[0]).toHaveStyle({
      opacity: 0.5,
    });
  });

  it('loading shows skeletons; error shows message and Try again', async () => {
    await render(<Card loading />);
    expect(screen.getByTestId('card-loading')).toBeTruthy();

    const onRetry = jest.fn();
    await render(<Card error="Couldn't load" onRetry={onRetry} />);
    expect(screen.getByText("Couldn't load")).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
