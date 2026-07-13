// Abstraction over localStorage — swap body for expo-secure-store on mobile
export function useStorage() {
  return {
    get: (key: string): string | null => localStorage.getItem(key),
    set: (key: string, value: string): void => localStorage.setItem(key, value),
    remove: (key: string): void => localStorage.removeItem(key),
  };
}
