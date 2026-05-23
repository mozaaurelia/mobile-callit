import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

export default function SplashAnimation({ onFinish }) {

  // ── Animations ──────────────────────────────────────────
  const slideAnim   = useRef(new Animated.Value(height)).current;
  const fadeContent = useRef(new Animated.Value(0)).current;
  const scaleLogo   = useRef(new Animated.Value(0.6)).current;
  const fadeRing1   = useRef(new Animated.Value(0)).current;
  const scaleRing1  = useRef(new Animated.Value(0.4)).current;
  const fadeRing2   = useRef(new Animated.Value(0)).current;
  const scaleRing2  = useRef(new Animated.Value(0.4)).current;
  const fadeStrip   = useRef(new Animated.Value(0)).current;
  const slideStrip  = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // 1. Slide in the whole screen
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 700,
      useNativeDriver: true,
    }).start(() => {

      // 2. Fade + scale logo icon
      Animated.parallel([
        Animated.timing(fadeContent, {
          toValue: 1, duration: 400, useNativeDriver: true,
        }),
        Animated.spring(scaleLogo, {
          toValue: 1, friction: 6, tension: 80, useNativeDriver: true,
        }),
      ]).start();

      // 3. Rings expand after icon appears
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeRing1, {
            toValue: 1, duration: 500, useNativeDriver: true,
          }),
          Animated.spring(scaleRing1, {
            toValue: 1, friction: 5, tension: 60, useNativeDriver: true,
          }),
        ]).start();
      }, 200);

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeRing2, {
            toValue: 1, duration: 500, useNativeDriver: true,
          }),
          Animated.spring(scaleRing2, {
            toValue: 1, friction: 5, tension: 50, useNativeDriver: true,
          }),
        ]).start();
      }, 380);

      // 4. Bottom strip slides up
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeStrip, {
            toValue: 1, duration: 400, useNativeDriver: true,
          }),
          Animated.timing(slideStrip, {
            toValue: 0, duration: 400, useNativeDriver: true,
          }),
        ]).start();
      }, 500);
    });

    const timer = setTimeout(() => {
      onFinish?.();
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[styles.container, { transform: [{ translateY: slideAnim }] }]}
    >

      {/* ── Decorative static rings ── */}
      <View style={[styles.staticRing, {
        width: width * 1.6, height: width * 1.6,
        top: -width * 0.6, right: -width * 0.4,
      }]} />
      <View style={[styles.staticRing, {
        width: width * 1.1, height: width * 1.1,
        bottom: -width * 0.5, left: -width * 0.3,
        borderWidth: 20,
      }]} />

      {/* ── Static dots ── */}
      <View style={[styles.dot, { top: height * 0.15, left: 40,  width: 8,  height: 8  }]} />
      <View style={[styles.dot, { top: height * 0.22, right: 60, width: 5,  height: 5  }]} />
      <View style={[styles.dot, { top: height * 0.72, left: 80,  width: 10, height: 10 }]} />
      <View style={[styles.dot, { top: height * 0.78, right: 40, width: 6,  height: 6  }]} />

      {/* ── Center content ── */}
      <Animated.View style={[styles.center, { opacity: fadeContent }]}>

        {/* Animated ring 2 (outer) */}
        <Animated.View style={[
          styles.ring,
          styles.ring2,
          { opacity: fadeRing2, transform: [{ scale: scaleRing2 }] },
        ]} />

        {/* Animated ring 1 (inner) */}
        <Animated.View style={[
          styles.ring,
          styles.ring1,
          { opacity: fadeRing1, transform: [{ scale: scaleRing1 }] },
        ]} />

        {/* Logo icon box */}
        <Animated.View style={[
          styles.iconBox,
          { transform: [{ scale: scaleLogo }] },
        ]}>
          <MaterialCommunityIcons name="coffee" size={44} color="#f0d5b8" />
        </Animated.View>

        {/* App name */}
        <Text style={styles.appName}>
          Call <Text style={styles.appNameLight}>It!</Text>
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Sistem Pengaduan Masyarakat</Text>

        {/* Feature pills */}
        <View style={styles.pillRow}>
          {["Laporan", "Real-time", "Aman"].map((p, i) => (
            <View key={i} style={styles.pill}>
              <Feather
                name={i === 0 ? "file-text" : i === 1 ? "zap" : "shield"}
                size={11}
                color="rgba(240,213,184,0.85)"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.pillText}>{p}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* ── Bottom strip ── */}
      <Animated.View style={[
        styles.bottomStrip,
        { opacity: fadeStrip, transform: [{ translateY: slideStrip }] },
      ]}>
        <View style={styles.stripInner}>
          <View style={styles.stripDivider} />
          <View style={styles.stripContent}>
            <Feather name="shield" size={13} color="rgba(240,213,184,0.6)" />
            <Text style={styles.stripText}>  Dilindungi enkripsi end-to-end</Text>
          </View>
          <View style={styles.stripDivider} />
        </View>

        {/* Loading dots */}
        <View style={styles.loadingRow}>
          {[0, 1, 2].map((i) => (
            <LoadingDot key={i} delay={i * 180} />
          ))}
        </View>
      </Animated.View>

    </Animated.View>
  );
}

// ── Loading dot with pulse animation ────────────────────
function LoadingDot({ delay }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[styles.loadingDot, { opacity }]} />
  );
}

// ── COLORS ──────────────────────────────────────────────
const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: "#3d1a08",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  // static bg rings
  staticRing: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 32,
    borderColor: "rgba(255,255,255,0.04)",
  },

  dot: {
    position: "absolute",
    borderRadius: 99,
    backgroundColor: "rgba(240,213,184,0.2)",
  },

  // center block
  center: {
    alignItems: "center",
    zIndex: 10,
  },

  // animated rings around icon
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderStyle: "solid",
  },
  ring1: {
    width: 160,
    height: 160,
    borderWidth: 1.5,
    borderColor: "rgba(200,149,107,0.35)",
    backgroundColor: "rgba(200,149,107,0.06)",
  },
  ring2: {
    width: 220,
    height: 220,
    borderWidth: 1,
    borderColor: "rgba(200,149,107,0.18)",
    backgroundColor: "rgba(200,149,107,0.03)",
  },

  // icon box
  iconBox: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    shadowColor: "#c8956b",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },

  appName: {
    fontSize: 48,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -1.5,
    lineHeight: 52,
    marginBottom: 8,
  },

  appNameLight: {
    color: "#c8956b",
  },

  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(240,213,184,0.6)",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 28,
  },

  // pills
  pillRow: {
    flexDirection: "row",
    gap: 8,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(240,213,184,0.8)",
    letterSpacing: 0.3,
  },

  // bottom strip
  bottomStrip: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 44 : 28,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 16,
  },

  stripInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },

  stripDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  stripContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  stripText: {
    fontSize: 11,
    color: "rgba(240,213,184,0.55)",
    fontWeight: "500",
    letterSpacing: 0.3,
  },

  // loading dots
  loadingRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },

  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#c8956b",
  },
});