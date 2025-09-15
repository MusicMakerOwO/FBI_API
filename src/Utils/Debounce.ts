export default function Debounce(func: Function, delay: number) {
	let timeoutId: NodeJS.Timeout | null = null;
	return function(...args: unknown[]) {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => {
			func(...args);
			timeoutId = null; // Reset timeoutId after execution
		}, delay);
	};
}