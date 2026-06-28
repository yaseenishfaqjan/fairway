import { useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import Constants from "expo-constants";

// Point this at your deployment (defaults to the value in app.json > extra).
const API = (Constants.expoConfig?.extra?.apiBaseUrl as string) ?? "https://fairway360.io";

/**
 * Minimal Fairway360 member app. Logs into the same REST API as the web portals
 * and shows the member dashboard. Session is a cookie captured at login and
 * replayed on subsequent requests. A real app would add navigation, the full
 * portal surface, and push registration (see registerForPush below + README).
 */
export default function App() {
  const [cookie, setCookie] = useState<string | null>(null);
  const [email, setEmail] = useState("james@augustapines.com");
  const [password, setPassword] = useState("Password123!");
  const [dash, setDash] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Invalid email or password");
      const setCookieHeader = res.headers.get("set-cookie") ?? "";
      const sid = setCookieHeader.split(";")[0];
      setCookie(sid);
      await loadDashboard(sid);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadDashboard(sid: string) {
    const res = await fetch(`${API}/api/me/dashboard`, { headers: { cookie: sid } });
    if (res.ok) setDash(await res.json());
  }

  function logout() {
    setCookie(null);
    setDash(null);
  }

  if (!cookie) {
    return (
      <View style={styles.center}>
        <Text style={styles.brand}>FAIRWAY360</Text>
        <Text style={styles.sub}>Member sign in</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor="#6b7d72" />
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor="#6b7d72" />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={styles.button} onPress={login} disabled={busy}>
          {busy ? <ActivityIndicator color="#04130c" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
      </View>
    );
  }

  const account = dash?.account;
  const upcoming = dash?.upcoming ?? [];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
      <Text style={styles.brand}>FAIRWAY360</Text>
      <Text style={styles.h1}>Welcome{account?.name ? `, ${account.name.split(" ")[0]}` : ""}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Account balance</Text>
        <Text style={styles.value}>${Number(account?.balance ?? 0).toLocaleString()}</Text>
        <Text style={styles.muted}>{account?.tier ?? "Member"}</Text>
      </View>

      <Text style={styles.section}>Upcoming</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.muted}>No upcoming tee times.</Text>
      ) : (
        upcoming.map((u: any) => (
          <View key={u.id} style={styles.row}>
            <Text style={styles.rowTitle}>{u.date} · {u.time}</Text>
            <Text style={styles.muted}>{u.players} players</Text>
          </View>
        ))
      )}

      <Pressable style={[styles.button, { marginTop: 32 }]} onPress={logout}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#04130c" },
  center: { flex: 1, backgroundColor: "#04130c", justifyContent: "center", padding: 24 },
  brand: { color: "#d9b24a", fontWeight: "700", letterSpacing: 3, fontSize: 13, marginBottom: 8 },
  sub: { color: "#9fb3a6", marginBottom: 24 },
  h1: { color: "#fff", fontSize: 26, fontWeight: "700", marginBottom: 20 },
  input: { backgroundColor: "#0a2417", color: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#1c4030" },
  button: { backgroundColor: "#d9b24a", borderRadius: 12, padding: 16, alignItems: "center" },
  buttonText: { color: "#04130c", fontWeight: "700" },
  error: { color: "#ff9a9a", marginBottom: 12 },
  card: { backgroundColor: "#0a2417", borderRadius: 16, padding: 18, borderWidth: 1, borderColor: "#1c4030", marginBottom: 24 },
  label: { color: "#9fb3a6", fontSize: 12 },
  value: { color: "#fff", fontSize: 30, fontWeight: "700", marginTop: 4 },
  muted: { color: "#9fb3a6", fontSize: 13 },
  section: { color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 10 },
  row: { backgroundColor: "#0a2417", borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: "#1c4030" },
  rowTitle: { color: "#fff", fontWeight: "600", marginBottom: 2 },
});
