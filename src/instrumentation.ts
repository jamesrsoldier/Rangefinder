/**
 * Next.js instrumentation hook.
 * Runs once on server startup, before any request handler.
 * Used to ensure mock database is fully initialized in mock mode.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.USE_MOCK_ENGINE === 'true') {
    const { waitForInit } = await import('@/lib/db');
    await waitForInit();
  }
}
