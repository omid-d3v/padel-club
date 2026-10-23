export function normalizeCard(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[\s-]/g, "");
}
export function validCard(value: string) {
  const card = normalizeCard(value);
  if (!/^\d{16}$/.test(card) || /^(\d)\1+$/.test(card)) return false;
  return (
    [...card].reduce((sum, d, i) => {
      const n = Number(d) * (i % 2 === 0 ? 2 : 1);
      return sum + (n > 9 ? n - 9 : n);
    }, 0) %
      10 ===
    0
  );
}
export function receiptExtension(bytes: Uint8Array) {
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n))
    return "png";
  if (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "webp";
  return null;
}
