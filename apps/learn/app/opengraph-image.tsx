import { ImageResponse } from "next/og";

export const alt = "Learn the NARUTO Mythos TCG: free interactive lessons, Lethal Puzzles and a keyword glossary";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SPIRAL =
  "M12 12m-1 0a1 1 0 1 1 2 0a2 2 0 1 1-4 0a3 3 0 1 1 6 0a4 4 0 1 1-8 0a5 5 0 1 1 10 0a6 6 0 1 1-12 0";

function CardBack({ x, y, rotate }: { x: number; y: number; rotate: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 176,
        height: 246,
        transform: `rotate(${rotate}deg)`,
        borderRadius: 18,
        padding: 4,
        background: "linear-gradient(135deg, #c4b5fd, #6d28d9 60%, #1f1f2e)",
        boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
        display: "flex",
      }}
    >
      <div
        style={{
          flex: 1,
          borderRadius: 14,
          background: "radial-gradient(circle at 50% 42%, #3b1d8a 0%, #0d0d14 72%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <svg width="104" height="104" viewBox="0 0 24 24">
          <path d={SPIRAL} fill="none" stroke="#c4b5fd" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <div style={{ display: "flex", color: "#ddd6fe", fontSize: 16, letterSpacing: 6 }}>HIDDEN</div>
      </div>
    </div>
  );
}

function Card({ x, y, rotate, from, to, label, cost, power }: { x: number; y: number; rotate: number; from: string; to: string; label: string; cost: number; power: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 176,
        height: 246,
        transform: `rotate(${rotate}deg)`,
        borderRadius: 18,
        padding: 4,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: "0 30px 60px rgba(0,0,0,0.6)",
        display: "flex",
      }}
    >
      <div
        style={{
          flex: 1,
          borderRadius: 14,
          background: "linear-gradient(160deg, #1f1f2e 0%, #0d0d14 70%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 14,
        }}
      >
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
          <div style={{ display: "flex", width: 38, height: 38, borderRadius: 19, background: "#0ea5e9", color: "#fff", fontSize: 22, fontWeight: 800, alignItems: "center", justifyContent: "center" }}>
            {cost}
          </div>
          <div style={{ display: "flex", width: 38, height: 38, borderRadius: 19, background: "#f25c00", color: "#fff", fontSize: 22, fontWeight: 800, alignItems: "center", justifyContent: "center" }}>
            {power}
          </div>
        </div>
        <svg width="96" height="96" viewBox="0 0 24 24">
          <path d={SPIRAL} fill="none" stroke={from} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <div style={{ display: "flex", color: "#ffffff", fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{label}</div>
      </div>
    </div>
  );
}

/** Social preview used by Reddit, Discord, X and friends when the site is shared. */
export default function OpengraphImage() {
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
            "radial-gradient(circle at 18% 20%, rgba(242,92,0,0.38), transparent 45%), radial-gradient(circle at 85% 80%, rgba(139,92,246,0.30), transparent 45%), radial-gradient(circle at 70% 10%, rgba(14,165,233,0.18), transparent 40%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ position: "absolute", left: 0, top: 0, width: 1200, height: 8, background: "linear-gradient(90deg, #ffa95c, #f25c00, #ef4060)", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", padding: "70px 0 0 72px", width: 740 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="44" height="44" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill="#0d0d14" stroke="#f25c00" strokeWidth="1.4" />
              <path d={SPIRAL} fill="none" stroke="#ffa95c" strokeWidth="1.5" strokeLinecap="round" transform="translate(2.4 2.4) scale(0.8)" />
            </svg>
            <div style={{ display: "flex", color: "#ffa95c", fontSize: 24, fontWeight: 800, letterSpacing: 6 }}>FREE · FAN-MADE · NO SIGN-UP</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 30, color: "#ffffff", fontSize: 70, fontWeight: 900, lineHeight: 1.08, letterSpacing: -1.5 }}>
            <span>Learn to play</span>
            <span style={{ color: "#ff7a1a" }}>Naruto Mythos TCG</span>
          </div>

          <div style={{ display: "flex", marginTop: 28, color: "#b3b3c6", fontSize: 30, lineHeight: 1.35, width: 660 }}>
            Interactive rulebook lessons, Lethal Puzzles and a searchable keyword glossary.
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
            {[
              ["D", "#22c55e"],
              ["C", "#0ea5e9"],
              ["B", "#8b5cf6"],
              ["A", "#f5c542"],
            ].map(([rank, color]) => (
              <div
                key={rank}
                style={{ display: "flex", width: 56, height: 56, borderRadius: 14, background: color, color: "#07070b", fontSize: 30, fontWeight: 900, alignItems: "center", justifyContent: "center" }}
              >
                {rank}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", marginLeft: 10, color: "#fcd96a", fontSize: 24, fontWeight: 700 }}>Ties → Edge token</div>
          </div>
        </div>

        <CardBack x={975} y={96} rotate={11} />
        <Card x={815} y={58} rotate={-9} from="#86efac" to="#ff7a1a" label="NARUTO" cost={2} power={2} />
        <Card x={905} y={330} rotate={5} from="#fdeaa8" to="#d9a514" label="AMBUSH!" cost={4} power={5} />
      </div>
    ),
    size,
  );
}
