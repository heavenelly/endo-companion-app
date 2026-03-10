import { useCallback, useState } from "react";
import { ScrollView, Text, View, StyleSheet, Platform, Modal } from "react-native";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  loadDailyLogs,
  getLogForDate,
  estimateCyclePhase,
  loadCycleSettings,
  calculatePainTrend,
  PAIN_LABELS,
  type DailyLog,
  type CycleSettings,
} from "@/utils/endoData";
import { predictNextPeriod, type PeriodPrediction } from "@/utils/periodPrediction";
import { loadStreakData, getStreakMessage, type StreakData } from "@/utils/streakTracker";
import {
  getFlareState,
  activateFlareMode,
  deactivateFlareMode,
  getRandomAffirmation,
  FLARE_COMFORT_TIPS,
  getFlareDefaults,
  type FlareState,
} from "@/utils/flareDay";
import { getSuggestedActivities, type SelfCareActivity } from "@/utils/selfCare";
import { loadSettings } from "@/utils/settings";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();

  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [cycleSettings, setCycleSettings] = useState<CycleSettings | null>(null);
  const [prediction, setPrediction] = useState<PeriodPrediction | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [flare, setFlare] = useState<FlareState | null>(null);
  const [showFlareModal, setShowFlareModal] = useState(false);
  const [affirmation, setAffirmation] = useState("");
  const [suggestions, setSuggestions] = useState<SelfCareActivity[]>([]);
  const [userName, setUserName] = useState("");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const today = new Date().toISOString().split("T")[0];
        const [allLogs, tLog, cs, streakData, flareState, settings] = await Promise.all([
          loadDailyLogs(),
          getLogForDate(today),
          loadCycleSettings(),
          loadStreakData(),
          getFlareState(),
          loadSettings(),
        ]);
        setLogs(allLogs.slice(0, 30));
        setTodayLog(tLog);
        setCycleSettings(cs);
        setStreak(streakData);
        setFlare(flareState);
        setUserName(settings.profile.name);

        if (cs.lastPeriodStart) {
          setPrediction(predictNextPeriod(cs, allLogs));
        }

        // Suggest self-care based on today's log or defaults
        if (tLog) {
          setSuggestions(getSuggestedActivities(tLog.painLevel, tLog.energyLevel, tLog.mood));
        } else {
          setSuggestions(getSuggestedActivities(0, 2, ""));
        }
      })();
    }, [])
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = userName ? `, ${userName}` : "";
    if (hour < 12) return `Good morning${name}`;
    if (hour < 17) return `Good afternoon${name}`;
    return `Good evening${name}`;
  };

  const handleFlareActivate = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await activateFlareMode();
    setFlare({ isActive: true, activatedAt: new Date().toISOString(), date: new Date().toISOString().split("T")[0] });
    setAffirmation(getRandomAffirmation());
    setShowFlareModal(true);
  };

  const handleFlareDeactivate = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await deactivateFlareMode();
    setFlare(null);
    setShowFlareModal(false);
  };

  const handleFlareQuickLog = () => {
    setShowFlareModal(false);
    router.push("/(tabs)/log" as any);
  };

  const phaseInfo = cycleSettings ? estimateCyclePhase(cycleSettings) : null;
  const painTrend = logs.length >= 4 ? calculatePainTrend(logs) : null;

  const phaseColors: Record<string, string> = {
    menstrual: colors.error,
    follicular: colors.success,
    ovulatory: colors.warning,
    luteal: colors.primary,
    unknown: colors.muted,
  };

  return (
    <ScreenContainer className="px-5 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={[styles.greeting, { color: colors.muted }]}>{getGreeting()}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>How are you today?</Text>
        </View>

        {/* Flare Day Mode Button */}
        {!flare ? (
          <Pressable
            onPress={handleFlareActivate}
            style={({ pressed }) => [
              styles.flareButton,
              { backgroundColor: colors.error + "12", borderColor: colors.error + "30", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <View style={[styles.flareIcon, { backgroundColor: colors.error + "20" }]}>
              <IconSymbol name="heart.fill" size={18} color={colors.error} />
            </View>
            <View style={styles.flareTextWrap}>
              <Text style={[styles.flareTitle, { color: colors.foreground }]}>Having a tough day?</Text>
              <Text style={[styles.flareSub, { color: colors.muted }]}>Tap for comfort mode and quick logging</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { setAffirmation(getRandomAffirmation()); setShowFlareModal(true); }}
            style={({ pressed }) => [
              styles.flareActiveCard,
              { backgroundColor: colors.error + "18", borderColor: colors.error + "35", opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <View style={styles.flareActiveRow}>
              <IconSymbol name="heart.fill" size={16} color={colors.error} />
              <Text style={[styles.flareActiveText, { color: colors.error }]}>Comfort mode is on</Text>
            </View>
            <Text style={[styles.flareActiveHint, { color: colors.muted }]}>Tap for affirmations and comfort tips</Text>
          </Pressable>
        )}

        {/* Streak Card */}
        {streak && streak.currentStreak > 0 && (
          <View style={[styles.streakCard, { backgroundColor: colors.success + "12", borderColor: colors.success + "25" }]}>
            <View style={styles.streakRow}>
              <View style={[styles.streakBadge, { backgroundColor: colors.success + "25" }]}>
                <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
              </View>
              <View style={styles.streakTextWrap}>
                <Text style={[styles.streakTitle, { color: colors.foreground }]}>
                  {streak.currentStreak === 1 ? "1 day streak" : `${streak.currentStreak} day streak`}
                </Text>
                <Text style={[styles.streakMsg, { color: colors.muted }]}>{getStreakMessage(streak)}</Text>
              </View>
            </View>
            {/* Weekly dots */}
            <View style={styles.weekDots}>
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                <View key={i} style={styles.weekDotCol}>
                  <View style={[styles.weekDot, { backgroundColor: streak.weeklyProgress[i] ? colors.success : colors.border }]} />
                  <Text style={[styles.weekDotLabel, { color: colors.muted }]}>{day}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Log CTA */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(tabs)/log" as any);
          }}
          style={({ pressed }) => [
            todayLog
              ? [styles.loggedCard, { backgroundColor: colors.success + "12", borderColor: colors.success + "25" }]
              : [styles.quickLogCard, { backgroundColor: colors.primary + "15" }],
            { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          {todayLog ? (
            <View style={styles.loggedRow}>
              <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.loggedTitle, { color: colors.foreground }]}>Today's check-in saved</Text>
                <Text style={[styles.loggedSub, { color: colors.muted }]}>
                  {PAIN_LABELS[todayLog.painLevel]} · {todayLog.mood || "No mood"} · Tap to update
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.muted} />
            </View>
          ) : (
            <View style={styles.quickLogContent}>
              <View style={[styles.quickLogIcon, { backgroundColor: colors.primary + "25" }]}>
                <IconSymbol name="pencil.and.list.clipboard" size={22} color={colors.primary} />
              </View>
              <View style={styles.quickLogText}>
                <Text style={[styles.quickLogTitle, { color: colors.foreground }]}>Daily Check-in</Text>
                <Text style={[styles.quickLogSub, { color: colors.muted }]}>Take a moment to log how you're feeling</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.primary} />
            </View>
          )}
        </Pressable>

        {/* Cycle Phase Card */}
        {phaseInfo && phaseInfo.phase !== "unknown" && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.phaseIndicator, { backgroundColor: phaseColors[phaseInfo.phase] + "20" }]}>
                <View style={[styles.phaseDot, { backgroundColor: phaseColors[phaseInfo.phase] }]} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardLabel, { color: colors.muted }]}>Cycle Day {phaseInfo.dayOfCycle}</Text>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {phaseInfo.phase.charAt(0).toUpperCase() + phaseInfo.phase.slice(1)} Phase
                </Text>
              </View>
            </View>
            <Text style={[styles.cardBody, { color: colors.muted }]}>{phaseInfo.message}</Text>
          </View>
        )}

        {/* Period Prediction */}
        {prediction && (
          <View style={[styles.card, { backgroundColor: colors.error + "08", borderColor: colors.error + "20" }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.phaseIndicator, { backgroundColor: colors.error + "18" }]}>
                <IconSymbol name="calendar" size={18} color={colors.error} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardLabel, { color: colors.muted }]}>
                  {prediction.isCurrentlyOnPeriod ? "Current Period" : "Next Period"}
                </Text>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {prediction.isCurrentlyOnPeriod
                    ? `Day ${prediction.currentPeriodDay}`
                    : prediction.daysUntilNextPeriod <= 1
                      ? "Tomorrow"
                      : `In ~${prediction.daysUntilNextPeriod} days`}
                </Text>
              </View>
              <View style={[styles.confidenceBadge, { backgroundColor: prediction.confidence === "good" ? colors.success + "20" : prediction.confidence === "moderate" ? colors.warning + "20" : colors.muted + "20" }]}>
                <Text style={[styles.confidenceText, { color: prediction.confidence === "good" ? colors.success : prediction.confidence === "moderate" ? colors.warning : colors.muted }]}>
                  {prediction.confidence}
                </Text>
              </View>
            </View>
            <Text style={[styles.cardBody, { color: colors.muted }]}>{prediction.message}</Text>
          </View>
        )}

        {/* Pain Trend */}
        {painTrend && logs.length >= 4 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.phaseIndicator, { backgroundColor: colors.primary + "20" }]}>
                <IconSymbol name="chart.line.uptrend.xyaxis" size={18} color={colors.primary} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>Comfort Trend</Text>
                <Text style={[styles.cardBody, { color: colors.muted }]}>
                  {painTrend.trend === "improving"
                    ? "Your comfort levels have been gently improving"
                    : painTrend.trend === "worsening"
                      ? "Things have been a bit tougher recently — be extra kind to yourself"
                      : "Your comfort levels have been fairly steady"}
                </Text>
              </View>
            </View>
            {/* Mini chart */}
            <View style={styles.miniChart}>
              {logs.slice(-7).map((log, i) => {
                const height = Math.max(8, (log.painLevel / 6) * 50);
                const barColor = log.painLevel <= 2 ? colors.success : log.painLevel <= 4 ? colors.warning : colors.error;
                return (
                  <View key={i} style={styles.miniBar}>
                    <View style={[styles.miniBarFill, { height, backgroundColor: barColor + "60", borderRadius: 4 }]} />
                    <Text style={[styles.miniBarLabel, { color: colors.muted }]}>
                      {new Date(log.date + "T12:00:00").toLocaleDateString("en", { weekday: "narrow" })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Self-Care Suggestions */}
        {suggestions.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.phaseIndicator, { backgroundColor: colors.success + "20" }]}>
                <IconSymbol name="leaf.fill" size={18} color={colors.success} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Gentle Suggestions</Text>
            </View>
            <View style={styles.suggestionsGrid}>
              {suggestions.slice(0, 4).map((activity) => (
                <View key={activity.id} style={[styles.suggestionChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={styles.suggestionIcon}>{activity.icon}</Text>
                  <Text style={[styles.suggestionLabel, { color: colors.foreground }]} numberOfLines={1}>{activity.title}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* AI Insights Link */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(tabs)/insights" as any);
          }}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25", opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.phaseIndicator, { backgroundColor: colors.primary + "20" }]}>
              <IconSymbol name="sparkles" size={18} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Your Insights</Text>
              <Text style={[styles.cardBody, { color: colors.muted }]}>
                {logs.length >= 7
                  ? "Tap to see personalized patterns and gentle suggestions"
                  : "Log for a few more days to unlock personalized insights"}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.primary} />
          </View>
        </Pressable>

        {/* Gentle Reminder */}
        <View style={[styles.reminderCard, { backgroundColor: colors.success + "10" }]}>
          <IconSymbol name="leaf.fill" size={14} color={colors.success} />
          <Text style={[styles.reminderText, { color: colors.success }]}>
            Remember: your experience is valid, and you deserve gentle care.
          </Text>
        </View>
      </ScrollView>

      {/* Flare Day Modal */}
      <Modal visible={showFlareModal} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.flareModal, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Header */}
              <View style={styles.flareModalHeader}>
                <IconSymbol name="heart.fill" size={32} color={colors.error} />
                <Text style={[styles.flareModalTitle, { color: colors.foreground }]}>
                  You're not alone
                </Text>
              </View>

              {/* Affirmation */}
              <View style={[styles.affirmationCard, { backgroundColor: colors.primary + "12" }]}>
                <Text style={[styles.affirmationText, { color: colors.foreground }]}>
                  "{affirmation || getRandomAffirmation()}"
                </Text>
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAffirmation(getRandomAffirmation());
                  }}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, marginTop: 10, alignSelf: "center" }]}
                >
                  <Text style={[styles.newAffirmation, { color: colors.primary }]}>Another affirmation</Text>
                </Pressable>
              </View>

              {/* Comfort Tips */}
              <Text style={[styles.comfortTitle, { color: colors.foreground }]}>Things that might help</Text>
              {FLARE_COMFORT_TIPS.map((tip, i) => (
                <View key={i} style={[styles.comfortRow, { backgroundColor: colors.surface }]}>
                  <Text style={styles.comfortIcon}>{tip.icon}</Text>
                  <Text style={[styles.comfortText, { color: colors.foreground }]}>{tip.text}</Text>
                </View>
              ))}

              {/* Quick Log */}
              <Pressable
                onPress={handleFlareQuickLog}
                style={({ pressed }) => [
                  styles.flareLogBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <IconSymbol name="pencil.and.list.clipboard" size={18} color={colors.background} />
                <Text style={[styles.flareLogBtnText, { color: colors.background }]}>Quick Log (pre-filled)</Text>
              </Pressable>

              {/* Deactivate */}
              <Pressable
                onPress={handleFlareDeactivate}
                style={({ pressed }) => [styles.flareDeactivateBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.flareDeactivateText, { color: colors.muted }]}>I'm feeling better — turn off comfort mode</Text>
              </Pressable>

              {/* Close */}
              <Pressable
                onPress={() => setShowFlareModal(false)}
                style={({ pressed }) => [styles.flareCloseBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.flareCloseText, { color: colors.muted }]}>Close</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  greetingSection: { marginBottom: 16, marginTop: 8 },
  greeting: { fontSize: 15, fontWeight: "500", marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "700", letterSpacing: -0.5 },

  // Flare button
  flareButton: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  flareIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  flareTextWrap: { flex: 1 },
  flareTitle: { fontSize: 15, fontWeight: "700" },
  flareSub: { fontSize: 12, marginTop: 2 },
  flareActiveCard: { borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1 },
  flareActiveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  flareActiveText: { fontSize: 14, fontWeight: "700" },
  flareActiveHint: { fontSize: 12, marginTop: 4 },

  // Streak
  streakCard: { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  streakBadge: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  streakNumber: { fontSize: 20, fontWeight: "800" },
  streakTextWrap: { flex: 1 },
  streakTitle: { fontSize: 15, fontWeight: "700" },
  streakMsg: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  weekDots: { flexDirection: "row", justifyContent: "space-around", marginTop: 14 },
  weekDotCol: { alignItems: "center", gap: 4 },
  weekDot: { width: 10, height: 10, borderRadius: 5 },
  weekDotLabel: { fontSize: 10, fontWeight: "500" },

  // Quick log
  quickLogCard: { borderRadius: 16, padding: 16, marginBottom: 14 },
  quickLogContent: { flexDirection: "row", alignItems: "center", gap: 14 },
  quickLogIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickLogText: { flex: 1 },
  quickLogTitle: { fontSize: 16, fontWeight: "700" },
  quickLogSub: { fontSize: 12, marginTop: 2 },
  loggedCard: { borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1 },
  loggedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  loggedTitle: { fontSize: 14, fontWeight: "700" },
  loggedSub: { fontSize: 12, marginTop: 2 },

  // Cards
  card: { borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  cardHeaderText: { flex: 1 },
  cardLabel: { fontSize: 12, fontWeight: "500", marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardBody: { fontSize: 13, lineHeight: 19 },
  phaseIndicator: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  phaseDot: { width: 12, height: 12, borderRadius: 6 },
  confidenceBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  confidenceText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" as const },

  // Mini chart
  miniChart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 60, paddingTop: 8 },
  miniBar: { alignItems: "center", gap: 4, flex: 1 },
  miniBarFill: { width: 14 },
  miniBarLabel: { fontSize: 10, fontWeight: "500" },

  // Suggestions
  suggestionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  suggestionChip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  suggestionIcon: { fontSize: 16 },
  suggestionLabel: { fontSize: 13, fontWeight: "500" },

  // Reminder
  reminderCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 14, marginTop: 4, marginBottom: 20 },
  reminderText: { fontSize: 13, fontWeight: "500", flex: 1, lineHeight: 18 },

  // Flare Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  flareModal: { borderRadius: 24, padding: 24, width: "100%", maxWidth: 400, maxHeight: "85%" },
  flareModalHeader: { alignItems: "center", marginBottom: 20, gap: 12 },
  flareModalTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
  affirmationCard: { borderRadius: 16, padding: 20, marginBottom: 20 },
  affirmationText: { fontSize: 16, fontWeight: "500", lineHeight: 24, textAlign: "center", fontStyle: "italic" },
  newAffirmation: { fontSize: 13, fontWeight: "600" },
  comfortTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  comfortRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, padding: 14, marginBottom: 8 },
  comfortIcon: { fontSize: 20 },
  comfortText: { fontSize: 14, flex: 1, lineHeight: 20 },
  flareLogBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16, marginTop: 12 },
  flareLogBtnText: { fontSize: 16, fontWeight: "700" },
  flareDeactivateBtn: { alignItems: "center", paddingVertical: 14 },
  flareDeactivateText: { fontSize: 14, fontWeight: "500" },
  flareCloseBtn: { alignItems: "center", paddingVertical: 8 },
  flareCloseText: { fontSize: 14, fontWeight: "500" },
});
