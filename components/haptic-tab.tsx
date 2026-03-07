import { Pressable } from "react-native";

interface HapticTabProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}

export function HapticTab({ children, onPress, style }: HapticTabProps) {
  return (
    <Pressable
      onPress={onPress}
      style={style}
    >
      {children}
    </Pressable>
  );
}
