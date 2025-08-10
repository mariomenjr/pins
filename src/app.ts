import Alpine from "alpinejs";

import { Osm } from "./core/map";
import { supabase, signInWithGoogle, signOut } from "./core/supabase";
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
      user: null as any, // TODO: Replace with proper User type from Supabase
      isSignedIn: false,

      async initAsync() {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;
        this.isSignedIn = !!session;

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
          this.user = session?.user || null;
          this.isSignedIn = !!session;
        });
      },

      toggleMarkMode() {
        Osm.toggleMarkMode();
        this.markMode = Osm.isMarkModeOn;
      },

      async handleGoogleAuthAsync() {
        try {
          if (this.isSignedIn) {
            await signOut();
            console.log("User signed out");
          } else {
            await signInWithGoogle();
          }
        } catch (error) {
          console.error('Authentication error:', error);
        }
      },
    }));

    Alpine.start();
  }
}
