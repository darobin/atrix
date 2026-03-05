// Generate an ATProto TID (Timestamp ID) — base32-sortable 13-char string.
// Format: top bit 0 | 53-bit microsecond timestamp | 10-bit random clock ID
const ALPHABET = '234567abcdefghijklmnopqrstuvwxyz';

export function genTID() {
  const ts = BigInt(Date.now()) * 1000n; // approximate microseconds
  const clock = BigInt(Math.floor(Math.random() * 1024));
  let n = (ts << 10n) | clock;
  let s = '';
  for (let i = 0; i < 13; i++) {
    s = ALPHABET[Number(n & 31n)] + s;
    n >>= 5n;
  }
  return s;
}
