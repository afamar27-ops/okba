import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { showError, useData } from '../lib/data';
import { supabase } from '../lib/supabase';
import { Button, Card, Choice, colors, Field, Header, num, styles } from '../lib/ui';

type ItemDraft = { name: string; qty_ordered: string; qty_received: string; unit_cost: string; unit_price: string };

const emptyItem: ItemDraft = { name: '', qty_ordered: '', qty_received: '', unit_cost: '', unit_price: '' };
const str = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n));
const today = () => new Date().toISOString().slice(0, 10);

export function OrderForm({ orderId, onDone }: { orderId?: string; onDone: (id?: string) => void }) {
  const { me, clients, orders, reload, nameOf, possessive } = useData();
  const existing = orders.find((o) => o.id === orderId);

  const [clientId, setClientId] = useState<string | null>(existing?.client_id ?? null);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [orderDate, setOrderDate] = useState(existing?.order_date ?? today());
  const [deposit, setDeposit] = useState(str(existing?.deposit));
  const [shipping, setShipping] = useState(str(existing?.shipping_cost));
  const [other, setOther] = useState(str(existing?.other_cost));
  const [sharePct, setSharePct] = useState(str(existing?.sourcer_share_pct ?? 50));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [items, setItems] = useState<ItemDraft[]>(
    existing?.order_items.map((i) => ({
      name: i.name,
      qty_ordered: str(i.qty_ordered),
      qty_received: str(i.qty_received),
      unit_cost: str(i.unit_cost),
      unit_price: str(i.unit_price),
    })) ?? [{ ...emptyItem }],
  );
  const [busy, setBusy] = useState(false);

  const client = clients.find((c) => c.id === clientId);
  const setItem = (idx: number, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const save = async () => {
    if (!clientId || !title.trim()) return;
    setBusy(true);
    const row = {
      client_id: clientId,
      title: title.trim(),
      order_date: orderDate,
      deposit: num(deposit),
      shipping_cost: num(shipping),
      other_cost: num(other),
      sourcer_share_pct: Math.min(100, Math.max(0, num(sharePct))),
      notes: notes.trim() || null,
    };
    const res = existing
      ? await supabase.from('orders').update(row).eq('id', existing.id).select().single()
      : await supabase.from('orders').insert(row).select().single();
    if (showError(res.error)) return setBusy(false);
    const id = res.data.id as string;

    const itemRows = items
      .filter((i) => i.name.trim())
      .map((i) => ({
        order_id: id,
        name: i.name.trim(),
        qty_ordered: Math.round(num(i.qty_ordered)),
        qty_received: i.qty_received.trim() === '' ? null : Math.round(num(i.qty_received)),
        unit_cost: num(i.unit_cost),
        unit_price: num(i.unit_price),
      }));
    const del = await supabase.from('order_items').delete().eq('order_id', id);
    if (showError(del.error)) return setBusy(false);
    if (itemRows.length) {
      const ins = await supabase.from('order_items').insert(itemRows);
      if (showError(ins.error)) return setBusy(false);
    }
    await reload();
    setBusy(false);
    onDone(id);
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title={existing ? 'Edit order' : 'New order'} onBack={() => onDone(existing?.id)} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <Card>
          {clients.length === 0 ? (
            <Text style={[styles.muted, { marginBottom: 12 }]}>Add a client first in the Clients tab.</Text>
          ) : (
            <Choice label="Client" value={clientId} onChange={setClientId}
              options={clients.map((c) => ({ value: c.id, label: c.name }))} />
          )}
          <Field label="Order name" value={title} onChangeText={setTitle} placeholder="e.g. 200 phone cases" />
          <Field label="Order date (YYYY-MM-DD)" value={orderDate} onChangeText={setOrderDate} />
        </Card>

        <Text style={styles.section}>Products</Text>
        {items.map((it, idx) => (
          <Card key={idx}>
            <Field label="Product" value={it.name} onChangeText={(v) => setItem(idx, { name: v })} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Qty ordered" value={it.qty_ordered} keyboardType="number-pad"
                  onChangeText={(v) => setItem(idx, { qty_ordered: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Qty arrived" value={it.qty_received} keyboardType="number-pad" placeholder="when it arrives"
                  onChangeText={(v) => setItem(idx, { qty_received: v })} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Field label="Cost per piece (DA)" value={it.unit_cost} keyboardType="decimal-pad"
                  onChangeText={(v) => setItem(idx, { unit_cost: v })} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Client price per piece (DA)" value={it.unit_price} keyboardType="decimal-pad"
                  onChangeText={(v) => setItem(idx, { unit_price: v })} />
              </View>
            </View>
            {items.length > 1 ? (
              <Button title="Remove product" variant="secondary"
                onPress={() => setItems((l) => l.filter((_, i) => i !== idx))} />
            ) : null}
          </Card>
        ))}
        <Button title="+ Add product" variant="secondary" onPress={() => setItems((l) => [...l, { ...emptyItem }])} />

        <Text style={[styles.section, { marginTop: 16 }]}>Costs & money</Text>
        <Card>
          <Field label="Shipping cost (DA)" value={shipping} onChangeText={setShipping} keyboardType="decimal-pad" />
          <Field label="Other costs: customs, fees... (DA)" value={other} onChangeText={setOther} keyboardType="decimal-pad" />
          <Field label={`Deposit paid by client (DA)${me.role === 'seller' ? '' : ` · set by ${nameOf('seller')}`}`}
            value={deposit} onChangeText={setDeposit} keyboardType="decimal-pad" editable={me.role === 'seller'} />
          {client?.owner === 'sourcer' ? (
            <Field label={`${possessive('sourcer')} share of profit in % (the rest goes to ${nameOf('seller')})`}
              value={sharePct} onChangeText={setSharePct} keyboardType="number-pad" editable={me.role === 'sourcer'} />
          ) : client ? (
            <Text style={[styles.muted, { marginBottom: 12 }]}>{possessive('seller')} client: profit is split 50/50.</Text>
          ) : null}
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline />
        </Card>

        <Button title={busy ? 'Saving…' : 'Save order'} onPress={save} disabled={busy || !clientId || !title.trim()} />
        {!clientId || !title.trim() ? (
          <Text style={{ color: colors.muted, textAlign: 'center' }}>Pick a client and enter an order name.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
