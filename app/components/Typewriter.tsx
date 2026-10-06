"use client";

import { useEffect, useRef, useState } from "react";

function charDelayMs(ch: string): number {
  if (ch === "." || ch === "!" || ch === "?") return 300;
  if (ch === ",") return 160;
  if (ch === " ") return 24;
  return 26;
}

type TypewriterProps = {
  text: string;
  onDone?: () => void;
  style?: React.CSSProperties;
  speedMultiplier?: number;
};

// If `text` needs to change after mount, key this component by `text` at
// the call site to force a clean remount rather than relying on internal
// reset logic (state resets for free via natural remount that way).
export function Typewriter({ text, onDone, style, speedMultiplier = 1 }: TypewriterProps) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const mult = Math.max(0.1, speedMultiplier);
    let i = 0;
    const tick = () => {
      if (cancelled) return;
      if (i >= text.length) {
        setDone(true);
        onDoneRef.current?.();
        return;
      }
      i += 1;
      setShown(text.slice(0, i));
      timer = setTimeout(tick, charDelayMs(text.charAt(i - 1)) * mult);
    };
    timer = setTimeout(tick, 200 * mult);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [text, speedMultiplier]);

  const skip = () => {
    setShown(text);
    setDone(true);
    onDoneRef.current?.();
  };

  return (
    <span onClick={skip} style={{ cursor: done ? "default" : "pointer", ...style }}>
      {shown}
      {!done && (
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: "0.5em",
            marginLeft: 2,
            background: "currentColor",
            height: "1em",
            verticalAlign: "-0.15em",
            opacity: 0.5,
          }}
        />
      )}
    </span>
  );
}
