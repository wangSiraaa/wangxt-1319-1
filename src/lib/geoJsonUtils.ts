import * as turf from '@turf/turf';
import type { FeatureCollection, Feature, LineString, Point, Polygon } from 'geojson';
import type { BusStop, BusRoute } from '@/types';
import { STOPS, ROUTES, getStopById } from '@/data/transitData';

export function stopsToGeoJSON(filter?: (s: BusStop) => boolean): FeatureCollection<Point> {
  const list = filter ? STOPS.filter(filter) : STOPS;
  return {
    type: 'FeatureCollection',
    features: list.map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: {
        id: s.id,
        name: s.name,
        isTransfer: s.isTransfer,
        routeList: s.routes.join(','),
        routeCount: s.routes.length,
        peakFlow: s.peakFlow || 0,
      },
    })),
  };
}

export function routesToGeoJSON(options?: {
  filter?: (r: BusRoute) => boolean;
  useDetourIds?: Set<string>;
  highlightIds?: Set<string>;
}): FeatureCollection<LineString> {
  const { filter, useDetourIds, highlightIds } = options || {};
  const list = filter ? ROUTES.filter(filter) : ROUTES;
  return {
    type: 'FeatureCollection',
    features: list.map((r) => {
      const useDetour = useDetourIds?.has(r.id) && !!r.detourPath;
      const path = useDetour ? r.detourPath! : r.path;
      return {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: path },
        properties: {
          id: r.id,
          name: r.name,
          color: r.color,
          isDetour: useDetour,
          isHighlight: highlightIds ? highlightIds.has(r.id) : false,
          dailyRidership: r.dailyRidership || 0,
        },
      };
    }),
  };
}

export function closedStopsToGeoJSON(closedStopIds: string[]): FeatureCollection<Point> {
  const set = new Set(closedStopIds);
  return stopsToGeoJSON((s) => set.has(s.id));
}

export function buildConstructionBuffer(
  closedStopIds: string[],
  radiusMeters: number = 120,
): FeatureCollection<Polygon> {
  const features: Feature<Polygon>[] = [];
  for (const sid of closedStopIds) {
    const s = getStopById(sid);
    if (!s) continue;
    const center = turf.point([s.lng, s.lat]);
    const circle = turf.circle(center, radiusMeters, {
      steps: 24,
      units: 'meters',
    });
    circle.properties = {
      stopId: s.id,
      stopName: s.name,
      radius: radiusMeters,
    };
    features.push(circle as unknown as Feature<Polygon>);
  }
  return { type: 'FeatureCollection', features };
}

export interface ShuttleLine {
  id: string;
  from: BusStop;
  to: BusStop;
  distance: number;
  reason: string;
  routes: string[];
}

export function shuttleLinesToGeoJSON(lines: ShuttleLine[]): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: lines.map((l) => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [l.from.lng, l.from.lat],
          [l.to.lng, l.to.lat],
        ],
      },
      properties: {
        id: l.id,
        fromStop: l.from.id,
        fromName: l.from.name,
        toStop: l.to.id,
        toName: l.to.name,
        distance: l.distance,
        reason: l.reason,
      },
    })),
  };
}
