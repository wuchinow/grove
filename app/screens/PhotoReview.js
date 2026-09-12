"use client";

import React from "react";
import { C } from "../lib/theme";
import Icon from "../components/Icon";
import { Shell, Logo } from "../components/Shell";

const MAX_PHOTOS = 6;

export default function PhotoReview({ g }) {
  const { addAnotherPage, cancelPhotoReview, extractPendingPhotos, pendingPhotos, removePendingPhoto } = g;
  const full = pendingPhotos.length >= MAX_PHOTOS;

  return (
    <Shell>
      <div style={{ padding: "20px 20px 30px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <Logo small />
        <div className="fadeUp" style={{ marginTop: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.5 }}>Review your pages before we read them. Remove any that didn't come out right, or add another.</div>
          <div style={{ display: "inline-block", marginTop: 8, background: C.soft, color: C.primaryDeep, padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>{pendingPhotos.length} {pendingPhotos.length === 1 ? "page" : "pages"}</div>
        </div>

        <div style={{ position: "relative", flex: 1, minHeight: 0, marginTop: 16 }}>
          <div style={{ height: "100%", overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, paddingBottom: 26, WebkitMaskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)", maskImage: "linear-gradient(to bottom, black calc(100% - 26px), transparent 100%)" }}>
            {pendingPhotos.map((p, i) => (
              <div key={p.id} className="fadeUp" style={{ position: "relative", aspectRatio: "1", borderRadius: 14, overflow: "hidden", background: C.card, boxShadow: "0 3px 10px rgba(58,42,32,.08)" }}>
                <img src={p.url} alt={`Page ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button onClick={() => removePendingPhoto(p.id)} aria-label={`Remove page ${i + 1}`} style={{ position: "absolute", top: 5, right: 5, border: "none", background: "rgba(45,28,16,.62)", color: "#FCEFE4", width: 24, height: 24, borderRadius: 999, cursor: "pointer", fontSize: 14, display: "grid", placeItems: "center" }}>&times;</button>
              </div>
            ))}
            <button
              onClick={addAnotherPage}
              disabled={full}
              style={{
                aspectRatio: "1", border: `1.5px dashed ${C.line}`, background: "transparent",
                cursor: full ? "default" : "pointer", borderRadius: 14, color: full ? C.stone : C.primary,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              {full ? (
                <span style={{ fontWeight: 800, fontSize: 12.5 }}>{MAX_PHOTOS} of {MAX_PHOTOS}</span>
              ) : (
                <>
                  <Icon name="camera" size={18} color={C.primary} />
                  <span style={{ fontWeight: 700, fontSize: 11.5, textAlign: "center", padding: "0 4px" }}>Add another page</span>
                </>
              )}
            </button>
          </div>
        </div>

        <button onClick={extractPendingPhotos} disabled={!pendingPhotos.length} style={{ marginTop: 14, width: "100%", border: "none", cursor: pendingPhotos.length ? "pointer" : "default", padding: 16, borderRadius: 16, background: pendingPhotos.length ? `linear-gradient(135deg, ${C.primary}, ${C.primaryDeep})` : C.line, color: "#FCEFE4", fontWeight: 800, fontSize: 16 }}>
          Extract
        </button>
        <button onClick={cancelPhotoReview} style={{ marginTop: 8, width: "100%", border: "none", background: "transparent", cursor: "pointer", color: C.sub, fontWeight: 700, fontSize: 14 }}>Back to grove</button>
      </div>
    </Shell>
  );
}
