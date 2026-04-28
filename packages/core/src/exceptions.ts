/**
 * Error thrown when a SharePoint list configuration is invalid.
 */
export class InvalidListConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidListConfigError";
  }
}