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
      showPrivacyNotice: false,
      showDeleteConfirm: false,

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

      async deleteAllDataAsync() {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Delete all user's points
            const { error } = await supabase
              .from('points')
              .delete()
              .eq('user_id', user.id);
            
            if (error) {
              console.error('Error deleting data:', error);
              alert('Failed to delete data. Please try again.');
              return;
            }
          }
          
          // Sign out user
          await signOut();
          this.showDeleteConfirm = false;
          console.log('All user data deleted and signed out');
        } catch (error) {
          console.error('Error deleting data:', error);
          alert('Failed to delete data. Please try again.');
        }
      },
    }));

    Alpine.start();
  }
}
