export class Logger {
  private prefix = '[dockervis]';

  info(message: string, ...args: unknown[]): void {
    console.log(`${this.prefix} INFO: ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`${this.prefix} ERROR: ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`${this.prefix} WARN: ${message}`, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(`${this.prefix} DEBUG: ${message}`, ...args);
  }
}