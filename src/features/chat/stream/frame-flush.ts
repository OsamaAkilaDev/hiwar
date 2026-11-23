export function createFrameFlusher(flush: (id: string, text: string) => void) {
  let pending: Record<string, string> = {};
  let frame: number | undefined;

  const flushNow = () => {
    if (frame !== undefined) globalThis.cancelAnimationFrame(frame);
    frame = undefined;
    const batch = pending;
    pending = {};
    for (const [id, text] of Object.entries(batch)) flush(id, text);
  };

  return {
    push(id: string, chunk: string) {
      pending[id] = (pending[id] ?? "") + chunk;
      frame ??= globalThis.requestAnimationFrame(flushNow);
    },
    flushNow,
  };
}
