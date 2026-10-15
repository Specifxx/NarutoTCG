import { ImageResponse } from "next/og";
import { getAllCards, getRevealedCards, getSets } from "@/lib/data";
import { ELEMENT_GLYPHS, ELEMENT_META } from "@/lib/meta";

export const alt = "Naruto TCG Card Database: search every card, follow spoilers and track set checklists. Free.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function MiniCard({
  x,
  y,
  rotate,
  element,
  name,
  cost,
  power,
}: {
  x: number;
  y: number;
  rotate: number;
  element: "fire" | "water" | "lightning" | "earth" | "wind";
  name: string;
  cost: string;
  power: string;
}) {
  const hex = ELEMENT_META[element].hex;
  const glyph = ELEMENT_GLYPHS[element];
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 168,
        height: 236,
        transform: `rotate(${rotate}deg)`,
        borderRadius: 16,
        padding: 5,
        background: `linear-gradient(140deg, ${hex}, #1f1f2e 70%, ${hex})`,
        boxShadow: "0 30px 70px rgba(0,0,0,0.65)",
        display: "flex",
      }}
    >
      <div
        style={{
          flex: 1,
          borderRadius: 12,
          background: `radial-gradient(circle at 50% 38%, ${hex}55 0%, #0d0d14 70%)`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              display: "flex",
              width: 36,
              height: 36,
              borderRadius: 18,
              background: hex,
              color: "#07070b",
              fontSize: 20,
              fontWeight: 900,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {cost}
          </div>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 17, fontWeight: 800 }}>{name}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <svg width="80" height="80" viewBox="0 0 24 24">
            {glyph.stroke ? (
              <path d={glyph.d} fill="none" stroke={hex} strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d={glyph.d} fill={hex} />
            )}
          </svg>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div
            style={{
              display: "flex",
              padding: "4px 10px",
              borderRadius: 8,
              background: "#07070bcc",
              border: `1px solid ${hex}`,
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {power}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Social preview used by Reddit, Discord, X and friends when the site is shared. */
export default function OpengraphImage() {
  const cards = getAllCards().length;
  const sets = getSets().length;
  const spoilers = getRevealedCards().length;
  const stats = [
    [`${cards}`, "cards"],
    [`${sets}`, "sets"],
    [`${spoilers}`, "spoilers"],
  ];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#07070b",
          backgroundImage:
            "radial-gradient(circle at 15% 18%, rgba(242,92,0,0.40), transparent 45%), radial-gradient(circle at 88% 82%, rgba(59,157,255,0.28), transparent 45%), radial-gradient(circle at 72% 8%, rgba(63,220,154,0.18), transparent 40%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 8, background: "linear-gradient(90deg, #ffa95c, #f25c00, #ef4060)", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", padding: "64px 0 0 72px", width: 720 }}>
          <div style={{ display: "flex", color: "#ffa95c", fontSize: 24, fontWeight: 800, letterSpacing: 6 }}>
            FREE · FAN-MADE · NO SIGN-UP
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 26, color: "#ffffff", fontSize: 58, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1.5 }}>
            <span>Every Naruto TCG card</span>
            <span style={{ color: "#ff7a1a" }}>one search away</span>
          </div>
          <div style={{ display: "flex", marginTop: 26, color: "#b3b3c6", fontSize: 29, lineHeight: 1.35, width: 640 }}>
            Card database with filters, new spoilers as they drop, and set checklists for your collection.
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
            {stats.map(([value, label]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: 14,
                  background: "#151521",
                  border: "1px solid #2a2a3d",
                }}
              >
                <span style={{ color: "#ffffff", fontSize: 34, fontWeight: 900 }}>{value}</span>
                <span style={{ color: "#8d8da3", fontSize: 22, fontWeight: 700 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <MiniCard x={744} y={200} rotate={-9} element="wind" name="Naruto" cost="3" power="4000" />
        <MiniCard x={1004} y={200} rotate={9} element="lightning" name="Sasuke" cost="4" power="5000" />
        <MiniCard x={874} y={150} rotate={0} element="fire" name="Itachi" cost="L" power="5000" />
      </div>
    ),
    size,
  );
}
