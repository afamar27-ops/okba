import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DataProvider } from './lib/data';
import { isConfigured, supabase } from './lib/supabase';
import type { Profile } from './lib/types';
import { colors, Header, styles } from './lib/ui';
import { Clients } from './screens/Clients';
import { Login, ProfileSetup } from './screens/Login';
import { Money } from './screens/Money';
import { OrderDetail } from './screens/OrderDetail';
import { OrderForm } from './screens/OrderForm';
import { OrdersList } from './screens/Orders';

type Tab = 'orders' | 'clients' | 'money';
type Route = { name: 'tabs' } | { name: 'order'; id: string } | { name: 'orderForm'; id?: string };

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <StatusBar style="dark" />
        <Root />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Root() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setProfile(undefined);
    supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
      .then(({ data }) => setProfile((data as Profile | null) ?? null));
  }, [session?.user.id]);

  if (!isConfigured) {
    return (
      <View style={{ padding: 20, paddingTop: 80 }}>
        <Text style={styles.section}>Setup needed</Text>
        <Text style={styles.muted}>Create a .env file with your Supabase URL and key (see README.md), then restart the app.</Text>
      </View>
    );
  }
  if (session === undefined || (session && profile === undefined)) {
    return <ActivityIndicator style={{ marginTop: 100 }} color={colors.primary} />;
  }
  if (!session) return <Login />;
  if (!profile) return <ProfileSetup userId={session.user.id} onDone={setProfile} />;

  return (
    <DataProvider me={profile}>
      <Main me={profile} />
    </DataProvider>
  );
}

function Main({ me }: { me: Profile }) {
  const [tab, setTab] = useState<Tab>('orders');
  const [route, setRoute] = useState<Route>({ name: 'tabs' });

  if (route.name === 'order') {
    return <OrderDetail orderId={route.id} onBack={() => setRoute({ name: 'tabs' })}
      onEdit={() => setRoute({ name: 'orderForm', id: route.id })} />;
  }
  if (route.name === 'orderForm') {
    return <OrderForm orderId={route.id}
      onDone={(id) => setRoute(id ? { name: 'order', id } : { name: 'tabs' })} />;
  }

  const titles: Record<Tab, string> = { orders: 'Orders', clients: 'Clients', money: 'Money' };
  return (
    <View style={{ flex: 1 }}>
      <Header title={titles[tab]} right={
        <Pressable onPress={() => supabase.auth.signOut()} hitSlop={10}>
          <Text style={styles.muted}>{me.name} · Sign out</Text>
        </Pressable>
      } />
      <View style={{ flex: 1 }}>
        {tab === 'orders' ? (
          <OrdersList onOpen={(id) => setRoute({ name: 'order', id })} onNew={() => setRoute({ name: 'orderForm' })} />
        ) : tab === 'clients' ? <Clients /> : <Money />}
      </View>
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
        {(Object.keys(titles) as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}>
            <Text style={{ fontWeight: '600', color: tab === t ? colors.primary : colors.muted }}>{titles[t]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
