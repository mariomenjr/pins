import type { FeatureCollection } from "geojson";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import MaplibreGeocoder, { type CarmenGeojsonFeature } from '@maplibre/maplibre-gl-geocoder';

import "maplibre-gl/dist/maplibre-gl.css";
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import { createCircleLayer, createHeatmapLayer, createPoint } from "./utils";
import { supabase } from "../supabase";

const div = "map";
const vtu = "https://tiles.openfreemap.org/styles/liberty";
const nominatim = "https://nominatim.openstreetmap.org/search";

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
  static lastBounds: maplibregl.LngLatBounds | null = null;
  static heatmapTimeout: number | null = null;

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
      attributionControl: false,
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

    const geocoder = new MaplibreGeocoder({
      forwardGeocode: async (config) => {
        const features: CarmenGeojsonFeature[] = [];
        try {
          const bounds = Osm.map!.getBounds();
          const request = `${nominatim}?q=${config.query}&format=geojson&polygon_geojson=1&addressdetails=1&bounded=1&viewbox=${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
          const response = await fetch(request);
          const geojson = await response.json();
          for (const feature of geojson.features) {
            features.push({
              ...feature,
              place_name: feature.properties.display_name,
              center: feature.geometry.coordinates
            });
          }
        } catch (e) {
          console.error(`Failed to forwardGeocode with error: ${e}`);
        }
        return {
          type: 'FeatureCollection',
          features
        };
      }
    }, {
      debounceSearch: 300,
      showResultsWhileTyping: true,
      clearOnBlur: true,
      clearAndBlurOnEsc: true,
      limit: 7,
      flyTo: {
        animate: true,
        zoom: (Osm.MAX_MAP_ZOOM-Osm.MAP_ZOOM) / 1.5 + Osm.MAP_ZOOM
      },
    });
    
    Osm.map.addControl(geocoder, "bottom-left");
    Osm.map.addControl(new maplibregl.NavigationControl(), "top-right");
    Osm.map.addControl(new maplibregl.AttributionControl({ compact: false }));
    Osm.map.addControl(new maplibregl.GlobeControl());
    Osm.map.addControl(geolocate);

    geolocate.on("geolocate", () => Osm._heatmap());

    Osm.map.on("load", () => {
      Osm._initializeSource();
      geolocate.trigger();
    });
    
    Osm.map.on("moveend", () => {
      Osm._debouncedHeatmap();
    });
    Osm.map.on("click", Osm.addSightingAsync);
  }

  public static async addSightingAsync(e: maplibregl.MapMouseEvent) {
    if (!Osm.isMarkModeOn) return;

    try {
      const { error } = await supabase
        .from('points')
        .insert([
          { 
            lng: e.lngLat.lng, 
            lat: e.lngLat.lat, 
            mag: Math.random() * Osm.HEATMAP_MAX_MAG 
          }
        ]);

      if (error) {
        console.error('Failed to save point:', error);
        return;
      }

      // Refresh the heatmap to show the new point
      Osm._heatmap();
    } catch (error) {
      console.error('Error adding sighting:', error);
    }
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

  private static _initializeSource() {
    Osm._mapcheck();

    if (Osm.map!.getSource(Osm.SOURCE_NAME)) return;

    Osm.map!.addSource(Osm.SOURCE_NAME, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [],
      },
    });

    Osm.map!.addLayer(
      createHeatmapLayer(Osm.SOURCE_NAME, Osm.HEATMAP_MAX_MAG, Osm.MAP_ZOOM),
    );
    Osm.map!.addLayer(
      createCircleLayer(Osm.SOURCE_NAME, Osm.HEATMAP_MAX_MAG, Osm.MIN_MAP_ZOOM),
    );
  }

  private static _debouncedHeatmap() {
    if (Osm.heatmapTimeout) {
      clearTimeout(Osm.heatmapTimeout);
    }
    
    Osm.heatmapTimeout = window.setTimeout(() => {
      const currentBounds = Osm.map!.getBounds();
      
      // Only fetch if bounds changed significantly
      if (!Osm.lastBounds || !Osm._boundsEqual(currentBounds, Osm.lastBounds)) {
        Osm.lastBounds = currentBounds;
        Osm._heatmap();
      }
    }, 300);
  }

  private static _boundsEqual(bounds1: maplibregl.LngLatBounds, bounds2: maplibregl.LngLatBounds): boolean {
    const threshold = 0.001; // ~100m
    return Math.abs(bounds1.getWest() - bounds2.getWest()) < threshold &&
           Math.abs(bounds1.getEast() - bounds2.getEast()) < threshold &&
           Math.abs(bounds1.getNorth() - bounds2.getNorth()) < threshold &&
           Math.abs(bounds1.getSouth() - bounds2.getSouth()) < threshold;
  }

  private static async _heatmap() {
    const src = Osm.map!.getSource(Osm.SOURCE_NAME) as GeoJSONSource;
    if (!src) return;

    try {
      const bounds = Osm.map!.getBounds();
      
      const { data: points, error } = await supabase
        .from('points')
        .select('*')
        .gte('lng', bounds.getWest())
        .lte('lng', bounds.getEast())
        .gte('lat', bounds.getSouth())
        .lte('lat', bounds.getNorth());

      if (error) {
        console.error('Supabase error:', error);
        return;
      }

      const geojson = {
        type: 'FeatureCollection' as const,
        features: points?.map(point => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [point.lng, point.lat]
          },
          properties: {
            id: point.id,
            mag: point.mag,
            time: new Date(point.created_at).getTime()
          }
        })) || []
      };

      src.setData(geojson);
    } catch (error) {
      console.error('Failed to fetch points:', error);
    }
  }
}
