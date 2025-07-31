import Alpine from "alpinejs";

import Osm from "./osm";

export default class App {
  static start() {
    Osm.start();

    Alpine.data(`toolbox`, () => ({
      markMode: Osm.isMarkModeOn,

      mark() {
        Osm.toggleMarkMode();
        this.markMode = Osm.isMarkModeOn;
      },
    }));

    Alpine.start();
  }
}
