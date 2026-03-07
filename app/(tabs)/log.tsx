import { useCallback, useState } from "react";
import { ScrollView, Text, View, TextInput, StyleSheet, Platform, Modal, Alert } from "react-native";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  saveDailyLog,
  getLogForDate,
  PAIN_LABELS,
  MOOD_OPTIONS,
  SYMPTOM_OPTIONS,
  ENERGY_LABELS,
  FLOW_OPTIONS,
  type DailyLog,
} from "@/utils/endoData";
import { loadCustomSymptoms, addCustomSymptom, removeCustomSymptom } from "@/utils/customSymptoms";
import { savePhotoEntry, getPhotosForDate, deletePhotoEntry, PHOTO_CATEGORIES, type PhotoEntry } from "@/utils/photoJournal";
import { updateStreakOnLog } from "@/utils/streakTracker";
import { getFlareState, getFlareDefaults } from "@/utils/flareDay";

export default function DailyLogScreen() {
  const colors = useColors();
  const today = new Date().toISOString().split("T")[0];

  const [painLevel, setPainLevel] = useState(0);
  const [mood, setMood] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [energyLevel, setEnergyLevel] = useState(2);
  const [flowLevel, setFlowLevel] = useState(0);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Custom symptoms
  const [customSymptoms, setCustomSymptoms] = useState<string[]>([]);
  const [showAddSymptom, setShowAddSymptom] = useState(false);
  const [newSymptomName, setNewSymptomName] = useState("");

  // Photo journal
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoCategory, setPhotoCategory] = useState<PhotoEntry["category"]>("general");
  const [pendingPhotoUri, setPendingPhotoUri] = useState("");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [existing, customSym, todayPhotos, flareState] = await Promise.all([
          getLogForDate(today),
          loadCustomSymptoms(),
          getPhotosForDate(today),
          getFlareState(),
        ]);

        setCustomSymptoms(customSym);
        setPhotos(todayPhotos);

        if (existing) {
          setPainLevel(existing.painLevel);
          setMood(existing.mood);
          setSymptoms([...existing.symptoms]);
          setEnergyLevel(existing.energyLevel);
          setFlowLevel(existing.flowLevel);
          setNotes(existing.notes);
          setIsEditing(true);
        } else if (flareState?.isActive) {
          // Pre-fill with flare defaults
          const defaults = getFlareDefaults();
          setPainLevel(defaults.painLevel);
          setMood(defaults.mood);
          setSymptoms([...defaults.symptoms]);
          setEnergyLevel(defaults.energyLevel);
          setFlowLevel(0);
          setNotes("");
          setIsEditing(false);
        } else {
          setPainLevel(0);
          setMood("");
          setSymptoms([]);
          setEnergyLevel(2);
          setFlowLevel(0);
          setNotes("");
          setIsEditing(false);
        }
        setSaved(false);
      })();
    }, [today])
  );

  const toggleSymptom = (symptom: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleAddCustomSymptom = async () => {
    if (!newSymptomName.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await addCustomSymptom(newSymptomName.trim());
    if (success) {
      setCustomSymptoms((prev) => [...prev, newSymptomName.trim()]);
      setNewSymptomName("");
      setShowAddSymptom(false);
    }
  };

  const handleRemoveCustomSymptom = (symptom: string) => {
    Alert.alert("Remove Symptom", `Remove "${symptom}" from your custom list?`, [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeCustomSymptom(symptom);
          setCustomSymptoms((prev) => prev.filter((s) => s !== symptom));
          setSymptoms((prev) => prev.filter((s) => s !== symptom));
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const log: DailyLog = {
      id: `log_${today}_${Date.now()}`,
      date: today,
      painLevel,
      mood,
      symptoms,
      energyLevel,
      flowLevel,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
    const success = await saveDailyLog(log);
    if (success) {
      setSaved(true);
      setIsEditing(true);
      await updateStreakOnLog(today);
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingPhotoUri(result.assets[0].uri);
      setPhotoCaption("");
      setPhotoCategory("general");
      setShowPhotoModal(true);
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission", "Camera access is needed to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPendingPhotoUri(result.assets[0].uri);
      setPhotoCaption("");
      setPhotoCategory("general");
      setShowPhotoModal(true);
    }
  };

  const handleSavePhoto = async () => {
    if (!pendingPhotoUri) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const entry: PhotoEntry = {
      id: `photo_${Date.now()}`,
      date: today,
      uri: pendingPhotoUri,
      caption: photoCaption.trim(),
      category: photoCategory,
      createdAt: new Date().toISOString(),
    };
    await savePhotoEntry(entry);
    setPhotos((prev) => [entry, ...prev]);
    setShowPhotoModal(false);
    setPendingPhotoUri("");
  };

  const handleDeletePhoto = (id: string) => {
    Alert.alert("Remove Photo", "Remove this photo from today's journal?", [
      { text: "Keep", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deletePhotoEntry(id);
          setPhotos((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  const getPainColor = (level: number): string => {
    if (level <= 1) return colors.success;
    if (level <= 3) return colors.warning;
    return colors.error;
  };

  const allSymptoms = [...SYMPTOM_OPTIONS, ...customSymptoms];

  return (
    <ScreenContainer className="px-5 pt-2">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Daily Check-in</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>
          {new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
        </Text>

        {saved && (
          <View style={[styles.savedBanner, { backgroundColor: colors.success + "18" }]}>
            <IconSymbol name="checkmark.circle.fill" size={18} color={colors.success} />
            <Text style={[styles.savedText, { color: colors.success }]}>
              Your check-in has been saved. Thank you for taking this moment.
            </Text>
          </View>
        )}

        {/* Pain / Comfort Level */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How is your comfort level?</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>Tap the level that feels right</Text>
          <View style={styles.sliderRow}>
            {PAIN_LABELS.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPainLevel(i);
                }}
                style={({ pressed }) => [
                  styles.sliderItem,
                  {
                    backgroundColor: painLevel === i ? getPainColor(i) + "25" : "transparent",
                    borderColor: painLevel === i ? getPainColor(i) : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={[styles.sliderDot, { backgroundColor: painLevel === i ? getPainColor(i) : colors.border }]} />
                <Text style={[styles.sliderLabel, { color: painLevel === i ? colors.foreground : colors.muted, fontWeight: painLevel === i ? "700" : "500" }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Mood */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>How are you feeling emotionally?</Text>
          <View style={styles.moodGrid}>
            {MOOD_OPTIONS.map((option) => (
              <Pressable
                key={option.label}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setMood(mood === option.label ? "" : option.label);
                }}
                style={({ pressed }) => [
                  styles.moodChip,
                  {
                    backgroundColor: mood === option.label ? option.color + "30" : "transparent",
                    borderColor: mood === option.label ? option.color : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={[styles.moodDot, { backgroundColor: option.color }]} />
                <Text style={[styles.moodLabel, { color: mood === option.label ? colors.foreground : colors.muted, fontWeight: mood === option.label ? "700" : "500" }]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Symptoms with Custom Tags */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Any symptoms to note?</Text>
              <Text style={[styles.sectionHint, { color: colors.muted }]}>Tap all that apply — no pressure</Text>
            </View>
          </View>
          <View style={styles.symptomGrid}>
            {allSymptoms.map((symptom) => {
              const isActive = symptoms.includes(symptom);
              const isCustom = customSymptoms.includes(symptom);
              return (
                <Pressable
                  key={symptom}
                  onPress={() => toggleSymptom(symptom)}
                  onLongPress={isCustom ? () => handleRemoveCustomSymptom(symptom) : undefined}
                  style={({ pressed }) => [
                    styles.symptomChip,
                    {
                      backgroundColor: isActive ? colors.primary + "22" : "transparent",
                      borderColor: isActive ? colors.primary : isCustom ? colors.warning + "60" : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.symptomText, { color: isActive ? colors.primary : colors.muted, fontWeight: isActive ? "700" : "500" }]}>
                    {symptom}
                  </Text>
                  {isCustom && <Text style={[styles.customBadge, { color: colors.warning }]}>✦</Text>}
                </Pressable>
              );
            })}
            {/* Add custom symptom button */}
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAddSymptom(true);
              }}
              style={({ pressed }) => [
                styles.addSymptomBtn,
                { borderColor: colors.primary + "40", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <IconSymbol name="plus" size={14} color={colors.primary} />
              <Text style={[styles.addSymptomText, { color: colors.primary }]}>Add your own</Text>
            </Pressable>
          </View>
        </View>

        {/* Energy Level */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Energy level</Text>
          <View style={styles.energyRow}>
            {ENERGY_LABELS.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setEnergyLevel(i);
                }}
                style={({ pressed }) => [
                  styles.energyChip,
                  {
                    backgroundColor: energyLevel === i ? colors.success + "25" : "transparent",
                    borderColor: energyLevel === i ? colors.success : colors.border,
                    opacity: pressed ? 0.7 : 1,
                    flex: 1,
                  },
                ]}
              >
                <Text style={[styles.energyText, { color: energyLevel === i ? colors.foreground : colors.muted, fontWeight: energyLevel === i ? "700" : "500" }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Flow Level */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Flow</Text>
          <View style={styles.energyRow}>
            {FLOW_OPTIONS.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFlowLevel(i);
                }}
                style={({ pressed }) => [
                  styles.energyChip,
                  {
                    backgroundColor: flowLevel === i ? colors.error + "20" : "transparent",
                    borderColor: flowLevel === i ? colors.error : colors.border,
                    opacity: pressed ? 0.7 : 1,
                    flex: 1,
                  },
                ]}
              >
                <Text style={[styles.energyText, { color: flowLevel === i ? colors.foreground : colors.muted, fontWeight: flowLevel === i ? "700" : "500" }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Photo Journal */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Photo Journal</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>Track visual symptoms like skin changes or swelling</Text>

          {photos.length > 0 && (
            <View style={styles.photoGrid}>
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onLongPress={() => handleDeletePhoto(photo.id)}
                  style={({ pressed }) => [styles.photoThumb, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} contentFit="cover" />
                  {photo.caption ? (
                    <Text style={[styles.photoCaption, { color: colors.muted }]} numberOfLines={1}>{photo.caption}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.photoActions}>
            <Pressable
              onPress={handleTakePhoto}
              style={({ pressed }) => [styles.photoBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", opacity: pressed ? 0.7 : 1 }]}
            >
              <IconSymbol name="camera.fill" size={16} color={colors.primary} />
              <Text style={[styles.photoBtnText, { color: colors.primary }]}>Camera</Text>
            </Pressable>
            <Pressable
              onPress={handlePickPhoto}
              style={({ pressed }) => [styles.photoBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30", opacity: pressed ? 0.7 : 1 }]}
            >
              <IconSymbol name="photo" size={16} color={colors.primary} />
              <Text style={[styles.photoBtnText, { color: colors.primary }]}>Gallery</Text>
            </Pressable>
          </View>
        </View>

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Anything else on your mind?</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Write anything you'd like to remember about today..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            returnKeyType="default"
            style={[styles.notesInput, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
          />
        </View>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Text style={[styles.saveButtonText, { color: colors.background }]}>
            {isEditing ? "Update Today's Entry" : "Save Check-in"}
          </Text>
        </Pressable>

        <Text style={[styles.footerNote, { color: colors.muted }]}>
          Your data stays on your device. Only you can see it.
        </Text>
      </ScrollView>

      {/* Add Custom Symptom Modal */}
      <Modal visible={showAddSymptom} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Custom Symptom</Text>
            <Text style={[styles.modalHint, { color: colors.muted }]}>
              Everyone's experience is different. Add symptoms specific to you.
            </Text>
            <TextInput
              value={newSymptomName}
              onChangeText={setNewSymptomName}
              placeholder="e.g., Leg pain, Dizziness..."
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              onSubmitEditing={handleAddCustomSymptom}
              autoFocus
              style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            />
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => { setShowAddSymptom(false); setNewSymptomName(""); }}
                style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAddCustomSymptom}
                style={({ pressed }) => [styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.modalSaveText, { color: colors.background }]}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Detail Modal */}
      <Modal visible={showPhotoModal} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Photo Details</Text>

            {pendingPhotoUri ? (
              <Image source={{ uri: pendingPhotoUri }} style={styles.photoPreview} contentFit="cover" />
            ) : null}

            <Text style={[styles.fieldLabel, { color: colors.muted }]}>Category</Text>
            <View style={styles.categoryRow}>
              {PHOTO_CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.value}
                  onPress={() => setPhotoCategory(cat.value)}
                  style={({ pressed }) => [
                    styles.categoryChip,
                    {
                      backgroundColor: photoCategory === cat.value ? colors.primary + "22" : "transparent",
                      borderColor: photoCategory === cat.value ? colors.primary : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[styles.categoryLabel, { color: photoCategory === cat.value ? colors.primary : colors.muted }]}>{cat.label}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              value={photoCaption}
              onChangeText={setPhotoCaption}
              placeholder="Add a note (optional)"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              style={[styles.modalInput, { color: colors.foreground, backgroundColor: colors.surface, borderColor: colors.border }]}
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => { setShowPhotoModal(false); setPendingPhotoUri(""); }}
                style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.modalCancelText, { color: colors.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSavePhoto}
                style={({ pressed }) => [styles.modalSaveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={[styles.modalSaveText, { color: colors.background }]}>Save Photo</Text>
              </Pressable>
            </View>
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
  savedText: { fontSize: 13, fontWeight: "600", flex: 1, lineHeight: 18 },
  section: { borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  sectionHint: { fontSize: 13, marginBottom: 14 },
  sliderRow: { gap: 6, marginTop: 8 },
  sliderItem: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  sliderDot: { width: 10, height: 10, borderRadius: 5 },
  sliderLabel: { fontSize: 14 },
  moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  moodChip: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1 },
  moodDot: { width: 8, height: 8, borderRadius: 4 },
  moodLabel: { fontSize: 14 },
  symptomGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  symptomChip: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1 },
  symptomText: { fontSize: 13 },
  customBadge: { fontSize: 10 },
  addSymptomBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderStyle: "dashed" },
  addSymptomText: { fontSize: 13, fontWeight: "600" },
  energyRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  energyChip: { alignItems: "center", borderRadius: 12, paddingVertical: 10, paddingHorizontal: 6, borderWidth: 1 },
  energyText: { fontSize: 12, textAlign: "center" },

  // Photo journal
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  photoThumb: { width: 80, height: 80, borderRadius: 12, overflow: "hidden", borderWidth: 1 },
  photoImage: { width: "100%", height: "100%" },
  photoCaption: { position: "absolute", bottom: 0, left: 0, right: 0, fontSize: 9, padding: 4, backgroundColor: "rgba(0,0,0,0.3)" },
  photoActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, flex: 1, justifyContent: "center" },
  photoBtnText: { fontSize: 13, fontWeight: "600" },

  notesInput: { borderRadius: 12, padding: 14, fontSize: 14, lineHeight: 20, minHeight: 100, borderWidth: 1, marginTop: 10 },
  saveButton: { borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 6, marginBottom: 8 },
  saveButtonText: { fontSize: 16, fontWeight: "700" },
  footerNote: { fontSize: 12, textAlign: "center", marginTop: 4, marginBottom: 20 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { borderRadius: 20, padding: 24, width: "100%", maxWidth: 380 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  modalHint: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  modalInput: { borderRadius: 12, padding: 14, fontSize: 14, borderWidth: 1, marginBottom: 16 },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalCancelText: { fontSize: 14, fontWeight: "600" },
  modalSaveBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalSaveText: { fontSize: 14, fontWeight: "700" },
  photoPreview: { width: "100%", height: 200, borderRadius: 12, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "500", marginBottom: 8 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1 },
  categoryIcon: { fontSize: 14 },
  categoryLabel: { fontSize: 12, fontWeight: "500" },
});
