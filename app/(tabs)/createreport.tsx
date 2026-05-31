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
  Dimensions,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const CATEGORIES = [
  { id: 1, label: "Jalan Rusak" },
  { id: 2, label: "Sampah" },
  { id: 3, label: "Lampu Jalan" },
  { id: 4, label: "Banjir" },
];

// ─── Ganti dengan IP lokal laptop kamu ───────────────────────────────────
const BASE_URL = "http://localhost:5000"
// ─────────────────────────────────────────────────────────────────────────

export default function CreateReportPage() {
  const navigation = useNavigation<any>();

  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState("");

  const [header, setHeader] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(1);
  const [location, setLocation] = useState("");
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  // Track field mana yang sudah disentuh (untuk warna border merah)
  const [touched, setTouched] = useState({
    header: false,
    location: false,
    body: false,
    image: false,
  });

  // =========================
  // PROTECT PAGE
  // =========================
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem("token");
      const userStr = await AsyncStorage.getItem("user");

      if (!token || !userStr) {
        navigation.replace("Login");
        return;
      }

      const parsedUser = JSON.parse(userStr);
      if (parsedUser.role !== "user") {
        navigation.replace("Login");
        return;
      }

      setUser(parsedUser);

      const savedProfile = await AsyncStorage.getItem(`profileImage_${parsedUser.id}`);
      if (savedProfile) setProfileImage(savedProfile);
    };

    init();
  }, []);

  // =========================
  // HANDLE UPLOAD IMAGE
  // =========================
  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Izin Diperlukan", "Izin akses galeri diperlukan untuk upload foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setImage(asset);
    // Normalisasi URI untuk iOS (hapus file:// prefix jika ada)
    const previewUri = Platform.OS === "ios"
      ? asset.uri.replace("file://", "")
      : asset.uri;
    setPreview(previewUri);
    setTouched((prev) => ({ ...prev, image: true }));
  };

  // =========================
  // VALIDASI — cek semua field terisi
  // =========================
  const validate = (): { valid: boolean; missing: string[] } => {
    const missing: string[] = [];

    if (!image) missing.push("📷 Foto bukti");
    if (!header.trim()) missing.push("📝 Judul laporan");
    if (!location.trim()) missing.push("📍 Lokasi");
    if (!body.trim()) missing.push("📄 Deskripsi");

    return { valid: missing.length === 0, missing };
  };

  // =========================
  // RESET FORM
  // =========================
  const resetForm = () => {
    setHeader("");
    setBody("");
    setCategory(1);
    setLocation("");
    setImage(null);
    setPreview(null);
    setTouched({ header: false, location: false, body: false, image: false });
  };

  // =========================
  // HANDLE SUBMIT
  // =========================
  const handleSubmit = async () => {
    // Tandai semua field sudah disentuh agar border merah muncul
    setTouched({ header: true, location: true, body: true, image: true });

    const { valid, missing } = validate();

    // ── Validasi gagal → tampilkan notif detail ──────────────────────
    if (!valid) {
      Alert.alert(
        "Laporan Tidak Lengkap ⚠️",
        `Kamu belum mengisi:\n\n${missing.join("\n")}\n\nLengkapi semua field sebelum mengirim laporan.`,
        [{ text: "Oke, Lengkapi", style: "default" }]
      );
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Error", "Silahkan login terlebih dahulu");
        return;
      }

      const formData = new FormData();
      formData.append("header", header);
      formData.append("body", `Lokasi: ${location}\n\n${body}`);
      formData.append("category_id", String(category));
      formData.append("location", location);

      if (image) {
        if (Platform.OS === "web") {
          const imgResponse = await fetch(image.uri);
          const blob = await imgResponse.blob();

          formData.append(
            "image",
            blob,
            `photo_${Date.now()}.jpg`
          );
        } else {
          const uriParts = image.uri.split(".");
          const ext = uriParts[uriParts.length - 1]?.toLowerCase() || "jpg";

          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            png: "image/png",
            gif: "image/gif",
            webp: "image/webp",
          };

          formData.append("image", {
            uri: image.uri,
            name: `photo_${Date.now()}.${ext}`,
            type: mimeMap[ext] || "image/jpeg",
          } as any);
        }
      }

      console.log("FORMDATA====", formData)
      const response = await fetch(`${BASE_URL}/api/posts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // JANGAN set Content-Type — biarkan fetch set boundary FormData otomatis
        },
        body: formData,
      });
      // console.log("===============", await response.json());
      // console.log(body)


      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Gagal", data.message || "Gagal membuat laporan");
        return;
      }

      // ── Berhasil → notif dengan opsi navigasi ────────────────────
      // Setelah user memilih, useFocusEffect di Homepage akan otomatis
      // re-fetch data sehingga laporan baru langsung muncul di card.
      Alert.alert(
        "Laporan Berhasil Dikirim! ✅",
        `Laporan "${header}" kamu sudah masuk dan sedang diproses.\n\nKamu bisa memantau status laporan di halaman My Reports.`,
        [
          {
            text: "Cek My Reports",
            onPress: () => {
              resetForm();
              navigation.navigate("MyReport");
            },
          },
          {
            text: "Ke Homepage",
            onPress: () => {
              resetForm();
              // useFocusEffect di UserHomepage akan otomatis re-fetch
              // begitu layar ini mendapat fokus kembali
              navigation.navigate("UserHomepage");
            },
          },
          {
            text: "Buat Laporan Baru",
            style: "cancel",
            onPress: () => resetForm(),
          },
        ],
        { cancelable: false }
      );

    } catch (error) {
      console.log("SUBMIT ERROR:", error);
      Alert.alert("Error", "Terjadi kesalahan saat mengirim laporan");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c8956b" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const selectedCategory = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  // Apakah form sudah lengkap (untuk warna tombol)
  const isFormComplete = !!image && !!header.trim() && !!location.trim() && !!body.trim();

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.topbarCenter}>
          <Text style={styles.topbarSub}>CREATE NEW REPORT</Text>
          <Text style={styles.topbarTitle}>Make a Complaint 📝</Text>
        </View>

        <Image
          source={{
            uri: profileImage
              ? profileImage
              : `https://ui-avatars.com/api/?name=${user.username}&background=c8956b&color=fff`,
          }}
          style={styles.avatar}
        />
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── HERO BANNER ─── */}
        <LinearGradient
          colors={["#5c2d0e", "#7a3f1c", "#c8956b"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>📢 CITIZEN COMPLAINT FORM</Text>
          </View>
          <Text style={styles.heroTitle}>Report Problems Easily</Text>
          <Text style={styles.heroDesc}>
            Submit complaints about damaged roads, floods, garbage, public
            facilities, and more directly from your dashboard.
          </Text>
        </LinearGradient>

        {/* ─── FORM CARD ─── */}
        <View style={styles.card}>

          {/* ── UPLOAD PHOTO ── */}
          <View style={styles.uploadSection}>
            <View style={styles.uploadLabelRow}>
              <Text style={styles.sectionTitle}>Upload Evidence Photo</Text>
              <Text style={styles.required}>* Wajib</Text>
            </View>

            <TouchableOpacity
              onPress={handleUpload}
              style={[
                styles.uploadBox,
                touched.image && !image && styles.uploadBoxError,
              ]}
              activeOpacity={0.85}
            >
              {preview ? (
                <>
                  <Image source={{ uri: preview }} style={styles.uploadPreview} resizeMode="cover" />
                  <View style={styles.uploadChangeOverlay}>
                    <Feather name="camera" size={18} color="#fff" />
                    <Text style={styles.uploadChangeText}>Ganti Foto</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={[
                    styles.uploadIconWrap,
                    touched.image && !image && { backgroundColor: "#fee2e2" },
                  ]}>
                    <Feather
                      name="camera"
                      size={26}
                      color={touched.image && !image ? "#ef4444" : "#7a5133"}
                    />
                  </View>
                  <Text style={[
                    styles.uploadLabel,
                    touched.image && !image && { color: "#ef4444" },
                  ]}>
                    {touched.image && !image ? "Foto wajib diupload!" : "Upload Photo"}
                  </Text>
                  <Text style={styles.uploadHint}>PNG, JPG • Max 5MB</Text>
                </>
              )}
            </TouchableOpacity>

            {touched.image && !image && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.errorText}>Foto bukti wajib diupload</Text>
              </View>
            )}
          </View>

          {/* ── TITLE ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Report Title</Text>
              <Text style={styles.required}>* Wajib</Text>
            </View>
            <View style={[
              styles.inputRow,
              touched.header && !header.trim() && styles.inputRowError,
            ]}>
              <Feather name="file-text" size={17} color={touched.header && !header.trim() ? "#ef4444" : "#8b735f"} style={styles.inputIcon} />
              <TextInput
                placeholder="Contoh: Jalan berlubang di Jl. Sudirman"
                placeholderTextColor="#b29c8b"
                value={header}
                onChangeText={setHeader}
                onBlur={() => setTouched((p) => ({ ...p, header: true }))}
                style={styles.input}
              />
            </View>
            {touched.header && !header.trim() && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.errorText}>Judul laporan wajib diisi</Text>
              </View>
            )}
          </View>

          {/* ── CATEGORY ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Category</Text>
            <TouchableOpacity
              onPress={() => setCategoryOpen(!categoryOpen)}
              style={styles.inputRow}
              activeOpacity={0.8}
            >
              <Feather name="tag" size={17} color="#8b735f" style={styles.inputIcon} />
              <Text style={styles.selectText}>{selectedCategory.label}</Text>
              <Feather name={categoryOpen ? "chevron-up" : "chevron-down"} size={17} color="#8b735f" />
            </TouchableOpacity>

            {categoryOpen && (
              <View style={styles.dropdown}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => { setCategory(cat.id); setCategoryOpen(false); }}
                    style={[styles.dropdownItem, cat.id === category && styles.dropdownItemActive]}
                  >
                    <Text style={[styles.dropdownItemText, cat.id === category && styles.dropdownItemTextActive]}>
                      {cat.label}
                    </Text>
                    {cat.id === category && <Feather name="check" size={15} color="#7a3f1c" />}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* ── LOCATION ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Location</Text>
              <Text style={styles.required}>* Wajib</Text>
            </View>
            <View style={[
              styles.inputRow,
              touched.location && !location.trim() && styles.inputRowError,
            ]}>
              <Feather name="map-pin" size={17} color={touched.location && !location.trim() ? "#ef4444" : "#8b735f"} style={styles.inputIcon} />
              <TextInput
                placeholder="Jl. Sudirman No. 123"
                placeholderTextColor="#b29c8b"
                value={location}
                onChangeText={setLocation}
                onBlur={() => setTouched((p) => ({ ...p, location: true }))}
                style={styles.input}
              />
            </View>
            {touched.location && !location.trim() && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.errorText}>Lokasi wajib diisi</Text>
              </View>
            )}
          </View>

          {/* ── DESCRIPTION ── */}
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Description</Text>
              <Text style={styles.required}>* Wajib</Text>
            </View>
            <View style={[
              styles.inputRow,
              styles.textareaRow,
              touched.body && !body.trim() && styles.inputRowError,
            ]}>
              <Feather
                name="edit-2"
                size={17}
                color={touched.body && !body.trim() ? "#ef4444" : "#8b735f"}
                style={[styles.inputIcon, { marginTop: 2 }]}
              />
              <TextInput
                placeholder="Jelaskan detail permasalahan..."
                placeholderTextColor="#b29c8b"
                value={body}
                onChangeText={setBody}
                onBlur={() => setTouched((p) => ({ ...p, body: true }))}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={[styles.input, styles.textarea]}
              />
            </View>
            {touched.body && !body.trim() && (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={12} color="#ef4444" />
                <Text style={styles.errorText}>Deskripsi wajib diisi</Text>
              </View>
            )}
          </View>

          {/* ── PROGRESS INDICATOR ── */}
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                {
                  width: `${([!!image, !!header.trim(), !!location.trim(), !!body.trim()]
                    .filter(Boolean).length / 4) * 100
                    }%`,
                },
              ]} />
            </View>
            <Text style={styles.progressText}>
              {[!!image, !!header.trim(), !!location.trim(), !!body.trim()].filter(Boolean).length}/4 field terisi
            </Text>
          </View>

          {/* ── SUBMIT BUTTON ── */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={styles.submitBtnWrapper}
          >
            <LinearGradient
              colors={isFormComplete ? ["#6f4324", "#8a5a39"] : ["#b0a098", "#c4b8b0"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtn}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.submitBtnText}>Mengirim...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Kirim Laporan</Text>
                  <Feather name="send" size={17} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {!isFormComplete ? (
            <View style={styles.incompleteHint}>
              <Feather name="info" size={13} color="#a07a5e" />
              <Text style={styles.incompleteHintText}>
                Lengkapi semua field bertanda * untuk mengirim laporan
              </Text>
            </View>
          ) : (
            <Text style={styles.submitNote}>Laporan akan diproses dalam 24 jam</Text>
          )}
        </View>

        {/* ─── BOTTOM NAV ─── */}
        <View style={styles.bottomNav}>
          <TouchableOpacity onPress={() => navigation.navigate("homepage")} style={styles.navItem}>
            <Feather name="home" size={22} color="#9b7f6a" />
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("createreport")} style={styles.navItem}>
            <View style={styles.navActive}>
              <Feather name="plus-circle" size={22} color="#fff" />
            </View>
            <Text style={[styles.navLabel, { color: "#7a3f1c" }]}>Create</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("myreport")} style={styles.navItem}>
            <Feather name="file-text" size={22} color="#9b7f6a" />
            <Text style={styles.navLabel}>My Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("profile")} style={styles.navItem}>
            <Feather name="user" size={22} color="#9b7f6a" />
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// =========================
// STYLES
// =========================
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f3ef" },
  loadingContainer: {
    flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f3ef",
  },
  loadingText: { color: "#7a5c44", fontWeight: "600", fontSize: 14, marginTop: 8 },

  topbar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 16 : 14, gap: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  topbarCenter: { flex: 1 },
  topbarSub: { fontSize: 10, color: "#e2c4a8", fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  topbarTitle: { fontSize: 18, color: "#fff", fontWeight: "800", marginTop: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: "#c8956b" },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  heroBanner: { margin: 16, borderRadius: 24, padding: 22, paddingBottom: 26 },
  heroBadge: {
    alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12,
  },
  heroBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  heroTitle: { fontSize: 26, fontWeight: "900", color: "#fff", marginBottom: 8 },
  heroDesc: { fontSize: 13, color: "#f0d5b8", lineHeight: 19 },

  card: {
    marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 28,
    padding: 20, shadowColor: "#5c2d0e", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
    borderWidth: 1, borderColor: "#eee5da", marginBottom: 16,
  },

  uploadSection: { marginBottom: 22 },
  uploadLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#2b1d15" },
  required: { fontSize: 11, fontWeight: "700", color: "#ef4444" },

  uploadBox: {
    borderWidth: 2, borderStyle: "dashed", borderColor: "#d9c5b2",
    borderRadius: 20, height: 170, alignItems: "center", justifyContent: "center",
    backgroundColor: "#fcfaf8", overflow: "hidden",
  },
  uploadBoxError: {
    borderColor: "#ef4444", backgroundColor: "#fff5f5",
  },
  uploadPreview: { width: "100%", height: "100%", position: "absolute" },
  uploadChangeOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 10,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6,
  },
  uploadChangeText: { color: "#fff", fontWeight: "700", fontSize: 13, marginLeft: 4 },
  uploadIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "#f2e6da", alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  uploadLabel: { fontSize: 14, fontWeight: "700", color: "#5c3b27" },
  uploadHint: { fontSize: 12, color: "#9b8573", marginTop: 4 },

  errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 5 },
  errorText: { fontSize: 11, color: "#ef4444", fontWeight: "600" },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: "#3b2a1f" },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fcfaf8", borderWidth: 1, borderColor: "#eadfd4",
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
  },
  inputRowError: { borderColor: "#ef4444", backgroundColor: "#fff5f5" },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 13, color: "#2b1d15", padding: 0 },
  textareaRow: { alignItems: "flex-start", paddingVertical: 12 },
  textarea: { height: 100, textAlignVertical: "top" },
  selectText: { flex: 1, fontSize: 13, color: "#2b1d15" },

  dropdown: {
    marginTop: 6, backgroundColor: "#fff", borderWidth: 1,
    borderColor: "#eadfd4", borderRadius: 14, overflow: "hidden", elevation: 4,
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: "#f5ece4",
  },
  dropdownItemActive: { backgroundColor: "#fdf5ee" },
  dropdownItemText: { fontSize: 13, color: "#5c3b27", fontWeight: "600" },
  dropdownItemTextActive: { color: "#7a3f1c", fontWeight: "700" },

  progressWrap: { marginBottom: 16, gap: 6 },
  progressBar: {
    height: 6, borderRadius: 3, backgroundColor: "#f0e5d8", overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: "#7a3f1c" },
  progressText: { fontSize: 11, color: "#a07a5e", fontWeight: "600", textAlign: "right" },

  submitBtnWrapper: { borderRadius: 18, overflow: "hidden", elevation: 6 },
  submitBtn: {
    height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.3 },

  incompleteHint: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 12,
  },
  incompleteHintText: { fontSize: 12, color: "#a07a5e", textAlign: "center", flex: 1 },
  submitNote: { textAlign: "center", color: "#9b8573", fontSize: 12, marginTop: 14 },

  bottomNav: {
    flexDirection: "row", backgroundColor: "#fff",
    marginHorizontal: 16, marginBottom: 16, borderRadius: 24,
    paddingVertical: 12, paddingHorizontal: 8,
    justifyContent: "space-around", elevation: 6,
    borderWidth: 1, borderColor: "#eee5da",
  },
  navItem: { flex: 1, alignItems: "center" },
  navActive: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: "#7a3f1c", alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  navLabel: { fontSize: 11, color: "#9b7f6a", fontWeight: "600", marginTop: 4 },
});