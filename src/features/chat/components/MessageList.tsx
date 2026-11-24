import { useRouter } from "@tanstack/react-router";
import { Fragment, useEffect, useLayoutEffect, useRef } from "react";
import type { MessageDTO } from "../../../../shared/events";
import { MessageRow, NoResponse } from "./MessageRow";

type Props = {
  messages: MessageDTO[];
  streamingId: string | null;
  /** Ids already on screen when the conversation opened; only others animate in. */
  settled: ReadonlySet<string>;
  onRetry: (userMessageId: string) => void;
  /** Set while older messages exist; called as the reader nears the top. */
  onReachTop?: () => void;
};

const NEAR_BOTTOM_PX = 120;

export function MessageList({
  messages,
  streamingId,
  settled,
  onRetry,
  onReachTop,
}: Props) {
  const top = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const router = useRouter();

  // Follow the stream until the reader scrolls up; reaching the bottom again
  // re-pins. Only the reader's own input unpins: the page also moves up on its
  // own when a placeholder is swapped for a shorter chart, and a chart can land
  // between an auto-scroll and its scroll event.
  useEffect(() => {
    let lastY = window.scrollY;
    let inputAt = 0;
    let held = false;
    const onInput = () => {
      inputAt = performance.now();
    };
    const onPointer = (e: PointerEvent) => {
      held = e.type === "pointerdown";
    };
    const onScroll = () => {
      const { scrollY, innerHeight } = window;
      const fromEnd =
        document.documentElement.scrollHeight - (scrollY + innerHeight);
      const byReader = held || performance.now() - inputAt < 500;
      if (fromEnd < NEAR_BOTTOM_PX) pinned.current = true;
      else if (scrollY < lastY && byReader) pinned.current = false;
      lastY = scrollY;
    };
    const opts = { passive: true };
    const inputs = ["wheel", "touchmove", "keydown"] as const;
    for (const type of inputs) window.addEventListener(type, onInput, opts);
    window.addEventListener("pointerdown", onPointer, opts);
    window.addEventListener("pointerup", onPointer, opts);
    window.addEventListener("scroll", onScroll, opts);
    return () => {
      for (const type of inputs) window.removeEventListener(type, onInput);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onPointer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // A new last message always pins to the bottom. While pinned, the view follows
  // any growth: streamed text, visuals that load after the first paint, and the
  // composer's footer.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when a message is appended
  useEffect(() => {
    pinned.current = true;
    const follow = () => {
      // The sticky composer ends the page, so the very end puts the last line
      // just above it.
      if (pinned.current)
        window.scrollTo(0, document.documentElement.scrollHeight);
    };
    follow();
    const grows = new ResizeObserver(follow);
    grows.observe(document.body);
    // The router scrolls to the top after each navigation renders.
    const unsubscribe = router.subscribe("onRendered", follow);
    return () => {
      grows.disconnect();
      unsubscribe();
    };
  }, [messages.at(-1)?.id]);

  // Re-observing after each page re-checks a sentinel still in view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run per loaded page
  useEffect(() => {
    const el = top.current;
    if (!onReachTop || !el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry?.isIntersecting && onReachTop(),
      { rootMargin: "800px 0px 0px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onReachTop, messages[0]?.id]);

  // Older messages land above the reader: keep the row they were looking at
  // where it was. Native scroll anchoring misses this at scrollY 0 and in
  // Safari, so whatever offset is left gets corrected. The position is
  // read during render, before the DOM changes.
  const firstId = messages[0]?.id;
  const anchor = useRef<{ id?: string; el?: Element | null; y?: number }>({});
  if (anchor.current.id !== firstId) {
    const el = top.current?.nextElementSibling;
    anchor.current = { id: firstId, el, y: el?.getBoundingClientRect().top };
  }
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when a page is prepended
  useLayoutEffect(() => {
    const { el, y } = anchor.current;
    if (el?.isConnected && y !== undefined) {
      const drift = el.getBoundingClientRect().top - y;
      if (Math.abs(drift) > 1) window.scrollBy(0, drift);
    }
  }, [firstId]);

  return (
    // ponytail: no virtualization. History loads 50 messages at a time; at 50
    // visual-heavy messages a streaming flush costs ~2.6ms of layout, ~11ms at
    // 120. If readers often scroll back that far, try content-visibility:auto
    // on settled rows (measured 10x cheaper) and handle its estimated heights.
    <div className="flex flex-col gap-8 pb-6">
      <div ref={top} aria-hidden className="-mb-8" />
      {messages.map((m, i) => {
        if (m.role === "assistant") {
          const prev = messages[i - 1];
          return (
            <MessageRow
              key={m.id}
              message={m}
              live={m.id === streamingId}
              fresh={!settled.has(m.id)}
              onRetry={
                prev?.role === "user" ? () => onRetry(prev.id) : undefined
              }
            />
          );
        }
        const unanswered = messages[i + 1]?.role !== "assistant";
        return (
          <Fragment key={m.id}>
            <MessageRow message={m} live={false} fresh={!settled.has(m.id)} />
            {unanswered && streamingId === null ? (
              <div className="-mt-5">
                <NoResponse onRetry={() => onRetry(m.id)} />
              </div>
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}
