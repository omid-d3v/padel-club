import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";
export default async function Icon() {
  const bytes = await readFile(
    process.cwd() + "/public/brand/rallyyar-mark.png",
  );
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: 64,
        height: 64,
        background: "#F8FAF7",
        borderRadius: 12,
      }}
    >
      <img
        alt=""
        src={"data:image/png;base64," + bytes.toString("base64")}
        width={64}
        height={64}
      />
    </div>,
    size,
  );
}
