// utils/verifyTelegram.js
import crypto from "crypto";

export function verifyTelegram(initDataRaw, botToken) {
    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get("hash");

    urlParams.delete("hash");

    const dataCheckString = [...urlParams.entries()]
        .sort()
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");

    const secret = crypto
        .createHmac("sha256", "WebAppData")
        .update(botToken)
        .digest();

    const hmac = crypto
        .createHmac("sha256", secret)
        .update(dataCheckString)
        .digest("hex");

    return hmac === hash;
}