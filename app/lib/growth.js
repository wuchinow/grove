// ---- Growth ------------------------------------------------------------------
// A tree's growth reads on one axis: height. One completed session is one
// stage, eight states in all - a planted seed mark, then seven tree stages -
// so seven sessions gets a tree to full size. How well a concept is known
// (mastery) is a separate signal and lives on Progress, not on the tree.
//
// "Sessions" here is the concept's `days` field: it goes up by one each time a
// tutor session on that concept finishes. It never counted calendar days.
//
// This is the one place the stage maths and the stage names live.
export const STAGE_NAMES = ["Planted", "Sprout", "Seedling", "Sapling", "Young tree", "Growing tree", "Tall tree", "Full grown"];
export const STAGE_MAX = STAGE_NAMES.length - 1;

export function stageOf(sessions) {
  const n = Math.floor(Number(sessions));
  return Number.isFinite(n) ? Math.min(STAGE_MAX, Math.max(0, n)) : 0;
}

export const stageName = (sessions) => STAGE_NAMES[stageOf(sessions)];

// The tree card's line under the progress strip: what one more session does.
export function nextStageLine(sessions) {
  const stage = stageOf(sessions);
  if (stage >= STAGE_MAX) return "Full grown. Come back to it whenever you want.";
  if (stage === STAGE_MAX - 1) return "Finish one more session to reach full size.";
  return `Finish one more session to grow into a ${STAGE_NAMES[stage + 1].toLowerCase()}.`;
}
