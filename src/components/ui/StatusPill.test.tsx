import { render, screen } from '@testing-library/react-native';

import '@/i18n';
import { palette } from '@/theme/tokens';

import { StatusPill } from './StatusPill';

const c = palette.light;

describe('StatusPill', () => {
  it.each([
    ['received', 'Received', c.border, 'transparent', c.text],
    ['ready', 'Ready', c.primary, c.primary, c['on-primary']],
    ['delivered', 'Delivered', c.border, 'transparent', c['text-muted']],
    ['cancelled', 'Cancelled', c['error-subtle'], 'transparent', c.error],
  ] as const)('%s: label + DESIGN.md colours', async (status, label, border, fill, text) => {
    await render(<StatusPill status={status} testID="pill" />);
    expect(screen.getByTestId('pill')).toHaveStyle({
      height: 22,
      borderRadius: 2,
      borderColor: border,
      backgroundColor: fill,
    });
    expect(screen.getByText(label)).toHaveStyle({
      color: text,
      fontSize: 13,
      fontFamily: 'PlusJakartaSans_600SemiBold',
    });
  });
});
