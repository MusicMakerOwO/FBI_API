import crypto from 'node:crypto';

const MASTER_KEY = Buffer.from(process.env.PEPPER!, 'base64');

/**
 * Wraps a key with another key using AES-256-GCM.
 * This should not be used for user keys, use WrapUserKey() instead.
 * @param keyToWrap
 * @param wrappingKey
 * @returns {Buffer}
 */
function WrapKey(keyToWrap: Buffer, wrappingKey: Buffer = MASTER_KEY): Buffer {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', wrappingKey, iv);
	const wrapped = Buffer.concat([cipher.update(keyToWrap), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, wrapped]); // 12 + 16 + length(wrapped)
}

/**
 * Undoes WrapKey() given the same wrapping key
 * @param wrappedBlob
 * @param wrappingKey
 * @returns {Buffer}
 */
function UnwrapKey(wrappedBlob: Buffer, wrappingKey: Buffer = MASTER_KEY): Buffer {
	if (wrappedBlob.length < 12 + 16) throw new Error('Invalid wrapped key length');
	const iv = wrappedBlob.subarray(0, 12);
	const tag = wrappedBlob.subarray(12, 28);
	const encryptedKey = wrappedBlob.subarray(28);
	const decipher = crypto.createDecipheriv('aes-256-gcm', wrappingKey, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(encryptedKey), decipher.final()]); // original key
}

export {
	WrapKey,
	UnwrapKey
}