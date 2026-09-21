import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const number = (value: number) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value);
export const date = (value: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeZone: "Asia/Tehran",
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));
export const fullName = (p: { first_name: string; last_name: string }) =>
  `${p.first_name} ${p.last_name}`;
