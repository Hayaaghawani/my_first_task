export const COUNTRY_CORES = {
  jo: "country12",
} as const;

export type CountryCode = keyof typeof COUNTRY_CORES;
