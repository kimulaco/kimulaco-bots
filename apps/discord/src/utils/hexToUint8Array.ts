export const hexToUint8Array = (hex: string): Uint8Array => {
  const pairs = hex.match(/.{1,2}/g) || [];
  return new Uint8Array(pairs.map((byte) => parseInt(byte, 16)));
};
