"use client";
import { useState } from "react";
import type { Equipment } from "@/lib/platform/types";
import { money } from "@/lib/platform/format";
import { ActionForm } from "./action-form";
import { EquipmentIcon } from "./sport-icon";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
export function JoinForm({
  basePrice = 0,
  matchId,
  equipment,
  pending,
  disabled,
}: {
  basePrice?: number;
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
            <div key={e.id} className="equipment-choice">
              <span className="flex items-center gap-3">
                <EquipmentIcon name={e.name} />
                {e.name} · {money(e.price)}
              </span>
              <QuantityStepper
                label={e.name}
                value={quantities[e.id] ?? 0}
                max={Math.min(e.stock, 20)}
                disabled={disabled}
                onChange={(value) =>
                  setQuantities((p) => ({ ...p, [e.id]: value }))
                }
              />
            </div>
          ))}
        </fieldset>
      )}
      <p className="font-bold">
        مجموع سهم شما:{" "}
        {money(
          basePrice +
            equipment.reduce(
              (total, e) => total + e.price * (quantities[e.id] ?? 0),
              0,
            ),
        )}
      </p>
      <p className="text-xs leading-7 text-muted-foreground">
        موجودی و هزینه نهایی در سرور بررسی می‌شود. تجهیزات شخصی فقط به سهم شما
        افزوده می‌شود.
      </p>
    </ActionForm>
  );
}
