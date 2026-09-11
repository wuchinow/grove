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
  if (g.student && g.loaded && (!g.profile || g.editingProfile)) return <Setup g={g} />;
  if (g.screen === "home") return <Home g={g} />;
  if (g.screen === "progress") return <Progress g={g} />;
  if (g.screen === "help") return <Help g={g} />;
  if (g.screen === "processing") return <Processing g={g} />;
  if (g.screen === "confirm") return <Confirm g={g} />;
  if (g.screen === "tutor") return <Tutor g={g} />;
  if (g.screen === "play") return <Play g={g} />;
  return null;
}
