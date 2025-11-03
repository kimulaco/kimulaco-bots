import nacl from "tweetnacl";
import { hexToUint8Array } from "./hexToUint8Array";
import { DISCORD_HEADERS } from "../constants/verify";

export const verifyDiscordSignature = async (
  request: Request,
  publicKey?: string,
): Promise<boolean> => {
  if (!publicKey || publicKey === "undefined" || publicKey.trim() === "") {
    console.warn(
      "DISCORD_PUBLIC_KEY is not set or invalid. Skipping signature verification.",
    );
    return false;
  }

  const signature = request.headers.get(DISCORD_HEADERS.SIGNATURE);
  const timestamp = request.headers.get(DISCORD_HEADERS.TIMESTAMP);

  if (!signature || !timestamp) {
    console.warn("Missing Discord signature headers - skipping verification", {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
    });
    return false;
  }

  if (signature.length !== 128) {
    console.error(
      "Invalid signature length:",
      signature.length,
      "expected 128 (64 bytes hex)",
    );
    return false;
  }

  if (publicKey.length !== 64) {
    console.error(
      "Invalid public key length:",
      publicKey.length,
      "expected 64 (32 bytes hex)",
    );
    return false;
  }

  const signatureBytes = hexToUint8Array(signature);
  const publicKeyBytes = hexToUint8Array(publicKey);

  if (signatureBytes.length !== 64) {
    console.error("Invalid signature byte length:", signatureBytes.length);
    return false;
  }

  if (publicKeyBytes.length !== 32) {
    console.error("Invalid public key byte length:", publicKeyBytes.length);
    return false;
  }

  try {
    const bodyText = await request.clone().text();
    const message = timestamp + bodyText;
    const messageBytes = new TextEncoder().encode(message);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );

    if (!isValid) {
      console.error("Discord signature verification failed", {
        timestamp,
        bodyLength: bodyText.length,
        messageLength: message.length,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("Signature verification error:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    return false;
  }
};
