import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default class Osm {
  static readonly ZOOM = 13;
  static readonly MAX_ZOOM = 19;

  static readonly MAP_DIV = "map";
  static readonly VECTOR_TITLE_URL =
    "https://tiles.openfreemap.org/styles/liberty";
  // "https://demotiles.maplibre.org/style.json",

  static readonly FALLBACK_COORDS: maplibregl.LngLatLike = [-0.09, 51.505];

  static map: maplibregl.Map | null = null;
  static geolocate: maplibregl.GeolocateControl | null = null;

  static start() {
    if (!document.getElementById("map")) {
      throw new Error("Missing #map container.");
    }

    if (!navigator.geolocation) {
      throw new Error("Geolocation not supported.");
    }

    if (!Osm.map) {
      Osm.map = new maplibregl.Map({
        container: Osm.MAP_DIV,
        style: Osm.VECTOR_TITLE_URL,
        center: Osm.FALLBACK_COORDS, // starting position [lng, lat]
        zoom: Osm.ZOOM, // starting zoom
        maxZoom: Osm.MAX_ZOOM,
      });

      Osm.geolocate = new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
      });

      Osm.map.addControl(Osm.geolocate!);
      Osm.map.on("load", () => Osm.geolocate!.trigger());
    }
  }
}
