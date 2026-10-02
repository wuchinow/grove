// ---- Palette: deep green on warm cream -------------------------------------
// The keys are the ones every screen already reads, so the whole app (admin
// included) takes the palette from here. ink, sub, bg, line, soft, primary and
// coral are the redesign's own values; amber, sage, sageDeep and stone have no
// counterpart there and are picked to sit in the same family.
export const C = {
  ink: "#1b3c30",       // deep green (text)
  sub: "#637264",       // muted green-grey (secondary text)
  bg: "#fafbf5",        // warm cream paper (app background)
  card: "#ffffff",      // card surface
  line: "rgba(35,72,48,.16)", // hairline
  soft: "#e4ead9",      // soft sage chip
  primary: "#234d3b",   // green (buttons, links)
  primaryDeep: "#1b3c30",
  amber: "#dfe8cd",     // was golden-hour amber; now a pale sage fill
  amberDeep: "#cfdcb8",
  sage: "#8aa37a",      // foliage
  sageDeep: "#2f5f3f",
  stone: "#93a091",
  coral: "#945b3b",     // needs-work accent
};

// The two families, declared with their files in app/fonts/fonts.css.
export const FONT_BODY = "'DM Sans',system-ui,-apple-system,'Segoe UI',sans-serif";
export const FONT_DISPLAY = "'Playfair Display',Georgia,serif";

export const FONTS = `
@keyframes fadeUp { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
@keyframes pop { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
@keyframes grow { 0%{transform:scale(.4) translateY(14px);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1) translateY(0);opacity:1} }
@keyframes sway { 0%,100%{transform:rotate(-1deg)} 50%{transform:rotate(1deg)} }
@keyframes dotPulse { 0%,80%,100%{opacity:.3;transform:scale(.85)} 40%{opacity:1;transform:scale(1)} }
.dotPulse{display:inline-block;width:5px;height:5px;border-radius:999px;background:currentColor;animation:dotPulse 1.1s ease-in-out infinite}
.fadeUp{animation:fadeUp .32s ease both}
.pop{animation:pop .35s ease both}
.grew{animation:grow .4s cubic-bezier(.22,1,.36,1) both}
.planted{animation:grow .38s cubic-bezier(.22,1,.36,1) both}
.disp{font-family:${FONT_DISPLAY};letter-spacing:-.015em}
.fullvh{height:100vh;height:100dvh}
.minvh{min-height:100vh;min-height:100dvh}
.noscroll::-webkit-scrollbar{display:none}
.noscroll{scroll-behavior:smooth}
.treeLabelCard{
  display:block; width:100%; box-sizing:border-box;
  padding:6px 5px; border-radius:12px;
  border:1px solid rgba(255,255,255,.88);
  background:rgba(250,252,240,.94);
  box-shadow:0 5px 18px rgba(33,65,37,.10);
}
.treeLabel{
  color:#234332; font-size:11.5px; font-weight:500; line-height:1.25;
  text-align:center; overflow:hidden; overflow-wrap:anywhere;
  -webkit-hyphens:auto; hyphens:auto;
  -webkit-hyphenate-limit-before:6; -webkit-hyphenate-limit-after:5; hyphenate-limit-chars:13 6 5;
  display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;
}
@media (max-width:420px){ .treeLabel{ font-size:11px } .treeLabelCard{ padding:5px 4px } }
@media (prefers-reduced-motion: reduce){
  .fadeUp,.pop,.grew,.planted,.dotPulse{animation:none}
  .noscroll{scroll-behavior:auto}
}
.groveHeaderIcon{display:grid;place-items:center}
.groveHeaderName{font-family:${FONT_DISPLAY};font-size:20px;font-weight:500;letter-spacing:-.02em;flex:1 1 auto;min-width:44px}
.groveHeaderChevron{display:inline-flex;flex-shrink:0}
.groveHeaderPill{padding:0 13px}
@media (max-width:480px){
  .groveHeaderPill{padding:0;width:36px;justify-content:center}
  .groveHeaderPillLabel{display:none}
}
@media (max-width:400px){
  .groveHeaderChevron.isPlus{display:none}
}
@media (max-width:360px){
  .groveHeaderName{font-family:${FONT_BODY};font-size:17px;font-weight:600;letter-spacing:-.01em}
  .groveHeaderChevron{display:none}
}
`;
