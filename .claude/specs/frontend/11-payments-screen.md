# Spec 11 — Payments & Subscription Screen (Web)

**Status:** `DRAFT`
**Session:** 8
**Depends on:** Spec 07 (web app shell), Spec 06 (payments API)

---

## Goal

Let students upgrade from Free to Plus or Pro via Razorpay in the browser. Razorpay's JS checkout modal handles UPI/card UI natively on web.

---

## Scope

### In
- `frontend/src/pages/profile/SubscriptionPage.tsx`
- Plan comparison table (Free / Plus / Pro)
- Razorpay checkout via `<script>` tag (Razorpay Web JS SDK — no npm package needed for web)
- Post-payment tier confirmation
- Upgrade CTA shown inline when free user hits quota

### Out
- Subscription cancellation
- Invoice download

---

## Razorpay Web Integration

Razorpay provides a hosted checkout modal via a `<script>` tag — no install needed:

```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

Flow:
```typescript
// 1. Create order on backend
const { orderId, amount, currency } = await api.post('/api/payment/create-order', { plan: 'plus' });

// 2. Open Razorpay modal
const rzp = new window.Razorpay({
  key: import.meta.env.VITE_RAZORPAY_KEY_ID,  // publishable key — safe to expose
  order_id: orderId,
  amount,
  currency,
  name: 'VidyaAI',
  description: 'Plus Plan — ₹199/month',
  handler: async (response) => {
    // 3. Verify on backend
    await api.post('/api/payment/verify', {
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature,
    });
    // 4. Refresh user tier
    await refetchProfile();
  },
  prefill: { contact: user.phone },
  theme: { color: '#FF6B00' },
});
rzp.open();
```

---

## Page Layout

```
┌──────────────────────────────────────────────────────┐
│  Apna plan choose karo                               │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Free    │  │ Plus     │  │ Pro      │           │
│  │  ₹0/mo   │  │ ₹199/mo  │  │ ₹399/mo  │           │
│  │          │  │ ★ Popular│  │          │           │
│  │ 3 doubts │  │Unlimited │  │Unlimited │           │
│  │ Hindi    │  │6 languages│  │6 languages│          │
│  │ —        │  │WhatsApp  │  │WhatsApp  │           │
│  │ —        │  │Parent dash│  │Parent+  │           │
│  │          │  │          │  │Mock tests│           │
│  │ Current  │  │[Upgrade] │  │[Upgrade] │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────┘
```

---

## Open Questions (resolve before build)

1. `VITE_RAZORPAY_KEY_ID` — confirm test key before Session 8 begins
2. What happens if payment succeeds but `/verify` call fails? (Store `razorpay_payment_id` in localStorage and retry on next page load)

---

## Acceptance Criteria (draft)

- [ ] Upgrade CTA appears inline when free user hits daily quota (on Doubt page)
- [ ] Plan comparison table renders on `/profile/subscription`
- [ ] Clicking "Upgrade to Plus" opens Razorpay modal
- [ ] Successful test payment (Razorpay test mode): tier badge updates to "Plus" without page reload
- [ ] Failed payment: Razorpay shows its own error; no tier change on our end
- [ ] Razorpay modal prefills phone number correctly

---

## Dependencies

- Spec 07 (web app shell)
- Spec 06 (`POST /payment/create-order`, `POST /payment/verify`, `GET /payment/subscription`)
- `VITE_RAZORPAY_KEY_ID` in frontend env (publishable key only)
- Razorpay Web JS SDK loaded via CDN `<script>` tag

## Phase 2 — Mobile

- Replace Razorpay Web JS SDK with `react-native-razorpay` npm package
- `window.Razorpay` → `RazorpayCheckout.open()` from the native SDK
- Rest of the flow (create order → verify) unchanged
