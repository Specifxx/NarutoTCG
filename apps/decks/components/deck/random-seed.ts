/** A fresh 32-bit seed from the platform CSPRNG. Call only from event handlers or effects, never during render. */
export function randomSeed(): number {
  const buffer = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buffer);
  return buffer[0];
}
