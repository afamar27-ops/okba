# China Sourcing app

A mobile app (iPhone and Android) for two partners:
- the **seller** gets confirmed orders from clients and collects deposits,
- the **sourcer** buys the goods in China and brings them.

All amounts are in DZD.

## How the money works

- **Profit per order** = what the client pays for the pieces that *arrived* − (cost of all pieces ordered + shipping + other costs).
  Pieces that did not arrive are shown as **lost**: the cost is paid, but the client doesn't pay for them.
- **Split**: the seller's clients are always 50/50. For the sourcer's own clients, the sourcer sets the % per order.
- **Deposit**: entered by the seller (any amount). The seller keeps it.
- **Delivery**: whoever delivers (either partner) keeps the rest of the client's payment.
- **Monthly charges** are deducted from that month's total profit and split 50/50.
- **Balance**: the Money tab shows who owes whom, counting deposits, who delivered,
  charges and payments between you. It assumes the sourcer pays for the goods and shipping.
  Record a payment whenever you hand money to each other.

## One-time setup

1. Create a free project at https://supabase.com.
2. In Supabase open **SQL Editor**, paste the contents of `supabase/schema.sql` and click **Run**.
3. In **Project Settings → API**, copy the Project URL and the `anon` public key.
4. Copy `.env.example` to `.env` and paste those two values into it.
5. Install and start:
   ```bash
   npm install
   npx expo start
   ```
6. Install **Expo Go** on both phones and scan the QR code.
7. Each of you taps **Create account**, then picks a role.
8. After both accounts exist, in Supabase go to **Authentication → Sign In / Providers** and turn off
   "Allow new users to sign up" so nobody else can join.

To install it as a real app (without Expo Go), build it with EAS: https://docs.expo.dev/build/setup/
