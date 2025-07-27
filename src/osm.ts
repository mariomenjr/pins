import * as L from "leaflet";

export default class Osm {
  static ZOOM = 13;
  static MAX_ZOOM = 19;
  static ATTRIBUTION = "© OpenStreetMap";
  static TILE_LAYER_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  static FALLBACK_COORDS: L.LatLng = L.latLng(51.505, -0.09);

  static icon = L.divIcon({
    className: "custom-icon",
    html: '<svg class="h-7 w-7"><use href="/app.svg#icon-crosshairs-gps"></use></svg>',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });

  static map: L.Map | null = null;
  static positionMarker: L.Marker | null = null;

  protected static _setMarker(coords: L.LatLng) {
    if (Osm.positionMarker) Osm.map?.removeLayer(Osm.positionMarker);
    Osm.positionMarker = L.marker(coords, { icon: Osm.icon }).addTo(Osm.map!);
  }

  protected static _showLocation(coords: L.LatLng) {
    Osm.map!.setView(coords, Osm.ZOOM);
    Osm._setMarker(coords);
  }

  protected static _bindEvents() {
    Osm.map!.on("load", () => Osm.locate());
    Osm.map!.on("locationfound", (e) => Osm._setMarker(e.latlng));
    Osm.map!.on("locationerror", () => {
      alert("Unable to retrieve your location.");
      Osm._showLocation(Osm.FALLBACK_COORDS);
    });
  }

  static start() {
    if (!document.getElementById("map"))
      throw new Error("Missing #map container.");
    if (!navigator.geolocation) throw new Error("Geolocation not supported.");

    if (!Osm.map) {
      Osm.map = L.map("map", { zoom: Osm.ZOOM });
      L.tileLayer(Osm.TILE_LAYER_URL, {
        maxZoom: Osm.MAX_ZOOM,
        attribution: Osm.ATTRIBUTION,
      }).addTo(Osm.map);
    }

    Osm._bindEvents();
    Osm._showLocation(Osm.FALLBACK_COORDS);
  }

  static locate() {
    Osm.map?.locate({
      setView: true,
      maxZoom: Osm.ZOOM,
      watch: false,
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  }
}
