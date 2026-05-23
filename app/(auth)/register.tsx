import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);

  const [focus, setFocus] = useState({
    name: false,
    email: false,
    password: false,
    confirm: false,
  });

  // =========================
  // REGISTER — logic tidak diubah, hanya IP disamakan dengan login
  // =========================
  const handleRegister = async () => {
    if (form.password !== form.confirmPassword) {
      Alert.alert("Error", "Password tidak cocok");
      return;
    }

    if (form.password.length < 6) {
      Alert.alert("Error", "Password minimal 6 karakter");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        "http://192.168.100.231:5000/api/auth/register", // ← IP disamakan dengan login
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: form.name,
            email: form.email,
            password: form.password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Register gagal");
      }

      await AsyncStorage.setItem("token", data.token);
     await AsyncStorage.setItem(
  "user",
  JSON.stringify(data.user || data.data || data)
);

      Alert.alert("Berhasil", "Akun berhasil dibuat");

      router.replace("/(tabs)/homepage");

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Terjadi kesalahan";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#5c2d0e" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.circleTopRight} />
          <View style={styles.circleBottomLeft} />

          <View style={styles.logoWrap}>
            <View style={styles.logoIconBox}>
              <Ionicons name="person-add" size={30} color="#f0d5b8" />
            </View>
            <Text style={styles.logoText}>Call It!</Text>
            <Text style={styles.logoSub}>Citizen Report Platform</Text>
          </View>

          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Buat Akun Baru</Text>
            <Text style={styles.heroDesc}>
              Daftar untuk mulai melaporkan dan memantau pengaduan masyarakat.
            </Text>
          </View>
        </View>

        {/* CARD */}
        <View style={styles.card}>
          <View style={styles.cardAccent} />

          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Register</Text>
            <Text style={styles.cardSubtitle}>Lengkapi data diri Anda</Text>
          </View>

          {/* NAME */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>NAMA LENGKAP</Text>
            <View style={[styles.inputWrapper, focus.name && styles.inputFocused]}>
              <Feather name="user" size={18} color="#a07a5e" style={styles.inputIcon} />
              <TextInput
                placeholder="Nama lengkap"
                placeholderTextColor="#c4a98a"
                style={styles.input}
                value={form.name}
                onChangeText={(text) => setForm({ ...form, name: text })}
                onFocus={() => setFocus({ ...focus, name: true })}
                onBlur={() => setFocus({ ...focus, name: false })}
              />
            </View>
          </View>

          {/* EMAIL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={[styles.inputWrapper, focus.email && styles.inputFocused]}>
              <Feather name="mail" size={18} color="#a07a5e" style={styles.inputIcon} />
              <TextInput
                placeholder="Email anda"
                placeholderTextColor="#c4a98a"
                style={styles.input}
                value={form.email}
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={(text) => setForm({ ...form, email: text })}
                onFocus={() => setFocus({ ...focus, email: true })}
                onBlur={() => setFocus({ ...focus, email: false })}
              />
            </View>
          </View>

          {/* PASSWORD */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={[styles.inputWrapper, focus.password && styles.inputFocused]}>
              <Feather name="lock" size={18} color="#a07a5e" style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#c4a98a"
                secureTextEntry={!showPassword}
                style={[styles.input, { flex: 1 }]}
                value={form.password}
                onChangeText={(text) => setForm({ ...form, password: text })}
                onFocus={() => setFocus({ ...focus, password: true })}
                onBlur={() => setFocus({ ...focus, password: false })}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#a07a5e" />
              </TouchableOpacity>
            </View>
          </View>

          {/* CONFIRM PASSWORD */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>KONFIRMASI PASSWORD</Text>
            <View style={[styles.inputWrapper, focus.confirm && styles.inputFocused]}>
              <Feather name="shield" size={18} color="#a07a5e" style={styles.inputIcon} />
              <TextInput
                placeholder="Ulangi password"
                placeholderTextColor="#c4a98a"
                secureTextEntry={!showConfirm}
                style={[styles.input, { flex: 1 }]}
                value={form.confirmPassword}
                onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
                onFocus={() => setFocus({ ...focus, confirm: true })}
                onBlur={() => setFocus({ ...focus, confirm: false })}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Feather name={showConfirm ? "eye" : "eye-off"} size={18} color="#a07a5e" />
              </TouchableOpacity>
            </View>
          </View>

          {/* BUTTON */}
          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="user-plus" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.buttonText}>Daftar Sekarang</Text>
              </>
            )}
          </TouchableOpacity>

          {/* SUDAH PUNYA AKUN */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Sudah punya akun?</Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
              <Text style={styles.registerLink}> Masuk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BROWN_DARK   = "#5c2d0e";
const BROWN_ACCENT = "#c8956b";
const BG           = "#f7f3ef";
const BORDER       = "#e8d9cc";
const TEXT_DARK    = "#2b1d15";
const TEXT_MID     = "#a07a5e";

const styles = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: BG },

  hero: {
    backgroundColor: BROWN_DARK,
    paddingTop: 56, paddingBottom: 40, paddingHorizontal: 28,
    overflow: "hidden",
  },
  circleTopRight: {
    position: "absolute", top: -48, right: -48,
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 32, borderColor: "rgba(255,255,255,0.05)",
  },
  circleBottomLeft: {
    position: "absolute", bottom: -56, left: -36,
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 28, borderColor: "rgba(255,255,255,0.05)",
  },

  logoWrap: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  logoIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  logoText: { fontSize: 26, fontWeight: "800", color: "#f0d5b8" },
  logoSub: {
    fontSize: 10, color: "rgba(240,213,184,0.6)",
    position: "absolute", bottom: -14, left: 60,
  },

  heroTextWrap: { marginTop: 8 },
  heroTitle: { fontSize: 32, fontWeight: "800", color: "#fff", marginBottom: 8 },
  heroDesc: { fontSize: 14, color: "rgba(240,213,184,0.75)", lineHeight: 22, maxWidth: 280 },

  card: {
    backgroundColor: "#fff", borderRadius: 28,
    marginHorizontal: 20, marginTop: -20, marginBottom: 24,
    overflow: "hidden", elevation: 8,
    shadowColor: BROWN_DARK, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 24,
  },
  cardAccent: { height: 4, backgroundColor: BROWN_ACCENT },
  cardHeader: {
    paddingTop: 24, paddingHorizontal: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: "#f0e8df",
  },
  cardTitle: { fontSize: 22, fontWeight: "800", color: TEXT_DARK },
  cardSubtitle: { fontSize: 13, color: TEXT_MID, marginTop: 4 },

  fieldGroup: { paddingHorizontal: 24, paddingTop: 20 },
  fieldLabel: {
    fontSize: 10, fontWeight: "800", color: TEXT_MID,
    marginBottom: 8, letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fdf9f6", borderWidth: 1.5,
    borderColor: BORDER, borderRadius: 14,
    paddingHorizontal: 14, height: 52,
  },
  inputFocused: { borderColor: BROWN_ACCENT },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: TEXT_DARK },

  button: {
    marginHorizontal: 24, marginTop: 28, marginBottom: 8,
    height: 54, borderRadius: 16, backgroundColor: BROWN_DARK,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    shadowColor: BROWN_DARK, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  buttonText: { color: "#fff", fontWeight: "800", fontSize: 16 },

  registerRow: {
    flexDirection: "row", justifyContent: "center",
    paddingTop: 12, paddingBottom: 28,
  },
  registerPrompt: { color: TEXT_MID },
  registerLink: { color: BROWN_ACCENT, fontWeight: "800" },
});