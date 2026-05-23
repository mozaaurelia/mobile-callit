import { router } from "expo-router";
import SplashAnimation from "./SplashAnimation";

export default function SplashPage() {
  return (
    <SplashAnimation
      onFinish={() => router.replace("/(auth)/login")}
    />
  );
}