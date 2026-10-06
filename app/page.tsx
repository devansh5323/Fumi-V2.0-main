"use client";

import { useState } from "react";
import { PathfinderSweepGame } from "./games/pathfinder-sweep";
import { SignalWatchGame } from "./games/signal-watch";
import { PhoneFrame, PHONE_SCREEN_SIZE } from "./components/PhoneFrame";
import { GamePicker, type GameEntry } from "./components/GamePicker";

const GAMES: GameEntry[] = [
  {
    id: "pathfinder-sweep",
    title: "Pathfinder Sweep",
    tagline: "Find the one marker that matches exactly.",
    skills: "Selective attention · Visual scanning",
    art: "/games/pathfinder-sweep/backgrounds/forest-path.png",
    accent: "#F0C572",
  },
  {
    id: "signal-watch",
    title: "Signal Watch",
    tagline: "Watch the towers and tap the one with three rings.",
    skills: "Sustained attention · Signal detection",
    art: "/games/signal-watch/backgrounds/river-towers.jpg",
    artPosition: "50% 66%",
    accent: "#9bf0ff",
  },
];

export default function Home() {
  // null = the game picker. Each launch gets a fresh key so a game always
  // starts a clean session.
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [launchCount, setLaunchCount] = useState(0);

  const launch = (id: string) => {
    setLaunchCount((c) => c + 1);
    setActiveGame(id);
  };
  const exitToPicker = () => setActiveGame(null);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        background: "radial-gradient(circle at 50% 0%, #1c1740 0%, #07061c 55%, #030209 100%)",
        backgroundColor: "#030209",
      }}
    >
      <PhoneFrame>
        <div style={{ position: "relative", width: PHONE_SCREEN_SIZE.width, height: PHONE_SCREEN_SIZE.height, overflow: "hidden" }}>
          {activeGame === null && <GamePicker games={GAMES} onPick={launch} />}
          {activeGame === "pathfinder-sweep" && <PathfinderSweepGame key={launchCount} ageBand="6-10" onExit={exitToPicker} />}
          {activeGame === "signal-watch" && <SignalWatchGame key={launchCount} ageBand="6-10" onExit={exitToPicker} />}
        </div>
      </PhoneFrame>
    </main>
  );
}
