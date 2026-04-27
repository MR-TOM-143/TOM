import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProcessingOverlay } from "@/components/ProcessingOverlay";
import { useUID } from "@/context/UIDContext";
import { useColors } from "@/hooks/useColors";

const EXAMPLE = `100012345678901\n100098765432109|password123\n61551234567890`;

const FEATURES = [
  { icon: "bolt" as const, label: "Bulk Check", color: "#10B981" },
  { icon: "person" as const, label: "Auto Profile", color: "#F59E0B" },
  { icon: "content-copy" as const, label: "One-Tap Copy", color: "#38BDF8" },
  { icon: "signal-wifi-off" as const, label: "Works Offline", color: "#4F8EF7" },
];

export default function InputScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { parseAndProcess, processing, entries } = useUID();

  const [inputText, setInputText] = useState("");
  const [hasProcessed, setHasProcessed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const scaleAnim = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (hasProcessed && !processing.isProcessing) {
      setHasProcessed(false);
      setInputText("");
      if (entries.length > 0) router.push("/list");
    }
  }, [processing.isProcessing, hasProcessed, entries.length]);

  const startProcess = async (mode: "replace" | "append") => {
    const text = inputText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHasProcessed(true);
    await parseAndProcess(text, mode);
  };

  const handleProcess = async () => {
    const text = inputText.trim();
    if (!text) {
      Alert.alert("Empty Input", "Please paste UIDs or import a file.");
      return;
    }
    if (entries.length > 0) {
      Alert.alert(
        "Existing List Found",
        `You already have ${entries.length} UIDs. What do you want to do?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add to List", onPress: () => startProcess("append") },
          { text: "Replace All", style: "destructive", onPress: () => startProcess("replace") },
        ]
      );
    } else {
      await startProcess("replace");
    }
  };

  const handleImportFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const uri = asset.uri;
      const fileName = asset.name?.toLowerCase() ?? "";
      const mimeType = asset.mimeType?.toLowerCase() ?? "";
      const isLikelyBinary =
        /\.(jpg|jpeg|png|gif|mp4|mp3|pdf|zip|exe|apk|doc|docx|xlsx|ppt|pptx)$/i.test(fileName) ||
        mimeType.startsWith("image/") ||
        mimeType.startsWith("video/") ||
        mimeType.startsWith("audio/");
      if (isLikelyBinary) {
        Alert.alert("Unsupported File", "Please select a text file (.txt, .csv) containing UIDs.");
        return;
      }
      let content = "";
      if (Platform.OS === "web") {
        const response = await fetch(uri);
        content = await response.text();
      } else {
        content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      }
      if (!content.trim()) {
        Alert.alert("Empty File", "The selected file is empty.");
        return;
      }
      const lines = content.split(/[\n\r,;]+/).map((l) => l.trim()).filter(Boolean);
      const numericLines = lines.filter((l) => /^\d+/.test(l.split("|")[0] ?? ""));
      if (numericLines.length === 0) {
        Alert.alert("No UIDs Found", "The file doesn't contain any numeric UIDs.");
        return;
      }
      setInputText((prev) => (prev ? prev + "\n" + content : content));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Imported", `Found ${numericLines.length} potential UIDs from ${asset.name ?? "file"}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Import Error", `Could not read the file.\n\n${msg}`);
    }
  };

  const handleViewList = () => {
    Haptics.selectionAsync();
    router.push("/list");
  };

  const handleClearInput = () => {
    setInputText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePasteSample = () => {
    setInputText(EXAMPLE);
    Haptics.selectionAsync();
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const btmPad = Platform.OS === "web" ? 34 : insets.bottom;

  const lineCount = inputText ? inputText.split(/[\n\r]+/).filter((l) => l.trim()).length : 0;
  const validCount = inputText
    ? inputText.split(/[\n\r,;]+/).map((l) => (l.split("|")[0] ?? "").trim()).filter((l) => /^\d+$/.test(l)).length
    : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {processing.isProcessing && (
        <ProcessingOverlay
          visible={processing.isProcessing}
          step={processing.step}
          progress={processing.progress}
          stepIndex={processing.stepIndex}
        />
      )}

      <Animated.ScrollView
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: btmPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <LinearGradient
              colors={["#4F8EF7", "#38BDF8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <MaterialIcons name="dynamic-feed" size={26} color="#fff" />
            </LinearGradient>
            <View style={[styles.logoDot, { backgroundColor: colors.success }]} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.appName, { color: colors.foreground }]}>FB UID Manager</Text>
            <Text style={[styles.appDesc, { color: colors.mutedForeground }]}>
              Facebook UID validation &amp; management
            </Text>
          </View>
          {entries.length > 0 && (
            <TouchableOpacity
              onPress={handleViewList}
              style={[styles.listBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
              activeOpacity={0.75}
            >
              <Text style={[styles.listBadgeNum, { color: colors.primary }]}>{entries.length}</Text>
              <Text style={[styles.listBadgeLabel, { color: colors.primary + "AA" }]}>UIDs</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats strip (only when entries exist) */}
        {entries.length > 0 && (
          <TouchableOpacity onPress={handleViewList} activeOpacity={0.8}>
            <LinearGradient
              colors={[colors.primary + "22", colors.accent + "18"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.statsStrip, { borderColor: colors.primary + "30" }]}
            >
              <MaterialIcons name="assessment" size={16} color={colors.primary} />
              <Text style={[styles.statsStripText, { color: colors.foreground }]}>
                View saved list — {entries.length} UIDs stored
              </Text>
              <MaterialIcons name="arrow-forward-ios" size={13} color={colors.mutedForeground} />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Input Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: isFocused ? colors.primary + "50" : colors.border,
            },
          ]}
        >
          {/* Card header */}
          <View style={styles.cardTop}>
            <View style={styles.cardTopLeft}>
              <View style={[styles.cardIconBox, { backgroundColor: colors.primary + "20" }]}>
                <MaterialIcons name="edit-note" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Paste UIDs</Text>
            </View>
            {lineCount > 0 ? (
              <View style={styles.cardTopRight}>
                <View
                  style={[
                    styles.validPill,
                    { backgroundColor: colors.success + "18", borderColor: colors.success + "40" },
                  ]}
                >
                  <MaterialIcons name="check-circle-outline" size={11} color={colors.success} />
                  <Text style={[styles.validPillText, { color: colors.success }]}>
                    {validCount}/{lineCount}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleClearInput}
                  style={[
                    styles.clearBtn,
                    { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "40" },
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="clear" size={13} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePasteSample}
                style={[styles.sampleBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <MaterialIcons name="auto-awesome" size={11} color={colors.mutedForeground} />
                <Text style={[styles.sampleText, { color: colors.mutedForeground }]}>Sample</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Text input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderColor: isFocused ? colors.primary + "60" : colors.border,
              },
            ]}
            multiline
            placeholder={`One UID per line:\n100012345678901\n100098765432109|password`}
            placeholderTextColor={colors.mutedForeground + "80"}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            textAlignVertical="top"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            testID="uid-input"
          />

          {/* Format hint */}
          <View style={[styles.hint, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <MaterialIcons name="info-outline" size={13} color={colors.accent} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>UID</Text>
              {" or "}
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold" }}>UID|password</Text>
              {"   ·   Duplicates auto-removed"}
            </Text>
          </View>
        </View>

        {/* Import button */}
        <TouchableOpacity
          style={[styles.importBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleImportFile}
          activeOpacity={0.8}
          testID="import-btn"
        >
          <View style={[styles.importIconWrap, { backgroundColor: colors.primary + "18" }]}>
            <MaterialIcons name="folder-open" size={18} color={colors.primary} />
          </View>
          <Text style={[styles.importText, { color: colors.foreground }]}>Import from File</Text>
          <View style={[styles.importBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.importBadgeText, { color: colors.mutedForeground }]}>.txt .csv</Text>
          </View>
        </TouchableOpacity>

        {/* Process button */}
        <TouchableOpacity
          onPress={handleProcess}
          activeOpacity={0.88}
          disabled={validCount === 0}
          testID="process-btn"
          style={styles.processBtnWrap}
        >
          {validCount > 0 ? (
            <LinearGradient
              colors={["#4F8EF7", "#38BDF8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.processBtn}
            >
              <MaterialIcons name="rocket-launch" size={20} color="#fff" />
              <Text style={styles.processBtnText}>Process {validCount} UIDs</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.processBtn, { backgroundColor: colors.secondary }]}>
              <MaterialIcons name="rocket-launch" size={20} color={colors.mutedForeground} />
              <Text style={[styles.processBtnText, { color: colors.mutedForeground }]}>Process UIDs</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* View list button */}
        {entries.length > 0 && (
          <TouchableOpacity
            style={[styles.viewBtn, { borderColor: colors.info + "40", backgroundColor: colors.info + "0E" }]}
            onPress={handleViewList}
            activeOpacity={0.8}
            testID="view-list-btn"
          >
            <MaterialIcons name="list-alt" size={18} color={colors.info} />
            <Text style={[styles.viewBtnText, { color: colors.info }]}>
              Open Saved List ({entries.length})
            </Text>
            <MaterialIcons name="arrow-forward" size={15} color={colors.info + "90"} />
          </TouchableOpacity>
        )}

        {/* Features grid */}
        <View style={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <View
              key={f.label}
              style={[styles.featureCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.featureIconBox, { backgroundColor: f.color + "18" }]}>
                <MaterialIcons name={f.icon} size={16} color={f.color} />
              </View>
              <Text style={[styles.featureLabel, { color: colors.foreground }]}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Version tag */}
        <View style={styles.versionRow}>
          <View style={[styles.versionDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
            v2.0.0 · All data stored locally
          </Text>
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 18, gap: 14 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 2,
  },
  logoWrap: { position: "relative" },
  logoGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F8EF7",
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#07090F",
  },
  headerText: { flex: 1 },
  appName: { fontSize: 21, fontFamily: "Inter_700Bold", letterSpacing: -0.4 },
  appDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 17 },
  listBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 52,
  },
  listBadgeNum: { fontSize: 18, fontFamily: "Inter_700Bold", lineHeight: 22 },
  listBadgeLabel: { fontSize: 10, fontFamily: "Inter_500Medium", marginTop: 1 },

  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  statsStripText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },

  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 13,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTopLeft: { flexDirection: "row", alignItems: "center", gap: 9 },
  cardTopRight: { flexDirection: "row", alignItems: "center", gap: 7 },
  cardIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  validPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  validPillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sampleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
  },
  sampleText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  input: {
    minHeight: 170,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },

  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },

  importBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  importIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  importText: { flex: 1, fontSize: 15, fontFamily: "Inter_600SemiBold" },
  importBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  importBadgeText: { fontSize: 11, fontFamily: "Inter_500Medium" },

  processBtnWrap: { borderRadius: 16 },
  processBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 17,
    shadowColor: "#4F8EF7",
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  processBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },

  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  viewBtnText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },

  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: "45%",
  },
  featureIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  featureLabel: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },

  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingTop: 6,
    paddingBottom: 4,
  },
  versionDot: { width: 6, height: 6, borderRadius: 3 },
  versionText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
