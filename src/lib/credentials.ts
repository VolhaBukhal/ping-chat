import type { Credentials } from "../types";

const STORAGE_KEY = "ping-chat.credentials";
export const DEFAULT_API_URL = "https://api.green-api.com";

export function loadCredentials(): Credentials | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Credentials>;
    if (!parsed.idInstance || !parsed.apiTokenInstance) return null;
    return {
      idInstance: String(parsed.idInstance).trim(),
      apiTokenInstance: String(parsed.apiTokenInstance).trim(),
      apiUrl: (parsed.apiUrl || DEFAULT_API_URL).trim().replace(/\/$/, ""),
    };
  } catch {
    return null;
  }
}

export function saveCredentials(credentials: Credentials): void {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      idInstance: credentials.idInstance.trim(),
      apiTokenInstance: credentials.apiTokenInstance.trim(),
      apiUrl: (credentials.apiUrl || DEFAULT_API_URL).trim().replace(/\/$/, ""),
    }),
  );
}

export function clearCredentials(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
