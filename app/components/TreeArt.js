import { SCENE_ART } from "../lib/scene-art";
import { speciesOf, treeArt } from "../lib/scene";
import { STAGE_NAMES, STAGE_MAX } from "../lib/growth";

// A painted tree at a growth stage, for everywhere outside the Home scene:
// the tree card, the tutor header, list rows, the sign-in card. Drawn as
// painted (no tone filter), standing on the bottom edge of a square box of
// `size` px and contained in it, with explicit pixel sizes worked out from
// the art's own shape. Its alt text is the stage's name. `concept` is only
// there to pick a species once there is more than one.
export default function TreeArt({ stage = 0, size = 40, concept, style }) {
  const st = Math.min(STAGE_MAX, Math.max(0, Math.floor(Number(stage)) || 0));
  const species = speciesOf(concept);
  const art = SCENE_ART[species][st];
  const k = Math.min(size / art.w, size / art.h);
  return (
    <span className="treeArt" style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", width: size, height: size, flexShrink: 0, ...style }}>
      <img src={treeArt(species, st)} alt={STAGE_NAMES[st]} width={Math.round(art.w * k)} height={Math.round(art.h * k)} draggable={false} style={{ display: "block" }} />
    </span>
  );
}
