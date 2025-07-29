import Alpine from "alpinejs";

import Osm from "./osm";

export default class App {
  static start() {
    Osm.start();

    // Alpine.data(`toolbox`, () => ({
    //   mark() {
    //     // Osm.mark();
    //   },
    // }));

    Alpine.start();
  }
}
