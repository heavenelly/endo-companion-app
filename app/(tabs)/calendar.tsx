import { useCallback, useState } from "react";
import { ScrollView, Text, View, StyleSheet, Platform } from "react-native";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  loadDailyLogs,
  loadCycleSettings,
  PAIN_LABELS,
  ENERGY_LABELS,
  FLOW_OPTIONS,
  type DailyLog,
} from "@/utils/endoData";
import { getPredictedDaysForMonth } from "@/utils/periodPrediction";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatMonth(year: number, month: number): string {
  return new Date(year, month).toLocaleDateString("en", { month: "long", year: "numeric" });
}

function getDotColor(log: DailyLog, colors: ReturnType<typeof useColors>): string {
  if (log.flowLevel >= 2) return colors.error;
  if (log.painLevel >= 4) return colors.warning;
  if (log.symptoms.length > 0) return colors.primary;
  return colors.success;
}

export default function CalendarScreen() {
  const colors = useColors();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [logMap, setLogMap] = useState<Record<string, DailyLog>>({});
  const [predictedDays, setPredictedDays] = useState<Set<string>>(new Set());

  const updatePredictions = useCallback(async (year: number, month: number, logs: DailyLog[]) => {
    const settings = await loadCycleSettings();
    const predicted = getPredictedDaysForMonth(year, month, settings, logs);
    setPredictedDays(new Set(predicted.map((p) => p.date)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const allLogs = await loadDailyLogs();
        const map: Record<string, DailyLog> = {};
        allLogs.forEach((l) => { map[l.date] = l; });
        setLogMap(map);
        await updatePredictions(currentYear, currentMonth, allLogs);
      })();
    }, [currentYear, currentMonth, updatePredictions])
  );

  const goToPrevMonth = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else { setCurrentMonth(currentMonth - 1); }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else { setCurrentMonth(currentMonth + 1); }
    setSelectedDate(null);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const todayStr = today.toISOString().split("T")[0];
  const selectedLog = selectedDate ? logMap[selectedDate] : null;

  const calendarDays: ({ day: number; dateStr: string } | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    calendarDays.push({ day: d, dateStr });
  }

  return (
    <ScreenContainer className="px-5 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Calendar</Text>

        <View style={[styles.monthNav, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={goToPrevMonth} style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <IconSymbol name="chevron.left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.foreground }]}>{formatMonth(currentYear, currentMonth)}</Text>
          <Pressable onPress={goToNextMonth} style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <IconSymbol name="chevron.right" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((d) => (
            <View key={d} style={styles.weekdayCell}>
              <Text style={[styles.weekdayText, { color: colors.muted }]}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays.map((item, index) => {
            if (!item) return <View key={`e-${index}`} style={styles.dayCell} />;
            const log = logMap[item.dateStr];
            const isToday = item.dateStr === todayStr;
            const isSelected = item.dateStr === selectedDate;
            return (
              <Pressable
                key={item.dateStr}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedDate(isSelected ? null : item.dateStr);
                }}
                style={({ pressed }) => [styles.dayCell, { opacity: pressed ? 0.7 : 1 }]}
              >
                <View style={[
                  styles.dayCircle,
                  isToday && { backgroundColor: colors.primary + "20" },
                  isSelected && { backgroundColor: colors.primary },
                ]}>
                  <Text style={[
                    styles.dayText,
                    { color: isSelected ? colors.background : colors.foreground },
                    isToday && !isSelected && { color: colors.primary, fontWeight: "700" },
                  ]}>{item.day}</Text>
                </View>
                {log ? (
                  <View style={[styles.dayDot, { backgroundColor: getDotColor(log, colors) }]} />
                ) : predictedDays.has(item.dateStr) ? (
                  <View style={[styles.dayDot, { backgroundColor: colors.error, opacity: 0.35 }]} />
                ) : (
                  <View style={styles.dayDotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.legendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { color: colors.error, label: "Flow day" },
            { color: colors.error + "60", label: "Predicted" },
            { color: colors.warning, label: "Higher discomfort" },
            { color: colors.primary, label: "Symptoms noted" },
            { color: colors.success, label: "Comfortable day" },
          ].map((item) => (
            <View key={item.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendText, { color: colors.muted }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {selectedDate && (
          <View style={[styles.detailCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.detailDate, { color: colors.foreground }]}>
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            {selectedLog ? (
              <View style={styles.detailContent}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Comfort</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{PAIN_LABELS[selectedLog.painLevel]}</Text>
                </View>
                {selectedLog.mood ? (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Mood</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>{selectedLog.mood}</Text>
                  </View>
                ) : null}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.muted }]}>Energy</Text>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{ENERGY_LABELS[selectedLog.energyLevel]}</Text>
                </View>
                {selectedLog.flowLevel > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Flow</Text>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>{FLOW_OPTIONS[selectedLog.flowLevel]}</Text>
                  </View>
                )}
                {selectedLog.symptoms.length > 0 && (
                  <View style={styles.symptomSection}>
                    <Text style={[styles.detailLabel, { color: colors.muted, marginBottom: 6 }]}>Symptoms</Text>
                    <View style={styles.symptomChips}>
                      {selectedLog.symptoms.map((s) => (
                        <View key={s} style={[styles.symptomChip, { backgroundColor: colors.primary + "18" }]}>
                          <Text style={[styles.symptomChipText, { color: colors.primary }]}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {selectedLog.notes ? (
                  <View style={styles.notesSection}>
                    <Text style={[styles.detailLabel, { color: colors.muted }]}>Notes</Text>
                    <Text style={[styles.notesText, { color: colors.foreground }]}>{selectedLog.notes}</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={[styles.noLogText, { color: colors.muted }]}>No entry for this day. That's perfectly okay.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenTitle: { fontSize: 26, fontWeight: "700", marginBottom: 16, marginTop: 8, letterSpacing: -0.5 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1 },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 17, fontWeight: "700" },
  weekdayRow: { flexDirection: "row", marginBottom: 4 },
  weekdayCell: { flex: 1, alignItems: "center", paddingVertical: 6 },
  weekdayText: { fontSize: 12, fontWeight: "600" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", alignItems: "center", paddingVertical: 4 },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 14, fontWeight: "500" },
  dayDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  dayDotPlaceholder: { width: 5, height: 5, marginTop: 2 },
  legendCard: { flexDirection: "row", flexWrap: "wrap", gap: 14, borderRadius: 14, padding: 14, marginTop: 12, marginBottom: 12, borderWidth: 1 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: "500" },
  detailCard: { borderRadius: 16, padding: 18, marginBottom: 20, borderWidth: 1 },
  detailDate: { fontSize: 17, fontWeight: "700", marginBottom: 14 },
  detailContent: { gap: 10 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailLabel: { fontSize: 13, fontWeight: "500" },
  detailValue: { fontSize: 14, fontWeight: "600" },
  symptomSection: { marginTop: 4 },
  symptomChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  symptomChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  symptomChipText: { fontSize: 12, fontWeight: "600" },
  notesSection: { marginTop: 4, gap: 4 },
  notesText: { fontSize: 14, lineHeight: 20 },
  noLogText: { fontSize: 14, lineHeight: 20, fontStyle: "italic" },
});
