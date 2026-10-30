import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { notify, showError } from '../lib/data';
import { supabase } from '../lib/supabase';
import { Button, Card, Choice, colors, Field, styles } from '../lib/ui';
import type { Profile, Role } from '../lib/types';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<{ error: { message: string } | null }>) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    showError(error);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 80 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>China Sourcing</Text>
      <Text style={[styles.muted, { marginBottom: 24 }]}>Orders, profit and balance between partners</Text>
      <Card>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <Button title="Sign in" disabled={busy} onPress={() => run(() => supabase.auth.signInWithPassword({ email, password }))} />
        <Button title="Create account" variant="secondary" disabled={busy}
          onPress={() => run(async () => {
            const { data, error } = await supabase.auth.signUp({ email, password });
            if (!error && !data.session) {
              notify('Check your email', 'Open the confirmation link we sent you, then come back and sign in.');
            }
            return { error };
          })} />
      </Card>
    </ScrollView>
  );
}

export function ProfileSetup({ userId, onDone }: { userId: string; onDone: (p: Profile) => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role | null>(null);

  const save = async () => {
    if (!name.trim() || !role) return;
    const { data, error } = await supabase.from('profiles').insert({ id: userId, name: name.trim(), role }).select().single();
    if (!showError(error)) onDone(data as Profile);
  };

  return (
    <View style={{ padding: 20, paddingTop: 80 }}>
      <Text style={[styles.section, { fontSize: 22 }]}>Welcome! Who are you?</Text>
      <Card>
        <Field label="Your name" value={name} onChangeText={setName} />
        <Choice label="Your role" value={role} onChange={setRole} options={[
          { value: 'sourcer', label: 'I bring goods from China' },
          { value: 'seller', label: 'I get orders from clients' },
        ]} />
        <Button title="Continue" onPress={save} disabled={!name.trim() || !role} />
      </Card>
    </View>
  );
}
