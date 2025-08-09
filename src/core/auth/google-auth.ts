import { Security } from "../security";

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export default class GoogleAuth {
  private static clientId =
    "516711269207-qvad7vrql92mal19k05giaul033fmm6i.apps.googleusercontent.com";
  private static currentUser: GoogleUser | null = null;
  private static isInitialized = false;
  private static readonly STORAGE_KEY = "google_auth_user";
  private static onStateChange: ((user: GoogleUser | null) => void) | null = null;

  static async initializeAsync(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize security measures
    Security.initialize();

    // Check if we're on a secure connection (warning only, don't block)
    if (!Security.isSecureConnection()) {
      console.warn(
        "Authentication should only be used over HTTPS in production",
      );
    }

    // Load user from localStorage first
    this.loadUserFromStorage();

    return new Promise((resolve) => {
      const checkGoogleApi = () => {
        if (typeof google !== "undefined" && google.accounts) {
          google.accounts.id.initialize({
            client_id: this.clientId,
            callback: this.handleCredentialResponse.bind(this),
          });
          this.isInitialized = true;
          resolve();
        } else {
          setTimeout(checkGoogleApi, 100);
        }
      };
      checkGoogleApi();
    });
  }

  static async signInAsync(): Promise<GoogleUser | null> {
    await this.initializeAsync();

    return new Promise((resolve) => {
      google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to popup if prompt is not shown
          google.accounts.id.renderButton(document.createElement("div"), {
            theme: "outline",
            size: "large",
            type: "standard",
          });

          // Use the popup flow
          google.accounts.oauth2
            .initTokenClient({
              client_id: this.clientId,
              scope: "email profile",
              callback: (response: any) => {
                if (response.access_token) {
                  this.fetchUserProfileAsync(response.access_token).then(resolve);
                } else {
                  resolve(null);
                }
              },
            })
            .requestAccessToken();
        }
      });
    });
  }

  static signOut(): void {
    if (typeof google !== "undefined" && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
    this.currentUser = null;
    this.removeUserFromStorage();
  }

  static getCurrentUser(): GoogleUser | null {
    return this.currentUser;
  }

  static isSignedIn(): boolean {
    return this.currentUser !== null;
  }

  static async validateStoredUserAsync(): Promise<boolean> {
    if (!this.currentUser) return false;

    try {
      // Check if user data is stale
      const stored = localStorage.getItem(this.STORAGE_KEY + "_timestamp");
      if (stored) {
        const timestamp = parseInt(stored);
        if (Security.isDataExpired(timestamp)) {
          Security.logSecurityEvent("session_expired");
          console.log("User session expired, requiring re-authentication");
          this.signOut();
          return false;
        }
      }

      // Comprehensive validation using security utilities
      if (!this.isValidUserData(this.currentUser)) {
        Security.logSecurityEvent("invalid_user_data", this.currentUser);
        console.warn("Invalid user data structure, clearing session");
        this.signOut();
        return false;
      }

      return true;
    } catch (error) {
      Security.logSecurityEvent("validation_error", error);
      console.error("Error validating user session:", error);
      this.signOut();
      return false;
    }
  }

  private static handleCredentialResponse(response: any): void {
    const payload = this.parseJwt(response.credential);
    this.currentUser = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
    this.saveUserToStorage();
    this.notifyStateChange();
  }

  private static async fetchUserProfileAsync(
    accessToken: string,
  ): Promise<GoogleUser | null> {
    try {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.ok) {
        const profile = await response.json();
        this.currentUser = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
        };
        this.saveUserToStorage();
        this.notifyStateChange();
        return this.currentUser;
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }

    return null;
  }

  private static parseJwt(token: string): any {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(jsonPayload);
  }

  private static saveUserToStorage(): void {
    if (this.currentUser) {
      try {
        // Store user data
        localStorage.setItem(
          this.STORAGE_KEY,
          JSON.stringify(this.currentUser),
        );
        // Store timestamp for session expiration
        localStorage.setItem(
          this.STORAGE_KEY + "_timestamp",
          Date.now().toString(),
        );
      } catch (error) {
        console.error("Failed to save user to storage:", error);
      }
    }
  }

  private static loadUserFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored);

        // Comprehensive validation of stored user data
        if (this.isValidUserData(user)) {
          // Sanitize user data before storing
          this.currentUser = this.sanitizeUserData(user);
        } else {
          Security.logSecurityEvent("invalid_stored_data", user);
          console.warn("Invalid user data in storage, clearing...");
          this.removeUserFromStorage();
        }
      }
    } catch (error) {
      Security.logSecurityEvent("storage_load_error", error);
      console.error("Error loading user from storage:", error);
      this.removeUserFromStorage();
    }
  }

  private static isValidUserData(user: any): boolean {
    return (
      user &&
      typeof user.id === "string" &&
      typeof user.email === "string" &&
      typeof user.name === "string" &&
      typeof user.picture === "string" &&
      user.id.length > 0 &&
      Security.isValidEmail(user.email) &&
      user.name.length > 0 &&
      Security.isValidHttpsUrl(user.picture)
    );
  }

  private static sanitizeUserData(user: any): GoogleUser {
    return {
      id: Security.sanitizeString(user.id, 100),
      email: Security.sanitizeString(user.email, 100),
      name: Security.sanitizeString(user.name, 100),
      picture: Security.sanitizeString(user.picture, 500),
    };
  }

  static setStateChangeCallback(callback: (user: GoogleUser | null) => void): void {
    this.onStateChange = callback;
  }

  private static notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.currentUser);
    }
  }

  private static removeUserFromStorage(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.STORAGE_KEY + "_timestamp");
  }
}

// Add Google types to global scope
declare global {
  const google: {
    accounts: {
      id: {
        initialize: (config: any) => void;
        prompt: (callback?: (notification: any) => void) => void;
        renderButton: (element: HTMLElement, config: any) => void;
        disableAutoSelect: () => void;
      };
      oauth2: {
        initTokenClient: (config: any) => {
          requestAccessToken: () => void;
        };
      };
    };
  };
}
