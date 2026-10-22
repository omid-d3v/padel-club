import { ImageResponse } from "next/og";
export const alt = "پدل کلاب؛ زمین، هم‌بازی و رقابت";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function SocialImage() {
  const font = await import("node:fs/promises").then((fs) =>
    fs.readFile(
      `${process.cwd()}/node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-700-normal.woff`,
    ),
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#112d25",
        color: "#d0f17b",
        padding: 75,
        direction: "rtl",
        fontFamily: "Vazirmatn",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          fontSize: 64,
          fontWeight: 700,
        }}
      >
        <span>پدل کلاب</span>
        <span style={{ color: "#f5f5ee", marginTop: 30, fontSize: 40 }}>
          زمین، هم‌بازی و رقابت
        </span>
      </div>
      <div
        style={{
          width: 260,
          height: 400,
          border: "3px solid #b2c6a0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(-12deg)",
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: 100,
            background: "#d0f17b",
          }}
        />
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Vazirmatn", data: font, style: "normal", weight: 700 }],
    },
  );
}
