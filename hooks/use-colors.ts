import { useColorScheme } from "react-native";

export function useColors() {
  const colorScheme = useColorScheme();
  
  return {
    text: colorScheme === 'dark' ? '#ffffff' : '#000000',
    background: colorScheme === 'dark' ? '#000000' : '#ffffff',
    primary: '#007AFF',
    secondary: '#5856D6',
  };
}
