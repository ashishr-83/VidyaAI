# Spec 06 — Payments API

**Status:** `DRAFT`
**Session:** 8
**Depends on:** Spec 01 (auth, tier system)

---

## Goal

Integrate Razorpay to handle UPI and card payments for Plus (₹199/mo) and Pro (₹399/mo) subscriptions. On successful payment, upgrade the user's `tier` in the DB.

---

## Scope

### In
- `backend/src/services/razorpay.ts` — order creation + signature verification
- `backend/src/routes/payment.ts` — `/api/payment` route group
- Endpoints: `POST /create-order`, `POST /verify`, `GET /subscription`
- Tier upgrade on verified payment
- Razorpay webhook handler for async payment events

### Out
- Subscription renewal / auto-debit (Razorpay Subscriptions API) — manual renewal for Phase 1
- Refund flow
- Invoice generation

---

## API Contract

### `POST /api/payment/create-order`
Requires auth.

**Request:**
```json
{ "plan": "plus" }
```

`plan` enum: `"plus"` (₹199) | `"pro"` (₹399)

**Response 200:**
```json
{
  "orderId": "order_...",
  "amount": 19900,
  "currency": "INR",
  "keyId": "rzp_test_..."
}
```

Amount in paise (₹199 = 19900 paise).

---

### `POST /api/payment/verify`
Requires auth.

**Request:**
```json
{
  "razorpayOrderId": "order_...",
  "razorpayPaymentId": "pay_...",
  "razorpaySignature": "..."
}
```

**Response 200:**
```json
{ "ok": true, "tier": "plus", "validUntil": "2026-08-03T00:00:00Z" }
```

**Errors:**
- `400 INVALID_SIGNATURE` — HMAC verification failed

---

### `GET /api/payment/subscription`
Requires auth.

**Response 200:**
```json
{
  "tier": "plus",
  "validUntil": "2026-08-03T00:00:00Z",
  "daysRemaining": 31
}
```

---

## Acceptance Criteria (to be detailed before build)

- [ ] TBD — flesh out once Razorpay test account is set up

---

## Open Questions

1. Do we store payment records in DB? (Yes — add `Payment` model in migration)
2. Monthly vs one-time pricing? (Monthly for Phase 1)
3. Razorpay webhook secret rotation strategy?

---

## Dependencies

- Spec 01 (User.tier field)
- `razorpay` npm package
- Env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
- Prisma migration: add `Payment` model, `User.tierValidUntil DateTime?`
