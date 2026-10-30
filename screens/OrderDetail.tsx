import { useState } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { formatDZD, orderTotals } from '../lib/calc';
import { notify, showError, useData } from '../lib/data';
import { supabase } from '../lib/supabase';
import { Role, STATUS_LABELS, STATUSES, Status } from '../lib/types';
import { Button, Card, Choice, colors, Header, Row, styles } from '../lib/ui';
import { StatusBadge } from './Orders';

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(message)) onYes();
  } else {
    Alert.alert('Are you sure?', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Yes', style: 'destructive', onPress: onYes }]);
  }
}

export function OrderDetail({ orderId, onBack, onEdit }: { orderId: string; onBack: () => void; onEdit: () => void }) {
  const { orders, reload, nameOf, possessive } = useData();
  const order = orders.find((o) => o.id === orderId);
  const [deliveredBy, setDeliveredBy] = useState<Role | null>(order?.delivered_by ?? null);
  const [busy, setBusy] = useState(false);

  if (!order) {
    return (
      <View style={{ flex: 1 }}>
        <Header title="Order" onBack={onBack} />
        <Text style={[styles.muted, { padding: 16 }]}>This order no longer exists.</Text>
      </View>
    );
  }

  const t = orderTotals(order);
  const idx = STATUSES.indexOf(order.status);
  const next: Status | undefined = STATUSES[idx + 1];

  const update = async (patch: Record<string, unknown>) => {
    setBusy(true);
    const { error } = await supabase.from('orders').update(patch).eq('id', order.id);
    if (!showError(error)) await reload();
    setBusy(false);
  };

  const advance = () => {
    if (!next) return;
    if (next === 'delivered') {
      if (!deliveredBy) return notify('Who delivered?', 'Choose who delivered the order and collected the money.');
      return update({ status: next, delivered_by: deliveredBy, delivered_date: new Date().toISOString().slice(0, 10) });
    }
    update({ status: next });
  };

  const notArrivedYet = order.order_items.some((i) => i.qty_received === null);

  return (
    <View style={{ flex: 1 }}>
      <Header title={order.title} onBack={onBack} right={<Button title="Edit" variant="secondary" onPress={onEdit} />} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{order.clients.name}</Text>
            <StatusBadge status={order.status} />
          </View>
          <Text style={[styles.muted, { marginTop: 4 }]}>
            {possessive(order.clients.owner)} client · ordered {order.order_date}
            {order.delivered_date ? ` · delivered ${order.delivered_date} by ${nameOf(order.delivered_by!)}` : ''}
          </Text>
          {order.notes ? <Text style={{ marginTop: 8, color: colors.text }}>{order.notes}</Text> : null}
        </Card>

        <Card>
          <Text style={styles.section}>Progress</Text>
          {STATUSES.map((s, i) => (
            <Text key={s} style={{ paddingVertical: 3, color: i <= idx ? colors.text : colors.muted, fontWeight: i === idx ? '700' : '400' }}>
              {i < idx ? '✓' : i === idx ? '●' : '○'}  {STATUS_LABELS[s]}
            </Text>
          ))}
          {next === 'delivered' ? (
            <View style={{ marginTop: 10 }}>
              <Choice label="Who delivered and collected the money?" value={deliveredBy} onChange={setDeliveredBy}
                options={[{ value: 'seller', label: nameOf('seller') }, { value: 'sourcer', label: nameOf('sourcer') }]} />
            </View>
          ) : null}
          {next === 'arrived' || (next === 'delivered' && notArrivedYet) ? (
            <Text style={[styles.muted, { marginTop: 6 }]}>
              Tip: tap Edit to enter how many pieces actually arrived. Missing pieces are counted as lost.
            </Text>
          ) : null}
          {next ? <Button title={`Mark as ${STATUS_LABELS[next]}`} onPress={advance} disabled={busy} /> : null}
          {idx > 0 ? (
            <Button title={`Back to ${STATUS_LABELS[STATUSES[idx - 1]]}`} variant="secondary" disabled={busy}
              onPress={() => update({ status: STATUSES[idx - 1], ...(order.status === 'delivered' ? { delivered_by: null, delivered_date: null } : {}) })} />
          ) : null}
        </Card>

        <Card>
          <Text style={styles.section}>Products</Text>
          {order.order_items.map((i) => {
            const got = i.qty_received ?? i.qty_ordered;
            const lost = i.qty_ordered - got;
            return (
              <View key={i.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontWeight: '600', color: colors.text }}>{i.name}</Text>
                <Text style={styles.muted}>
                  Ordered {i.qty_ordered}
                  {i.qty_received !== null ? ` · arrived ${i.qty_received}` : ''} · cost {formatDZD(i.unit_cost)} · price {formatDZD(i.unit_price)}
                </Text>
                {lost > 0 ? <Text style={{ color: colors.red }}>{lost} lost ({formatDZD(lost * i.unit_cost)})</Text> : null}
              </View>
            );
          })}
        </Card>

        <Card>
          <Text style={styles.section}>Money</Text>
          <Row label="Client pays (arrived pieces)" value={formatDZD(t.revenue)} />
          <Row label="Deposit received" value={formatDZD(t.deposit)} />
          <Row label="Left to collect" value={formatDZD(t.remaining)} />
          <Row label="Total cost" value={formatDZD(t.cost)} />
          {t.lostPieces > 0 ? <Row label={`Lost pieces (${t.lostPieces})`} value={formatDZD(-t.lostValue)} color={colors.red} /> : null}
          <Row label="Profit" value={formatDZD(t.profit)} color={t.profit >= 0 ? colors.green : colors.red} bold />
          <Row label={`${nameOf('sourcer')} (${t.sourcerPct}%)`} value={formatDZD(t.sourcerProfit)} />
          <Row label={`${nameOf('seller')} (${100 - t.sourcerPct}%)`} value={formatDZD(t.sellerProfit)} />
        </Card>

        <Button title="Delete order" variant="danger" disabled={busy}
          onPress={() => confirm('Delete this order permanently?', async () => {
            const { error } = await supabase.from('orders').delete().eq('id', order.id);
            if (!showError(error)) {
              await reload();
              onBack();
            }
          })} />
      </ScrollView>
    </View>
  );
}
