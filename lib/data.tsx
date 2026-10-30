import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';
import type { Charge, Client, OrderWithItems, Profile, Transfer } from './types';

type Data = {
  me: Profile;
  profiles: Profile[];
  clients: Client[];
  orders: OrderWithItems[];
  charges: Charge[];
  transfers: Transfer[];
  loading: boolean;
  reload: () => Promise<void>;
  nameOf: (role: Profile['role']) => string;
  possessive: (role: Profile['role']) => string;
};

const Ctx = createContext<Data | null>(null);

// Alert.alert does nothing in a browser, so fall back to window.alert there.
export function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export function showError(error: { message: string } | null) {
  if (error) notify('Error', error.message);
  return Boolean(error);
}

export function DataProvider({ me, children }: { me: Profile; children: ReactNode }) {
  const [state, setState] = useState<Omit<Data, 'me' | 'reload' | 'loading' | 'nameOf' | 'possessive'>>({
    profiles: [], clients: [], orders: [], charges: [], transfers: [],
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const [profiles, clients, orders, charges, transfers] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('clients').select('*').order('name'),
      supabase.from('orders').select('*, order_items(*), clients(*)').order('order_date', { ascending: false }),
      supabase.from('charges').select('*').order('month', { ascending: false }),
      supabase.from('transfers').select('*').order('date', { ascending: false }),
    ]);
    setLoading(false);
    const err = profiles.error ?? clients.error ?? orders.error ?? charges.error ?? transfers.error;
    if (showError(err)) return;
    setState({
      profiles: profiles.data as Profile[],
      clients: clients.data as Client[],
      orders: orders.data as OrderWithItems[],
      charges: charges.data as Charge[],
      transfers: transfers.data as Transfer[],
    });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const nameOf = (role: Profile['role']) =>
    role === me.role ? 'You' : state.profiles.find((p) => p.role === role)?.name ?? (role === 'seller' ? 'Partner' : 'Sourcer');

  const possessive = (role: Profile['role']) => (role === me.role ? 'Your' : `${nameOf(role)}'s`);

  return <Ctx.Provider value={{ me, ...state, loading, reload, nameOf, possessive }}>{children}</Ctx.Provider>;
}

export function useData() {
  const d = useContext(Ctx);
  if (!d) throw new Error('useData outside DataProvider');
  return d;
}
