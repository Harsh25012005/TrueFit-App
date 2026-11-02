// @tabler/icons-react-native 3.50 maps per-icon types to dist/icons/*.d.ts, but ships them in
// dist/icons/icons/. Declare the per-icon subpaths so `import IconHome from '…/IconHome'` is typed.
declare module '@tabler/icons-react-native/*' {
  import type { Icon } from '@tabler/icons-react-native';
  const icon: Icon;
  export default icon;
}
