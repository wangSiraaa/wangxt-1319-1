import * as turf from '@turf/turf';
import type {
  BusStop,
  BusRoute,
  ConstructionSegment,
  ImpactAnalysis,
  PeakPressureItem,
  ShuttleSuggestion,
} from '@/types';
import { STOPS, ROUTES, getStopById, getRouteById } from '@/data/transitData';

function haversineDistance(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
): number {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units: 'meters' });
}

function computeDetourDistance(
  route: BusRoute,
  normalPath: [number, number][],
  detourPath?: [number, number][],
): number {
  const normalLine = turf.lineString(normalPath);
  const normalDist = turf.length(normalLine, { units: 'meters' });
  if (!detourPath || detourPath.length < 2) return 0;
  const detourLine = turf.lineString(detourPath);
  const detourDist = turf.length(detourLine, { units: 'meters' });
  return detourDist - normalDist;
}

export function analyzeImpact(params: {
  constructionSegments: ConstructionSegment[];
  excludedStops: string[];
  transferThreshold: number;
}): ImpactAnalysis {
  const { constructionSegments, excludedStops, transferThreshold } = params;

  const closedStopSet = new Set<string>();
  for (const seg of constructionSegments) {
    for (const s of seg.affectedStops) closedStopSet.add(s);
  }
  for (const s of excludedStops) closedStopSet.add(s);

  const affectedRouteIds = new Set<string>();
  const affectedStopMap = new Map<string, BusStop>();
  const detourRoutes = new Map<string, string[]>();

  for (const stop of STOPS) {
    if (closedStopSet.has(stop.id)) {
      affectedStopMap.set(stop.id, stop);
      for (const rid of stop.routes) affectedRouteIds.add(rid);
    }
  }

  for (const route of ROUTES) {
    const routeStops = route.stops;
    let hasClosed = false;
    for (const sid of routeStops) {
      if (closedStopSet.has(sid)) {
        hasClosed = true;
        break;
      }
    }
    if (!hasClosed) continue;

    affectedRouteIds.add(route.id);
    for (const sid of routeStops) {
      if (!affectedStopMap.has(sid)) {
        const st = getStopById(sid);
        if (st) affectedStopMap.set(sid, st);
      }
    }

    if (route.detourStops && route.detourStops.length > 0) {
      detourRoutes.set(route.id, route.detourStops);
    } else {
      const alt = routeStops.filter((s) => !closedStopSet.has(s));
      detourRoutes.set(route.id, alt);
    }
  }

  const affectedStopsList = Array.from(affectedStopMap.values());
  const closedTransferStops = affectedStopsList.filter((s) => s.isTransfer);

  const peakPressure: PeakPressureItem[] = [];
  for (const stop of STOPS) {
    if (!stop.isTransfer) continue;
    const hasClosed = closedStopSet.has(stop.id);
    const nearbyClosed = hasClosed || stop.routes.some((rid) => affectedRouteIds.has(rid));
    if (!nearbyClosed) continue;

    for (const rid of stop.routes) {
      const route = getRouteById(rid);
      if (!route) continue;

      let baseline = stop.peakFlow ? stop.peakFlow / stop.routes.length : 5000;
      let pressure = baseline;
      let level: PeakPressureItem['pressureLevel'] = 'low';

      if (hasClosed) {
        pressure = baseline * 2.6;
        level = 'critical';
      } else {
        const detourDelta = computeDetourDistance(route, route.path, route.detourPath);
        if (detourDelta > 3000) {
          pressure = baseline * 1.9;
          level = 'high';
        } else if (detourDelta > 1500) {
          pressure = baseline * 1.4;
          level = 'medium';
        } else if (detourDelta > 0) {
          pressure = baseline * 1.15;
          level = 'low';
        } else {
          pressure = baseline * 0.95;
          level = 'low';
        }
      }

      const color =
        level === 'critical'
          ? '#dc2626'
          : level === 'high'
            ? '#f97316'
            : level === 'medium'
              ? '#f59e0b'
              : '#16a34a';

      peakPressure.push({
        routeId: rid,
        routeName: route.name,
        transferStopId: stop.id,
        transferStopName: stop.name,
        baseline: Math.round(baseline),
        pressure: Math.round(pressure),
        pressureLevel: level,
        color,
      });
    }
  }

  peakPressure.sort((a, b) => b.pressure - a.pressure);

  const shuttleSuggestions: ShuttleSuggestion[] = [];
  const seenPairs = new Set<string>();

  for (const route of ROUTES) {
    if (!affectedRouteIds.has(route.id)) continue;
    const detourDelta = computeDetourDistance(route, route.path, route.detourPath);
    const effectivePath = route.detourPath && route.detourPath.length > 1 ? route.detourPath : route.path;
    const stopsOnRoute = route.stops.map((sid) => getStopById(sid)).filter(Boolean) as BusStop[];

    for (let i = 0; i < stopsOnRoute.length - 1; i++) {
      const a = stopsOnRoute[i];
      const b = stopsOnRoute[i + 1];
      if (!a || !b) continue;
      if (closedStopSet.has(a.id) || closedStopSet.has(b.id)) continue;

      const pairKey = [a.id, b.id].sort().join('|');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      let segDist = 0;
      for (let k = 0; k < effectivePath.length - 1; k++) {
        segDist += haversineDistance(
          effectivePath[k][0],
          effectivePath[k][1],
          effectivePath[k + 1][0],
          effectivePath[k + 1][1],
        );
      }

      const directDist = haversineDistance(a.lng, a.lat, b.lng, b.lat);
      const effectiveDist = directDist + detourDelta / Math.max(stopsOnRoute.length - 1, 1);

      if (effectiveDist > transferThreshold && effectiveDist > directDist * 1.3) {
        const reasonList: string[] = [];
        if (a.isTransfer) reasonList.push(`${a.name}为换乘站`);
        if (b.isTransfer) reasonList.push(`${b.name}为换乘站`);
        if (detourDelta > 1500) reasonList.push(`绕行增加 ${Math.round(detourDelta / 100) / 10} km`);
        if (closedStopSet.size > 0) reasonList.push(`${closedStopSet.size}个站点封闭`);

        shuttleSuggestions.push({
          fromStopId: a.id,
          fromStopName: a.name,
          toStopId: b.id,
          toStopName: b.name,
          distance: Math.round(effectiveDist),
          threshold: transferThreshold,
          reason: reasonList.join('；') || '绕行距离超阈值',
          routes: [route.id],
        });
      }
    }
  }

  shuttleSuggestions.sort((a, b) => b.distance - a.distance);

  return {
    affectedRoutes: Array.from(affectedRouteIds),
    affectedStops: affectedStopsList,
    affectedTransferStops: closedTransferStops,
    detourRoutes,
    totalAffectedStops: affectedStopsList.length,
    totalAffectedRoutes: affectedRouteIds.size,
    peakPressure,
    shuttleSuggestions,
  };
}

export function computeTransferDistance(
  fromStopId: string,
  toStopId: string,
): number {
  const a = getStopById(fromStopId);
  const b = getStopById(toStopId);
  if (!a || !b) return 0;
  return haversineDistance(a.lng, a.lat, b.lng, b.lat);
}

export function getRouteForMap(routeId: string, useDetour: boolean = false) {
  const route = getRouteById(routeId);
  if (!route) return null;
  const path = useDetour && route.detourPath ? route.detourPath : route.path;
  return {
    ...route,
    path,
    useDetour: useDetour && !!route.detourPath,
  };
}
