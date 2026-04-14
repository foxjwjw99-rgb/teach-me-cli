/**
 * Concurrency utilities for generation pipelines.
 */

/**
 * Run async tasks with a maximum concurrency limit.
 * Tasks are started in order; up to `limit` tasks run simultaneously.
 */
export async function runWithConcurrency(
	tasks: (() => Promise<void>)[],
	limit: number,
	abortSignal?: AbortSignal,
): Promise<void> {
	if (tasks.length === 0) return;
	let idx = 0;
	async function worker() {
		while (idx < tasks.length) {
			if (abortSignal?.aborted) return;
			const task = tasks[idx++];
			await task();
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(limit, tasks.length) }, worker),
	);
}
