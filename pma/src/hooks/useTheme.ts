import { useColorScheme as useNativeColorScheme } from 'react-native';

export const useColorScheme = useNativeColorScheme;

export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    background: isDark ? '#000' : '#fff',
    surface: isDark ? '#121212' : '#f5f5f5',
    text: isDark ? '#fff' : '#333',
    textSecondary: isDark ? '#aaa' : '#666',
    border: isDark ? '#333' : '#ddd',
  };
}; 