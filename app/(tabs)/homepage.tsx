import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
  StatusBar,
  Platform,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";           // ← ganti dari useNavigation
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const { width } = Dimensions.get("window");
const CARD_W = (width - 48 - 12) / 2;

// ── COLORS ───────────────────────────────────────────────────────────────
const C = {
  darkBrown: "#5c2d0e",
  midBrown:  "#7a3f1c",
  accent:    "#c8956b",
  light:     "#f0d5b8",
  bg:        "#f7f3ef",
  white:     "#ffffff",
  border:    "#eee5da",
  textDark:  "#2b1d15",
  textMid:   "#a07a5e",
  textMuted: "#b89f8d",
};

// ── STATUS BADGE ─────────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, { bg: string; text: string }> = {
    approved: { bg: "#22c55e", text: "#fff" },
    rejected: { bg: "#ef4444", text: "#fff" },
    pending:  { bg: "#fbbf24", text: "#78350f" },
  };
  const s = map[status] || map.pending;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusBadgeText, { color: s.text }]}>
        {status}
      </Text>
    </View>
  );
}

// ── BOTTOM STRIPE ─────────────────────────────────────────────────────────
interface BottomStripeProps {
  status: string;
}

function BottomStripe({ status }: BottomStripeProps) {
  const color =
    status === "approved" ? "#22c55e"
    : status === "rejected" ? "#ef4444"
    : "#fbbf24";
  return <View style={[styles.stripe, { backgroundColor: color }]} />;
}

// ═════════════════════════════════════════════════════════════════════════
// TYPES
// ═════════════════════════════════════════════════════════════════════════
interface User {
  id: string | number;
  username: string;
  email: string;
  role: string;
}

interface Report {
  id: string | number;
  header: string;
  body: string;
  status: string;
  image?: string;
  created_at: string;
}

// ═════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════════════
export default function UserHomepage() {

  const [user, setUser] = useState<User | null>(null);
  const [profileImage, setProfileImage] = useState("");

  // DATA
  const [reports, setReports] = useState<Report[]>([]);
  const [totalReports, setTotalReports] = useState(0);
  const [approvedReports, setApprovedReports] = useState(0);
  const [rejectedReports, setRejectedReports] = useState(0);

  // UI
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    initUser();
  }, []);

  const initUser = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");

      if (!token || !storedUser) {
        router.replace("/(auth)/login");
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== "user") {
        router.replace("/(auth)/login");
        return;
      }

      setUser(parsedUser);

      // Load profile image
      const savedProfile = await AsyncStorage.getItem(
        `profileImage_${parsedUser.id}`
      );
      if (savedProfile) setProfileImage(savedProfile);

      await fetchReports(token);
    } catch (error) {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      router.replace("/(auth)/login");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Reports ─────────────────────────────────────────────────────
  const fetchReports = async (token: string) => {
    try {
      const response = await fetch("http://localhost:5000/api/posts", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        console.log(data.message);
        return;
      }

      const list: Report[] = Array.isArray(data) ? data : data.data || [];
      setReports(list);
      setTotalReports(list.length);
      setApprovedReports(list.filter((i: Report) => i.status === "approved").length);
      setRejectedReports(list.filter((i: Report) => i.status === "rejected").length);
    } catch (error) {
      console.log("FETCH REPORT ERROR:", error);
    }
  };

  // ── Refresh ───────────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const token = await AsyncStorage.getItem("token");
    if (token) await fetchReports(token);
    setRefreshing(false);
  }, []);

  // ── Profile Upload ────────────────────────────────────────────────────
  const handleProfileUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Izin diperlukan",
        "Izinkan akses galeri untuk mengganti foto profil."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      if (user) {
        await AsyncStorage.setItem(`profileImage_${user.id}`, uri);
      }
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    Alert.alert("Logout", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Keluar",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("token");
          await AsyncStorage.removeItem("user");
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  // ── Filtered Reports ──────────────────────────────────────────────────
  const filteredReports: Report[] = Array.isArray(reports)
    ? reports.filter((r: Report) => {
        const q = searchQuery.toLowerCase();
        return (
          r.header?.toLowerCase().includes(q) ||
          r.body?.toLowerCase().includes(q) ||
          r.status?.toLowerCase().includes(q)
        );
      })
    : [];

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading || !user) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.accent} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
          />
        }
      >

        {/* ── TOP BAR ─────────────────────────────────────────────── */}
        <View style={styles.topbar}>
          <View>
            <Text style={styles.topbarLabel}>Dashboard</Text>
            <Text style={styles.topbarTitle}>Welcome back,</Text>
            <Text style={styles.topbarName}>{user.username}</Text>
          </View>

          {/* Profile avatar — tap untuk ganti foto */}
          <TouchableOpacity onPress={handleProfileUpload} activeOpacity={0.8}>
            <View style={styles.avatarWrap}>
              <Image
                source={{
                  uri:
                    profileImage ||
                    `https://ui-avatars.com/api/?name=${user.username}&background=c8956b&color=fff`,
                }}
                style={styles.avatar}
              />
              <View style={styles.avatarEdit}>
                <Feather name="camera" size={10} color="#fff" />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── HERO CARD ───────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={[styles.heroRing, { width: 200, height: 200, top: -80, right: -80 }]} />
          <View style={[styles.heroRing, { width: 140, height: 140, bottom: -60, left: -40, borderWidth: 18 }]} />

          <View style={styles.heroBadge}>
            <Feather name="file-text" size={11} color="rgba(240,213,184,0.9)" />
            <Text style={styles.heroBadgeText}>  REPORT DASHBOARD</Text>
          </View>

          <Text style={styles.heroTitle}>Hello, {user.username}!</Text>
          <Text style={styles.heroDesc}>
            Here's an overview of all your reports.
          </Text>

          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.heroBtnPrimary}
              onPress={() => router.push("/(tabs)/createreport")}
              activeOpacity={0.85}
            >
              <Feather name="plus-circle" size={16} color={C.darkBrown} />
              <Text style={styles.heroBtnPrimaryText}>New Report</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.heroBtnGhost}
              onPress={() => router.push("/(tabs)/myreport")}
              activeOpacity={0.85}
            >
              <Feather name="list" size={16} color="#fff" />
              <Text style={styles.heroBtnGhostText}>My Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── STAT CARDS ──────────────────────────────────────────── */}
        <View style={styles.statRow}>

          {/* Total */}
          <View style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
            <View style={[styles.statIcon, { backgroundColor: C.darkBrown }]}>
              <Feather name="bar-chart-2" size={20} color="#fff" />
            </View>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={styles.statValue}>{totalReports}</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, { width: "100%", backgroundColor: C.darkBrown }]} />
            </View>
          </View>

          {/* Approved */}
          <View style={[styles.statCard, { flex: 1, marginHorizontal: 4 }]}>
            <View style={[styles.statIcon, { backgroundColor: "#16a34a" }]}>
              <Feather name="check-circle" size={20} color="#fff" />
            </View>
            <Text style={styles.statLabel}>Approved</Text>
            <Text style={[styles.statValue, { color: "#16a34a" }]}>{approvedReports}</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, {
                width: totalReports ? `${(approvedReports / totalReports) * 100}%` : "0%",
                backgroundColor: "#22c55e",
              }]} />
            </View>
            <Text style={styles.statPct}>
              {totalReports ? Math.round((approvedReports / totalReports) * 100) : 0}%
            </Text>
          </View>

          {/* Rejected */}
          <View style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
            <View style={[styles.statIcon, { backgroundColor: "#dc2626" }]}>
              <Feather name="x-circle" size={20} color="#fff" />
            </View>
            <Text style={styles.statLabel}>Rejected</Text>
            <Text style={[styles.statValue, { color: "#dc2626" }]}>{rejectedReports}</Text>
            <View style={styles.statBar}>
              <View style={[styles.statBarFill, {
                width: totalReports ? `${(rejectedReports / totalReports) * 100}%` : "0%",
                backgroundColor: "#ef4444",
              }]} />
            </View>
            <Text style={[styles.statPct, { color: "#ef4444" }]}>
              {totalReports ? Math.round((rejectedReports / totalReports) * 100) : 0}%
            </Text>
          </View>
        </View>

        {/* ── RECENT REPORTS ──────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            <Text style={styles.sectionSub}>
              {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""} found
            </Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Feather name="search" size={15} color={C.textMid} style={{ marginRight: 8 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search complaints..."
            placeholderTextColor={C.textMuted}
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Feather name="x" size={15} color={C.textMid} />
            </TouchableOpacity>
          )}
        </View>

        {/* Cards grid */}
        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="inbox" size={32} color={C.accent} />
            </View>
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptyDesc}>
              Try adjusting your search or create a new report.
            </Text>
          </View>
        ) : (
          <View style={styles.cardGrid}>
            {filteredReports.map((report) => (
              <View key={report.id} style={styles.reportCard}>

                {/* Image */}
                <View style={styles.cardImageWrap}>
               <Image
  source={{
    uri: report.image
      ? `http://localhost:5000/uploads/${report.image}`
      : "https://via.placeholder.com/400x300?text=No+Image",
  }}
  style={styles.cardImage}
  resizeMode="cover"
/>
                  <StatusBadge status={report.status} />
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {report.header}
                  </Text>

                  <View style={styles.cardDateRow}>
                    <Feather name="calendar" size={11} color={C.textMuted} />
                    <Text style={styles.cardDate}>
                      {"  "}
                      {new Date(report.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>

                  <Text style={styles.cardDesc} numberOfLines={3}>
                    {report.body}
                  </Text>
                </View>

                <BottomStripe status={report.status} />
              </View>
            ))}
          </View>
        )}

        {/* ── BOTTOM ACTIONS ──────────────────────────────────────── */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.8}
          >
            <Feather name="user" size={18} color={C.accent} />
            <Text style={styles.actionBtnText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={18} color="#ef4444" />
            <Text style={[styles.actionBtnText, { color: "#ef4444" }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── FLOATING ACTION BUTTON ────────────────────────────────── */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/(tabs)/createreport")}
        activeOpacity={0.9}
      >
        <Feather name="plus" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// STYLES — tidak ada perubahan
// ═════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({

  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  loadingScreen: {
    flex: 1, backgroundColor: C.bg,
    alignItems: "center", justifyContent: "center", gap: 12,
  },
  loadingText: { color: C.textMid, fontSize: 14, fontWeight: "500" },

  topbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 36,
    paddingBottom: 16,
    backgroundColor: C.bg,
  },
  topbarLabel: {
    fontSize: 11, fontWeight: "700", color: C.textMid,
    letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2,
  },
  topbarTitle: { fontSize: 14, color: C.textMid, fontWeight: "400" },
  topbarName: {
    fontSize: 22, fontWeight: "800", color: C.textDark, letterSpacing: -0.5,
  },

  avatarWrap: { position: "relative" },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    borderWidth: 2.5, borderColor: C.accent,
  },
  avatarEdit: {
    position: "absolute", bottom: 0, right: 0,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: C.accent,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: C.bg,
  },

  heroCard: {
    marginHorizontal: 16, borderRadius: 24,
    backgroundColor: C.darkBrown, padding: 24, marginBottom: 20,
    overflow: "hidden",
    shadowColor: C.darkBrown,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 10,
    position: "relative",
  },
  heroRing: {
    position: "absolute", borderRadius: 999,
    borderWidth: 24, borderColor: "rgba(255,255,255,0.05)",
  },
  heroBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 99, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)", marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 10, fontWeight: "800",
    color: "rgba(240,213,184,0.85)", letterSpacing: 1.2,
  },
  heroTitle: {
    fontSize: 28, fontWeight: "900", color: "#fff",
    letterSpacing: -0.8, marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13, color: "rgba(240,213,184,0.7)",
    lineHeight: 20, marginBottom: 20, fontWeight: "400",
  },
  heroButtons: { flexDirection: "row", gap: 10 },
  heroBtnPrimary: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  heroBtnPrimaryText: { fontSize: 13, fontWeight: "800", color: C.darkBrown },
  heroBtnGhost: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  heroBtnGhostText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  statRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 24 },
  statCard: {
    backgroundColor: C.white, borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.darkBrown, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  statLabel: {
    fontSize: 10, fontWeight: "700", color: C.textMid,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 2,
  },
  statValue: {
    fontSize: 28, fontWeight: "900", color: C.textDark,
    letterSpacing: -1, marginBottom: 8, lineHeight: 32,
  },
  statBar: {
    height: 4, borderRadius: 2, backgroundColor: "#f0e5d8",
    overflow: "hidden", marginBottom: 4,
  },
  statBarFill: { height: 4, borderRadius: 2 },
  statPct: { fontSize: 10, fontWeight: "700", color: C.textMid },

  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-end", paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20, fontWeight: "800", color: C.textDark, letterSpacing: -0.3,
  },
  sectionSub: { fontSize: 12, color: C.textMuted, fontWeight: "500", marginTop: 2 },

  searchBar: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: C.white, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.darkBrown, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.textDark, fontWeight: "500" },

  emptyState: {
    alignItems: "center", paddingVertical: 48, paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: "#f0e5d8",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: C.textDark, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: C.textMuted, textAlign: "center", lineHeight: 20 },

  cardGrid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 16, gap: 12,
  },
  reportCard: {
    width: CARD_W, backgroundColor: C.white,
    borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.darkBrown, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  cardImageWrap: { height: 120, position: "relative" },
  cardImage: { width: "100%", height: "100%" },

  statusBadge: {
    position: "absolute", top: 8, right: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "800", textTransform: "capitalize" },

  cardBody: { padding: 12 },
  cardTitle: { fontSize: 13, fontWeight: "800", color: C.textDark, marginBottom: 5 },
  cardDateRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  cardDate: { fontSize: 10, color: C.textMuted, fontWeight: "500" },
  cardDesc: { fontSize: 11, color: "#6b5040", lineHeight: 17 },

  stripe: { height: 3, width: "100%" },

  bottomActions: {
    flexDirection: "row", gap: 12,
    marginHorizontal: 16, marginTop: 24,
  },
  actionBtn: {
    flex: 1, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: C.white, borderRadius: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.darkBrown, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  actionBtnDanger: { borderColor: "#fee2e2", backgroundColor: "#fff5f5" },
  actionBtnText: { fontSize: 14, fontWeight: "700", color: C.accent },

  fab: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 24,
    right: 20,
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: C.darkBrown,
    alignItems: "center", justifyContent: "center",
    shadowColor: C.darkBrown, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
});