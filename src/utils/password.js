import bcrypt from "bcryptjs";

const ROUNDS = 10;
const isHashed = (value = "") => /^\$2[aby]\$/.test(value);

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);

/**
 * Compare a plain password with the stored value.
 * Accounts created before hashing was added still hold plain text, so those are
 * compared directly and flagged with needsRehash so the caller can upgrade them.
 */
export const verifyPassword = async (plain, stored) => {
  if (!stored) return { ok: false, needsRehash: false };
  if (isHashed(stored)) {
    return { ok: await bcrypt.compare(plain, stored), needsRehash: false };
  }
  return { ok: plain === stored, needsRehash: plain === stored };
};
