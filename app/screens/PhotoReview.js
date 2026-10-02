"use client";

import React from "react";
import { C } from "../lib/theme";
import Icon from "../components/Icon";
import { Shell, Logo } from "../components/Shell";
import { Chip } from "../components/ui/Card";
import PillButton from "../components/ui/PillButton";

const MAX_PHOTOS = 6;

// A guaranteed-square cell that never depends on aspect-ratio CSS support
// (or its interaction with a CSS grid's 1fr track sizing, which is where
// this actually broke - a thumbnail rendered fine on desktop Chromium and
// desktop WebKit alike, but collapsed to zero height on a real iPhone,
// which also silently clipped the absolutely-positioned remove button
// since it shared the same overflow:hidden box). The classic
// padding-bottom:100% intrinsic-ratio trick has worked in every browser
// since CSS1 and doesn't depend on aspect-ratio at all.
function SquareCell({ children, style, className }) {
  return (
    <div className={className} style={{ position: "relative", width: "100%", paddingBottom: "100%", borderRadius: 14, overflow: "hidden", background: C.soft, boxShadow: "0 3px 10px rgba(31,56,36,.08)", ...style }}>
      <div style={{ position: "absolute", inset: 0 }}>{children}</div>
    </div>
  );
}

export default function PhotoReview({ g }) {
  const { addAnotherPage, cancelPhotoReview, extractPendingPhotos, pendingPhotos, removePendingPhoto } = g;
  const full = pendingPhotos.length >= MAX_PHOTOS;

  return (
    <Shell>
      <div style={{ padding: "18px 18px 28px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Logo small />
        <div className="fadeUp" style={{ marginTop: 20 }}>
          <Chip>{pendingPhotos.length} {pendingPhotos.length === 1 ? "page" : "pages"}</Chip>
          <div className="disp" style={{ fontSize: 26, fontWeight: 500, lineHeight: 1.2, marginTop: 12 }}>Review your pages</div>
          <div style={{ fontSize: 14, color: C.sub, lineHeight: 1.55, marginTop: 6 }}>Remove any that didn't come out clearly, or add another before we read them.</div>
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0, marginTop: 16 }}>
          <div style={{ height: "100%", overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", alignItems: "start", alignContent: "start", gap: 10, paddingBottom: 26, WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)", maskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)" }}>
            {pendingPhotos.map((p, i) => (
              <SquareCell key={p.id} className="fadeUp">
                <img src={p.url} alt={`Page ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button onClick={() => removePendingPhoto(p.id)} aria-label={`Remove page ${i + 1}`} style={{ position: "absolute", top: 5, right: 5, border: "none", background: "rgba(20,46,39,.66)", color: "#fff", width: 26, height: 26, borderRadius: 999, cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center" }}>&times;</button>
              </SquareCell>
            ))}
            <SquareCell style={{ background: "transparent", border: `1px dashed ${C.stone}`, boxShadow: "none" }}>
              <button
                onClick={addAnotherPage}
                disabled={full}
                style={{
                  width: "100%", height: "100%", border: "none", background: "transparent",
                  cursor: full ? "default" : "pointer", color: full ? C.stone : C.primary,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                }}
              >
                {full ? (
                  <span style={{ fontWeight: 500, fontSize: 12.5 }}>{MAX_PHOTOS} of {MAX_PHOTOS}</span>
                ) : (
                  <>
                    <Icon name="camera" size={18} color={C.primary} />
                    <span style={{ fontWeight: 500, fontSize: 12, textAlign: "center", padding: "0 4px" }}>Add another page</span>
                  </>
                )}
              </button>
            </SquareCell>
          </div>
        </div>

        <PillButton size="lg" full onClick={extractPendingPhotos} disabled={!pendingPhotos.length} style={{ marginTop: 14 }}>
          Extract
        </PillButton>
        <button onClick={cancelPhotoReview} style={{ marginTop: 6, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 500, fontSize: 14, padding: 8 }}>Back to my grove</button>
      </div>
    </Shell>
  );
}
