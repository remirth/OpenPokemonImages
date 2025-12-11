const cache = new Map<string, Promise<unknown>>();
export function lazyLoaded<T>(key: string, loader: () => Promise<T>) {
	if (!cache.has(key)) {
		const p = loader();
		cache.set(key, p);
		(async () => {
			try {
				await p;
			} catch {
				cache.delete(key);
			}
		})();
	}

	return cache.get(key) as Promise<T>;
}
