"use client";
import { useState } from "react";
import type { Equipment } from "@/lib/platform/types";
import { money } from "@/lib/platform/format";
import { ActionForm } from "./action-form";
import { EquipmentIcon } from "./sport-icon";
export function JoinForm({
  matchId,
  equipment,
  pending,
  disabled,
}: {
  matchId: string;
  equipment: Equipment[];
  pending: boolean;
  disabled: boolean;
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  return (
    <ActionForm
      operation="join"
      label={pending ? "اعلام علاقه‌مندی" : "گرفتن جایگاه موقت"}
      disabled={disabled}
    >
      <input type="hidden" name="match_id" value={matchId} />
      <input
        type="hidden"
        name="equipment"
        value={JSON.stringify(
          equipment
            .filter((e) => (quantities[e.id] ?? 0) > 0)
            .map((e) => ({ id: e.id, quantity: quantities[e.id] })),
        )}
      />
      {!!equipment.length && (
        <fieldset className="space-y-3">
          <legend className="mb-3 text-sm font-semibold">
            تجهیزات شخصی؛ اختیاری
          </legend>
          {equipment.map((e) => (
            <label key={e.id} className="field">
              <EquipmentIcon name={e.name} />
              {e.name} · {money(e.price)}
              <input
                type="number"
                min={0}
                max={Math.min(e.stock, 20)}
                value={quantities[e.id] ?? 0}
                onChange={(ev) =>
                  setQuantities({
                    ...quantities,
                    [e.id]: Number(ev.target.value),
                  })
                }
              />
            </label>
          ))}
        </fieldset>
      )}
      <p className="text-xs leading-7 text-muted-foreground">
        موجودی و هزینه نهایی در سرور بررسی می‌شود. تجهیزات شخصی فقط به سهم شما
        افزوده می‌شود.
      </p>
    </ActionForm>
  );
}
