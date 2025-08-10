import type { Position } from "geojson";
import type {
  CircleLayerSpecification,
  HeatmapLayerSpecification,
} from "maplibre-gl";

export function createPoint(coords: Position, mag: number) {
  const time = Date.now();
  return {
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: coords,
    },
    properties: {
      id: time,
      mag: mag,
      time: time,
    },
  };
}

export function createHeatmapLayer(
  src: string,
  mag: number,
  zoom: number,
): HeatmapLayerSpecification {
  return {
    id: `${src}-heat`,
    type: "heatmap",
    source: src,
    paint: {
      // Increase the heatmap weight based on frequency and property magnitude
      "heatmap-weight": [
        "interpolate",
        ["linear"],
        ["get", "mag"],
        0,
        0,
        mag,
        1,
      ],
      // Increase the heatmap color weight weight by zoom level
      // heatmap-intensity is a multiplier on top of heatmap-weight
      "heatmap-intensity": [
        "interpolate",
        ["linear"],
        ["zoom"],
        zoom,
        9,
        13,
        3,
      ],
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
      "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 2, 8, 4, 13, 8],
      // Transition from heatmap to circle layer by zoom level
      "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], zoom, 1, 13, 0],
    },
  };
}

export function createCircleLayer(
  src: string,
  mag: number,
  minZoom: number,
): CircleLayerSpecification {
  return {
    id: `${src}-point`,
    type: "circle",
    source: src,
    minzoom: minZoom,
    paint: {
      // Size circle radius by earthquake magnitude and zoom level
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        1,
        ["interpolate", ["linear"], ["get", "mag"], 1, 1, mag, 2],
        8,
        ["interpolate", ["linear"], ["get", "mag"], 1, 2, mag, 4],
        13,
        ["interpolate", ["linear"], ["get", "mag"], 1, 3, mag, 6],
      ],
      // Color circle by earthquake magnitude
      "circle-color": [
        "interpolate",
        ["linear"],
        ["get", "mag"],
        0,
        "rgba(33,102,172,0)",
        1,
        "rgb(103,169,207)",
        2,
        "rgb(209,229,240)",
        3,
        "rgb(253,219,199)",
        4,
        "rgb(239,138,98)",
        5,
        "rgb(178,24,43)",
      ],
      "circle-stroke-color": "white",
      "circle-stroke-width": [
        "interpolate",
        ["linear"],
        ["zoom"],
        11,
        0,
        13,
        2.5,
      ],
      // Transition from heatmap to circle layer by zoom level
      "circle-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 12.5, 1],
    },
  };
}
