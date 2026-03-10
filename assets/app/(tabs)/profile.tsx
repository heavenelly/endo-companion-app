import { useCallback, useState } from "react";
import { ScrollView, Text, View, TextInput, StyleSheet, Platform, Alert, Switch, Modal, FlatList } from "react-native";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  loadCycleSettings,
  saveCycleSettings,
  clearAllEndoData,
  type CycleSettings,
} from "@/utils/endoData";
import {
  loadSettings,
  saveSettings,
  resetSettings,
  type AppSettings,
} from "@/utils/settings";
import { loadDailyLogs } from "@/utils/endoData";
import { analyzeSymptomCorrelations } from "@/utils/symptomCorrelation";
import { predictNextPeriod } from "@/utils/periodPrediction";
import { exportAppointmentPDF } from "@/utils/appointmentExport";
import {
  loadMedications,
  saveMedication,
  deleteMedication,
  getDaysUntilRefill,
  FREQUENCY_LABELS,
  type Medication,
} from "@/utils/medicationTracker";
import {
  SELF_CARE_ACTIVITIES,
  CATEGORY_LABELS,
  loadFavorites,
  toggleFavorite,
  saveSelfCareLog,
  type SelfCareActivity,
  type SelfCareLog,
} from "@/utils/selfCare";

export default function ProfileScreen() {
  const colors = useColors();
  const [cycleSettings, setCycleSettings] = useState<CycleSettings>({
    averageCycleLength: 28,
    averagePeriodLength: 5,
    lastPeriodStart: "",
  });
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [showCycleEdit, setShowCycleEdit] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [exporting, setExporting] = useState(false);

  // Medications
  const [medications, setMedications] = useState<Medication[]>([]);
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState<Medication["frequency"]>("daily");
  const [medNotes, setMedNotes] = useState("");
  const [medQuantity, setMedQuantity] = useState("");
  const [medTotal, setMedTotal] = useState("");

  // Self-care
  const [showSelfCare, setShowSelfCare] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SelfCareActivity["category"] | "all">("all");

  // Active section
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [cs, as2, meds, favs] = await Promise.all([
          loadCycleSettings(),
          loadSettings(),
          loadMedications(),
          loadFavorites(),
        ]);
        setCycleSettings(cs);
        setAppSettings(as2);
        setProfileName(as2.profile.name);
        setMedications(meds);
        setFavorites(favs);
        setSaved(false);
      })();
    }, [])
  );

  const handleSaveCycleSettings = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveCycleSettings(cycleSettings);
    setSaved(true);
    setShowCycleEdit(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleSaveProfile = async () => {
    if (!appSettings) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = { ...appSettings, profile: { ...appSettings.profile, name: profileName } };
    await saveSettings(updated);
    setAppSettings(updated);
    setSaved(true);
    setShowProfileEdit(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleToggleNotification = async (key: keyof AppSettings["notifications"], value: boolean) => {
    if (!appSettings) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = {
      ...appSettings,
      notifications: { ...appSettings.notifications, [key]: value },
    };
    setAppSettings(updated);
    await saveSettings(updated);
  };

  const handleExportAppointment = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExporting(true);
    try {
      const [logs, settings] = await Promise.all([loadDailyLogs(), loadCycleSettings()]);
      const correlations = analyzeSymptomCorrelations(logs, settings);
      const prediction = predictNextPeriod(settings, logs);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const dateRange = `${thirtyDaysAgo.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
      const success = await exportAppointmentPDF({
        userName: profileName || undefined,
        logs,
        cycleSettings: settings,
        correlations,
        prediction,
        dateRange,
      });
      if (success && Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert("Export", "Unable to create the summary right now. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Medication handlers
  const openAddMed = () => {
    setEditingMed(null);
    setMedName("");
    setMedDosage("");
    setMedFrequency("daily");
    setMedNotes("");
    setMedQuantity("");
    setMedTotal("");
    setShowMedModal(true);
  };

  const openEditMed = (med: Medication) => {
    setEditingMed(med);
    setMedName(med.name);
    setMedDosage(med.dosage);
    setMedFrequency(med.frequency);
    setMedNotes(med.notes);
    setMedQuantity(med.quantityRemaining?.toString() || "");
    setMedTotal(med.quantityTotal?.toString() || "");
    setShowMedModal(true);
  };

  const handleSaveMed = async () => {
    if (!medName.trim()) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const med: Medication = {
      id: editingMed?.id || `med_${Date.now()}`,
      name: medName.trim(),
      dosage: medDosage.trim(),
      frequency: medFrequency,
      reminderTimes: editingMed?.reminderTimes || ["08:00"],
      notes: medNotes.trim(),
      startDate: editingMed?.startDate || new Date().toISOString().split("T")[0],
      quantityRemaining: medQuantity ? parseInt(medQuantity) : undefined,
      quantityTotal: medTotal ? parseInt(medTotal) : undefined,
      createdAt: editingMed?.createdAt || new Date().toISOString(),
    };
    await saveMedication(med);
    const updated = await loadMedications();
    setMedications(updated);
    setShowMedModal(false);
  };

  const handleDeleteMed = (med: Medication) => {
    Alert.alert("Remove Medication", `Remove "${med.name}" from your list?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deleteMedication(med.id);
          setMedications((prev) => prev.filter((m) => m.id !== med.id));
        },
      },
    ]);
  };

  // Self-care handlers
  const handleToggleFav = async (activityId: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleFavorite(activityId);
    setFavorites((prev) =>
      prev.includes(activityId) ? prev.filter((f) => f !== activityId) : [...prev, activityId]
    );
  };

  const handleLogSelfCare = async (activity: SelfCareActivity) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const log: SelfCareLog = {
      id: `sc_${Date.now()}`,
      activityId: activity.id,
      date: new Date().toISOString().split("T")[0],
      notes: "",
      helpfulness: 3,
      createdAt: new Date().toISOString(),
    };
    await saveSelfCareLog(log);
    Alert.alert("Logged", `"${activity.title}" has been added to today's self-care log.`);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will remove all your logs, cycle settings, and preferences. This cannot be undone. Are you sure?",
      [
        { text: "Keep My Data", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await clearAllEndoData();
            await resetSettings();
            const cs = await loadCycleSettings();
            setCycleSettings(cs);
            const as2 = await loadSettings();
            setAppSettings(as2);
            setProfileName("");
            setMedications([]);
          },
        },
      ]
    );
  };

  const toggleSection = (section: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveSection(activeSection === section ? null : section);
  };

  const filteredActivities = selectedCategory === "all"
    ? SELF_CARE_ACTIVITIES
    : SELF_CARE_ACTIVITIES.filter((a) => a.category === selectedCategory);

  return (
    <ScreenContainer className="px-5 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Profile</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Your space, your settings</Text>

        {saved && (
          <View style={[styles.savedBanner, { backgroundColor: colors.success + "18" }]}>
            <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
            <Text style={[styles.savedText, { color: colors.success }]}>Changes saved</Text>
          </View>
        )}

        {/* Name / Greeting */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.primary + "25" }]}>
              <IconSymbol name="person.fill" size={24} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {profileName || "Welcome"}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                {profileName ? "Your wellness companion" : "Tap to set your name"}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowProfileEdit(!showProfileEdit);
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <IconSymbol name="pencil" size={18} color={colors.muted} />
            </Pressable>
          </View>
          {showProfileEdit && (
            <View style={styles.editSection}>
              <TextInput
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Your name (optional)"
                placeholderTextColor={colors.muted}
                returnKeyType="done"
                onSubmitEditing={handleSaveProfile}
                style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
              />
              <Pressable
                onPress={handleSaveProfile}
                style={({ pressed }) => [
                  styles.smallBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.smallBtnText, { color: colors.background }]}>Save</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Medications Section */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => toggleSection("meds")}
            style={({ pressed }) => [styles.cardHeader, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.primary + "18" }]}>
              <IconSymbol name="heart.fill" size={18} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Medications</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                {medications.length === 0
                  ? "Track your medications and refills"
                  : `${medications.length} medication${medications.length > 1 ? "s" : ""}`}
              </Text>
            </View>
            <IconSymbol name={activeSection === "meds" ? "chevron.up" : "chevron.down"} size={18} color={colors.muted} />
          </Pressable>

          {activeSection === "meds" && (
            <View style={styles.expandedSection}>
              {medications.map((med) => {
                const refillDays = getDaysUntilRefill(med);
                return (
                  <View key={med.id} style={[styles.medCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.medHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.medName, { color: colors.foreground }]}>{med.name}</Text>
                        <Text style={[styles.medDosage, { color: colors.muted }]}>
                          {med.dosage} · {FREQUENCY_LABELS[med.frequency]}
                        </Text>
                      </View>
                      <View style={styles.medActions}>
                        <Pressable
                          onPress={() => openEditMed(med)}
                          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 6 }]}
                        >
                          <IconSymbol name="pencil" size={16} color={colors.muted} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteMed(med)}
                          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 6 }]}
                        >
                          <IconSymbol name="trash" size={16} color={colors.error} />
                        </Pressable>
                      </View>
                    </View>
                    {refillDays !== null && (
                      <View style={[styles.refillBadge, {
                        backgroundColor: refillDays <= 7 ? colors.warning + "18" : colors.success + "12",
                      }]}>
                        <Text style={[styles.refillText, {
                          color: refillDays <= 7 ? colors.warning : colors.success,
                        }]}>
                          {refillDays <= 0
                            ? "Refill needed"
                            : refillDays <= 7
                              ? `~${refillDays} days until refill`
                              : `~${refillDays} days remaining`}
                        </Text>
                      </View>
                    )}
                    {med.notes ? (
                      <Text style={[styles.medNotes, { color: colors.muted }]}>{med.notes}</Text>
                    ) : null}
                  </View>
                );
              })}

              <Pressable
                onPress={openAddMed}
                style={({ pressed }) => [
                  styles.addBtn,
                  { borderColor: colors.primary + "40", opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <IconSymbol name="plus" size={16} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>Add Medication</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Self-Care Toolkit */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => toggleSection("selfcare")}
            style={({ pressed }) => [styles.cardHeader, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.success + "18" }]}>
              <IconSymbol name="leaf.fill" size={18} color={colors.success} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Self-Care Toolkit</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>Curated activities for comfort and wellness</Text>
            </View>
            <IconSymbol name={activeSection === "selfcare" ? "chevron.up" : "chevron.down"} size={18} color={colors.muted} />
          </Pressable>

          {activeSection === "selfcare" && (
            <View style={styles.expandedSection}>
              {/* Category filters */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                <Pressable
                  onPress={() => setSelectedCategory("all")}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    {
                      backgroundColor: selectedCategory === "all" ? colors.primary + "22" : "transparent",
                      borderColor: selectedCategory === "all" ? colors.primary : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.categoryLabel, { color: selectedCategory === "all" ? colors.primary : colors.muted }]}>All</Text>
                </Pressable>
                {(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      {
                        backgroundColor: selectedCategory === cat ? CATEGORY_LABELS[cat].color + "22" : "transparent",
                        borderColor: selectedCategory === cat ? CATEGORY_LABELS[cat].color : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.categoryLabel, { color: selectedCategory === cat ? CATEGORY_LABELS[cat].color : colors.muted }]}>
                      {CATEGORY_LABELS[cat].label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Activities list */}
              {filteredActivities.map((activity) => {
                const isFav = favorites.includes(activity.id);
                return (
                  <View key={activity.id} style={[styles.activityCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.activityRow}>
                      <Text style={styles.activityIcon}>{activity.icon}</Text>
                      <View style={styles.activityText}>
                        <Text style={[styles.activityTitle, { color: colors.foreground }]}>{activity.title}</Text>
                        <Text style={[styles.activityDesc, { color: colors.muted }]} numberOfLines={2}>{activity.description}</Text>
                        {activity.durationMinutes ? (
                          <Text style={[styles.activityDuration, { color: colors.muted }]}>~{activity.durationMinutes} min</Text>
                        ) : null}
                      </View>
                      <View style={styles.activityActions}>
                        <Pressable
                          onPress={() => handleToggleFav(activity.id)}
                          style={({ pressed }) => [{ opacity: pressed ? 0.5 : 1, padding: 6 }]}
                        >
                          <IconSymbol name={isFav ? "heart.fill" : "heart"} size={18} color={isFav ? colors.error : colors.muted} />
                        </Pressable>
                        <Pressable
                          onPress={() => handleLogSelfCare(activity)}
                          style={({ pressed }) => [
                            styles.logActivityBtn,
                            { backgroundColor: colors.primary + "15", opacity: pressed ? 0.7 : 1 },
                          ]}
                        >
                          <Text style={[styles.logActivityText, { color: colors.primary }]}>Log</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Cycle Settings */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCycleEdit(!showCycleEdit);
            }}
            style={({ pressed }) => [styles.cardHeader, { opacity: pressed ? 0.8 : 1 }]}
          >
            <View style={[styles.iconBox, { backgroundColor: colors.error + "18" }]}>
              <IconSymbol name="calendar" size={18} color={colors.error} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Cycle Settings</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
                {cycleSettings.lastPeriodStart
                  ? `Last period: ${new Date(cycleSettings.lastPeriodStart + "T12:00:00").toLocaleDateString("en", { month: "short", day: "numeric" })}`
                  : "Set up your cycle tracking"}
              </Text>
            </View>
            <IconSymbol name={showCycleEdit ? "chevron.up" : "chevron.down"} size={18} color={colors.muted} />
          </Pressable>

          {showCycleEdit && (
            <View style={styles.editSection}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Average cycle length</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCycleSettings((p) => ({ ...p, averageCycleLength: Math.max(20, p.averageCycleLength - 1) }));
                    }}
                    style={({ pressed }) => [styles.stepperBtn, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.foreground }]}>−</Text>
                  </Pressable>
                  <Text style={[styles.stepperValue, { color: colors.foreground }]}>{cycleSettings.averageCycleLength} days</Text>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCycleSettings((p) => ({ ...p, averageCycleLength: Math.min(45, p.averageCycleLength + 1) }));
                    }}
                    style={({ pressed }) => [styles.stepperBtn, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.foreground }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Average period length</Text>
                <View style={styles.stepperRow}>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCycleSettings((p) => ({ ...p, averagePeriodLength: Math.max(1, p.averagePeriodLength - 1) }));
                    }}
                    style={({ pressed }) => [styles.stepperBtn, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.foreground }]}>−</Text>
                  </Pressable>
                  <Text style={[styles.stepperValue, { color: colors.foreground }]}>{cycleSettings.averagePeriodLength} days</Text>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCycleSettings((p) => ({ ...p, averagePeriodLength: Math.min(10, p.averagePeriodLength + 1) }));
                    }}
                    style={({ pressed }) => [styles.stepperBtn, { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.stepperBtnText, { color: colors.foreground }]}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.fieldCol}>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Last period start date (YYYY-MM-DD)</Text>
                <TextInput
                  value={cycleSettings.lastPeriodStart}
                  onChangeText={(t) => setCycleSettings((p) => ({ ...p, lastPeriodStart: t }))}
                  placeholder="2026-02-01"
                  placeholderTextColor={colors.muted}
                  returnKeyType="done"
                  style={[styles.textInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
                />
              </View>

              <Pressable
                onPress={handleSaveCycleSettings}
                style={({ pressed }) => [
                  styles.smallBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={[styles.smallBtnText, { color: colors.background }]}>Save Cycle Settings</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Notification Preferences */}
        {appSettings && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.warning + "18" }]}>
                <IconSymbol name="bell.fill" size={18} color={colors.warning} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Gentle Reminders</Text>
            </View>

            <View style={styles.toggleList}>
              {[
                { key: "medicationReminders" as const, label: "Medication reminders", desc: "Soft reminders for your medications" },
                { key: "appointmentReminders" as const, label: "Appointment reminders", desc: "Gentle nudge before appointments" },
                { key: "dailyHealthTips" as const, label: "Daily wellness tips", desc: "A kind thought each day" },
              ].map((item) => (
                <View key={item.key} style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.toggleText}>
                    <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.toggleDesc, { color: colors.muted }]}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={appSettings.notifications[item.key]}
                    onValueChange={(v) => handleToggleNotification(item.key, v)}
                    trackColor={{ false: colors.border, true: colors.primary + "60" }}
                    thumbColor={appSettings.notifications[item.key] ? colors.primary : colors.muted}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Prepare for Appointment */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.success + "18" }]}>
              <IconSymbol name="doc.text.fill" size={18} color={colors.success} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Prepare for Appointment</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>Share your patterns with your provider</Text>
            </View>
          </View>
          <Text style={[styles.exportDesc, { color: colors.muted }]}>
            Generate a gentle, printable summary of your recent logs, symptom patterns, and cycle data to share with your healthcare provider.
          </Text>
          <Pressable
            onPress={handleExportAppointment}
            disabled={exporting}
            style={({ pressed }) => [
              styles.exportBtn,
              { backgroundColor: colors.success, opacity: pressed || exporting ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color={colors.background} />
            <Text style={[styles.exportBtnText, { color: colors.background }]}>
              {exporting ? "Preparing..." : "Create & Share Summary"}
            </Text>
          </Pressable>
        </View>

        {/* Data & Privacy */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + "18" }]}>
              <IconSymbol name="lock.fill" size={18} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Data & Privacy</Text>
              <Text style={[styles.cardSubtitle, { color: colors.muted }]}>Your data stays on your device</Text>
            </View>
          </View>

          <Pressable
            onPress={handleClearData}
            style={({ pressed }) => [
              styles.dangerBtn,
              { backgroundColor: colors.error + "12", borderColor: colors.error + "30", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <IconSymbol name="trash" size={16} color={colors.error} />
            <Text style={[styles.dangerBtnText, { color: colors.error }]}>Clear All Data</Text>
          </Pressable>
        </View>

        {/* About */}
        <View style={[styles.aboutCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.aboutTitle, { color: colors.foreground }]}>Endo Companion</Text>
          <Text style={[styles.aboutVersion, { color: colors.muted }]}>Version 1.0.0</Text>
          <Text style={[styles.aboutBody, { color: colors.muted }]}>
            Built with care for those navigating endometriosis. Your wellness journey matters, and you are not alone.
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={[styles.disclaimer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <IconSymbol name="heart.fill" size={14} color={colors.muted} />
          <Text style={[styles.disclaimerText, { color: colors.muted }]}>
            This app is a wellness companion, not a medical device. Always consult your healthcare provider for medical decisions.
          </Text>
        </View>
      </ScrollView>

      {/* Add/Edit Medication Modal */}
      <Modal visible={showMedModal} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                {editingMed ? "Edit Medication" : "Add Medication"}
              </Text>
              <Text style={[styles.modalHint, { color: colors.muted }]}>
                Keep track of what helps you feel better.
              </Text>

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Name</Text>
              <TextInput
                value={medName}
                onChangeText={setMedName}
                placeholder="e.g., Ibuprofen, Visanne..."
                placeholderTextColor={colors.muted}
                autoFocus
                style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Dosage</Text>
              <TextInput
                value={medDosage}
                onChangeText={setMedDosage}
                placeholder="e.g., 200mg, 2 tablets..."
                placeholderTextColor={colors.muted}
                style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Frequency</Text>
              <View style={styles.freqRow}>
                {(["daily", "twice_daily", "as_needed", "weekly"] as const).map((freq) => (
                  <Pressable
                    key={freq}
                    onPress={() => {
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setMedFrequency(freq);
                    }}
                    style={({ pressed }) => [
                      styles.freqChip,
                      {
                        backgroundColor: medFrequency === freq ? colors.primary + "22" : "transparent",
                        borderColor: medFrequency === freq ? colors.primary : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.freqLabel, { color: medFrequency === freq ? colors.primary : colors.muted }]}>
                      {FREQUENCY_LABELS[freq]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Quantity remaining (optional)</Text>
              <TextInput
                value={medQuantity}
                onChangeText={setMedQuantity}
                placeholder="e.g., 30"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Total quantity per refill (optional)</Text>
              <TextInput
                value={medTotal}
                onChangeText={setMedTotal}
                placeholder="e.g., 90"
                placeholderTextColor={colors.muted}
                keyboardType="number-pad"
                style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
              />

              <Text style={[styles.inputLabel, { color: colors.muted }]}>Notes (optional)</Text>
              <TextInput
                value={medNotes}
                onChangeText={setMedNotes}
                placeholder="Any notes about this medication..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border, minHeight: 70 }]}
              />

              <View style={styles.modalButtons}>
                <Pressable
                  onPress={() => setShowMedModal(false)}
                  style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveMed}
                  style={({ pressed }) => [styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={[styles.modalSaveText, { color: colors.background }]}>
                    {editingMed ? "Update" : "Add"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenTitle: { fontSize: 26, fontWeight: "700", marginTop: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginBottom: 20, marginTop: 4 },
  savedBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 14, marginBottom: 16 },
  savedText: { fontSize: 13, fontWeight: "600" },
  card: { borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  editSection: { marginTop: 16, gap: 12 },
  expandedSection: { marginTop: 14, gap: 8 },
  textInput: { borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1 },
  smallBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  smallBtnText: { fontSize: 14, fontWeight: "700" },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fieldCol: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "500" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperBtn: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  stepperBtnText: { fontSize: 18, fontWeight: "600" },
  stepperValue: { fontSize: 14, fontWeight: "600", minWidth: 60, textAlign: "center" },
  toggleList: { marginTop: 12 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 0.5 },
  toggleText: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  toggleDesc: { fontSize: 12, marginTop: 2 },

  // Medications
  medCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
  medHeader: { flexDirection: "row", alignItems: "flex-start" },
  medName: { fontSize: 15, fontWeight: "700" },
  medDosage: { fontSize: 13, marginTop: 2 },
  medActions: { flexDirection: "row", gap: 4 },
  medNotes: { fontSize: 12, marginTop: 8, lineHeight: 17 },
  refillBadge: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, marginTop: 10, alignSelf: "flex-start" },
  refillText: { fontSize: 12, fontWeight: "600" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderStyle: "dashed" },
  addBtnText: { fontSize: 14, fontWeight: "600" },

  // Self-care
  categoryScroll: { gap: 8, paddingBottom: 8 },
  categoryChip: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  categoryLabel: { fontSize: 13, fontWeight: "600" },
  activityCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  activityIcon: { fontSize: 24 },
  activityText: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: "700" },
  activityDesc: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  activityDuration: { fontSize: 11, marginTop: 4 },
  activityActions: { alignItems: "center", gap: 6 },
  logActivityBtn: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  logActivityText: { fontSize: 12, fontWeight: "700" },

  // Export
  exportDesc: { fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 14 },
  exportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 14 },
  exportBtnText: { fontSize: 15, fontWeight: "700" },

  // Danger
  dangerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12, marginTop: 12, borderWidth: 1 },
  dangerBtnText: { fontSize: 14, fontWeight: "600" },

  // About
  aboutCard: { borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 14, borderWidth: 1 },
  aboutTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  aboutVersion: { fontSize: 13, marginBottom: 10 },
  aboutBody: { fontSize: 13, lineHeight: 19, textAlign: "center" },

  // Disclaimer
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1 },
  disclaimerText: { fontSize: 12, lineHeight: 17, flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { borderRadius: 20, padding: 24, width: "100%", maxWidth: 400, maxHeight: "85%" },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  modalHint: { fontSize: 13, lineHeight: 18, marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: "500", marginBottom: 6, marginTop: 4 },
  modalInput: { borderRadius: 12, padding: 12, fontSize: 14, borderWidth: 1, marginBottom: 8 },
  freqRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  freqChip: { borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  freqLabel: { fontSize: 13, fontWeight: "600" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalCancelText: { fontSize: 14, fontWeight: "600" },
  modalSaveBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalSaveText: { fontSize: 14, fontWeight: "700" },
});
