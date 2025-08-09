import Alpine from "alpinejs";

import { Osm } from "./core/map";
import { GoogleAuth, type GoogleUser } from "./core/auth";
import { Security } from "./core/security";

export default class App {
  static start() {
    // Initialize security measures first
    Security.initialize();

    // Log CSP status
    if (Security.isProduction()) {
      console.log("Production environment detected, CSP enabled for security");
    } else {
      console.log("Development environment detected, CSP disabled");
    }

    Osm.start();

    Alpine.data(`toolbox`, () => ({
      markMode: Osm.isMarkModeOn,
      user: null as GoogleUser | null,
      isSignedIn: false,

      async init() {
        await GoogleAuth.initialize();

        // Set up callback for auth state changes
        GoogleAuth.setStateChangeCallback((user) => {
          this.user = user;
          this.isSignedIn = user !== null;
        });

        // Load user state from storage
        this.user = GoogleAuth.getCurrentUser();
        this.isSignedIn = GoogleAuth.isSignedIn();

        // Validate stored user if exists
        if (this.isSignedIn) {
          const isValid = await GoogleAuth.validateStoredUser();
          if (!isValid) {
            console.log("Stored user session invalid, signing out...");
            GoogleAuth.signOut();
            this.user = null;
            this.isSignedIn = false;
          }
        }
      },

      mark() {
        Osm.toggleMarkMode();
        this.markMode = Osm.isMarkModeOn;
      },

      async handleGoogleAuth() {
        if (this.isSignedIn) {
          GoogleAuth.signOut();
          this.user = null;
          this.isSignedIn = false;
          console.log("User signed out");
        } else {
          try {
            const user = await GoogleAuth.signIn();
            if (user) {
              this.user = user;
              this.isSignedIn = true;
              console.log("User signed in:", user);
            }
          } catch (error) {
            console.error("Sign-in failed:", error);
          }
        }
      },
    }));

    Alpine.start();
  }
}
