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
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";




export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

const handleLogin = async () => {

    if (!email || !password) {
  Alert.alert(
    "Error",
    "Email dan password wajib diisi"
  );
  return;
}

  try {
    const res = await fetch(
      "http://localhost:5000/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data.message || "Login gagal"
      );
    }

    // simpan token
    await AsyncStorage.setItem(
      "token",
      data.token
    );

    // simpan user
    await AsyncStorage.setItem(
  "user",
  JSON.stringify(data.user || data.data || data)
);

    Alert.alert(
      "Berhasil",
      "Login berhasil"
    );

    // masuk homepage
    router.replace("/(tabs)/homepage");

 } catch (err: any) {
  Alert.alert(
    "Error",
    err.message
  );
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

        {/* ── TOP HERO SECTION ── */}
        <View style={styles.hero}>

          {/* Decorative circles */}
          <View style={styles.circleTopRight} />
          <View style={styles.circleBottomLeft} />
          <View style={styles.circleMid} />

          {/* Logo area */}
          <View style={styles.logoWrap}>
            <View style={styles.logoIconBox}>
              <Ionicons name="shield-checkmark" size={32} color="#f0d5b8" />
            </View>
            <Text style={styles.logoText}>Call It!</Text>
            <Text style={styles.logoSub}>Citizen Report Platform</Text>
          </View>

          {/* Hero text */}
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Selamat Datang</Text>
            <Text style={styles.heroDesc}>
              Masuk untuk melaporkan dan memantau permasalahan di sekitar Anda.
            </Text>
          </View>
        </View>

        {/* ── FORM CARD ── */}
        <View style={styles.card}>

          {/* Card top accent line */}
          <View style={styles.cardAccent} />

          {/* Card header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Masuk ke Akun</Text>
            <Text style={styles.cardSubtitle}>Gunakan email dan password terdaftar</Text>
          </View>

          {/* Email field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={[
              styles.inputWrapper,
              emailFocused && styles.inputWrapperFocused,
            ]}>
              <View style={styles.inputIcon}>
                <Feather
                  name="mail"
                  size={18}
                  color={emailFocused ? "#c8956b" : "#a07a5e"}
                />
              </View>
              <TextInput
                placeholder="Masukkan email Anda"
                placeholderTextColor="#c4a98a"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>
          </View>

          {/* Password field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={[
              styles.inputWrapper,
              passwordFocused && styles.inputWrapperFocused,
            ]}>
              <View style={styles.inputIcon}>
                <Feather
                  name="lock"
                  size={18}
                  color={passwordFocused ? "#c8956b" : "#a07a5e"}
                />
              </View>
              <TextInput
                placeholder="Masukkan password"
                placeholderTextColor="#c4a98a"
                secureTextEntry={!showPassword}
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Feather
                  name={showPassword ? "eye" : "eye-off"}
                  size={18}
                  color="#a07a5e"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot password */}
          <TouchableOpacity style={styles.forgotWrap} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Lupa password?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            style={[
              styles.button,
              (!email || !password) && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={!email || !password}
          >
            <Feather name="log-in" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.buttonText}>Masuk</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>atau</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register prompt */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>Belum punya akun? </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(auth)/register")}
            >
            <Text style={styles.registerLink}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── INFO STRIP ── */}
        <View style={styles.infoStrip}>
          {[
            { icon: "file-text" as const, label: "Buat Laporan" },
            { icon: "check-circle" as const, label: "Pantau Status" },
            { icon: "message-circle" as const, label: "Chat Admin" },
          ].map((item, i) => (
            <View key={i} style={styles.infoItem}>
               <View style={styles.infoIconBox}>
                <Feather name={item.icon} size={18} color="#c8956b" />
              </View>
              <Text style={styles.infoLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const BROWN_DARK   = "#5c2d0e";
const BROWN_MID    = "#7a3f1c";
const BROWN_ACCENT = "#c8956b";
const BROWN_LIGHT  = "#f0d5b8";
const BG           = "#f7f3ef";
const BORDER       = "#e8d9cc";
const TEXT_DARK    = "#2b1d15";
const TEXT_MID     = "#a07a5e";
const TEXT_MUTED   = "#c4a98a";

const styles = StyleSheet.create({

  scroll: {
    flexGrow: 1,
    backgroundColor: BG,
  },

  // ── HERO ──
  hero: {
    backgroundColor: BROWN_DARK,
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 28,
    overflow: "hidden",
    position: "relative",
  },

  circleTopRight: {
    position: "absolute",
    top: -48,
    right: -48,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 32,
    borderColor: "rgba(255,255,255,0.05)",
  },

  circleBottomLeft: {
    position: "absolute",
    bottom: -56,
    left: -36,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 28,
    borderColor: "rgba(255,255,255,0.05)",
  },

  circleMid: {
    position: "absolute",
    top: 20,
    right: 120,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "rgba(240,213,184,0.3)",
  },

  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },

  logoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  logoText: {
    fontSize: 26,
    fontWeight: "800",
    color: BROWN_LIGHT,
    letterSpacing: -0.5,
  },

  logoSub: {
    fontSize: 10,
    color: "rgba(240,213,184,0.6)",
    fontWeight: "600",
    letterSpacing: 0.5,
    position: "absolute",
    bottom: -14,
    left: 60,
  },

  heroTextWrap: {
    marginTop: 8,
  },

  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  heroDesc: {
    fontSize: 14,
    color: "rgba(240,213,184,0.75)",
    lineHeight: 22,
    maxWidth: 280,
  },

  // ── FORM CARD ──
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    marginHorizontal: 20,
    marginTop: -20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#5c2d0e",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  cardAccent: {
    height: 4,
    backgroundColor: BROWN_ACCENT,
    // gradient simulation via a view – actual gradient needs expo-linear-gradient
  },

  cardHeader: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0e8df",
  },

  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: -0.3,
  },

  cardSubtitle: {
    fontSize: 13,
    color: TEXT_MID,
    marginTop: 4,
    fontWeight: "500",
  },

  fieldGroup: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: TEXT_MID,
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fdf9f6",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },

  inputWrapperFocused: {
    borderColor: BROWN_ACCENT,
    backgroundColor: "#fdf6f0",
    shadowColor: BROWN_ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },

  inputIcon: {
    marginRight: 12,
    width: 20,
    alignItems: "center",
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: TEXT_DARK,
    fontWeight: "500",
  },

  eyeBtn: {
    padding: 4,
    marginLeft: 8,
  },

  forgotWrap: {
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "flex-end",
  },

  forgotText: {
    fontSize: 13,
    color: BROWN_ACCENT,
    fontWeight: "700",
  },

  button: {
    marginHorizontal: 24,
    marginTop: 24,
    height: 54,
    borderRadius: 16,
    backgroundColor: BROWN_DARK,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BROWN_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },

  buttonDisabled: {
    backgroundColor: "#d9c5b2",
    shadowOpacity: 0,
    elevation: 0,
  },

  buttonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 20,
    gap: 12,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#f0e8df",
  },

  dividerText: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: "600",
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },

  registerPrompt: {
    fontSize: 14,
    color: TEXT_MID,
    fontWeight: "500",
  },

  registerLink: {
    fontSize: 14,
    color: BROWN_ACCENT,
    fontWeight: "800",
  },

  // ── INFO STRIP ──
  infoStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginBottom: 32,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#5c2d0e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  infoItem: {
    alignItems: "center",
    gap: 8,
  },

  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f0e5d8",
    alignItems: "center",
    justifyContent: "center",
  },

  infoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT_MID,
    letterSpacing: 0.2,
  },

});