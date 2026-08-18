import bcrypt from 'bcryptjs'
import * as crypto from 'crypto'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Migration helper: check if a hash is legacy SHA-256 (64 hex chars) vs bcrypt
export function isLegacyHash(hash: string): boolean {
  return hash.length === 64 && /^[0-9a-f]{64}$/.test(hash)
}

// Verify legacy SHA-256 hash for migration
export function verifyLegacySha256(password: string, hash: string): boolean {
  return crypto.createHash('sha256').update(password).digest('hex') === hash
}
