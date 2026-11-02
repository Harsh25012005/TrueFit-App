// Global Jest setup (TESTING.md §5). Manual mocks for native modules are added here per feature.
import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);
