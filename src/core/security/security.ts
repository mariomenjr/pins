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
  enableCSP: !isDevelopment(), // Enabled in production, disabled in development
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

  // Check for production domains first
  if (typeof location !== "undefined") {
    const hostname = location.hostname;

    // Known production domains
    const productionDomains = [
      "pins.mariomenjr.com",
      "genuine-chimera-400df9.netlify.app",
    ];

    if (productionDomains.includes(hostname)) {
      return false;
    }

    // Check for common development patterns
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

  // Default to production if we can't determine (safer)
  return false;
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

    // Remove any existing report-only CSP first
    const reportOnly = document.querySelector(
      'meta[http-equiv="Content-Security-Policy-Report-Only"]',
    );
    if (reportOnly) {
      reportOnly.remove();
    }

    const cspMeta = document.createElement("meta");
    cspMeta.httpEquiv = "Content-Security-Policy";
    cspMeta.content = this.generateCSPPolicy();
    document.head.appendChild(cspMeta);

    console.log("CSP enforced:", this.generateCSPPolicy());
  }

  /**
   * Generate CSP policy string
   */
  private static generateCSPPolicy(): string {
    const allowedDomains = this.config.allowedDomains.join(" ");
    return [
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: https: blob:",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${allowedDomains} https: blob:`,
      `connect-src 'self' ${allowedDomains} https: wss: ws:`,
      `img-src 'self' data: https: blob:`,
      `style-src 'self' 'unsafe-inline' https: blob:`,
      `font-src 'self' data: https: blob:`,
      `media-src 'self' data: https: blob:`,
      `worker-src 'self' blob:`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
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
        const sanitizedKey = key.replace(/[\r\n]/g, ' ').slice(0, 50);
        console.warn(`Storage value for key "${sanitizedKey}" exceeds size limit`);
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
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        event,
        details,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        url: typeof location !== "undefined" ? location.href : "unknown",
      };

      const sanitizedLogData = {
        ...logData,
        event: logData.event.replace(/[\r\n]/g, ' ').slice(0, 100),
        details: typeof logData.details === 'string' ? logData.details.replace(/[\r\n]/g, ' ').slice(0, 200) : logData.details
      };
      console.warn("Security Event:", sanitizedLogData);

      // In production, you'd send this to your monitoring service:
      // fetch('/api/security-log', { method: 'POST', body: JSON.stringify(logData) });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Enable CSP manually (useful for production after testing)
   */
  static enableCSP(): void {
    this.config.enableCSP = true;
    if (typeof document !== "undefined") {
      this.setupCSP();
    }
  }

  /**
   * Test CSP without enforcing (report-only mode)
   */
  static testCSP(): void {
    if (typeof document === "undefined") return;

    const existingCSP = document.querySelector(
      'meta[http-equiv="Content-Security-Policy"]',
    );
    const existingReportOnly = document.querySelector(
      'meta[http-equiv="Content-Security-Policy-Report-Only"]',
    );

    if (existingCSP || existingReportOnly) {
      console.log("CSP already configured");
      return;
    }

    const cspMeta = document.createElement("meta");
    cspMeta.httpEquiv = "Content-Security-Policy-Report-Only";
    cspMeta.content = this.generateCSPPolicy();
    document.head.appendChild(cspMeta);

    console.log(
      "CSP enabled in report-only mode. Check browser console for violations.",
    );
  }

  /**
   * Enable CSP with custom configuration for production
   */
  static enableProductionCSP(): void {
    const productionConfig = {
      enableCSP: true,
      allowedDomains: [
        "accounts.google.com",
        "www.googleapis.com",
        "*.googleapis.com",
        "fonts.googleapis.com",
        "fonts.gstatic.com",
      ],
    };

    this.config = { ...this.config, ...productionConfig };

    if (typeof document !== "undefined") {
      console.log("Enabling production-safe CSP...");
      this.setupCSP();
    }
  }

  /**
   * Check if we're in a production environment
   */
  static isProduction(): boolean {
    return !isDevelopment();
  }
}
