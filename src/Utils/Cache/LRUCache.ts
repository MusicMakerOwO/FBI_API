export class LRUCache <K extends string | number, V> {
	size: number;
	cache: Map<K, V>;

	constructor(size: number) {
		this.size = size;
		this.cache = new Map();
	}

	has(key: K) {
		return this.cache.has(key);
	}

	set(key: K, value: V) {
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

	get(key: K) {
		if (!this.cache.has(key)) return null;

		const value = this.cache.get(key)!;

		this.cache.delete(key);
		this.cache.set(key, value);

		return value;
	}

	delete(key: K) {
		return this.cache.delete(key);
	}
}