/**
 * Strip markdown code fences and parse JSON from an LLM response.
 * Throws with the raw response text on parse failure for easier debugging.
 */
export function parseLLMJson<T>(text: string, context: string): T {
  const cleaned = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `[${context}] Failed to parse JSON from LLM response.\n` +
        `Parse error: ${err}\n` +
        `Raw response (first 500 chars): ${cleaned.slice(0, 500)}`,
    );
  }
}
