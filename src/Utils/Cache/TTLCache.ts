import { SECONDS } from '../../Constants';

export class TTLCache<T> {
	cache: Map<string, { value: T; expiryTime: number; ttl: number }>;
	interval: NodeJS.Timeout;

	constructor(checkInterval = SECONDS.MINUTE * 1000) {
		this.cache = new Map();

		// Start the interval to clean up expired items
		this.interval = setInterval(() => this.cleanup(), checkInterval);
	}

	set(key: string, value: T, ttl: number = SECONDS.MINUTE * 10 * 1000) {
		const expiryTime = Date.now() + ttl;
		this.cache.set(key, { value, expiryTime, ttl });
	}

	delete(key: string) {
		this.cache.delete(key);
	}

	#isExpired(item: { value: T; expiryTime: number; ttl: number }) {
		return Date.now() > item.expiryTime;
	}

	has(key: string) {
		const item = this.cache.get(key);
		if (!item) return false;

		if (this.#isExpired(item)) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}


	get(key: string, touch = true) {
		const item = this.cache.get(key);
		if (!item) return null;

		if (this.#isExpired(item)) {
			this.cache.delete(key);
			return null;
		}

		if (touch) {
			// Update the expiry time to extend the TTL
			item.expiryTime = Date.now() + item.ttl;
			this.cache.set(key, item);
		}

		return item.value;
	}

	cleanup() {
		for (const [key, item] of this.cache.entries()) {
			if (this.#isExpired(item)) {
				this.cache.delete(key);
			}
		}
	}

	destroy() {
		clearInterval(this.interval);
		this.cache.clear();
	}

	keys() {
		return Array.from(this.cache.keys()).filter(key => this.has(key));
	}

	values() {
		return Array.from(this.cache.values())
			.filter(item => !this.#isExpired(item))
			.map(item => item.value);
	}

	entries() {
		return Array.from(this.cache.entries())
			.filter(([key, item]) => !this.#isExpired(item))
			.map(([key, item]) => [key, item.value]);
	}
}