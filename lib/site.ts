export const SITE_NAME = "LLM-Docs";
export const SITE_URL = "https://llm-docs.github.io";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}
