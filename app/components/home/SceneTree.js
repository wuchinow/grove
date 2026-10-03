"use client";

import Icon from "../Icon";
import { treeArt } from "../../lib/scene";
import { stageName } from "../../lib/growth";

// One tree on the scene: its painted cut-out standing on its anchor, a soft
// ground shadow, and its pinned label. All of it is one button, so tapping the
// tree or its label opens the tree card. The button carries no z-index or
// transform of its own, so the shadow, the tree and the label each layer
// against the whole scene: every label above every tree, nearer trees over
// farther ones. The planting and growing animations run on the image alone.
export default function SceneTree({ t, c, label, labelShown, showStage = true, portrait = false, labelRef, animClass, delay, onOpen }) {
  // The portrait plate's grass is brighter, so its shadows are wider and
  // fall further right (ui.css darkens them too).
  const sw = Math.max(portrait ? 20 : 18, t.w * (portrait ? 0.8 : 0.62));
  const sh = Math.max(portrait ? 7 : 6, t.w * (portrait ? 0.16 : 0.13));
  // The plate is lit from the upper left, so shadows fall a little to the
  // right; a mirrored copy of the plate is lit from the upper right.
  const ox = (t.mirrored ? -1 : 1) * t.w * (portrait ? 0.12 : 0.06);
  const fx = t.footX - t.left;
  const fy = t.footY - t.top;
  const pos = label || { x: t.footX - 70, y: t.footY + 6 };
  return (
    <button title={c.name} onClick={onOpen} className="sceneTree" data-foot={`${t.footX},${t.footY}`} data-art-foot={`${t.art.footX},${t.art.footY}`} style={{ left: t.left, top: t.top, width: t.w, height: t.h }}>
      <span className="sceneShadow" style={{ left: fx - sw / 2 + ox, top: fy - sh / 2, width: sw, height: sh, zIndex: t.z * 2 }} />
      <img
        src={treeArt(t.species, t.stage)}
        alt=""
        width={Math.round(t.w)}
        height={Math.round(t.h)}
        draggable={false}
        className={animClass ? `sceneTreeImg ${animClass}` : "sceneTreeImg"}
        style={{ zIndex: t.z * 2 + 1, transformOrigin: `${t.art.footX * 100}% ${t.art.footY * 100}%`, animationDelay: delay }}
      />
      <span ref={labelRef} className={labelShown ? "treeLabelPin" : "treeLabelPin isHidden"} aria-hidden={labelShown ? undefined : true} style={{ left: pos.x - t.left, top: pos.y - t.top, zIndex: 1000 + t.z }}>
        <span className="treeLabelText">
          <span className="treeLabel">{c.name}</span>
          {showStage && <span className="treeLabelStage">{stageName(c.days)}</span>}
        </span>
        <Icon name="chevronRight" size={14} color="#687b64" strokeWidth={2.2} />
      </span>
    </button>
  );
}
