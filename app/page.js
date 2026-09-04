"use client";

import { useGrove } from "./lib/useGrove";
import Setup from "./screens/Setup";
import Home from "./screens/Home";
import Progress from "./screens/Progress";
import Help from "./screens/Help";
import Processing from "./screens/Processing";
import Confirm from "./screens/Confirm";
import Tutor from "./screens/Tutor";

// Grove decides which screen to show; every screen reads its data from useGrove.
export default function App() {
  const g = useGrove();

  // Setup comes first for a named grove that has no grade yet, or is editing it.
  if (g.child && g.loaded && (!g.profile || g.editingProfile)) return <Setup g={g} />;
  if (g.screen === "home") return <Home g={g} />;
  if (g.screen === "progress") return <Progress g={g} />;
  if (g.screen === "help") return <Help g={g} />;
  if (g.screen === "processing") return <Processing g={g} />;
  if (g.screen === "confirm") return <Confirm g={g} />;
  if (g.screen === "tutor") return <Tutor g={g} />;
  return null;
}
