import React, { useEffect, useRef, useState } from "react";
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
  Modal,
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

const BASE_URL = "http://localhost:5000";

// ─────────────────────────────────────────────────────
// REVERSE GEOCODE HELPER
// ─────────────────────────────────────────────────────
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    const a = data.address || {};
    const road     = a.road || a.pedestrian || a.residential || "";
    const village  = a.village || a.suburb || a.hamlet || a.neighbourhood || "";
    const city     = a.city || a.town || a.county || "";
    const parts    = [road, village, city].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : data.display_name;
  } catch {
    return `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
  }
};

// ─────────────────────────────────────────────────────
// MAP HTML
// ─────────────────────────────────────────────────────
const buildMapHtml = (lat: number, lng: number) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: calc(100% - 40px); }
    #info {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: rgba(92,45,14,0.92); color: #fff;
      font-size: 12px; text-align: center;
      padding: 10px 16px; z-index: 9999; font-family: sans-serif;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="info">Ketuk peta untuk memilih lokasi</div>
  <script>
    var map = L.map('map').setView([${lat}, ${lng}], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 19,
    }).addTo(map);
    var marker = L.marker([${lat}, ${lng}]).addTo(map);
    map.on('click', function(e) {
      var newLat = e.latlng.lat;
      var newLng = e.latlng.lng;
      marker.setLatLng([newLat, newLng]);
      document.getElementById('info').textContent = 'Memuat alamat...';
      fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + newLat + '&lon=' + newLng)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          var a = data.address || {};
          var road    = a.road || a.pedestrian || a.residential || '';
          var village = a.village || a.suburb || a.hamlet || a.neighbourhood || '';
          var city    = a.city || a.town || a.county || '';
          var parts   = [road, village, city].filter(Boolean);
          var label   = parts.length > 0 ? parts.join(', ') : data.display_name;
          document.getElementById('info').textContent = label;
          var msg = JSON.stringify({ lat: newLat, lng: newLng, label: label });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(msg);
          } else {
            window.parent.postMessage(msg, '*');
          }
        })
        .catch(function() {
          var label = 'Lat: ' + newLat.toFixed(5) + ', Lng: ' + newLng.toFixed(5);
          document.getElementById('info').textContent = label;
          var msg = JSON.stringify({ lat: newLat, lng: newLng, label: label });
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(msg);
          } else {
            window.parent.postMessage(msg, '*');
          }
        });
    });
  </script>
</body>
</html>
`;

// ─────────────────────────────────────────────────────
// MAP PICKER MODAL
// ─────────────────────────────────────────────────────
const MapPickerModal = ({
  visible,
  initialLat,
  initialLng,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initialLat: number;
  initialLng: number;
  onConfirm: (lat: number, lng: number, label: string) => void;
  onClose: () => void;
}) => {
  const [pendingLat,   setPendingLat]   = useState<number | null>(null);
  const [pendingLng,   setPendingLng]   = useState<number | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const iframeRef = useRef<any>(null);

  const mapHtml = buildMapHtml(initialLat, initialLng);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const handler = (e: any) => {
      try {
        const data = JSON.parse(e.data);
        if (data.lat !== undefined && data.lng !== undefined) {
          setPendingLat(data.lat);
          setPendingLng(data.lng);
          setPendingLabel(data.label || null);
        }
      } catch (_) {}
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const handleConfirm = () => {
    if (pendingLat !== null && pendingLng !== null) {
      onConfirm(pendingLat, pendingLng, pendingLabel || `Lat: ${pendingLat.toFixed(5)}, Lng: ${pendingLng.toFixed(5)}`);
    } else {
      onConfirm(initialLat, initialLng, `Lat: ${initialLat.toFixed(5)}, Lng: ${initialLng.toFixed(5)}`);
    }
    setPendingLat(null);
    setPendingLng(null);
    setPendingLabel(null);
  };

  const handleClose = () => {
    setPendingLat(null);
    setPendingLng(null);
    setPendingLabel(null);
    onClose();
  };

  const ModalContent = (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#5c2d0e" }}>
      {/* Header */}
      <View style={mapStyles.header}>
        <TouchableOpacity onPress={handleClose} style={mapStyles.closeBtn}>
          <Feather name="x" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={mapStyles.headerTitle}>Pilih Lokasi di Peta</Text>
        <TouchableOpacity
          onPress={handleConfirm}
          style={[mapStyles.confirmBtn, pendingLat === null && { opacity: 0.5 }]}
        >
          <Feather name="check" size={16} color="#fff" />
          <Text style={mapStyles.confirmText}>Pilih</Text>
        </TouchableOpacity>
      </View>

      {/* Coord bar */}
      {pendingLabel !== null && (
        <View style={mapStyles.coordBar}>
          <Feather name="map-pin" size={12} color="#c8956b" />
          <Text style={mapStyles.coordText} numberOfLines={1}>{pendingLabel}</Text>
        </View>
      )}

      {/* Map */}
      {Platform.OS === "web" ? (
        <iframe
          ref={iframeRef}
          srcDoc={mapHtml}
          style={{ flex: 1, border: "none", width: "100%", height: "100%" } as any}
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        (() => {
          const RNWebView = require("react-native-webview").WebView;
          return (
            <RNWebView
              originWhitelist={["*"]}
              source={{ html: mapHtml }}
              onMessage={(event: any) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  setPendingLat(data.lat);
                  setPendingLng(data.lng);
                  setPendingLabel(data.label || null);
                } catch (_) {}
              }}
              style={{ flex: 1 }}
              javaScriptEnabled
              domStorageEnabled
            />
          );
        })()
      )}
    </SafeAreaView>
  );

  if (Platform.OS === "web") {
    if (!visible) return null;
    return <Modal visible={visible} animationType="slide" transparent={false}>{ModalContent}</Modal>;
  }
  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      {ModalContent}
    </Modal>
  );
};

const mapStyles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#5c2d0e", gap: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: "#fff" },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#c8956b", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  coordBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fdf5ee", paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#e8d9cc",
  },
  coordText: { fontSize: 12, color: "#5c2d0e", fontWeight: "600", flex: 1 },
});

// ─────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────
export default function CreateReportPage() {
  const navigation = useNavigation<any>();

  const [user, setUser]               = useState<any>(null);
  const [profileImage, setProfileImage] = useState("");

  const [header,   setHeader]   = useState("");
  const [body,     setBody]     = useState("");
  const [category, setCategory] = useState(1);
  const [location, setLocation] = useState("");
  const [image,    setImage]    = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [preview,  setPreview]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  const [locationMode, setLocationMode] = useState<"type" | "map">("type");
  const [mapVisible,   setMapVisible]   = useState(false);
  const [mapLat,       setMapLat]       = useState(-6.2);
  const [mapLng,       setMapLng]       = useState(106.816666);
  const [geoLoading,   setGeoLoading]   = useState(false);

  const [touched, setTouched] = useState({
    header: false, location: false, body: false, image: false,
  });

  // ── PROTECT PAGE ──
  useEffect(() => {
    const init = async () => {
      const token   = await AsyncStorage.getItem("token");
      const userStr = await AsyncStorage.getItem("user");
      if (!token || !userStr) { navigation.replace("Login"); return; }
      const parsedUser = JSON.parse(userStr);
      if (parsedUser.role !== "user") { navigation.replace("Login"); return; }
      setUser(parsedUser);
      const savedProfile = await AsyncStorage.getItem(`profileImage_${parsedUser.id}`);
      if (savedProfile) setProfileImage(savedProfile);
    };
    init();
  }, []);

  // ── UPLOAD IMAGE ──
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
    setPreview(Platform.OS === "ios" ? asset.uri.replace("file://", "") : asset.uri);
    setTouched((p) => ({ ...p, image: true }));
  };

  // ── GPS ──
  const handleCurrentLocation = () => {
    if (!navigator?.geolocation) {
      Alert.alert("Error", "Geolocation tidak didukung di perangkat ini");
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setMapLat(lat);
        setMapLng(lng);
        const label = await reverseGeocode(lat, lng);
        setLocation(label);
        setGeoLoading(false);
      },
      () => {
        Alert.alert("Gagal", "Tidak dapat mengambil lokasi. Pastikan GPS aktif.");
        setGeoLoading(false);
      }
    );
  };

  // ── MAP CONFIRM — label sudah dikirim dari map ──
  const handleMapConfirm = (lat: number, lng: number, label: string) => {
    setMapLat(lat);
    setMapLng(lng);
    setLocation(label);
    setMapVisible(false);
  };

  // ── VALIDASI ──
  const validate = () => {
    const missing: string[] = [];
    if (!image)          missing.push("📷 Foto bukti");
    if (!header.trim())  missing.push("📝 Judul laporan");
    if (!location.trim()) missing.push("📍 Lokasi");
    if (!body.trim())    missing.push("📄 Deskripsi");
    return { valid: missing.length === 0, missing };
  };

  // ── RESET ──
  const resetForm = () => {
    setHeader(""); setBody(""); setCategory(1); setLocation("");
    setImage(null); setPreview(null); setLocationMode("type");
    setMapLat(-6.2); setMapLng(106.816666);
    setTouched({ header: false, location: false, body: false, image: false });
  };

  // ── SUBMIT ──
  const handleSubmit = async () => {
    setTouched({ header: true, location: true, body: true, image: true });
    const { valid, missing } = validate();
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
      if (!token) { Alert.alert("Error", "Silahkan login terlebih dahulu"); return; }

      const formData = new FormData();
      formData.append("header", header);
      formData.append("body", `Lokasi: ${location}\n\n${body}`);
      formData.append("category_id", String(category));
      formData.append("location", location);

      if (image) {
        if (Platform.OS === "web") {
          const imgResponse = await fetch(image.uri);
          const blob = await imgResponse.blob();
          formData.append("image", blob, `photo_${Date.now()}.jpg`);
        } else {
          const ext = image.uri.split(".").pop()?.toLowerCase() || "jpg";
          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg", jpeg: "image/jpeg",
            png: "image/png", gif: "image/gif", webp: "image/webp",
          };
          formData.append("image", {
            uri: image.uri,
            name: `photo_${Date.now()}.${ext}`,
            type: mimeMap[ext] || "image/jpeg",
          } as any);
        }
      }

      const response = await fetch(`${BASE_URL}/api/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) { Alert.alert("Gagal", data.message || "Gagal membuat laporan"); return; }

      resetForm();
      Alert.alert(
        "Laporan Berhasil Dikirim! ✅",
        `Laporan "${header}" sudah masuk dan sedang diproses.\n\nKamu bisa memantau status di halaman My Reports.`,
        [
          { text: "Cek My Reports", onPress: () => navigation.navigate("MyReport") },
          { text: "Ke Homepage",    onPress: () => navigation.navigate("UserHomepage") },
          { text: "Buat Lagi",      style: "cancel" },
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
  const isFormComplete   = !!image && !!header.trim() && !!location.trim() && !!body.trim();
  const filledCount      = [!!image, !!header.trim(), !!location.trim(), !!body.trim()].filter(Boolean).length;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#5c2d0e" />

      <MapPickerModal
        visible={mapVisible}
        initialLat={mapLat}
        initialLng={mapLng}
        onConfirm={handleMapConfirm}
        onClose={() => setMapVisible(false)}
      />

      {/* ── TOPBAR ── */}
      <LinearGradient
        colors={["#5c2d0e", "#7a3f1c"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.topbar}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topbarCenter}>
          <Text style={styles.topbarSub}>CREATE NEW REPORT</Text>
          <Text style={styles.topbarTitle}>New Report</Text>
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
        {/* ══════════════════════════════════════
            UNIFIED CARD — mirip web
        ══════════════════════════════════════ */}
        <View style={styles.unifiedCard}>

          {/* ── HERO STRIP ── */}
          <LinearGradient
            colors={["#5c2d0e", "#7a3f1c", "#c8956b"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.heroStrip}
          >
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>CITIZEN REPORT FORM</Text>
            </View>
            <Text style={styles.heroTitle}>Submit Your Complaint</Text>
            <Text style={styles.heroDesc}>
              Report issues like damaged roads, floods, or public facility problems. Fill in all fields for faster processing.
            </Text>
          </LinearGradient>

          {/* ── ACCENT LINE ── */}
          <View style={styles.accentLine} />

          {/* ══════════════════════════════════════
              FORM BODY
          ══════════════════════════════════════ */}
          <View style={styles.formBody}>

            {/* ── UPLOAD FOTO ── */}
            <View style={styles.fieldGroup}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Evidence Photo</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Wajib</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleUpload}
                style={[styles.uploadBox, touched.image && !image && styles.uploadBoxError]}
                activeOpacity={0.85}
              >
                {preview ? (
                  <>
                    <Image source={{ uri: preview }} style={styles.uploadPreview} resizeMode="cover" />
                    <View style={styles.uploadChangeOverlay}>
                      <Feather name="camera" size={18} color="#fff" />
                      <Text style={styles.uploadChangeText}>Ganti Foto</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => { setPreview(null); setImage(null); }}
                      style={styles.uploadRemoveBtn}
                    >
                      <Feather name="x" size={14} color="#fff" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={[styles.uploadIconWrap, touched.image && !image && { backgroundColor: "#fee2e2" }]}>
                      <Feather name="camera" size={24} color={touched.image && !image ? "#ef4444" : "#c8956b"} />
                    </View>
                    <Text style={[styles.uploadLabel, touched.image && !image && { color: "#ef4444" }]}>
                      {touched.image && !image ? "Foto wajib diupload!" : "Click or drag photo here"}
                    </Text>
                    <Text style={styles.uploadHint}>PNG, JPG, WEBP — Max 5MB</Text>
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

            <View style={styles.divider} />

            {/* ── JUDUL ── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Report Title</Text>
              <View style={[
                styles.inputRow,
                touched.header && !header.trim() && styles.inputRowError,
                header && styles.inputRowFilled,
              ]}>
                <Feather name="file-text" size={17} color={touched.header && !header.trim() ? "#ef4444" : "#c8956b"} style={styles.inputIcon} />
                <TextInput
                  placeholder="Contoh: Jalan berlubang di Jl. Sudirman"
                  placeholderTextColor="#c4a98a"
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

              {/* Pill shortcuts */}
              <View style={styles.pillRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategory(cat.id)}
                    style={[styles.pill, cat.id === category && styles.pillActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pillText, cat.id === category && styles.pillTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Select dropdown */}
              <TouchableOpacity
                onPress={() => setCategoryOpen(!categoryOpen)}
                style={styles.inputRow}
                activeOpacity={0.8}
              >
                <Feather name="tag" size={17} color="#c8956b" style={styles.inputIcon} />
                <Text style={styles.selectText}>{selectedCategory.label}</Text>
                <Feather name={categoryOpen ? "chevron-up" : "chevron-down"} size={17} color="#a07a5e" />
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
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Wajib</Text>
                </View>
              </View>

              {/* Toggle ketik / peta */}
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  onPress={() => setLocationMode("type")}
                  style={[styles.modeBtn, locationMode === "type" && styles.modeBtnActive]}
                >
                  <Feather name="edit-2" size={13} color={locationMode === "type" ? "#fff" : "#a07a5e"} />
                  <Text style={[styles.modeBtnText, locationMode === "type" && styles.modeBtnTextActive]}>Ketik</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setLocationMode("map")}
                  style={[styles.modeBtn, locationMode === "map" && styles.modeBtnActive]}
                >
                  <Feather name="map" size={13} color={locationMode === "map" ? "#fff" : "#a07a5e"} />
                  <Text style={[styles.modeBtnText, locationMode === "map" && styles.modeBtnTextActive]}>Pilih di Peta</Text>
                </TouchableOpacity>
              </View>

              {/* GPS button */}
              <TouchableOpacity onPress={handleCurrentLocation} disabled={geoLoading} style={styles.gpsBtn}>
                <Feather name="navigation" size={13} color="#c8956b" style={geoLoading ? { opacity: 0.5 } : {}} />
                <Text style={[styles.gpsBtnText, geoLoading && { opacity: 0.5 }]}>
                  {geoLoading ? "Mengambil lokasi..." : "Gunakan lokasi saat ini"}
                </Text>
              </TouchableOpacity>

              {/* MODE: KETIK */}
              {locationMode === "type" && (
                <View style={[
                  styles.inputRow,
                  touched.location && !location.trim() && styles.inputRowError,
                  location && styles.inputRowFilled,
                ]}>
                  <Feather name="map-pin" size={17} color={touched.location && !location.trim() ? "#ef4444" : "#c8956b"} style={styles.inputIcon} />
                  <TextInput
                    placeholder="Jl. Sudirman No. 123, Jakarta"
                    placeholderTextColor="#c4a98a"
                    value={location}
                    onChangeText={setLocation}
                    onBlur={() => setTouched((p) => ({ ...p, location: true }))}
                    style={styles.input}
                  />
                  {location.trim() !== "" && (
                    <TouchableOpacity onPress={() => setLocation("")}>
                      <Feather name="x" size={15} color="#a07a5e" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* MODE: PETA */}
              {locationMode === "map" && (
                <View>
                  <TouchableOpacity
                    onPress={() => setMapVisible(true)}
                    style={[styles.mapPickerBtn, touched.location && !location.trim() && styles.inputRowError]}
                  >
                    <Feather name="map" size={17} color="#7a3f1c" style={styles.inputIcon} />
                    <Text style={styles.mapPickerBtnText}>
                      {location ? "Ubah Lokasi di Peta" : "Buka Peta & Pilih Lokasi"}
                    </Text>
                    <Feather name="chevron-right" size={16} color="#8b735f" />
                  </TouchableOpacity>

                  {location ? (
                    <View style={styles.locationSelectedBox}>
                      <Feather name="map-pin" size={13} color="#c8956b" />
                      <Text style={styles.locationSelectedText} numberOfLines={2}>{location}</Text>
                      <TouchableOpacity onPress={() => setLocation("")}>
                        <Feather name="x" size={14} color="#a07a5e" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              )}

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
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredBadgeText}>Wajib</Text>
                </View>
              </View>
              <View style={[
                styles.inputRow,
                styles.textareaRow,
                touched.body && !body.trim() && styles.inputRowError,
                body && styles.inputRowFilled,
              ]}>
                <Feather
                  name="edit-2"
                  size={17}
                  color={touched.body && !body.trim() ? "#ef4444" : "#c8956b"}
                  style={[styles.inputIcon, { marginTop: 2 }]}
                />
                <TextInput
                  placeholder="Describe the problem in detail..."
                  placeholderTextColor="#c4a98a"
                  value={body}
                  onChangeText={setBody}
                  onBlur={() => setTouched((p) => ({ ...p, body: true }))}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  style={[styles.input, styles.textarea]}
                />
              </View>
              {body.length > 0 && (
                <Text style={styles.charCount}>{body.length} characters</Text>
              )}
              {touched.body && !body.trim() && (
                <View style={styles.errorRow}>
                  <Feather name="alert-circle" size={12} color="#ef4444" />
                  <Text style={styles.errorText}>Deskripsi wajib diisi</Text>
                </View>
              )}
            </View>

            {/* ── PROGRESS ── */}
            <View style={styles.progressWrap}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(filledCount / 4) * 100}%` as any }]} />
              </View>
              <Text style={styles.progressText}>{filledCount}/4 field terisi</Text>
            </View>

            {/* ── SUBMIT ── */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              style={styles.submitBtnWrapper}
            >
              <LinearGradient
                colors={isFormComplete ? ["#5c2d0e", "#8b4a20"] : ["#ddd0c5", "#ddd0c5"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitBtn}
              >
                {loading ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.submitBtnText}>Mengirim...</Text>
                  </>
                ) : (
                  <>
                    <Feather name="send" size={17} color={isFormComplete ? "#fff" : "#a07a5e"} />
                    <Text style={[styles.submitBtnText, !isFormComplete && { color: "#a07a5e" }]}>
                      Kirim Laporan
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {!isFormComplete ? (
              <View style={styles.incompleteHint}>
                <Feather name="info" size={13} color="#a07a5e" />
                <Text style={styles.incompleteHintText}>
                  Lengkapi judul, lokasi, dan deskripsi untuk mengirim
                </Text>
              </View>
            ) : (
              <Text style={styles.submitNote}>Laporan akan diproses dalam 24 jam</Text>
            )}
          </View>
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

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f3ef" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f3ef" },
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
  scrollContent: { padding: 16 },

  // ── UNIFIED CARD ──
  unifiedCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#eee5da",
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#5c2d0e",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },

  // ── HERO STRIP ──
  heroStrip: { paddingHorizontal: 22, paddingVertical: 22 },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  heroBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  heroTitle: { fontSize: 22, fontWeight: "900", color: "#fff", marginBottom: 6 },
  heroDesc: { fontSize: 13, color: "rgba(240,213,184,0.85)", lineHeight: 19 },

  accentLine: { height: 2, backgroundColor: "#c8956b", opacity: 0.3 },

  // ── FORM BODY ──
  formBody: { padding: 20, gap: 0 },

  divider: { height: 1, backgroundColor: "#f0e8df", marginVertical: 20 },

  fieldGroup: { marginBottom: 20 },
  fieldLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  fieldLabel: { fontSize: 14, fontWeight: "800", color: "#2b1d15", marginBottom: 10 },

  requiredBadge: {
    backgroundColor: "#fff1ee", borderWidth: 1, borderColor: "#fdd0c7",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  requiredBadgeText: { fontSize: 11, fontWeight: "700", color: "#e57c4a" },

  // ── UPLOAD ──
  uploadBox: {
    borderWidth: 2, borderStyle: "dashed", borderColor: "#ddd0c5",
    borderRadius: 20, height: 176, alignItems: "center", justifyContent: "center",
    backgroundColor: "#fdf9f6", overflow: "hidden",
  },
  uploadBoxError: { borderColor: "#ef4444", backgroundColor: "#fff5f5" },
  uploadPreview: { width: "100%", height: "100%", position: "absolute" },
  uploadChangeOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.4)", paddingVertical: 10,
    alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6,
  },
  uploadChangeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  uploadRemoveBtn: {
    position: "absolute", top: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center",
  },
  uploadIconWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: "#f0e5d8", alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  uploadLabel: { fontSize: 14, fontWeight: "700", color: "#5c3b27" },
  uploadHint: { fontSize: 12, color: "#a07a5e", marginTop: 4 },

  errorRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 5 },
  errorText: { fontSize: 11, color: "#ef4444", fontWeight: "600" },

  // ── PILLS ──
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  pill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#f0e8df",
  },
  pillActive: { backgroundColor: "#5c2d0e" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#7a5c44" },
  pillTextActive: { color: "#fff" },

  // ── INPUT ROW ──
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fdf9f6", borderWidth: 1, borderColor: "#e8d9cc",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  inputRowFilled: { borderColor: "#c8956b", borderWidth: 1.5 },
  inputRowError: { borderColor: "#ef4444", backgroundColor: "#fff5f5" },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 13, color: "#2b1d15", padding: 0 },
  textareaRow: { alignItems: "flex-start", paddingVertical: 12 },
  textarea: { height: 100, textAlignVertical: "top" },
  selectText: { flex: 1, fontSize: 13, color: "#2b1d15" },
  charCount: { fontSize: 11, color: "#a07a5e", textAlign: "right", marginTop: 4 },

  // ── DROPDOWN ──
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

  // ── LOCATION ──
  modeToggle: {
    flexDirection: "row", backgroundColor: "#f0e8df",
    borderRadius: 12, padding: 4, marginBottom: 10,
  },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 8, borderRadius: 10,
  },
  modeBtnActive: { backgroundColor: "#7a3f1c" },
  modeBtnText: { fontSize: 12, fontWeight: "700", color: "#8b735f" },
  modeBtnTextActive: { color: "#fff" },
  gpsBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, alignSelf: "flex-start" },
  gpsBtnText: { fontSize: 12, fontWeight: "700", color: "#c8956b" },
  mapPickerBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fdf5ee", borderWidth: 1.5, borderColor: "#c8956b",
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
  },
  mapPickerBtnText: { flex: 1, fontSize: 13, color: "#5c2d0e", fontWeight: "700" },
  locationSelectedBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#fdf9f6", borderWidth: 1, borderColor: "#e8d9cc",
    borderRadius: 12, padding: 10, marginTop: 8,
  },
  locationSelectedText: { flex: 1, fontSize: 12, color: "#3b2a1f", fontWeight: "600", lineHeight: 17 },

  // ── PROGRESS ──
  progressWrap: { marginBottom: 16, gap: 6 },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: "#f0e5d8", overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: "#7a3f1c" },
  progressText: { fontSize: 11, color: "#a07a5e", fontWeight: "600", textAlign: "right" },

  // ── SUBMIT ──
  submitBtnWrapper: { borderRadius: 18, overflow: "hidden", elevation: 6 },
  submitBtn: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 15, letterSpacing: 0.3 },
  incompleteHint: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, marginTop: 12,
  },
  incompleteHintText: { fontSize: 12, color: "#a07a5e", textAlign: "center", flex: 1 },
  submitNote: { textAlign: "center", color: "#9b8573", fontSize: 12, marginTop: 14 },

  // ── BOTTOM NAV ──
  bottomNav: {
    flexDirection: "row", backgroundColor: "#fff",
    borderRadius: 24, paddingVertical: 12, paddingHorizontal: 8,
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