const crypto = require('node:crypto');

export function EncryptMessage(plaintext: string, key: Buffer) {
	if (plaintext === null) return { encrypted: null, tag: null, iv: null };
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return { encrypted, tag, iv };
}

export function DecryptMessage(encrypted: Buffer | null, tag: Buffer | null, iv: Buffer | null, key: Buffer): string | null {
	if (encrypted === null) return null;
	if (tag === null || iv === null) throw new Error('Tag and IV are required for decryption');
	const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
	return plain.toString('utf8');
}