import { useColorScheme } from 'react-native';

export const useThemeColors = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    background: isDark ? '#121212' : '#fff',
    surface: isDark ? '#1e1e1e' : '#f5f5f5',
    text: isDark ? '#fff' : '#333',
    textSecondary: isDark ? '#aaa' : '#666',
    border: isDark ? '#333' : '#ddd',
  };
}; 