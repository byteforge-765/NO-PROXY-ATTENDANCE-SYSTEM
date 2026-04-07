let twilioClient = null;

const init = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (sid && token && sid.startsWith('AC')) {
    twilioClient = require('twilio')(sid, token);
    console.log('[Twilio] WhatsApp ready ✓');
  } else {
    console.warn('[Twilio] No credentials — OTP will print to console (dev mode)');
  }
};
init();

const sendWhatsAppOtp = async (phone, otp, name = 'Student') => {
  let to = phone.replace(/\D/g, '');
  if (to.length === 10) to = `91${to}`;
  if (!to.startsWith('+')) to = `+${to}`;

  const body =
    `Hello ${name}! 👋\n\n` +
    `Your ICMS Attendance OTP: *${otp}*\n\n` +
    `Valid for 2 minutes. Do not share.\n— ICMS Campus System`;

  if (twilioClient) {
    try {
      const msg = await twilioClient.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
        to: `whatsapp:${to}`,
        body,
      });
      console.log(`[WhatsApp] OTP sent to ${to} — ${msg.sid}`);
      return { success: true, sid: msg.sid };
    } catch (err) {
      console.error('[WhatsApp] Error:', err.message);
      console.log(`[DEV FALLBACK] OTP for ${to}: ${otp}`);
      return { success: false, error: err.message, fallback_otp: otp };
    }
  } else {
    console.log(`\n=============================`);
    console.log(`[DEV] WhatsApp OTP`);
    console.log(`Phone: ${to}`);
    console.log(`OTP:   ${otp}`);
    console.log(`=============================\n`);
    return { success: true, dev_mode: true, otp };
  }
};

module.exports = { sendWhatsAppOtp };
