import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcrypt
 * @param {string} plainPassword 
 * @returns {Promise<string>} hashed password
 */
export const hashPassword = async (plainPassword) => {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
};

/**
 * Compare a candidate plain text password with a stored hash
 * @param {string} candidatePassword 
 * @param {string} passwordHash 
 * @returns {Promise<boolean>}
 */
export const comparePassword = async (candidatePassword, passwordHash) => {
  return await bcrypt.compare(candidatePassword, passwordHash);
};
