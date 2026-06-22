export const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(new DOMException(`Délai dépassé (${timeoutMs / 1000}s)`, "TimeoutError")),
    timeoutMs,
  );
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal || controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
};
