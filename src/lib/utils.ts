import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatPersianDate } from "./date-time";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const number = (value: number) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value);
export const date = formatPersianDate;
export const fullName = (p: { first_name: string; last_name: string }) =>
  `${p.first_name} ${p.last_name}`;
