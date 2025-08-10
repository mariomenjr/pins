import maplibregl, { GeoJSONSource } from "maplibre-gl";
import MaplibreGeocoder, { type CarmenGeojsonFeature } from '@maplibre/maplibre-gl-geocoder';

import "maplibre-gl/dist/maplibre-gl.css";
import '@maplibre/maplibre-gl-geocoder/dist/maplibre-gl-geocoder.css';
import { createCircleLayer, createHeatmapLayer } from "./utils";
import { supabase } from "../supabase";

const MAP_CONTAINER_ID = "map";
const VECTOR_TILE_URL = "https://tiles.openfreemap.org/styles/liberty";
const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const MAGNITUDE_DECAY_DAYS = 30;
const BOUNDS_THRESHOLD = 0.001;
const DEBOUNCE_TIMEOUT = 300;

export default class Osm {
  static readonly MAP_DIV = MAP_CONTAINER_ID;
  static readonly MAP_COORDS: maplibregl.LngLatLike = [-117.6591, 33.5104];
  static readonly MIN_MAP_ZOOM = 3;
  static readonly MAP_VECTOR_TILE_URL = VECTOR_TILE_URL;
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
          if (!config.query) return { type: 'FeatureCollection', features };
          const sanitizedQuery = encodeURIComponent(String(config.query).replace(/[<>"'&]/g, ''));
          const request = `${NOMINATIM_SEARCH_URL}?q=${sanitizedQuery}&format=geojson&polygon_geojson=1&addressdetails=1&bounded=1&viewbox=${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`;
          const response = await fetch(request);
          const geojson = await response.json();
          if (Array.isArray(geojson.features)) {
            const maxFeatures = Math.min(geojson.features.length, 10);
            for (let i = 0; i < maxFeatures; i++) {
              const feature = geojson.features[i];
              if (feature && feature.properties && feature.geometry) {
                features.push({
                  ...feature,
                  place_name: feature.properties.display_name,
                  center: feature.geometry.coordinates
                });
              }
            }
          }
        } catch (e) {
          const sanitizedError = String(e).replace(/[\r\n]/g, ' ').slice(0, 200);
          console.error(`Failed to forwardGeocode with error: ${sanitizedError}`);
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
    Osm.map.addControl(new maplibregl.AttributionControl({ 
      compact: false,
      customAttribution: [
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
        'Tiles by <a href="https://openfreemap.org/" target="_blank">OpenFreeMap</a>'
      ]
    }));
    Osm.map.addControl(new maplibregl.GlobeControl());
    Osm.map.addControl(geolocate);

    geolocate.on("geolocate", () => Osm._heatmapAsync());

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
      // Get current user from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || 'anonymous';

      const { error } = await supabase
        .from('points')
        .insert([
          { 
            lng: e.lngLat.lng, 
            lat: e.lngLat.lat, 
            user_id: userId
          }
        ]);

      if (error) {
        console.error('Failed to save point:', error);
        return;
      }

      // Refresh the heatmap to show the new point
      Osm._heatmapAsync();
    } catch (error) {
      console.error('Error adding sighting:', error);
    }
  }

  public static toggleMarkMode() {
    if (!Osm.map) {
      console.error('Map not initialized');
      return;
    }
    Osm.isMarkModeOn = !Osm.isMarkModeOn;
    Osm.map.getCanvas().style.cursor = Osm.isMarkModeOn ? "crosshair" : "";
  }

  private static _precheck(): void {
    if (!document.getElementById("map")) {
      throw new Error("Missing #map container.");
    }
    if (!navigator.geolocation) {
      throw new Error("Geolocation not supported.");
    }
  }

  private static _mapcheck(): void {
    if (!Osm.map) {
      throw new Error("Map not initialized.");
    }
  }

  private static _initializeSource(): void {
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

  private static _debouncedHeatmap(): void {
    if (Osm.heatmapTimeout) {
      clearTimeout(Osm.heatmapTimeout);
    }
    
    Osm.heatmapTimeout = window.setTimeout(() => {
      const currentBounds = Osm.map!.getBounds();
      
      // Only fetch if bounds changed significantly
      if (!Osm.lastBounds || !Osm._boundsEqual(currentBounds, Osm.lastBounds)) {
        Osm.lastBounds = currentBounds;
        Osm._heatmapAsync();
      }
    }, DEBOUNCE_TIMEOUT);
  }

  private static _boundsEqual(bounds1: maplibregl.LngLatBounds, bounds2: maplibregl.LngLatBounds): boolean {
    return Math.abs(bounds1.getWest() - bounds2.getWest()) < BOUNDS_THRESHOLD &&
           Math.abs(bounds1.getEast() - bounds2.getEast()) < BOUNDS_THRESHOLD &&
           Math.abs(bounds1.getNorth() - bounds2.getNorth()) < BOUNDS_THRESHOLD &&
           Math.abs(bounds1.getSouth() - bounds2.getSouth()) < BOUNDS_THRESHOLD;
  }

  private static async _heatmapAsync(): Promise<void> {
    const src = Osm.map!.getSource(Osm.SOURCE_NAME) as GeoJSONSource;
    if (!src) return;

    try {
      const bounds = Osm.map!.getBounds();
      
      const { data: points, error } = await supabase
        .from('active_points')
        .select('*')
        .gte('lng', bounds.getWest())
        .lte('lng', bounds.getEast())
        .gte('lat', bounds.getSouth())
        .lte('lat', bounds.getNorth())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return;
      }

      const geojson = {
        type: 'FeatureCollection' as const,
        features: points?.map(point => {
          const ageInDays = (Date.now() - new Date(point.created_at).getTime()) / (1000 * 60 * 60 * 24);
          const mag = Math.max(0.1, Osm.HEATMAP_MAX_MAG * Math.exp(-ageInDays / MAGNITUDE_DECAY_DAYS));
          
          return {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [point.lng, point.lat]
            },
            properties: {
              id: point.id,
              mag: mag,
              time: new Date(point.created_at).getTime()
            }
          };
        }) || []
      };

      src.setData(geojson);
    } catch (error) {
      console.error('Failed to fetch points:', error);
    }
  }
}
