export class LRUCache <T> {
	size: number;
	cache: Map<string, T>;

	constructor(size: number) {
		this.size = size;
		this.cache = new Map();
	}

	has(key: string) {
		return this.cache.has(key);
	}

	set(key: string, value: T) {
		if (this.cache.has(key)) {
			this.cache.delete(key);
			this.cache.set(key, value);
			return;
		}

		if (this.cache.size >= this.size) {
			const oldestKey = this.cache.keys().next().value;
			this.cache.delete(oldestKey!);
		}

		this.cache.set(key, value);
	}

	get(key: string) {
		if (!this.cache.has(key)) return null;

		const value = this.cache.get(key)!;

		this.cache.delete(key);
		this.cache.set(key, value);

		return value;
	}

	delete(key: string) {
		return this.cache.delete(key);
	}
}