// Simple line icons drawn in the app's palette, replacing platform emoji so the
// visual language stays consistent (and doesn't read as a kids' app).
export default function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.8 }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", style: { display: "block", flexShrink: 0 } };
  if (name === "camera") return (
    <svg {...common}><path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1.5 1.5 0 0 0 1.24-.66l.72-1.08A1.5 1.5 0 0 1 9.9 4.6h4.2a1.5 1.5 0 0 1 1.24.66l.72 1.08A1.5 1.5 0 0 0 17.3 7h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" /><circle cx="12" cy="13" r="3.4" /></svg>
  );
  if (name === "drop") return (
    <svg {...common}><path d="M12 3.5c3.2 3.6 5.5 6.4 5.5 9.2a5.5 5.5 0 0 1-11 0c0-2.8 2.3-5.6 5.5-9.2z" /></svg>
  );
  if (name === "tree") return (
    <svg {...common}><path d="M12 3.5 6.8 11h3L5.8 17.5h12.4L14.2 11h3z" /><path d="M12 17.5V21" /></svg>
  );
  if (name === "sprout") return (
    <svg {...common}><path d="M12 20v-7" /><path d="M12 13c0-3-2-5-5-5 0 3 2 5 5 5z" /><path d="M12 13c0-2.6 1.8-4.4 4.4-4.4C16.4 11.2 14.6 13 12 13z" /></svg>
  );
  if (name === "chart") return (
    <svg {...common}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-6" /><path d="M22 20H2" /></svg>
  );
  if (name === "help") return (
    <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.6 9.2a2.5 2.5 0 0 1 4.8.8c0 1.7-2.4 2.2-2.4 3.6" /><path d="M12 17.2h.01" /></svg>
  );
  if (name === "pencil") return (
    <svg {...common}><path d="M4 20h4L18.5 9.5a2 2 0 0 0-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
  );
  if (name === "trash") return (
    <svg {...common}><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></svg>
  );
  if (name === "plus") return (
    <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
  );
  if (name === "chevronDown") return (
    <svg {...common}><path d="m5 9.5 7 7 7-7" /></svg>
  );
  if (name === "chevronLeft") return (
    <svg {...common}><path d="m14.5 5-7 7 7 7" /></svg>
  );
  if (name === "chevronRight") return (
    <svg {...common}><path d="m9.5 5 7 7-7 7" /></svg>
  );
  if (name === "arrowUp") return (
    <svg {...common}><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>
  );
  if (name === "snake") return (
    <svg {...common}><path d="M4 7c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3H7c-1.7 0-3 1.3-3 3s1.3 3 3 3h6c1.7 0 3-1.3 3-3" /><circle cx="18" cy="17" r="1.6" fill={color} stroke="none" /></svg>
  );
  if (name === "sound") return (
    <svg {...common}><path d="M4 10v4h3.5L12 17.5v-11L7.5 10z" /><path d="M16 9.5a4 4 0 0 1 0 5" /><path d="M18.5 7a7.5 7.5 0 0 1 0 10" /></svg>
  );
  if (name === "feedback") return (
    <svg {...common}><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H10l-4.5 4v-4H5.5A1.5 1.5 0 0 1 4 14.5z" /></svg>
  );
  if (name === "dollar") return (
    <svg {...common}><path d="M12 3v18" /><path d="M16 7.5c0-1.7-1.8-3-4-3s-4 1.2-4 3 1.8 2.6 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" /></svg>
  );
  if (name === "file") return (
    <svg {...common}><path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" /><path d="M14 3.5V8h4" /></svg>
  );
  if (name === "link") return (
    <svg {...common}><path d="M9.5 14.5 14.5 9.5" /><path d="M11 7.5l1.4-1.4a3.5 3.5 0 0 1 5 5L16 12.5" /><path d="M13 16.5l-1.4 1.4a3.5 3.5 0 0 1-5-5L8 11.5" /></svg>
  );
  if (name === "gear") return (
    <svg {...common}><circle cx="12" cy="12" r="3.2" /><path d="M12 3.5v2.4M12 18.1v2.4M20.5 12h-2.4M5.9 12H3.5M17.7 6.3l-1.7 1.7M8 16l-1.7 1.7M17.7 17.7 16 16M8 8 6.3 6.3" /></svg>
  );
  if (name === "users") return (
    <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" /><path d="M15.5 5.5a3 3 0 0 1 0 5.8" /><path d="M17 14.5c2.3.4 3.5 2 3.5 4.5" /></svg>
  );
  if (name === "list") return (
    <svg {...common}><path d="M8 6h12" /><path d="M8 12h12" /><path d="M8 18h12" /><path d="M4 6h.01" /><path d="M4 12h.01" /><path d="M4 18h.01" /></svg>
  );
  if (name === "grid") return (
    <svg {...common}><rect x="4" y="4" width="7" height="7" rx="1.2" /><rect x="13" y="4" width="7" height="7" rx="1.2" /><rect x="4" y="13" width="7" height="7" rx="1.2" /><rect x="13" y="13" width="7" height="7" rx="1.2" /></svg>
  );
  if (name === "menu") return (
    <svg {...common}><path d="M4 6.5h16" /><path d="M4 12h16" /><path d="M4 17.5h16" /></svg>
  );
  return null;
}
