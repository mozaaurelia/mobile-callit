import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  Animated,
} from "react-native";

// =====================================================
// EXPO PACKAGES — install dengan:
//   npx expo install expo-linear-gradient
//   npx expo install expo-image-picker
//   npx expo install @react-native-async-storage/async-storage
//   npx expo install @expo/vector-icons
// =====================================================
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export default function ProfilePage() {
  const navigation = useNavigation<any>();

  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // CEK LOGIN + ROLE USER
  // =========================
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");

      if (!token || !storedUser) {
        (navigation as any).replace("Login");
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      if (parsedUser.role !== "user") {
        (navigation as any).replace("Login");
        return;
      }

      setUser(parsedUser);
      setUsername(parsedUser.username);

      const savedProfile = await AsyncStorage.getItem(
        `profileImage_${parsedUser.id}`
      );

      setProfileImage(
        savedProfile ||
          parsedUser.profileImage ||
          `https://ui-avatars.com/api/?name=${parsedUser.username}&background=c8956b&color=fff`
      );

      setLoading(false);
      fetchActivities(token);
    };

    init();
  }, []);

  // =========================
  // FETCH AKTIVITAS USER
  // =========================
  const fetchActivities = async (token: string) => {
    try {
      const res = await fetch("http://localhost:5000/api/posts", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (Array.isArray(data)) {
        setActivities(data);
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.log("FETCH ACTIVITY ERROR:", err);
    }
  };

  // =========================
  // GANTI FOTO
  // =========================
  const handlePhotoChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Izin Diperlukan", "Izin akses galeri diperlukan.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const base64Uri = `data:image/jpeg;base64,${asset.base64}`;

    setProfileImage(base64Uri);
    if (user) {
      await AsyncStorage.setItem(`profileImage_${user.id}`, base64Uri);
    }
  };

  // =========================
  // UPDATE PROFILE
  // =========================
  const handleSave = async () => {
    try {
      if (!user) return;

      const token = await AsyncStorage.getItem("token");

      const res = await fetch("http://localhost:5000/api/users/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username,
          email: user.email,
          profileImage,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Gagal", data.message || "Gagal update");
        return;
      }

      const updatedUser = { ...user, username, profileImage };

      setUser(updatedUser);
      await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
      await AsyncStorage.setItem(`profileImage_${user.id}`, profileImage);

      setIsEditing(false);
      Alert.alert("Berhasil", "Profile berhasil diupdate");
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Server error");
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
        <View>
          <Text style={styles.topbarSub}>USER PROFILE</Text>
          <Text style={styles.topbarTitle}>Profile Saya</Text>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={18} color="#ffb088" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ─── PROFILE HERO CARD ─── */}
        <LinearGradient
          colors={["#5c2d0e", "#7a3f1c", "#c8956b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* AVATAR */}
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: profileImage }}
              style={styles.avatar}
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={handlePhotoChange}
              style={styles.cameraBtn}
            >
              <LinearGradient
                colors={["#8b5e3c", "#b37b56"]}
                style={styles.cameraBtnGradient}
              >
                <Feather name="camera" size={16} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroName}>{username}</Text>

          <View style={styles.heroEmailRow}>
            <Feather name="mail" size={14} color="#f0d5b8" />
            <Text style={styles.heroEmail}>{user?.email || "N/A"}</Text>
          </View>
        </LinearGradient>

        {/* ─── EDIT PROFILE CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Feather name="edit-2" size={18} color="#5c2d0e" />
              <Text style={styles.cardTitle}>Edit Profile</Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsEditing(!isEditing)}
              style={[
                styles.editToggleBtn,
                isEditing && styles.editToggleBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.editToggleBtnText,
                  isEditing && styles.editToggleBtnTextActive,
                ]}
              >
                {isEditing ? "Batal" : "Edit"}
              </Text>
            </TouchableOpacity>
          </View>

          {isEditing && (
            <View style={styles.editForm}>
              {/* USERNAME INPUT */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Username</Text>
                <View style={styles.inputRow}>
                  <Feather
                    name="user"
                    size={16}
                    color="#8b735f"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Username"
                    placeholderTextColor="#b29c8b"
                    style={styles.input}
                  />
                </View>
              </View>

              {/* CHANGE PHOTO BTN */}
              <TouchableOpacity
                onPress={handlePhotoChange}
                style={styles.photoBtn}
                activeOpacity={0.8}
              >
                <Feather name="camera" size={18} color="#6f4324" />
                <Text style={styles.photoBtnText}>Ganti Foto Profile</Text>
              </TouchableOpacity>

              {/* SAVE BTN */}
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.85}
                style={styles.saveBtnWrap}
              >
                <LinearGradient
                  colors={["#8b5e3c", "#b37b56"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
                >
                  <Feather name="check" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Simpan Perubahan</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ─── ACCOUNT SETTINGS CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderLeft}>
            <Feather name="shield" size={18} color="#5c2d0e" />
            <Text style={styles.cardTitle}>Pengaturan Akun</Text>
          </View>

          <View style={styles.settingItemRow}>
            <View style={styles.settingIconWrap}>
              <Feather name="bell" size={20} color="#8a6548" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Notifikasi</Text>
              <Text style={styles.settingDesc}>Kelola notifikasi akun</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#c8a98b" />
          </View>
        </View>

        {/* ─── ACTIVITY CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderLeft}>
            <Feather name="file-text" size={18} color="#5c2d0e" />
            <Text style={styles.cardTitle}>Aktivitas</Text>
          </View>

          {activities.length > 0 ? (
            activities.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityLabel}>Membuat laporan</Text>
                  <Text style={styles.activityHeader}>{item.header}</Text>
                  <Text style={styles.activityCategory}>
                    {item.category_name}
                  </Text>
                </View>
                <Text style={styles.activityDate}>
                  {new Date(item.created_at).toLocaleDateString("id-ID")}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityText}>
                Belum ada aktivitas laporan
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

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
          <Feather name="file-text" size={22} color="#9b7f6a" />
          <Text style={styles.navLabel}>My Reports</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => (navigation as any).navigate("Profile")}
          style={styles.navItem}
        >
          <View style={styles.navActive}>
            <Feather name="user" size={22} color="#fff" />
          </View>
          <Text style={[styles.navLabel, { color: "#7a3f1c" }]}>Profile</Text>
        </TouchableOpacity>
      </View>
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
  topbarSub: {
    fontSize: 10,
    color: "#e2c4a8",
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  topbarTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "800",
    marginTop: 2,
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── SCROLL ───
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
    gap: 16,
  },

  // ─── HERO ───
  heroCard: {
    borderRadius: 28,
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    shadowColor: "#5c2d0e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: "#fff",
  },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  cameraBtnGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#fff",
  },
  heroName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 10,
  },
  heroEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
  },
  heroEmail: {
    fontSize: 13,
    color: "#f0d5b8",
    fontWeight: "600",
    marginLeft: 4,
  },

  // ─── CARD ───
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#f0e4d8",
    shadowColor: "#5c2d0e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
    gap: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#3d2f25",
    marginLeft: 6,
  },
  editToggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eadfd3",
    backgroundColor: "#faf7f4",
  },
  editToggleBtnActive: {
    backgroundColor: "#fee2d5",
    borderColor: "#f8bfa5",
  },
  editToggleBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5b4636",
  },
  editToggleBtnTextActive: {
    color: "#7a3f1c",
  },

  // ─── EDIT FORM ───
  editForm: {
    gap: 14,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5c4434",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f4ef",
    borderWidth: 1,
    borderColor: "#eadfd3",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#2b1d15",
    padding: 0,
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#f8f4ef",
    borderWidth: 1,
    borderColor: "#e7d7c8",
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6f4324",
    marginLeft: 6,
  },
  saveBtnWrap: {
    borderRadius: 16,
    overflow: "hidden",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    gap: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    marginLeft: 6,
  },

  // ─── SETTINGS ───
  settingItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf7f4",
    borderWidth: 1,
    borderColor: "#efe5db",
    borderRadius: 18,
    padding: 14,
    gap: 14,
  },
  settingIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5c2d0e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3d2f25",
  },
  settingDesc: {
    fontSize: 12,
    color: "#8c7665",
    marginTop: 2,
  },

  // ─── ACTIVITY ───
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#fcfaf8",
    borderWidth: 1,
    borderColor: "#f1e7dd",
    borderRadius: 18,
    padding: 14,
  },
  activityDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#b37b56",
    marginTop: 4,
  },
  activityLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3d2f25",
  },
  activityHeader: {
    fontSize: 13,
    color: "#8c7665",
    marginTop: 2,
  },
  activityCategory: {
    fontSize: 11,
    color: "#b39a87",
    marginTop: 2,
  },
  activityDate: {
    fontSize: 11,
    color: "#b39a87",
    flexShrink: 0,
  },
  emptyActivity: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyActivityText: {
    fontSize: 14,
    color: "#9c8573",
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
});