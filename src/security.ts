/**
 * Security utilities for the application
 */

export interface SecurityConfig {
  enableCSP: boolean;
  allowedDomains: string[];
  sessionTimeout: number;
  maxStorageSize: number;
}

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  enableCSP: !isDevelopment(), // Disabled in development
  allowedDomains: ["accounts.google.com", "www.googleapis.com"],
  sessionTimeout: 60 * 60 * 1000, // 1 hour
  maxStorageSize: 5000, // 5KB
};

/**
 * Check if we're in development environment
 */
function isDevelopment(): boolean {
  // Check for Vite development mode
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return true;
  }

  // Check for common development hostnames and ports
  if (typeof location !== "undefined") {
    const hostname = location.hostname;
    const port = location.port;

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.endsWith(".local") ||
      port === "3000" ||
      port === "5173" ||
      port === "5174" ||
      port === "8080" ||
      (port !== "" && parseInt(port) >= 3000 && parseInt(port) <= 9999)
    );
  }

  // Default to development if we can't determine
  return true;
}

export default class Security {
  private static config: SecurityConfig = DEFAULT_SECURITY_CONFIG;

  /**
   * Initialize security measures
   */
  static initialize(config?: Partial<SecurityConfig>): void {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };

    if (this.config.enableCSP && typeof document !== "undefined") {
      this.setupCSP();
    }

    this.setupStorageLimit();
  }

  /**
   * Setup Content Security Policy via meta tag
   */
  private static setupCSP(): void {
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
      return; // CSP already set
    }

    const cspMeta = document.createElement("meta");
    cspMeta.httpEquiv = "Content-Security-Policy";
    cspMeta.content = this.generateCSPPolicy();
    document.head.appendChild(cspMeta);
  }

  /**
   * Generate CSP policy string
   */
  private static generateCSPPolicy(): string {
    const allowedDomains = this.config.allowedDomains.join(" ");
    return [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${allowedDomains}`,
      `connect-src 'self' ${allowedDomains}`,
      `img-src 'self' data: https:`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
  }

  /**
   * Setup localStorage size monitoring
   */
  private static setupStorageLimit(): void {
    if (typeof Storage === "undefined") return;

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function (key: string, value: string) {
      if (value.length > Security.config.maxStorageSize) {
        console.warn(`Storage value for key "${key}" exceeds size limit`);
        return;
      }
      originalSetItem.call(this, key, value);
    };
  }

  /**
   * Sanitize string input to prevent XSS
   */
  static sanitizeString(input: string, maxLength = 100): string {
    if (typeof input !== "string") return "";

    return input
      .replace(/[<>'"&]/g, "") // Remove potential XSS characters
      .trim()
      .slice(0, maxLength);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 100;
  }

  /**
   * Validate URL format (for profile pictures)
   */
  static isValidHttpsUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === "https:" && url.length <= 500;
    } catch {
      return false;
    }
  }

  /**
   * Check if current connection is secure (HTTPS)
   */
  static isSecureConnection(): boolean {
    return typeof location !== "undefined" && location.protocol === "https:";
  }

  /**
   * Generate a secure random ID
   */
  static generateSecureId(): string {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
    }

    // Fallback for older browsers
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Validate stored data timestamp
   */
  static isDataExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.config.sessionTimeout;
  }

  /**
   * Clear all sensitive data from storage
   */
  static clearSensitiveData(): void {
    if (typeof localStorage === "undefined") return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("auth") || key.includes("user") || key.includes("token"))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  /**
   * Log security events (in production, send to monitoring service)
   */
  static logSecurityEvent(event: string, details?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      details,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      url: typeof location !== "undefined" ? location.href : "unknown",
    };

    console.warn("Security Event:", logData);

    // In production, you'd send this to your monitoring service:
    // fetch('/api/security-log', { method: 'POST', body: JSON.stringify(logData) });
  }
}
