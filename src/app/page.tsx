'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Layers } from 'lucide-react';
import type { ConstructionSegment, UserPlan, ImpactAnalysis } from '@/types';
import ControlPanel from '@/components/ControlPanel';
import StatsPanel from '@/components/StatsPanel';
import { analyzeImpact } from '@/lib/impactEngine';
import { STOPS, getStopById, getRouteById } from '@/data/transitData';

const ImpactMap = dynamic(() => import('@/components/ImpactMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <div className="text-center text-slate-500">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm">加载地图组件…</div>
      </div>
    </div>
  ),
});

const DEFAULT_THRESHOLD = 800;
const DEFAULT_SEGMENTS: ConstructionSegment[] = [];

export default function HomePage() {
  const [segments, setSegments] = useState<ConstructionSegment[]>(DEFAULT_SEGMENTS);
  const [excludedStops, setExcludedStops] = useState<string[]>([]);
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);
  const [highlightedStops, setHighlightedStops] = useState<string[]>([]);
  const [highlightedRoutes, setHighlightedRoutes] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const analysis: ImpactAnalysis | null = useMemo(() => {
    return analyzeImpact({
      constructionSegments: segments,
      excludedStops,
      transferThreshold: threshold,
    });
  }, [segments, excludedStops, threshold]);

  const closedStopIds = useMemo(() => {
    const s = new Set<string>();
    for (const seg of segments) for (const id of seg.affectedStops) s.add(id);
    return Array.from(s);
  }, [segments]);

  const onHighlightChange = useCallback((stops: string[], routes: string[]) => {
    setHighlightedStops(stops);
    setHighlightedRoutes(routes);
  }, []);

  const onLoadPlan = useCallback((plan: UserPlan) => {
    setSegments(plan.constructionSegments || []);
    setExcludedStops(plan.excludedStops || []);
    setThreshold(plan.threshold ?? DEFAULT_THRESHOLD);
  }, []);

  const onStopClick = useCallback((stopId: string) => {
    const stop = getStopById(stopId);
    if (!stop) return;
    if (stop.routes?.length) {
      setHighlightedStops([stopId]);
      setHighlightedRoutes(stop.routes);
    } else {
      setHighlightedStops([stopId]);
    }
  }, []);

  const onRouteClick = useCallback((routeId: string) => {
    const r = getRouteById(routeId);
    if (!r) return;
    setHighlightedStops(r.stops.slice());
    setHighlightedRoutes([routeId]);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      <header className="shrink-0 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white border-b border-slate-800 shadow-lg">
        <div className="px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Layers size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate">
                公交换乘影响分析系统
              </h1>
              <p className="text-[11px] text-blue-200/80 truncate">
                纯前端交互工具 · 施工路段模拟 · 换乘压力评估 · 临时接驳规划
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-5 text-xs">
            <LegendItem color="#475569" label="普通站点" />
            <LegendItem color="#1d4ed8" label="换乘站" />
            <LegendItem color="#dc2626" label="封闭站点" />
            <LegendItem color="#f97316" label="取消停靠" />
            <LegendItem color="#06b6d4" label="接驳线路" dashed />
            <LegendItem color="#fbbf24" label="高亮线路" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[360px] shrink-0 border-r border-slate-200 bg-white shadow-sm">
          <ControlPanel
            segments={segments}
            setSegments={setSegments}
            excludedStops={excludedStops}
            setExcludedStops={setExcludedStops}
            threshold={threshold}
            setThreshold={setThreshold}
            highlightedStops={highlightedStops}
            highlightedRoutes={highlightedRoutes}
            onHighlightChange={onHighlightChange}
            onLoadPlan={onLoadPlan}
          />
        </aside>

        <section className="flex-1 flex flex-col min-w-0 bg-slate-50">
          <div className="shrink-0 px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-500" />
                施工路段 <b className="text-slate-800">{segments.length}</b>
              </span>
              <span className="text-slate-300">|</span>
              <span>封闭站点 <b className="text-slate-800">{closedStopIds.length}</b></span>
              <span className="text-slate-300">|</span>
              <span>取消停靠 <b className="text-slate-800">{excludedStops.length}</b></span>
              <span className="text-slate-300">|</span>
              <span>总站点 <b className="text-slate-800">{STOPS.length}</b></span>
            </div>
            <div className="text-[11px] text-slate-400">
              点击站点或线路查看详情 · 悬停列表项高亮对应地图元素
            </div>
          </div>

          <div className="flex-1 min-h-0 p-3">
            <div className="w-full h-full rounded-xl overflow-hidden ring-1 ring-slate-200 shadow-sm bg-white">
              {isClient && (
                <ImpactMap
                  analysis={analysis}
                  closedStopIds={closedStopIds}
                  excludedStopIds={excludedStops}
                  shuttleSuggestions={analysis?.shuttleSuggestions || []}
                  onStopClick={onStopClick}
                  onRouteClick={onRouteClick}
                  highlightedStops={highlightedStops}
                  highlightedRoutes={highlightedRoutes}
                />
              )}
            </div>
          </div>
        </section>

        <aside className="w-[380px] shrink-0 border-l border-slate-200 bg-white shadow-sm">
          <StatsPanel
            analysis={analysis}
            threshold={threshold}
            onStopHover={(id) => onHighlightChange([id], [])}
            onStopLeave={() => onHighlightChange([], [])}
            onRouteHover={(id) => {
              const r = getRouteById(id);
              onHighlightChange(r ? r.stops : [], [id]);
            }}
            onRouteLeave={() => onHighlightChange([], [])}
            onHighlight={onHighlightChange}
          />
        </aside>
      </main>
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {dashed ? (
        <div
          className="w-6 h-1 rounded"
          style={{
            backgroundColor: 'transparent',
            backgroundImage: `linear-gradient(90deg, ${color} 60%, transparent 40%)`,
            backgroundSize: '8px 2px',
            backgroundRepeat: 'repeat-x',
          }}
        />
      ) : (
        <div className="w-3 h-3 rounded-full ring-2 ring-white shadow" style={{ backgroundColor: color }} />
      )}
      <span className="text-blue-50/90">{label}</span>
    </div>
  );
}
