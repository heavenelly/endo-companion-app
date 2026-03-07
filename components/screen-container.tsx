import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: any;
}

export function ScreenContainer({ children, style }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View 
      style={[
        { 
          flex: 1, 
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
        style
      ]}
    >
      {children}
    </View>
  );
}
