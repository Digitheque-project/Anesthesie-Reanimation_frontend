import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Aligné sur la validation côté API hospitalisation (UUID v4 uniquement). */
export function isUuidV4(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_V4_REGEX.test(value.trim());
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
