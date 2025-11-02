export interface Logger {
  info(message: string, ...args: unknown[]): void;
  error(message: string, error?: Error | unknown): void;
  warn(message: string, ...args: unknown[]): void;
}

export function createLogger(): Logger {
  return {
    info(message: string, ...args: unknown[]): void {
      console.log(`[INFO] ${message}`, ...args);
    },
    error(message: string, error?: Error | unknown): void {
      console.error(`[ERROR] ${message}`, error);
      if (error instanceof Error) {
        console.error("Stack:", error.stack);
      }
    },
    warn(message: string, ...args: unknown[]): void {
      console.warn(`[WARN] ${message}`, ...args);
    },
  };
}
