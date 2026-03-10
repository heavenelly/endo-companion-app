import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

const ONBOARDING_KEY = "@health_companion:onboarding_complete";

interface Slide {
  title: string;
  subtitle: string;
  icon: "heart.fill" | "pencil.and.list.clipboard" | "sparkles" | "calendar" | "person.fill";
  iconBg: string;
  iconColor: string;
}

const SLIDES: Slide[] = [
  {
    title: "You're not alone\nin this",
    subtitle:
      "Endo Companion is a gentle space to track how you feel, understand your patterns, and take care of yourself — at your own pace.",
    icon: "heart.fill",
    iconBg: "#D4A0A020",
    iconColor: "#D4A0A0",
  },
  {
    title: "Log how\nyou're feeling",
    subtitle:
      "Use simple sliders to record your comfort level, mood, energy, and symptoms. No numbers to type — just gentle taps and slides.",
    icon: "pencil.and.list.clipboard",
    iconBg: "#B8C9E820",
    iconColor: "#B8C9E8",
  },
  {
    title: "See your\npatterns gently",
    subtitle:
      "Our AI looks at your logs and shares supportive insights — focusing on what's going well and offering kind suggestions for harder days.",
    icon: "sparkles",
    iconBg: "#C5B4E320",
    iconColor: "#C5B4E3",
  },
  {
    title: "Track your\ncycle with care",
    subtitle:
      "Soft color-coded calendar shows your cycle phases. No harsh reds or alarming visuals — just warm, calming indicators.",
    icon: "calendar",
    iconBg: "#D4C5A920",
    iconColor: "#D4C5A9",
  },
  {
    title: "Your space,\nyour pace",
    subtitle:
      "Everything stays private on your device. There's no pressure to log every day. This is your companion — here whenever you need it.",
    icon: "person.fill",
    iconBg: "#A8C5B420",
    iconColor: "#A8C5B4",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await handleComplete();
  };

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch {
      router.replace("/(tabs)");
    }
  };

  const slide = SLIDES[currentIndex];

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={st.container}>
        {/* Skip */}
        <View style={st.skipRow}>
          {currentIndex < SLIDES.length - 1 ? (
            <Pressable onPress={handleSkip} style={({ pressed }) => [pressed && { opacity: 0.6 }]}>
              <Text style={[st.skipText, { color: colors.muted }]}>Skip</Text>
            </Pressable>
          ) : (
            <View />
          )}
        </View>

        {/* Content */}
        <View style={st.content}>
          <View style={[st.iconCircle, { backgroundColor: slide.iconBg }]}>
            <IconSymbol size={56} name={slide.icon} color={slide.iconColor} />
          </View>
          <Text style={[st.title, { color: colors.foreground }]}>{slide.title}</Text>
          <Text style={[st.subtitle, { color: colors.muted }]}>{slide.subtitle}</Text>
        </View>

        {/* Bottom */}
        <View style={st.bottom}>
          {/* Dots */}
          <View style={st.dotsRow}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[
                  st.dot,
                  {
                    width: currentIndex === i ? 24 : 8,
                    backgroundColor: currentIndex === i ? colors.primary : colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Button */}
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              st.nextBtn,
              { backgroundColor: colors.primary },
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
            ]}
          >
            <Text style={[st.nextBtnText, { color: colors.background }]}>
              {currentIndex < SLIDES.length - 1 ? "Continue" : "I'm Ready"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

/**
 * Check if onboarding has been completed
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "true";
  } catch {
    return false;
  }
}

const st = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 32, paddingBottom: 40 },
  skipRow: { alignItems: "flex-end", paddingTop: 8, minHeight: 40 },
  skipText: { fontSize: 15, fontWeight: "600" },
  content: { flex: 1, justifyContent: "center", alignItems: "center", gap: 24 },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", lineHeight: 36, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, lineHeight: 23, textAlign: "center", paddingHorizontal: 12 },
  bottom: { gap: 24 },
  dotsRow: { flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { height: 8, borderRadius: 4 },
  nextBtn: { padding: 18, borderRadius: 16, alignItems: "center" },
  nextBtnText: { fontSize: 17, fontWeight: "700" },
});
