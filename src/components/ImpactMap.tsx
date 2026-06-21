'use client';

import { useEffect, useRef, useCallback } from 'react';
import maplibregl, { Map as MaplibreMap, Marker, Popup } from 'maplibre-gl';
import type { ImpactAnalysis, ShuttleSuggestion } from '@/types';
import { STOPS, ROUTES, getStopById, CENTER } from '@/data/transitData';
import {
  stopsToGeoJSON,
  routesToGeoJSON,
  buildConstructionBuffer,
  shuttleLinesToGeoJSON,
  ShuttleLine,
} from '@/lib/geoJsonUtils';

interface ImpactMapProps {
  analysis: ImpactAnalysis | null;
  closedStopIds: string[];
  excludedStopIds: string[];
  shuttleSuggestions: ShuttleSuggestion[];
  onStopClick: (stopId: string) => void;
  onRouteClick: (routeId: string) => void;
  highlightedStops?: string[];
  highlightedRoutes?: string[];
}

const TILE_URL =
  'https://demotiles.maplibre.org/style.json';

export default function ImpactMap({
  analysis,
  closedStopIds,
  excludedStopIds,
  shuttleSuggestions,
  onStopClick,
  onRouteClick,
  highlightedStops = [],
  highlightedRoutes = [],
}: ImpactMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markerRefs = useRef<Map<string, Marker>>(new Map());

  const initMap = useCallback(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: TILE_URL,
      center: [CENTER.lng, CENTER.lat],
      zoom: CENTER.zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      addBaseLayers(map);
      renderLayers(map);
    });

    map.on('click', (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [
          'stops-layer',
          'closed-stops-layer',
          'excluded-stops-layer',
        ],
      });
      if (features.length > 0) {
        const stopId = features[0].properties?.id as string;
        if (stopId) onStopClick(stopId);
        return;
      }
      const routeFeats = map.queryRenderedFeatures(e.point, {
        layers: [
          'routes-layer',
          'detour-routes-layer',
          'highlight-routes-layer',
        ],
      });
      if (routeFeats.length > 0) {
        const rid = routeFeats[0].properties?.id as string;
        if (rid) onRouteClick(rid);
      }
    });

    map.on('mouseenter', ['routes-layer', 'detour-routes-layer', 'highlight-routes-layer'], () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', ['routes-layer', 'detour-routes-layer', 'highlight-routes-layer'], () => {
      map.getCanvas().style.cursor = '';
    });
    map.on('mouseenter', ['stops-layer', 'closed-stops-layer', 'excluded-stops-layer'], () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', ['stops-layer', 'closed-stops-layer', 'excluded-stops-layer'], () => {
      map.getCanvas().style.cursor = '';
    });

    mapRef.current = map;
  }, [onStopClick, onRouteClick]);

  const addBaseLayers = (map: MaplibreMap) => {
    const emptyFc = { type: 'FeatureCollection' as const, features: [] };

    if (!map.getSource('routes-source')) {
      map.addSource('routes-source', { type: 'geojson', data: emptyFc as any });
    }
    if (!map.getSource('detour-routes-source')) {
      map.addSource('detour-routes-source', { type: 'geojson', data: emptyFc as any });
    }
    if (!map.getSource('highlight-routes-source')) {
      map.addSource('highlight-routes-source', { type: 'geojson', data: emptyFc as any });
    }
    if (!map.getSource('stops-source')) {
      map.addSource('stops-source', { type: 'geojson', data: emptyFc as any });
    }
    if (!map.getSource('closed-stops-source')) {
      map.addSource('closed-stops-source', { type: 'geojson', data: emptyFc as any });
    }
    if (!map.getSource('excluded-stops-source')) {
      map.addSource('excluded-stops-source', { type: 'geojson', data: emptyFc as any });
    }
    if (!map.getSource('construction-buffer-source')) {
      map.addSource('construction-buffer-source', { type: 'geojson', data: emptyFc as any });
    }
    if (!map.getSource('shuttle-source')) {
      map.addSource('shuttle-source', { type: 'geojson', data: emptyFc as any });
    }

    if (!map.getLayer('construction-buffer-layer')) {
      map.addLayer({
        id: 'construction-buffer-layer',
        type: 'fill',
        source: 'construction-buffer-source',
        paint: {
          'fill-color': '#f87171',
          'fill-opacity': 0.18,
          'fill-outline-color': '#dc2626',
        },
      });
    }

    if (!map.getLayer('shuttle-layer')) {
      map.addLayer({
        id: 'shuttle-layer',
        type: 'line',
        source: 'shuttle-source',
        paint: {
          'line-color': '#06b6d4',
          'line-width': 5,
          'line-opacity': 0.75,
          'line-dasharray': [2, 1.2],
        },
      });
    }

    if (!map.getLayer('routes-layer')) {
      map.addLayer({
        id: 'routes-layer',
        type: 'line',
        source: 'routes-source',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 4,
          'line-opacity': 0.55,
        },
      });
    }

    if (!map.getLayer('detour-routes-layer')) {
      map.addLayer({
        id: 'detour-routes-layer',
        type: 'line',
        source: 'detour-routes-source',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 7,
          'line-opacity': 0.92,
          'line-dasharray': [3, 0.8],
        },
      });
    }

    if (!map.getLayer('highlight-routes-layer')) {
      map.addLayer({
        id: 'highlight-routes-layer',
        type: 'line',
        source: 'highlight-routes-source',
        paint: {
          'line-color': '#fbbf24',
          'line-width': 9,
          'line-opacity': 0.98,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      });
    }

    if (!map.getLayer('stops-layer')) {
      map.addLayer({
        id: 'stops-layer',
        type: 'circle',
        source: 'stops-source',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'isTransfer'], true],
            9,
            6,
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'isTransfer'], true],
            '#1d4ed8',
            '#475569',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    }

    if (!map.getLayer('closed-stops-layer')) {
      map.addLayer({
        id: 'closed-stops-layer',
        type: 'circle',
        source: 'closed-stops-source',
        paint: {
          'circle-radius': 11,
          'circle-color': '#dc2626',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fecaca',
        },
      });
    }

    if (!map.getLayer('excluded-stops-layer')) {
      map.addLayer({
        id: 'excluded-stops-layer',
        type: 'circle',
        source: 'excluded-stops-source',
        paint: {
          'circle-radius': 10,
          'circle-color': '#f97316',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fed7aa',
        },
      });
    }
  };

  const renderLayers = (map: MaplibreMap) => {
    const detourRouteIds = new Set(analysis?.detourRoutes.keys() || []);
    const highlightSet = new Set(highlightedRoutes);

    const baseRoutes = routesToGeoJSON({
      filter: (r) => !highlightSet.has(r.id),
      useDetourIds: detourRouteIds,
    });

    const normalRoutes = {
      ...baseRoutes,
      features: baseRoutes.features.filter((f) => !f.properties?.isDetour),
    };
    const detourRoutes = {
      ...baseRoutes,
      features: baseRoutes.features.filter((f) => !!f.properties?.isDetour),
    };
    const highlightRoutes = routesToGeoJSON({
      filter: (r) => highlightSet.has(r.id),
      useDetourIds: detourRouteIds,
    });

    const closedSet = new Set(closedStopIds);
    const excludedSet = new Set(excludedStopIds);
    const hlStopSet = new Set(highlightedStops);

    const stops = stopsToGeoJSON(
      (s) => !closedSet.has(s.id) && !excludedSet.has(s.id),
    );
    const closedStops = stopsToGeoJSON((s) => closedSet.has(s.id));
    const excludedStops = stopsToGeoJSON((s) => excludedSet.has(s.id));
    const buffer = buildConstructionBuffer(Array.from(closedSet), 160);

    const shuttleLines: ShuttleLine[] = shuttleSuggestions.map((s, i) => {
      const from = getStopById(s.fromStopId);
      const to = getStopById(s.toStopId);
      return {
        id: `shuttle_${i}`,
        from: from!,
        to: to!,
        distance: s.distance,
        reason: s.reason,
        routes: s.routes,
      };
    }).filter((s) => s.from && s.to);
    const shuttleGeo = shuttleLinesToGeoJSON(shuttleLines);

    (map.getSource('routes-source') as any).setData(normalRoutes);
    (map.getSource('detour-routes-source') as any).setData(detourRoutes);
    (map.getSource('highlight-routes-source') as any).setData(highlightRoutes);
    (map.getSource('stops-source') as any).setData(stops);
    (map.getSource('closed-stops-source') as any).setData(closedStops);
    (map.getSource('excluded-stops-source') as any).setData(excludedStops);
    (map.getSource('construction-buffer-source') as any).setData(buffer);
    (map.getSource('shuttle-source') as any).setData(shuttleGeo);

    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current.clear();

    STOPS.forEach((s) => {
      if (!hlStopSet.has(s.id)) return;
      const el = document.createElement('div');
      el.className = 'hl-stop-marker';
      el.style.width = '26px';
      el.style.height = '26px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid #facc15';
      el.style.background = '#fff7ed';
      el.style.boxShadow = '0 0 0 4px rgba(250,204,21,0.35)';
      el.style.cursor = 'pointer';

      const popup = new Popup({ offset: 14, closeButton: false, closeOnClick: false }).setHTML(
        `<div style="font-size:13px;font-weight:600">${s.name}</div>
         <div style="font-size:12px;color:#64748b;margin-top:4px">
         ${s.routes.length} 条线路${s.isTransfer ? ' · 换乘站' : ''}</div>`,
      );
      const marker = new Marker({ element: el })
        .setLngLat([s.lng, s.lat])
        .setPopup(popup)
        .addTo(map);
      markerRefs.current.set(s.id, marker);
    });
  };

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  useEffect(() => {
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      renderLayers(mapRef.current);
    } else if (mapRef.current) {
      mapRef.current.once('styledata', () => {
        if (mapRef.current) renderLayers(mapRef.current);
      });
    }
  });

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full relative overflow-hidden rounded-lg"
      style={{ minHeight: '560px' }}
    />
  );
}
