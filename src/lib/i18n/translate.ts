import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

const dictionaries: Record<string, unknown> = { en, fr };

/**
 * Minimal translator usable outside of a request (emails, notifications, webhooks).
 * Supports simple `{param}` interpolation.
 */
export function translate(locale: string, key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[locale] ?? dictionaries.fr;
  const value = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, dict);
  if (typeof value !== "string") return key;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    params && name in params ? String(params[name]) : match,
  );
}
