import nacl from 'tweetnacl';

function hexToUint8Array(hex: string): Uint8Array {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
}

export async function verifyDiscordSignature(
  request: Request,
  publicKey: string | undefined
): Promise<boolean> {
  if (!publicKey || publicKey === 'undefined' || publicKey.trim() === '') {
    console.warn('DISCORD_PUBLIC_KEY is not set or invalid. Skipping signature verification.');
    return true;
  }

  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');

  if (!signature || !timestamp) {
    console.warn('Missing Discord signature headers - skipping verification', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
    });
    return false;
  }

  try {
    const bodyText = await request.clone().text();
    const message = timestamp + bodyText;
    const messageBytes = new TextEncoder().encode(message);
    
    if (signature.length !== 128) {
      console.error('Invalid signature length:', signature.length, 'expected 128 (64 bytes hex)');
      return false;
    }
    
    if (publicKey.length !== 64) {
      console.error('Invalid public key length:', publicKey.length, 'expected 64 (32 bytes hex)');
      return false;
    }
    
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(publicKey);

    if (signatureBytes.length !== 64) {
      console.error('Invalid signature byte length:', signatureBytes.length);
      return false;
    }
    
    if (publicKeyBytes.length !== 32) {
      console.error('Invalid public key byte length:', publicKeyBytes.length);
      return false;
    }

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      console.error('Discord signature verification failed', {
        timestamp,
        bodyLength: bodyText.length,
        messageLength: message.length,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Signature verification error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
    return false;
  }
}
