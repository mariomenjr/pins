import type { FeatureCollection } from "geojson";
import maplibregl, { GeoJSONSource } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import { createCircleLayer, createHeatmapLayer, createPoint } from "./utils";

const div = "map";
const vtu = "https://tiles.openfreemap.org/styles/liberty";

export default class Osm {
  static readonly MAP_DIV = div;
  static readonly MAP_COORDS: maplibregl.LngLatLike = [-117.6591, 33.5104];
  static readonly MIN_MAP_ZOOM = 3;
  static readonly MAP_VECTOR_TILE_URL = vtu;
  static readonly MAP_ZOOM = 11;
  static readonly MAX_MAP_ZOOM = 21;

  static readonly HEATMAP_MAX_MAG = 5;
  static readonly SOURCE_NAME = "sighting";

  static map: maplibregl.Map | null = null;
  static isMarkModeOn: boolean = false;

  static start() {
    Osm._precheck();
    if (!!Osm.map) return;

    Osm.map = new maplibregl.Map({
      container: Osm.MAP_DIV,
      style: Osm.MAP_VECTOR_TILE_URL,
      center: Osm.MAP_COORDS,
      maxZoom: Osm.MAX_MAP_ZOOM,
      minZoom: Osm.MIN_MAP_ZOOM,
      zoom: Osm.MAP_ZOOM,
    });

    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      fitBoundsOptions: {
        linear: true,
        zoom: Osm.MAP_ZOOM,
      },
    });

    Osm.map.addControl(new maplibregl.NavigationControl(), "top-right");
    Osm.map.addControl(new maplibregl.LogoControl({ compact: true }));
    Osm.map.addControl(new maplibregl.GlobeControl());
    Osm.map.addControl(geolocate);

    geolocate.on("geolocate", () => Osm._heatmap());

    Osm.map.on("load", () => geolocate.trigger());
    Osm.map.on("click", Osm.addSightingAsync);
  }

  public static async addSightingAsync(e: maplibregl.MapMouseEvent) {
    if (!Osm.isMarkModeOn) return;

    const src = Osm.map!.getSource(Osm.SOURCE_NAME) as GeoJSONSource;
    const data = (await src!.getData()) as FeatureCollection;

    data.features.push(
      createPoint(
        [e.lngLat.lng, e.lngLat.lat],
        Math.random() * Osm.HEATMAP_MAX_MAG,
      ),
    );

    if (!!src) src.setData(data);
  }

  public static toggleMarkMode() {
    Osm.isMarkModeOn = !Osm.isMarkModeOn;
    Osm.map!.getCanvas().style.cursor = Osm.isMarkModeOn ? "crosshair" : "";
  }

  private static _precheck() {
    if (!document.getElementById("map")) {
      throw new Error("Missing #map container.");
    }
    if (!navigator.geolocation) {
      throw new Error("Geolocation not supported.");
    }
  }

  private static _mapcheck() {
    if (!Osm.map) {
      throw new Error("Map not initialized.");
    }
  }

  private static _heatmap() {
    Osm._mapcheck();

    if (Osm.map!.isSourceLoaded(Osm.SOURCE_NAME)) return;

    // Add a geojson point source.
    // Heatmap layers also work with a vector tile source.
    // (To make debugging easier, we use a static dataset)
    Osm.map!.addSource(Osm.SOURCE_NAME, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: Array.from({ length: 250 }).map(() =>
          createPoint(
            [
              -117.63695568237284 + -0.125 * Math.random(),
              33.50267070026682 + 0.125 * Math.random(),
            ],
            Math.random() * Osm.HEATMAP_MAX_MAG,
          ),
        ),
      },
    });

    Osm.map!.addLayer(
      createHeatmapLayer(Osm.SOURCE_NAME, Osm.HEATMAP_MAX_MAG, Osm.MAP_ZOOM),
    );
    Osm.map!.addLayer(
      createCircleLayer(Osm.SOURCE_NAME, Osm.HEATMAP_MAX_MAG, Osm.MIN_MAP_ZOOM),
    );
  }
}
