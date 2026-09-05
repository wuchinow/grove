// ---- Palette: warm earth, a grove at golden hour --------------------------
export const C = {
  ink: "#38281E",       // warm dark bark-brown (text)
  sub: "#8E7967",       // warm taupe (secondary text)
  bg: "#F1E5D2",        // sand / oat (app background)
  card: "#FBF5EA",      // bone surface
  line: "#E4D6C0",      // warm sand line
  soft: "#EFE3CE",      // soft sand chip
  primary: "#B05A31",   // redwood / terracotta
  primaryDeep: "#874225",
  amber: "#E39A4E",     // golden hour light
  amberDeep: "#C77D34",
  sage: "#8B9A5B",      // foliage
  sageDeep: "#5E7340",
  stone: "#A99A85",
  coral: "#BC6B3E",     // needs-work accent
};

export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap');
@keyframes fadeUp { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
@keyframes pop { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
@keyframes grow { 0%{transform:scale(.4) translateY(14px);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1) translateY(0);opacity:1} }
@keyframes sway { 0%,100%{transform:rotate(-1deg)} 50%{transform:rotate(1deg)} }
@keyframes dotPulse { 0%,80%,100%{opacity:.3;transform:scale(.85)} 40%{opacity:1;transform:scale(1)} }
.dotPulse{display:inline-block;width:5px;height:5px;border-radius:999px;background:currentColor;animation:dotPulse 1.1s ease-in-out infinite}
.fadeUp{animation:fadeUp .32s ease both}
.pop{animation:pop .35s ease both}
.grew{animation:grow .7s cubic-bezier(.22,1,.36,1) both}
.disp{font-family:'Fraunces',Georgia,serif}
.fullvh{height:100vh;height:100dvh}
.minvh{min-height:100vh;min-height:100dvh}
.noscroll::-webkit-scrollbar{display:none}
.treeLabel{
  margin-top:4px; width:100%; box-sizing:border-box;
  padding:3px 6px; border-radius:8px;
  background:rgba(38,22,11,.62);
  color:#FDF4E4; font-size:10.5px; font-weight:800; line-height:1.2;
  text-align:center; overflow:hidden; overflow-wrap:anywhere; hyphens:auto;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
}
@media (max-width:420px){ .treeLabel{ font-size:9.5px; padding:2px 5px } }
@media (prefers-reduced-motion: reduce){
  .fadeUp,.pop,.grew,.dotPulse{animation:none}
}
`;
