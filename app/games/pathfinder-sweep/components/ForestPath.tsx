"use client";

// The game's forest-path backdrop — a single painted illustration.
export function ForestPath() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/games/pathfinder-sweep/backgrounds/forest-path.png"
      alt=""
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: "50% 50%",
        display: "block",
      }}
    />
  );
}
