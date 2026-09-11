"use client";

import { useEffect } from "react";
import { useGrove } from "./lib/useGrove";
import { prime } from "./lib/sound";
import Setup from "./screens/Setup";
import Home from "./screens/Home";
import Progress from "./screens/Progress";
import Help from "./screens/Help";
import Processing from "./screens/Processing";
import Confirm from "./screens/Confirm";
import Tutor from "./screens/Tutor";
import Play from "./screens/Play";
import FeedbackCard from "./components/FeedbackCard";

// Grove decides which screen to show; every screen reads its data from useGrove.
export default function App() {
  const g = useGrove();

  // Audio unlocks on the first tap anywhere in the app - autoplay policies
  // block it before a user gesture.
  useEffect(() => {
    const unlock = () => { prime(); window.removeEventListener("pointerdown", unlock); };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // Setup comes first for a named grove that has no grade yet, or is editing it.
  const screen = g.student && g.loaded && (!g.profile || g.editingProfile) ? <Setup g={g} />
    : g.screen === "home" ? <Home g={g} />
    : g.screen === "progress" ? <Progress g={g} />
    : g.screen === "help" ? <Help g={g} />
    : g.screen === "processing" ? <Processing g={g} />
    : g.screen === "confirm" ? <Confirm g={g} />
    : g.screen === "tutor" ? <Tutor g={g} />
    : g.screen === "play" ? <Play g={g} />
    : null;

  // Feedback can be opened from more than one screen, so it overlays
  // whichever one is active rather than living inside any single screen.
  return (
    <>
      {screen}
      {g.feedbackOpen && <FeedbackCard g={g} />}
    </>
  );
}
