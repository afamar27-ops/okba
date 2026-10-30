import { useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { formatDZD, orderTotals } from '../lib/calc';
import { showError, useData } from '../lib/data';
import { supabase } from '../lib/supabase';
import type { Role } from '../lib/types';
import { Button, Card, Choice, colors, Field, styles } from '../lib/ui';

export function Clients() {
  const { me, clients, orders, loading, reload, nameOf, possessive } = useData();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [owner, setOwner] = useState<Role>('seller');
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from('clients').insert({ name: name.trim(), phone: phone.trim() || null, owner });
    if (showError(error)) return;
    setName('');
    setPhone('');
    setAdding(false);
    reload();
  };

  const ownerOptions = [
    { value: 'seller' as Role, label: `${possessive('seller')} client · 50/50` },
    { value: 'sourcer' as Role, label: `${possessive('sourcer')} client · ${me.role === 'sourcer' ? 'you choose' : `${nameOf('sourcer')} chooses`} split` },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />} keyboardShouldPersistTaps="handled">
      {adding ? (
        <Card>
          <Field label="Client name" value={name} onChangeText={setName} />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Choice label="Whose client?" value={owner} onChange={setOwner} options={ownerOptions} />
          <Button title="Save client" onPress={add} disabled={!name.trim()} />
          <Button title="Cancel" variant="secondary" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <Button title="+ New client" onPress={() => setAdding(true)} />
      )}
      <View style={{ height: 8 }} />
      {clients.map((c) => {
        const theirs = orders.filter((o) => o.client_id === c.id);
        const profit = theirs.filter((o) => o.status === 'delivered').reduce((s, o) => s + orderTotals(o).profit, 0);
        return (
          <Card key={c.id}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{c.name}</Text>
            <Text style={styles.muted}>
              {possessive(c.owner)} client{c.phone ? ` · ${c.phone}` : ''} · {theirs.length} orders · profit {formatDZD(profit)}
            </Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}
