import crypto from 'crypto';

// Simple identifier hashing to keep key cardinality reasonable.
export function hashIdentifier(identifier, length = 16) {
  const asString = identifier == null ? '' : String(identifier);
  const hash = crypto.createHash('sha256').update(asString).digest('hex');
  return hash.slice(0, length);
}
