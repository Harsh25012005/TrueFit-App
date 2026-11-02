import { render, screen } from '@testing-library/react-native';

import { palette } from '@/theme/tokens';

import { Icon, ICON_STROKE } from './Icon';

const mockIconProps = jest.fn();
jest.mock('@tabler/icons-react-native/IconHome', () => {
  const { View } = jest.requireActual('react-native');
  return function MockTablerIcon(props: Record<string, unknown>) {
    mockIconProps(props);
    return <View {...props} />;
  };
});

describe('Icon', () => {
  beforeEach(() => mockIconProps.mockClear());

  it('passes the token colour, size and 1.8 stroke to the Tabler icon', async () => {
    await render(<Icon name="home" size="lg" color="primary" />);
    expect(mockIconProps).toHaveBeenCalledWith(
      expect.objectContaining({ size: 24, strokeWidth: ICON_STROKE, color: palette.light.primary }),
    );
  });

  it('accepts a custom pixel size', async () => {
    await render(<Icon name="home" size={22} />);
    expect(mockIconProps).toHaveBeenCalledWith(expect.objectContaining({ size: 22 }));
  });

  it('is hidden from screen readers unless labelled', async () => {
    await render(<Icon name="home" testID="decorative" />);
    expect(screen.queryByTestId('decorative')).toBeNull();
    expect(screen.getByTestId('decorative', { includeHiddenElements: true })).toBeTruthy();

    await render(<Icon name="home" accessibilityLabel="Home" />);
    expect(screen.getByLabelText('Home')).toBeTruthy();
  });
});
