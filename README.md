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

## Run it on your phones

The database is already set up (Supabase project `okba`) and the app is connected to it.

1. On a computer with Node.js:
   ```bash
   git clone https://github.com/afamar27-ops/okba
   cd okba
   npm install
   npx expo start
   ```
2. Install **Expo Go** on both phones and scan the QR code (iPhone: with the Camera app).
   The phones must be on the same Wi-Fi as the computer, or run `npx expo start --tunnel`.
3. Each of you taps **Create account**, then picks a role. Each role can only be taken once.
4. After both accounts exist, in Supabase go to **Authentication → Sign In / Providers** and turn off
   "Allow new users to sign up" so nobody else can join.

To install it as a real app (without Expo Go), build it with EAS: https://docs.expo.dev/build/setup/
