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

## Open the app

The app is a website: **https://afamar27-ops.github.io/okba/**

1. Open the link on your phone (Chrome on Android, Safari on iPhone).
2. Add it to your home screen: Android: menu ⋮ → **Add to Home screen**. iPhone: Share → **Add to Home Screen**.
3. Each of you taps **Create account**, confirms the email, signs in and picks a role. Each role can only be taken once.
4. After both accounts exist, in Supabase go to **Authentication → Sign In / Providers** and turn off
   "Allow new users to sign up" so nobody else can join.

Every push to `main` rebuilds and redeploys the site automatically (`.github/workflows/deploy.yml`).
The database is the Supabase project `okba`; its structure is in `supabase/schema.sql`.

## Developing locally

```bash
npm install
npx expo start
```

To install it as a real app (without Expo Go), build it with EAS: https://docs.expo.dev/build/setup/
