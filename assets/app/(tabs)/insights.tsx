import { useCallback, useState } from "react";
import { ScrollView, Text, View, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import {
  loadCycleSettings,
  estimateCyclePhase,
  getRecentLogs,
  type DailyLog,
  type CycleSettings,
} from "@/utils/endoData";
import {
  analyzeSymptomCorrelations,
  type CorrelationSummary,
  type SymptomPhaseCorrelation,
} from "@/utils/symptomCorrelation";

interface InsightPattern {
  title: string;
  description: string;
  type: "positive" | "neutral" | "attention";
}

interface InsightSuggestion {
  title: string;
  description: string;
}

interface InsightsData {
  summary: string;
  patterns: InsightPattern[];
  suggestions: InsightSuggestion[];
  affirmation: string;
}

const PHASE_COLORS_MAP: Record<string, string> = {
  menstrual: "error",
  follicular: "success",
  ovulatory: "warning",
  luteal: "primary",
};

export default function InsightsScreen() {
  const colors = useColors();
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [error, setError] = useState("");
  const [correlations, setCorrelations] = useState<CorrelationSummary | null>(null);
  const [activeTab, setActiveTab] = useState<"patterns" | "ai">("patterns");

  const generateInsightsMutation = trpc.generateInsights.useMutation();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const recentLogs = await getRecentLogs(90);
        setLogs(recentLogs);

        const settings = await loadCycleSettings();
        const corr = analyzeSymptomCorrelations(recentLogs, settings);
        setCorrelations(corr);
      })();
    }, [])
  );

  const handleGenerateInsights = async () => {
    if (logs.length < 3) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setLoading(true);
    setError("");

    try {
      const cycleSettings = await loadCycleSettings();
      const cycleInfo = estimateCyclePhase(cycleSettings);

      const result = await generateInsightsMutation.mutateAsync({
        logs: logs.slice(0, 30).map((l) => ({
          date: l.date,
          painLevel: l.painLevel,
          mood: l.mood,
          symptoms: [...l.symptoms],
          energyLevel: l.energyLevel,
          flowLevel: l.flowLevel,
        })),
        cyclePhase: cycleInfo.phase !== "unknown" ? cycleInfo.phase : undefined,
        cycleDayOfCycle: cycleInfo.phase !== "unknown" ? cycleInfo.dayOfCycle : undefined,
      });

      if (result.success && result.insights) {
        setInsights(result.insights as InsightsData);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError("Unable to generate insights right now. Please try again later.");
      }
    } catch (e) {
      setError("Something went wrong. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const getPatternColor = (type: string) => {
    switch (type) {
      case "positive": return colors.success;
      case "attention": return colors.warning;
      default: return colors.primary;
    }
  };

  const getPatternIcon = (type: string): "leaf.fill" | "heart.fill" | "sparkles" => {
    switch (type) {
      case "positive": return "leaf.fill";
      case "attention": return "heart.fill";
      default: return "sparkles";
    }
  };

  const getPhaseColor = (phase: string): string => {
    const key = PHASE_COLORS_MAP[phase] || "muted";
    return (colors as any)[key] || colors.muted;
  };

  const renderCorrelationBar = (correlation: SymptomPhaseCorrelation) => {
    const maxFreq = Math.max(...correlation.phases.map((p) => p.frequency), 0.01);
    return (
      <View key={correlation.symptom} style={[styles.corrCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.corrSymptom, { color: colors.foreground }]}>{correlation.symptom}</Text>
        <View style={styles.corrBars}>
          {correlation.phases.map((p) => (
            <View key={p.phase} style={styles.corrBarRow}>
              <Text style={[styles.corrPhaseLabel, { color: colors.muted }]}>
                {p.phase.charAt(0).toUpperCase() + p.phase.slice(1, 4)}
              </Text>
              <View style={[styles.corrBarBg, { backgroundColor: colors.border + "40" }]}>
                <View
                  style={[
                    styles.corrBarFill,
                    {
                      width: `${Math.max((p.frequency / maxFreq) * 100, 2)}%`,
                      backgroundColor: getPhaseColor(p.phase) + "90",
                      borderRadius: 4,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.corrPercent, { color: colors.muted }]}>
                {Math.round(p.frequency * 100)}%
              </Text>
            </View>
          ))}
        </View>
        <Text style={[styles.corrInsight, { color: colors.muted }]}>{correlation.insight}</Text>
      </View>
    );
  };

  return (
    <ScreenContainer className="px-5 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Your Insights</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          Gentle patterns and suggestions from your journey
        </Text>

        {/* Tab Switcher */}
        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("patterns");
            }}
            style={[
              styles.tabBtn,
              activeTab === "patterns" && { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Text style={[styles.tabText, { color: activeTab === "patterns" ? colors.primary : colors.muted }]}>
              Patterns
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab("ai");
            }}
            style={[
              styles.tabBtn,
              activeTab === "ai" && { backgroundColor: colors.primary + "20" },
            ]}
          >
            <Text style={[styles.tabText, { color: activeTab === "ai" ? colors.primary : colors.muted }]}>
              AI Insights
            </Text>
          </Pressable>
        </View>

        {/* ===== PATTERNS TAB ===== */}
        {activeTab === "patterns" && (
          <View>
            {/* Summary message */}
            {correlations && (
              <View style={[styles.summaryCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
                <IconSymbol name="sparkles" size={18} color={colors.primary} />
                <Text style={[styles.summaryText, { color: colors.foreground }]}>
                  {correlations.message}
                </Text>
              </View>
            )}

            {/* Not enough data */}
            {correlations && correlations.totalLogsAnalyzed < 5 && (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "20" }]}>
                  <IconSymbol name="sparkles" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>A few more days</Text>
                <Text style={[styles.emptyBody, { color: colors.muted }]}>
                  Log at least 5 days so we can start noticing patterns for you. There's no rush — take your time.
                </Text>
                <View style={styles.progressRow}>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.progressDot,
                        { backgroundColor: i < (correlations?.totalLogsAnalyzed || 0) ? colors.primary : colors.border },
                      ]}
                    />
                  ))}
                  <Text style={[styles.progressText, { color: colors.muted }]}>
                    {correlations?.totalLogsAnalyzed || 0}/5 days logged
                  </Text>
                </View>
              </View>
            )}

            {/* Pain by Phase */}
            {correlations && correlations.painByPhase.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>Comfort by Cycle Phase</Text>
                <View style={[styles.phaseGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {correlations.painByPhase.map((p) => (
                    <View key={p.phase} style={styles.phaseItem}>
                      <View style={[styles.phaseDot, { backgroundColor: getPhaseColor(p.phase) }]} />
                      <Text style={[styles.phaseLabel, { color: colors.foreground }]}>
                        {p.phase.charAt(0).toUpperCase() + p.phase.slice(1)}
                      </Text>
                      <Text style={[styles.phaseValue, { color: colors.muted }]}>{p.label}</Text>
                      <Text style={[styles.phaseDays, { color: colors.muted }]}>{p.dayRange}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Symptom Correlations */}
            {correlations && correlations.symptomCorrelations.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>Symptom Patterns by Phase</Text>
                {correlations.symptomCorrelations.slice(0, 5).map(renderCorrelationBar)}
              </View>
            )}

            {/* Top Symptoms */}
            {correlations && correlations.topSymptoms.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>Most Noted Symptoms</Text>
                <View style={[styles.topSymptomsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {correlations.topSymptoms.map((s) => (
                    <View key={s.symptom} style={styles.topSymptomRow}>
                      <Text style={[styles.topSymptomName, { color: colors.foreground }]}>{s.symptom}</Text>
                      <View style={[styles.topSymptomBarBg, { backgroundColor: colors.border + "40" }]}>
                        <View
                          style={[
                            styles.topSymptomBarFill,
                            { width: `${s.percentage}%`, backgroundColor: colors.primary + "60" },
                          ]}
                        />
                      </View>
                      <Text style={[styles.topSymptomPct, { color: colors.muted }]}>{s.percentage}%</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Mood Patterns */}
            {correlations && correlations.moodPatterns.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>Mood Overview</Text>
                <View style={[styles.moodCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.moodChips}>
                    {correlations.moodPatterns.map((m) => (
                      <View key={m.mood} style={[styles.moodChip, { backgroundColor: colors.primary + "15" }]}>
                        <Text style={[styles.moodEmoji, { color: colors.foreground }]}>{m.mood}</Text>
                        <Text style={[styles.moodPct, { color: colors.muted }]}>{m.percentage}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* ===== AI INSIGHTS TAB ===== */}
        {activeTab === "ai" && (
          <View>
            {/* Not enough data */}
            {logs.length < 3 && (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "20" }]}>
                  <IconSymbol name="sparkles" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>A few more days</Text>
                <Text style={[styles.emptyBody, { color: colors.muted }]}>
                  Log at least 3 days so we can generate personalized AI insights. There's no rush.
                </Text>
              </View>
            )}

            {/* Generate button */}
            {logs.length >= 3 && !loading && (
              <Pressable
                onPress={handleGenerateInsights}
                style={({ pressed }) => [
                  styles.generateBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <IconSymbol name="sparkles" size={20} color={colors.background} />
                <Text style={[styles.generateBtnText, { color: colors.background }]}>
                  {insights ? "Refresh AI Insights" : "Generate AI Insights"}
                </Text>
              </Pressable>
            )}

            {/* Loading */}
            {loading && (
              <View style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.muted }]}>
                  Taking a gentle look at your patterns...
                </Text>
              </View>
            )}

            {/* Error */}
            {error ? (
              <View style={[styles.errorCard, { backgroundColor: colors.warning + "15", borderColor: colors.warning + "30" }]}>
                <Text style={[styles.errorText, { color: colors.warning }]}>{error}</Text>
              </View>
            ) : null}

            {/* AI Insights Content */}
            {insights && !loading && (
              <View style={styles.insightsContainer}>
                {/* Summary */}
                <View style={[styles.summaryCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
                  <IconSymbol name="sparkles" size={20} color={colors.primary} />
                  <Text style={[styles.summaryText, { color: colors.foreground }]}>{insights.summary}</Text>
                </View>

                {/* Patterns */}
                {insights.patterns.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>Patterns We Noticed</Text>
                    {insights.patterns.map((pattern, i) => {
                      const patternColor = getPatternColor(pattern.type);
                      return (
                        <View key={i} style={[styles.patternCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <View style={styles.patternHeader}>
                            <View style={[styles.patternIcon, { backgroundColor: patternColor + "20" }]}>
                              <IconSymbol name={getPatternIcon(pattern.type)} size={16} color={patternColor} />
                            </View>
                            <Text style={[styles.patternTitle, { color: colors.foreground }]}>{pattern.title}</Text>
                          </View>
                          <Text style={[styles.patternDesc, { color: colors.muted }]}>{pattern.description}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Suggestions */}
                {insights.suggestions.length > 0 && (
                  <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionLabel, { color: colors.muted }]}>Gentle Suggestions</Text>
                    {insights.suggestions.map((suggestion, i) => (
                      <View key={i} style={[styles.suggestionCard, { backgroundColor: colors.success + "10", borderColor: colors.success + "25" }]}>
                        <View style={styles.suggestionHeader}>
                          <View style={[styles.suggestionIcon, { backgroundColor: colors.success + "20" }]}>
                            <IconSymbol name="leaf.fill" size={14} color={colors.success} />
                          </View>
                          <Text style={[styles.suggestionTitle, { color: colors.foreground }]}>{suggestion.title}</Text>
                        </View>
                        <Text style={[styles.suggestionDesc, { color: colors.muted }]}>{suggestion.description}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Affirmation */}
                {insights.affirmation && (
                  <View style={[styles.affirmationCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "20" }]}>
                    <Text style={[styles.affirmationText, { color: colors.primary }]}>
                      "{insights.affirmation}"
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="heart.fill" size={14} color={colors.muted} />
          <Text style={[styles.disclaimerText, { color: colors.muted }]}>
            These insights are based on your logged patterns and are meant to support your self-awareness — not replace professional medical guidance. Always share concerns with your healthcare provider.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenTitle: { fontSize: 26, fontWeight: "700", marginTop: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginBottom: 16, marginTop: 4 },
  tabRow: { flexDirection: "row", borderRadius: 14, padding: 4, marginBottom: 16, borderWidth: 1 },
  tabBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  tabText: { fontSize: 14, fontWeight: "700" },
  emptyCard: { borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, marginBottom: 16 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: "center", marginBottom: 16 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressDot: { width: 10, height: 10, borderRadius: 5 },
  progressText: { fontSize: 13, fontWeight: "500" },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 16, marginBottom: 16 },
  generateBtnText: { fontSize: 16, fontWeight: "700" },
  loadingCard: { borderRadius: 16, padding: 24, alignItems: "center", gap: 12, borderWidth: 1, marginBottom: 16 },
  loadingText: { fontSize: 14, fontWeight: "500" },
  errorCard: { borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1 },
  errorText: { fontSize: 13, fontWeight: "500", lineHeight: 18 },
  insightsContainer: { gap: 0 },
  summaryCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1 },
  summaryText: { fontSize: 15, lineHeight: 22, flex: 1, fontWeight: "500" },
  sectionBlock: { marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  patternCard: { borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1 },
  patternHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  patternIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  patternTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  patternDesc: { fontSize: 14, lineHeight: 20 },
  suggestionCard: { borderRadius: 14, padding: 16, marginBottom: 8, borderWidth: 1 },
  suggestionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  suggestionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  suggestionTitle: { fontSize: 15, fontWeight: "700", flex: 1 },
  suggestionDesc: { fontSize: 14, lineHeight: 20 },
  affirmationCard: { borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 16, borderWidth: 1 },
  affirmationText: { fontSize: 16, fontWeight: "600", fontStyle: "italic", textAlign: "center", lineHeight: 24 },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1 },
  disclaimerText: { fontSize: 12, lineHeight: 17, flex: 1 },
  // Correlation styles
  corrCard: { borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1 },
  corrSymptom: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  corrBars: { gap: 6 },
  corrBarRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  corrPhaseLabel: { fontSize: 11, fontWeight: "600", width: 32 },
  corrBarBg: { flex: 1, height: 10, borderRadius: 5, overflow: "hidden" },
  corrBarFill: { height: 10 },
  corrPercent: { fontSize: 11, fontWeight: "500", width: 32, textAlign: "right" },
  corrInsight: { fontSize: 13, lineHeight: 18, marginTop: 10, fontStyle: "italic" },
  // Phase grid
  phaseGrid: { flexDirection: "row", flexWrap: "wrap", borderRadius: 14, padding: 14, borderWidth: 1, gap: 4 },
  phaseItem: { width: "48%", padding: 10, alignItems: "center", gap: 4 },
  phaseDot: { width: 10, height: 10, borderRadius: 5 },
  phaseLabel: { fontSize: 13, fontWeight: "700" },
  phaseValue: { fontSize: 12, fontWeight: "500" },
  phaseDays: { fontSize: 11 },
  // Top symptoms
  topSymptomsCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  topSymptomRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  topSymptomName: { fontSize: 13, fontWeight: "600", width: 80 },
  topSymptomBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  topSymptomBarFill: { height: 8, borderRadius: 4 },
  topSymptomPct: { fontSize: 11, fontWeight: "500", width: 32, textAlign: "right" },
  // Mood
  moodCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
  moodChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  moodChip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  moodEmoji: { fontSize: 14, fontWeight: "600" },
  moodPct: { fontSize: 11, marginTop: 2 },
});
