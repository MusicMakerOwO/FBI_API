export class TTLCache<T> {
	cache: Map<string, { value: T; expiryTime: number; }>;
	ttl: number;

	#nextEviction: string | null;

	constructor(ttl: number) {
		this.cache = new Map();
		this.ttl = ttl;

		this.#nextEviction = null;
	}

	has(key: string) {
		if (!this.cache.has(key)) return false;
		const entry = this.cache.get(key)!;
		if (Date.now() > entry.expiryTime) {
			this.cache.delete(key);
			return false;
		}
		return true;
	}

	#scheduleNextEviction() {
		if (this.cache.size === 0) return;

		const nextItem = this.cache.entries().next().value;
		if (!nextItem) return;

		const [key, entry] = nextItem;
		const delay = entry.expiryTime - Date.now();
		if (delay <= 0) {
			this.#evict(key);
			this.#scheduleNextEviction();
		} else {
			this.#nextEviction = key;
			setTimeout(() => this.#evict(key), delay);
		}
	}

	#evict(key: string) {
		this.cache.delete(key);
		this.#nextEviction = null;
		this.#scheduleNextEviction();
	}

	set(key: string, value: T) {
		const expiryTime = Date.now() + this.ttl;
		this.cache.set(key, { value, expiryTime });

		if (!this.#nextEviction) {
			this.#nextEviction = key;
			setTimeout(() => this.#evict(key), this.ttl);
		}
	}

	get(key: string) {
		if (!this.cache.has(key)) return null;
		const entry = this.cache.get(key)!;
		if (Date.now() > entry.expiryTime) {
			this.cache.delete(key);
			return null;
		}
		return entry.value;
	}

	delete(key: string) {
		this.cache.delete(key);
	}
}