import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  Modal,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";

// =====================================================
// EXPO PACKAGES — install dengan:
//   npx expo install expo-linear-gradient
//   npx expo install @react-native-async-storage/async-storage
//   npx expo install @expo/vector-icons
// =====================================================
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

// =========================
// STATUS BADGE
// =========================
const StatusBadge = ({ status }: { status: string }) => {
  const getStyle = () => {
    switch (status?.toLowerCase()) {
      case "approved":
        return { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" };
      case "rejected":
        return { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" };
      case "pending":
        return { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" };
      default:
        return { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
    }
  };

  const s = getStyle();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: s.bg, borderColor: s.border },
      ]}
    >
      <Text style={[styles.badgeText, { color: s.text }]}>{status}</Text>
    </View>
  );
};

// =========================
// MAIN COMPONENT
// =========================
export default function MyReportsPage() {
  const navigation = useNavigation<any>();

  const [reports, setReports] = useState<any[]>([]);
  const [profileImage, setProfileImage] = useState("");
  const [user, setUser] = useState<any>(null);

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chats, setChats] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  // =========================
  // CEK LOGIN + ROLE USER
  // =========================
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("token");
      const userData = await AsyncStorage.getItem("user");

      if (!token || !userData) {
        (navigation as any).replace("Login");
        return;
      }

      try {
        const parsedUser = JSON.parse(userData);

        if (parsedUser.role !== "user") {
          (navigation as any).replace("Login");
          return;
        }

        setUser(parsedUser);

        const savedProfile = await AsyncStorage.getItem(
          `profileImage_${parsedUser.id}`
        );
        if (savedProfile) setProfileImage(savedProfile);

        fetchReports(token, parsedUser);
      } catch (err) {
        console.log(err);
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
        (navigation as any).replace("Login");
      }
    };

    init();
  }, []);

  // =========================
  // FETCH REPORTS
  // =========================
  const fetchReports = async (token: string, parsedUser: any) => {
    try {
      const response = await fetch("http://localhost:5000/api/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        setReports([]);
        return;
      }

      const safeData = Array.isArray(data) ? data : [];
      const myReports = safeData.filter(
        (item: any) => item.user_id === parsedUser.id
      );

      setReports(myReports);
    } catch (err) {
      console.log(err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // DELETE REPORT
  // =========================
  const handleDelete = (id: number) => {
    Alert.alert(
      "Hapus Laporan",
      "Yakin ingin menghapus laporan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem("token");

              const response = await fetch(
                `http://localhost:5000/api/posts/${id}`,
                {
                  method: "DELETE",
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              const data = await response.json();

              if (!response.ok) {
                Alert.alert("Gagal", data.message || "Gagal menghapus laporan");
                return;
              }

              setReports(reports.filter((item) => item.id !== id));
              setSelectedReport(null);
              Alert.alert("Berhasil", "Laporan berhasil dihapus");
            } catch (err) {
              console.log(err);
              Alert.alert("Error", "Terjadi kesalahan");
            }
          },
        },
      ]
    );
  };

  // =========================
  // SEARCH + FILTER
  // =========================
  const filteredReports = (Array.isArray(reports) ? reports : []).filter(
    (report) => {
      const query = search.toLowerCase();
      const matchesSearch =
        report.header?.toLowerCase().includes(query) ||
        report.body?.toLowerCase().includes(query) ||
        report.location?.toLowerCase().includes(query) ||
        report.status?.toLowerCase().includes(query);

      const matchesFilter =
        filter === "All" ||
        report.status?.toLowerCase() === filter.toLowerCase();

      return matchesSearch && matchesFilter;
    }
  );

  // =========================
  // FETCH CHATS
  // =========================
  const fetchChats = async (reportId: number) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/chats/${reportId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();
      if (!response.ok) return;

      setChats(data);
    } catch (err) {
      console.log(err);
    }
  };

  // =========================
  // SEND CHAT
  // =========================
  const sendMessage = async () => {
    try {
      if (!chatMessage.trim() || !selectedReport) return;

      const token = await AsyncStorage.getItem("token");

      const response = await fetch("http://localhost:5000/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          public_report_id: selectedReport?.id,
          message: chatMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Gagal", data.message);
        return;
      }

      setChatMessage("");
      fetchChats(selectedReport.id);
    } catch (err) {
      console.log(err);
    }
  };

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
    (navigation as any).replace("Login");
  };

  // =========================
  // LOADING
  // =========================
  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c8956b" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // =========================
  // REPORT CARD
  // =========================
  const ReportCard = ({ report }: { report: any }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => {
        setSelectedReport(report);
        fetchChats(report.id);
      }}
    >
      <View style={styles.cardImageWrap}>
        <Image
          source={{
            uri: report.image
              ? `http://localhost:5000/uploads/${report.image}`
              : "https://placehold.co/400x200",
          }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardBadgePos}>
          <StatusBadge status={report.status} />
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {report.header}
        </Text>
        <Text style={styles.cardDate}>
          {report.created_at
            ? new Date(report.created_at).toLocaleDateString("id-ID")
            : ""}
        </Text>
        <Text style={styles.cardDesc} numberOfLines={3}>
          {report.body}
        </Text>
        <View style={styles.cardLocation}>
          <Feather name="map-pin" size={13} color="#9b8573" />
          <Text style={styles.cardLocationText}>{report.location || "-"}</Text>
        </View>

        {/* DELETE */}
        <TouchableOpacity
          onPress={() => handleDelete(report.id)}
          style={styles.deleteBtn}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#ef4444", "#f87171"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.deleteBtnGradient}
          >
            <Feather name="trash-2" size={15} color="#fff" />
            <Text style={styles.deleteBtnText}>Delete Report</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#5c2d0e" />

      {/* ─── TOPBAR ─── */}
      <LinearGradient
        colors={["#5c2d0e", "#7a3f1c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topbar}
      >
        <View style={styles.topbarLeft}>
          <Image
            source={{
              uri: profileImage
                ? profileImage
                : `https://ui-avatars.com/api/?name=${user.username}&background=c8956b&color=fff`,
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.topbarSub}>MY REPORTS</Text>
            <Text style={styles.topbarTitle}>Kelola laporan kamu ✨</Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color="#ffb088" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ─── SEARCH BAR ─── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <Feather name="search" size={17} color="#a07a5e" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Cari laporan..."
            placeholderTextColor="#b29c8b"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* ─── FILTER TABS ─── */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {["All", "Pending", "Approved", "Rejected"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              activeOpacity={0.8}
              style={styles.filterBtnWrap}
            >
              {filter === tab ? (
                <LinearGradient
                  colors={["#6f4324", "#8a5a39"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterBtnActive}
                >
                  <Text style={styles.filterBtnTextActive}>{tab}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.filterBtn}>
                  <Text style={styles.filterBtnText}>{tab}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ─── REPORT LIST ─── */}
      {filteredReports.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>Tidak ada laporan</Text>
          <Text style={styles.emptyDesc}>
            Laporan yang kamu buat akan muncul di sini
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ReportCard report={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ─── BOTTOM NAV ─── */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          onPress={() => (navigation as any).navigate("UserHomepage")}
          style={styles.navItem}
        >
          <Feather name="home" size={22} color="#9b7f6a" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (navigation as any).navigate("CreateReport")}
          style={styles.navItem}
        >
          <Feather name="plus-circle" size={22} color="#9b7f6a" />
          <Text style={styles.navLabel}>Create</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (navigation as any).navigate("MyReport")}
          style={styles.navItem}
        >
          <View style={styles.navActive}>
            <Feather name="file-text" size={22} color="#fff" />
          </View>
          <Text style={[styles.navLabel, { color: "#7a3f1c" }]}>My Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (navigation as any).navigate("Profile")}
          style={styles.navItem}
        >
          <Feather name="user" size={22} color="#9b7f6a" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ─── MODAL DETAIL ─── */}
      <Modal
        visible={!!selectedReport}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKAV}
          >
            <View style={styles.modalContainer}>

              {/* MODAL HEADER */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => setSelectedReport(null)}
                  style={styles.modalBackBtn}
                >
                  <Feather name="arrow-left" size={18} color="#3d2a20" />
                </TouchableOpacity>

                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selectedReport?.header}
                  </Text>
                  <Text style={styles.modalSubtitle}>Detail laporan</Text>
                </View>

                {selectedReport && (
                  <StatusBadge status={selectedReport.status} />
                )}
              </View>

              {/* MODAL SCROLL CONTENT */}
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{
                    uri: selectedReport?.image
                      ? `http://localhost:5000/uploads/${selectedReport.image}`
                      : "https://placehold.co/600x400",
                  }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />

                {/* META */}
                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Feather name="map-pin" size={14} color="#6f4324" />
                    <Text style={styles.metaChipText}>
                      {selectedReport?.location || "-"}
                    </Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Feather name="calendar" size={14} color="#6f4324" />
                    <Text style={styles.metaChipText}>
                      {selectedReport?.created_at
                        ? new Date(selectedReport.created_at).toLocaleDateString("id-ID")
                        : ""}
                    </Text>
                  </View>
                </View>

                {/* BODY */}
                <View style={styles.bodyBox}>
                  <Text style={styles.bodyText}>{selectedReport?.body}</Text>
                </View>

                {/* CHAT SECTION */}
                <View style={styles.chatSection}>
                  <View style={styles.chatHeader}>
                    <Feather name="message-circle" size={16} color="#a07a5e" />
                    <Text style={styles.chatHeaderText}>DISKUSI LAPORAN</Text>
                  </View>

                  {chats.length === 0 ? (
                    <Text style={styles.chatEmpty}>Belum ada pesan</Text>
                  ) : (
                    chats.map((chat) => (
                      <View
                        key={chat.id}
                        style={[
                          styles.chatBubbleWrap,
                          chat.sender_id === user.id
                            ? { alignItems: "flex-end" }
                            : { alignItems: "flex-start" },
                        ]}
                      >
                        {chat.sender_id === user.id ? (
                          <LinearGradient
                            colors={["#6f4324", "#8a5a39"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.chatBubble, styles.chatBubbleRight]}
                          >
                            <Text style={styles.chatBubbleTextWhite}>
                              {chat.message}
                            </Text>
                            <Text style={styles.chatBubbleTime}>
                              {new Date(chat.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View style={[styles.chatBubble, styles.chatBubbleLeft]}>
                            <Text style={styles.chatBubbleTextDark}>
                              {chat.message}
                            </Text>
                            <Text style={[styles.chatBubbleTime, { color: "#a07a5e" }]}>
                              {new Date(chat.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>

              {/* CHAT INPUT */}
              <View style={styles.chatInputWrap}>
                <View style={styles.chatInputRow}>
                  <TextInput
                    value={chatMessage}
                    onChangeText={setChatMessage}
                    placeholder="Ketik pesan..."
                    placeholderTextColor="#b29c8b"
                    style={styles.chatInput}
                  />
                  <TouchableOpacity onPress={sendMessage} activeOpacity={0.85}>
                    <LinearGradient
                      colors={["#6f4324", "#8a5a39"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.chatSendBtn}
                    >
                      <Feather name="send" size={17} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f7f3ef",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f3ef",
  },
  loadingText: {
    color: "#7a5c44",
    fontWeight: "600",
    fontSize: 14,
    marginTop: 8,
  },

  // ─── TOPBAR ───
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 16 : 14,
  },
  topbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#c8956b",
  },
  topbarSub: {
    fontSize: 10,
    color: "#e2c4a8",
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  topbarTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "800",
  },
  logoutBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── SEARCH ───
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f7f3ef",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eadfd4",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: "#5c2d0e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#2b1d15",
    padding: 0,
  },

  // ─── FILTER ───
  filterRow: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  filterBtnWrap: {
    marginHorizontal: 4,
  },
  filterBtnActive: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
  },
  filterBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eadfd4",
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7a5c44",
  },
  filterBtnTextActive: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },

  // ─── LIST ───
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },

  // ─── EMPTY ───
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#6f4324",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: "#9b8573",
    textAlign: "center",
  },

  // ─── CARD ───
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee5da",
    shadowColor: "#5c2d0e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    overflow: "hidden",
  },
  cardImageWrap: {
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 180,
  },
  cardBadgePos: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2b1d15",
  },
  cardDate: {
    fontSize: 11,
    color: "#a07a5e",
    marginTop: 3,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: "#6b5040",
    lineHeight: 19,
    marginBottom: 10,
  },
  cardLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
  },
  cardLocationText: {
    fontSize: 12,
    color: "#9b8573",
    marginLeft: 4,
  },
  deleteBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  deleteBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  deleteBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 6,
  },

  // ─── BADGE ───
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  // ─── BOTTOM NAV ───
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee5da",
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    elevation: 10,
    shadowColor: "#5c2d0e",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
  },
  navActive: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#7a3f1c",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 10,
    color: "#9b7f6a",
    fontWeight: "600",
    marginTop: 4,
  },

  // ─── MODAL ───
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalKAV: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: height * 0.9,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#f0ebe5",
  },
  modalBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#f5eee8",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2b1d15",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#9b8573",
    marginTop: 1,
  },
  modalScrollContent: {
    padding: 18,
    paddingBottom: 30,
  },
  modalImage: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f3ee",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  metaChipText: {
    fontSize: 13,
    color: "#6f4324",
    fontWeight: "600",
    marginLeft: 4,
  },
  bodyBox: {
    backgroundColor: "#fcfaf8",
    borderWidth: 1,
    borderColor: "#f0ebe5",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  bodyText: {
    fontSize: 14,
    color: "#5b4638",
    lineHeight: 22,
  },

  // ─── CHAT ───
  chatSection: {
    marginTop: 4,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  chatHeaderText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#a07a5e",
    letterSpacing: 1,
    marginLeft: 4,
  },
  chatEmpty: {
    fontSize: 13,
    color: "#b29c8b",
    textAlign: "center",
    marginVertical: 12,
  },
  chatBubbleWrap: {
    marginBottom: 10,
  },
  chatBubble: {
    maxWidth: "80%",
    padding: 13,
    borderRadius: 18,
  },
  chatBubbleRight: {
    borderTopRightRadius: 4,
  },
  chatBubbleLeft: {
    backgroundColor: "#f5eee8",
    borderTopLeftRadius: 4,
  },
  chatBubbleTextWhite: {
    fontSize: 13,
    color: "#fff",
    lineHeight: 19,
  },
  chatBubbleTextDark: {
    fontSize: 13,
    color: "#3d2a20",
    lineHeight: 19,
  },
  chatBubbleTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    textAlign: "right",
    marginTop: 5,
  },
  chatInputWrap: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "#f0ebe5",
    backgroundColor: "#fcfaf8",
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eadfd4",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 13,
    color: "#2b1d15",
    paddingVertical: 6,
  },
  chatSendBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
});