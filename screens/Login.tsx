import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { showError } from '../lib/data';
import { supabase } from '../lib/supabase';
import { Button, Card, Choice, colors, Field, styles } from '../lib/ui';
import type { Profile, Role } from '../lib/types';

const FRIENDLY_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'Wrong email or password. If you just created the account, confirm your email first.',
  'Email not confirmed': 'Please open the confirmation link in your email first, then sign in.',
  'User already registered': 'This email already has an account. Tap Sign in instead.',
};

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok?: boolean } | null>(null);

  const submit = async (mode: 'signin' | 'signup') => {
    const cleanEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setMessage({ text: 'Enter a valid email address.' });
    if (password.length < 6) return setMessage({ text: 'The password must be at least 6 characters.' });
    setBusy(true);
    setMessage(null);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) setMessage({ text: FRIENDLY_ERRORS[error.message] ?? error.message });
    } else {
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password });
      if (error) setMessage({ text: FRIENDLY_ERRORS[error.message] ?? error.message });
      else if (!data.session) {
        setMessage({ ok: true, text: `Account created. Open the confirmation link sent to ${cleanEmail}, then come back and tap Sign in.` });
      }
    }
    setBusy(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 80 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 28, fontWeight: '800', color: colors.text }}>China Sourcing</Text>
      <Text style={[styles.muted, { marginBottom: 24 }]}>Orders, profit and balance between partners</Text>
      <Card>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
          keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
        <Field label="Password (at least 6 characters)" value={password} onChangeText={setPassword} secureTextEntry
          autoComplete="password" textContentType="password" />
        <Button title={busy ? 'Please wait…' : 'Sign in'} disabled={busy} onPress={() => submit('signin')} />
        <Button title="Create account" variant="secondary" disabled={busy} onPress={() => submit('signup')} />
        {message ? (
          <Text style={{ marginTop: 10, fontSize: 15, color: message.ok ? colors.green : colors.red }}>{message.text}</Text>
        ) : null}
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
