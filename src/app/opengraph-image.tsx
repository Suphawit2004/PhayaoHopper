import { ImageResponse } from "next/og";

export const alt = "PhayaoHopper — Phayao Cafe Guide";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px",
          background: "#203e4a",
          color: "#faf6ef",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#923e3c",
              border: "3px solid #ddbf79",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
          }}
          >
            <div style={{ width: 28, height: 28, border: "3px solid #ddbf79", transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 10, height: 10, background: "#ddbf79" }} />
            </div>
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 4,
              color: "#dcc09a",
            }}
          >
            PHAYAO · THAILAND
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, lineHeight: 1.1 }}>
            PhayaoHopper
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 40, color: "#e8d9c0" }}>
            A curated cafe guide to Phayao
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Lakeside & Old Town", "Mae Ka · University", "Maps · Reviews"].map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "12px 28px",
                borderRadius: 999,
                border: "2px solid rgba(250, 246, 239, 0.35)",
                background: "rgba(255, 255, 255, 0.08)",
                fontSize: 26,
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
