/**
 * Configuration options for the {@link TTY} logger.
 */
export interface TTYOptions {
  /**
   * Enables or disables all logging output.
   * When set to `false`, no messages will be written to the console.
   * @default true
   */
  enabled?: boolean;

  /**
   * Label used as a prefix in all log messages.
   * Helps identify the source of the logs.
   * @default "SharePointClient"
   */
  label?: string;
}

/**
 * Lightweight console logger that prefixes messages with a label and timestamp.
 * Supports standard and error logging with optional enable/disable control.
 */
export class TTY {
  private readonly enabled: boolean;
  private readonly label: string;

  /**
   * Creates a new logger instance.
   *
   * @param options Configuration options for the logger
   */
  constructor(
    { enabled = true, label = "SharePointClient" }: TTYOptions = {},
  ) {
    this.enabled = enabled;
    this.label = label;
  }

  /**
   * Builds a formatted prefix for log messages.
   * Includes the configured label and a timestamp (HH:mm:ss.sss).
   *
   * @returns The formatted log prefix
   */
  private getPrefix(): string {
    const timestamp = new Date().toISOString().substring(11, 23);
    const prefix = `[${this.label} ${timestamp}]`;

    return prefix;
  }

  /**
   * Internal helper to write messages to the console.
   *
   * @param method Console method to use ("log" or "error")
   * @param message Main message to log
   * @param args Additional arguments to include in the output
   */
  private write(
    method: "log" | "error",
    message: string,
    args: unknown[],
  ): void {
    if (!this.enabled) return;

    const prefix = this.getPrefix();
    const icon = method === "error" ? "❌ " : "";

    // deno-lint-ignore no-console
    console[method](`${prefix} ${icon}${message}`, ...args);
  }

  /**
   * Logs a standard message to the console.
   *
   * @param message Main message to log
   * @param args Additional arguments to log alongside the message
   */
  log(message: string, ...args: unknown[]): void {
    this.write("log", message, args);
  }

  /**
   * Logs an error message to the console.
   *
   * @param message Main error message to log
   * @param args Additional arguments to log alongside the error
   */
  logError(message: string, ...args: unknown[]): void {
    this.write("error", message, args);
  }
}
