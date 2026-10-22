import { Input } from "@/components/ui/input";
import { JalaliDateInput } from "@/components/ui/jalali-date-input";
import type { ComponentProps } from "react";
export function Field({
  label,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="field">
      {label}
      {props.type === "date" || props.type === "datetime-local" ? (
        <JalaliDateInput
          {...props}
          type={props.type === "date" ? "date" : "datetime-local"}
        />
      ) : (
        <Input {...props} />
      )}
    </label>
  );
}
export function SelectField({
  label,
  name,
  options,
  value,
  required = true,
}: {
  label: string;
  name: string;
  options: { id: string; name: string }[];
  value?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <select name={name} defaultValue={value ?? ""} required={required}>
        <option value="">انتخاب کنید</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function CheckField({
  name,
  label,
  checked = false,
}: {
  name: string;
  label: string;
  checked?: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm">
      <input
        type="checkbox"
        className="size-5 accent-emerald-800"
        name={name}
        defaultChecked={checked}
      />
      {label}
    </label>
  );
}
