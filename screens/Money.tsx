import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { balance, formatDZD, monthKey, monthlySummaries, otherRole } from '../lib/calc';
import { showError, useData } from '../lib/data';
import { supabase } from '../lib/supabase';
import type { Role } from '../lib/types';
import { Button, Card, Choice, colors, Field, num, Row, styles } from '../lib/ui';

const thisMonth = () => new Date().toISOString().slice(0, 7);

export function Money() {
  const { me, orders, charges, transfers, loading, reload, nameOf } = useData();
  const months = useMemo(() => monthlySummaries(orders, charges), [orders, charges]);
  const bal = useMemo(() => balance(orders, charges, transfers), [orders, charges, transfers]);
  const [form, setForm] = useState<'charge' | 'transfer' | null>(null);

  // Positive sellerOwes: the seller has to pay the sourcer.
  const debtor: Role = bal.sellerOwes >= 0 ? 'seller' : 'sourcer';
  const amount = Math.abs(bal.sellerOwes);
  const balanceText = amount < 1 ? 'You are even' : debtor === me.role
    ? `You owe ${nameOf(otherRole(me.role))} ${formatDZD(amount)}`
    : `${nameOf(debtor)} owes you ${formatDZD(amount)}`;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />} keyboardShouldPersistTaps="handled">
      <Card style={{ backgroundColor: '#fff7ed', borderColor: '#fed7aa' }}>
        <Text style={styles.muted}>Balance between you</Text>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text, marginVertical: 4 }}>{balanceText}</Text>
        <Text style={styles.muted}>
          Includes delivered orders, deposits, monthly charges and payments between you.
          {bal.openSpent > 0 ? ` Open orders: ${formatDZD(bal.openSpent)} spent on goods, ${formatDZD(bal.openDeposits)} received as deposits.` : ''}
        </Text>
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}><Button title="+ Monthly charge" variant="secondary" onPress={() => setForm('charge')} /></View>
        <View style={{ flex: 1 }}><Button title="+ Payment" variant="secondary" onPress={() => setForm('transfer')} /></View>
      </View>
      {form === 'charge' ? <ChargeForm onDone={() => setForm(null)} /> : null}
      {form === 'transfer' ? <TransferForm onDone={() => setForm(null)} /> : null}

      <Text style={[styles.section, { marginTop: 16 }]}>Profit by month</Text>
      {months.length === 0 ? <Text style={styles.muted}>Delivered orders will show up here.</Text> : null}
      {months.map((m) => (
        <Card key={m.month}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 }}>{m.month}</Text>
          <Row label={`Delivered orders (${m.orders})`} value={formatDZD(m.revenue)} />
          <Row label="Orders profit" value={formatDZD(m.profit)} />
          {m.lostValue > 0 ? <Row label="  of which lost pieces" value={formatDZD(-m.lostValue)} color={colors.red} /> : null}
          <Row label="Extra charges" value={formatDZD(-m.charges)} color={m.charges ? colors.red : undefined} />
          <Row label="Net profit" value={formatDZD(m.netProfit)} color={m.netProfit >= 0 ? colors.green : colors.red} bold />
          <Row label={nameOf('sourcer')} value={formatDZD(m.sourcerNet)} />
          <Row label={nameOf('seller')} value={formatDZD(m.sellerNet)} />
          {charges.filter((c) => monthKey(c.month) === m.month).map((c) => (
            <Text key={c.id} style={[styles.muted, { marginTop: 2 }]}>
              • {c.label}: {formatDZD(c.amount)} (paid by {nameOf(c.paid_by)})
            </Text>
          ))}
        </Card>
      ))}

      {transfers.length ? <Text style={[styles.section, { marginTop: 8 }]}>Payments between you</Text> : null}
      {transfers.map((tr) => (
        <Card key={tr.id}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>
            {nameOf(tr.from_role)} → {nameOf(otherRole(tr.from_role))}: {formatDZD(tr.amount)}
          </Text>
          <Text style={styles.muted}>{tr.date}{tr.note ? ` · ${tr.note}` : ''}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function ChargeForm({ onDone }: { onDone: () => void }) {
  const { me, reload, nameOf } = useData();
  const [month, setMonth] = useState(thisMonth());
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<Role>(me.role);

  const save = async () => {
    if (!/^\d{4}-\d{2}$/.test(month) || !label.trim() || !num(amount)) return;
    const { error } = await supabase.from('charges').insert({ month: `${month}-01`, label: label.trim(), amount: num(amount), paid_by: paidBy });
    if (showError(error)) return;
    await reload();
    onDone();
  };

  return (
    <Card style={{ marginTop: 8 }}>
      <Text style={styles.section}>Extra charge</Text>
      <Text style={[styles.muted, { marginBottom: 10 }]}>Deducted from that month's total profit, split 50/50.</Text>
      <Field label="Month (YYYY-MM)" value={month} onChangeText={setMonth} />
      <Field label="What for" value={label} onChangeText={setLabel} placeholder="e.g. warehouse rent, phone, transport" />
      <Field label="Amount (DA)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Choice label="Paid by" value={paidBy} onChange={setPaidBy}
        options={[{ value: 'sourcer', label: nameOf('sourcer') }, { value: 'seller', label: nameOf('seller') }]} />
      <Button title="Save charge" onPress={save} />
      <Button title="Cancel" variant="secondary" onPress={onDone} />
    </Card>
  );
}

function TransferForm({ onDone }: { onDone: () => void }) {
  const { me, reload, nameOf } = useData();
  const [from, setFrom] = useState<Role>(me.role);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const save = async () => {
    if (!num(amount)) return;
    const { error } = await supabase.from('transfers').insert({ from_role: from, amount: num(amount), note: note.trim() || null });
    if (showError(error)) return;
    await reload();
    onDone();
  };

  return (
    <Card style={{ marginTop: 8 }}>
      <Text style={styles.section}>Payment between you</Text>
      <Choice label="Who paid?" value={from} onChange={setFrom}
        options={[{ value: 'seller', label: `${nameOf('seller')} paid` }, { value: 'sourcer', label: `${nameOf('sourcer')} paid` }]} />
      <Field label="Amount (DA)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Field label="Note" value={note} onChangeText={setNote} />
      <Button title="Save payment" onPress={save} />
      <Button title="Cancel" variant="secondary" onPress={onDone} />
    </Card>
  );
}
