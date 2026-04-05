/**
 * Get environment variable value
 * @param key - The environment variable key
 * @returns The environment variable value or undefined if not found
 */
export const getEnv = (key: string): string | undefined => {
  return import.meta.env[key]
}
