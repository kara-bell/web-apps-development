const RevokedToken = require('../models/RevokedToken');

async function isRevoked(jti) {
  if (!jti) return false;
  const found = await RevokedToken.exists({ jti });
  return Boolean(found);
}

async function revoke(jti, expiresAt) {
  if (!jti) return;
  await RevokedToken.updateOne(
    { jti },
    { $setOnInsert: { jti, expiresAt } },
    { upsert: true }
  ).exec();
}

module.exports = { isRevoked, revoke };
