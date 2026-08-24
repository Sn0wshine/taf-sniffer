declare module "*/server/scrapers/utils.mjs" {
  export function findBonus(rawText: string): string;
  export function flattenJsonLd(value: any): any[];
  export function jsonLdJobPosting(html: string): any;
  export function buildKeywordVariants(targetJob: string, smartSearch?: boolean, experienceLevel?: string): string[];
  export function buildLocationVariants(location: string, smartLocation?: boolean): string[];
}
