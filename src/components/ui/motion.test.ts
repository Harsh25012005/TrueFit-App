import { pressTransform } from './motion';

describe('pressTransform', () => {
  it('scales while pressed (0.97 default, custom for cards / Add button)', () => {
    expect(pressTransform(true, false)).toEqual([{ scale: 0.97 }]);
    expect(pressTransform(true, false, 0.94)).toEqual([{ scale: 0.94 }]);
  });

  it('never returns undefined: released and reduced-motion both give scale 1', () => {
    // An array → undefined transform change crashes the native style diff on Android.
    expect(pressTransform(false, false)).toEqual([{ scale: 1 }]);
    expect(pressTransform(true, true)).toEqual([{ scale: 1 }]);
  });
});
