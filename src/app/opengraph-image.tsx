import { ImageResponse } from "next/og";
export const alt = "رالی‌یار؛ هم‌بازیِ هر رالی";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function SocialImage() {
  const font = await import("node:fs/promises").then((fs) =>
    fs.readFile(
      `${process.cwd()}/node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-700-normal.woff`,
    ),
  );
  const logo = await import("node:fs/promises").then((fs) =>
    fs.readFile(process.cwd() + "/public/brand/rallyyar-mark.png"),
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0B0F0E",
        color: "#D7FF3F",
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
        <span>رالی‌یار</span>
        <span style={{ color: "#f5f5ee", marginTop: 30, fontSize: 40 }}>
          زمین، هم‌بازی و رقابت
        </span>
      </div>
      <img
        alt=""
        src={"data:image/png;base64," + logo.toString("base64")}
        width={300}
        height={300}
        style={{ background: "#F8FAF7", borderRadius: 24 }}
      />
    </div>,
    {
      ...size,
      fonts: [{ name: "Vazirmatn", data: font, style: "normal", weight: 700 }],
    },
  );
}
