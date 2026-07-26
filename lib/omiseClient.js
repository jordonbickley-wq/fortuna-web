const omise = require('omise')({
  publicKey: process.env.OMISE_PUBLIC_KEY,
  secretKey: process.env.OMISE_SECRET_KEY,
  omiseVersion: '2019-05-29',
});

// Creates a PromptPay charge for a one-off purchase. Returns the charge
// object, which includes a scannable QR code image URL for the frontend to
// display. metadata carries userId + drawDate so the webhook can identify
// what to unlock without a separate lookup.
//
// NOTE: shaped against Omise's documented Sources + Charges API for
// PromptPay. Verify field names (particularly the QR image path under
// charge.source) against the live Omise dashboard/docs once you have real
// test keys - this hasn't been exercised against Omise's live API from
// this environment.
async function createPromptPayCharge({ amountSatang, userId, drawDate }) {
  const source = await omise.sources.create({
    amount: amountSatang,
    currency: 'thb',
    type: 'promptpay',
  });

  const charge = await omise.charges.create({
    amount: amountSatang,
    currency: 'thb',
    source: source.id,
    metadata: { userId, drawDate },
  });

  return charge;
}

async function getCharge(chargeId) {
  return omise.charges.retrieve(chargeId);
}

module.exports = { createPromptPayCharge, getCharge };
