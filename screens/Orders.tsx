import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { formatDZD, orderTotals } from '../lib/calc';
import { useData } from '../lib/data';
import { STATUS_LABELS, STATUSES, Status } from '../lib/types';
import { Button, Card, colors, styles } from '../lib/ui';

export function OrdersList({ onOpen, onNew }: { onOpen: (id: string) => void; onNew: () => void }) {
  const { orders, loading, reload } = useData();
  const [filter, setFilter] = useState<Status | 'open' | 'all'>('open');
  const [query, setQuery] = useState('');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter === 'open' && o.status === 'delivered') return false;
      if (filter !== 'open' && filter !== 'all' && o.status !== filter) return false;
      return !q || o.title.toLowerCase().includes(q) || o.clients.name.toLowerCase().includes(q);
    });
  }, [orders, filter, query]);

  const filters: { value: typeof filter; label: string }[] = [
    { value: 'open', label: 'Open' },
    ...STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
    { value: 'all', label: 'All' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Button title="+ New order" onPress={onNew} />
        <TextInput placeholder="Search order or client" value={query} onChangeText={setQuery}
          placeholderTextColor={colors.muted} style={[styles.input, { marginTop: 8 }]} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
          {filters.map((f) => (
            <Pressable key={f.value} onPress={() => setFilter(f.value)}
              style={[styles.chip, filter === f.value && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={{ color: filter === f.value ? '#fff' : colors.text }}>{f.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
        {shown.length === 0 && !loading ? <Text style={styles.muted}>No orders here.</Text> : null}
        {shown.map((o) => {
          const t = orderTotals(o);
          return (
            <Pressable key={o.id} onPress={() => onOpen(o.id)}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 }} numberOfLines={1}>{o.title}</Text>
                  <StatusBadge status={o.status} />
                </View>
                <Text style={[styles.muted, { marginVertical: 4 }]}>{o.clients.name} · {o.order_date}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.muted}>Total {formatDZD(t.revenue)}</Text>
                  <Text style={{ color: t.profit >= 0 ? colors.green : colors.red, fontWeight: '600' }}>
                    {o.status === 'delivered' ? 'Profit' : 'Expected profit'} {formatDZD(t.profit)}
                  </Text>
                </View>
                {t.lostPieces > 0 ? <Text style={{ color: colors.red, marginTop: 4 }}>{t.lostPieces} lost pieces</Text> : null}
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const BADGE: Record<Status, string> = {
  confirmed: '#6b7280',
  purchased: '#7c3aed',
  shipped: '#2563eb',
  arrived: '#d97706',
  delivered: '#15803d',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <View style={{ backgroundColor: BADGE[status], borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}
