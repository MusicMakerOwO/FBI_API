export function SecureStringTest(string1: string, string2: string): boolean {
	if (string1.length !== string2.length) return false;

	let result = 0;
	for (let i = 0; i < string1.length; i++) {
		result |= string1.charCodeAt(i) ^ string2.charCodeAt(i);
	}

	return result === 0;
}