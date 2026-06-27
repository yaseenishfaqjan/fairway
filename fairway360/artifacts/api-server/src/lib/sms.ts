// SMS via Twilio's REST API. No-ops (returning false) when the Twilio env vars
// aren't configured, so on-course order flow works in the demo without SMS.

import { logger } from "./logger";

export function smsEnabled(): boolean {
  return Boolean(
    process.env["TWILIO_ACCOUNT_SID"] &&
      process.env["TWILIO_AUTH_TOKEN"] &&
      process.env["TWILIO_FROM"],
  );
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_FROM"];
  if (!sid || !token || !from) {
    logger.debug("sms: skipped (Twilio env not configured)");
    return false;
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, body: text }, "sms: twilio error");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "sms: twilio request failed");
    return false;
  }
}
