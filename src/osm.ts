import type {
  FeatureCollection,
  Point,
  Feature,
  GeoJsonProperties,
} from "geojson";
import maplibregl, { GeoJSONSource } from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";

export default class Osm {
  static readonly ZOOM = 9;
  static readonly MAX_ZOOM = 21;
  static readonly MIN_ZOOM = 3;

  static readonly MAP_DIV = "map";
  static readonly VECTOR_TITLE_URL =
    "https://tiles.openfreemap.org/styles/liberty";

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
        // cooperativeGestures: true,
        container: Osm.MAP_DIV,
        style: Osm.VECTOR_TITLE_URL,
        center: Osm.FALLBACK_COORDS,
        maxZoom: Osm.MAX_ZOOM,
        minZoom: Osm.MIN_ZOOM,
        zoom: Osm.ZOOM,
      });

      Osm.geolocate = new maplibregl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        fitBoundsOptions: {
          linear: true,
          zoom: Osm.ZOOM,
        },
      });

      Osm.map.addControl(new maplibregl.NavigationControl(), "top-right");
      Osm.map.addControl(new maplibregl.LogoControl({ compact: false }));
      Osm.map.addControl(new maplibregl.GlobeControl());
      Osm.map.addControl(Osm.geolocate!);

      Osm.map.on("load", () => Osm.geolocate!.trigger());
      Osm.geolocate!.on("geolocate", (position) => {
        const coords = `${position.coords.longitude}, ${position.coords.latitude}`;
        console.log(coords);

        Osm._heatmap();
      });
      Osm.map.on("click", async (e) => {
        const src = Osm.map!.getSource("earthquakes") as GeoJSONSource;

        const time = Date.now();

        const data = (await src!.getData()) as FeatureCollection;
        const point: Feature<Point, GeoJsonProperties> = {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [e.lngLat.lng, e.lngLat.lat],
          },
          properties: {
            // name: `Random Point ${data.features.length + 1}`,
            id: time,
            mag: Math.random() * 6,
            time: time,
            felt: null,
            tsunami: 0,
          },
        };

        data.features.push(point);

        if (src) src.setData(data);
      });
    }
  }

  // public static mark() {
  //   new maplibregl.Marker().setLngLat([-117.6591, 33.5104]).addTo(Osm.map!);
  // }

  private static _heatmap() {
    if (Osm.map!.isSourceLoaded("earthquakes")) return;

    // Add a geojson point source.
    // Heatmap layers also work with a vector tile source.
    Osm.map!.addSource("earthquakes", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    Osm.map!.addLayer({
      id: "earthquakes-heat",
      type: "heatmap",
      source: "earthquakes",
      paint: {
        // Increase the heatmap weight based on frequency and property magnitude
        "heatmap-weight": [
          "interpolate",
          ["linear"],
          ["get", "mag"],
          0,
          0,
          6,
          1,
        ],
        // Increase the heatmap color weight weight by zoom level
        // heatmap-intensity is a multiplier on top of heatmap-weight
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
        // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
        // Begin color ramp at 0-stop with a 0-transparency color
        // to create a blur-like effect.
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(33,102,172,0)",
          0.2,
          "rgb(103,169,207)",
          0.4,
          "rgb(209,229,240)",
          0.6,
          "rgb(253,219,199)",
          0.8,
          "rgb(239,138,98)",
          1,
          "rgb(178,24,43)",
        ],
        // Adjust the heatmap radius by zoom level
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
        // Transition from heatmap to circle layer by zoom level
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 9, 0],
      },
    });

    Osm.map!.addLayer({
      id: "earthquakes-point",
      type: "circle",
      source: "earthquakes",
      minzoom: 7,
      paint: {
        // Size circle radius by earthquake magnitude and zoom level
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          7,
          ["interpolate", ["linear"], ["get", "mag"], 1, 1, 6, 4],
          16,
          ["interpolate", ["linear"], ["get", "mag"], 1, 5, 6, 50],
        ],
        // Color circle by earthquake magnitude
        "circle-color": [
          "interpolate",
          ["linear"],
          ["get", "mag"],
          1,
          "rgba(33,102,172,0)",
          2,
          "rgb(103,169,207)",
          3,
          "rgb(209,229,240)",
          4,
          "rgb(253,219,199)",
          5,
          "rgb(239,138,98)",
          6,
          "rgb(178,24,43)",
        ],
        "circle-stroke-color": "white",
        "circle-stroke-width": 1,
        // Transition from heatmap to circle layer by zoom level
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0, 8, 1],
      },
    });
  }
}
