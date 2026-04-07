const { getRedis } = require('../config/db');
const memStore = new Map();
const OTP_TTL = 120; // 2 minutes

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const saveOtp = async (key, otp) => {
  const r = getRedis();
  if (r) await r.set(`otp:${key}`, otp, { EX: OTP_TTL });
  else memStore.set(`otp:${key}`, { otp, exp: Date.now() + OTP_TTL * 1000 });
};

const verifyOtp = async (key, input) => {
  const r = getRedis();
  if (r) {
    const stored = await r.get(`otp:${key}`);
    if (!stored) return { valid: false, reason: 'OTP expired or not found' };
    if (stored !== input) return { valid: false, reason: 'Incorrect OTP' };
    await r.del(`otp:${key}`);
    return { valid: true };
  } else {
    const entry = memStore.get(`otp:${key}`);
    if (!entry || Date.now() > entry.exp) { memStore.delete(`otp:${key}`); return { valid: false, reason: 'OTP expired' }; }
    if (entry.otp !== input) return { valid: false, reason: 'Incorrect OTP' };
    memStore.delete(`otp:${key}`);
    return { valid: true };
  }
};

module.exports = { generateOtp, saveOtp, verifyOtp };
