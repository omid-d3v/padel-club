// A return URL carries selection only, never identity, credentials or prices.
// Prices, stock and ownership are independently validated by the booking RPC.
export function equipmentSelection(
  raw: string | undefined,
  allowed: { id: string; stock: number }[],
) {
  if (!raw || raw.length > 4000) return {} as Record<string, number>;
  try {
    const entries: unknown = JSON.parse(raw);
    if (!entries || typeof entries !== "object" || Array.isArray(entries))
      return {};
    return Object.fromEntries(
      allowed.flatMap((e) => {
        const quantity = (entries as Record<string, unknown>)[e.id];
        return typeof quantity === "number" &&
          Number.isInteger(quantity) &&
          quantity > 0
          ? [[e.id, Math.min(quantity, e.stock, 20)]]
          : [];
      }),
    );
  } catch {
    return {};
  }
}
