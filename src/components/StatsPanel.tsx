'use client';

import { useMemo, useState } from 'react';
import clsx from 'clsx';
import {
  Route,
  MapPin,
  Users,
  AlertTriangle,
  TrendingUp,
  Bus,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCcw,
} from 'lucide-react';
import type { ImpactAnalysis, PeakPressureItem } from '@/types';
import { getStopById, getRouteById } from '@/data/transitData';

interface StatsPanelProps {
  analysis: ImpactAnalysis | null;
  threshold: number;
  onStopHover: (stopId: string) => void;
  onStopLeave: () => void;
  onRouteHover: (routeId: string) => void;
  onRouteLeave: () => void;
  onHighlight: (stops: string[], routes: string[]) => void;
}

const PRESSURE_LABEL: Record<PeakPressureItem['pressureLevel'], { text: string; color: string; bg: string }> = {
  low: { text: '低压', color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  medium: { text: '中压', color: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' },
  high: { text: '高压', color: 'text-orange-700', bg: 'bg-orange-50 ring-orange-200' },
  critical: { text: '严重', color: 'text-red-700', bg: 'bg-red-50 ring-red-200' },
};

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)} 万`;
  return n.toLocaleString();
}

export default function StatsPanel({
  analysis,
  threshold,
  onStopHover,
  onStopLeave,
  onRouteHover,
  onRouteLeave,
  onHighlight,
}: StatsPanelProps) {
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({
    routes: true,
    stops: true,
    pressure: true,
    shuttle: true,
  });

  const toggle = (k: string) =>
    setExpandedSection((prev) => ({ ...prev, [k]: !prev[k] }));

  const stats = useMemo(() => {
    if (!analysis) {
      return {
        routes: 0,
        stops: 0,
        transferStops: 0,
        detour: 0,
        pressureCount: { low: 0, medium: 0, high: 0, critical: 0 },
        shuttle: 0,
        totalPressure: 0,
      };
    }
    const pc = { low: 0, medium: 0, high: 0, critical: 0 };
    let totalPressure = 0;
    for (const p of analysis.peakPressure) {
      pc[p.pressureLevel]++;
      totalPressure += p.pressure;
    }
    return {
      routes: analysis.totalAffectedRoutes,
      stops: analysis.totalAffectedStops,
      transferStops: analysis.affectedTransferStops.length,
      detour: analysis.detourRoutes.size,
      pressureCount: pc,
      shuttle: analysis.shuttleSuggestions.length,
      totalPressure,
    };
  }, [analysis]);

  const SectionHeader = ({
    id,
    title,
    count,
    icon: Icon,
    tone,
  }: {
    id: string;
    title: string;
    count?: number;
    icon: any;
    tone: 'blue' | 'amber' | 'red' | 'cyan';
  }) => {
    const open = expandedSection[id];
    const toneMap = {
      blue: 'text-blue-600 bg-blue-50',
      amber: 'text-amber-600 bg-amber-50',
      red: 'text-red-600 bg-red-50',
      cyan: 'text-cyan-600 bg-cyan-50',
    };
    return (
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center gap-3 py-2.5 px-1 group"
      >
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        <div className={clsx('p-1.5 rounded-md', toneMap[tone])}>
          <Icon size={14} />
        </div>
        <div className="flex-1 text-left font-semibold text-sm text-slate-700 group-hover:text-slate-900">
          {title}
        </div>
        {typeof count === 'number' && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-slate-50">
      <div className="p-4 border-b border-slate-200 bg-white">
        <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-3">
          <TrendingUp className="text-emerald-500" size={18} />
          影响分析结果
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard
            icon={Route}
            label="受影响线路"
            value={stats.routes}
            suffix="条"
            tone="blue"
            sub={stats.detour > 0 ? `${stats.detour} 条绕行` : undefined}
          />
          <StatCard
            icon={MapPin}
            label="受影响站点"
            value={stats.stops}
            suffix="个"
            tone="amber"
            sub={stats.transferStops > 0 ? `${stats.transferStops} 换乘站` : undefined}
          />
          <StatCard
            icon={Users}
            label="高峰压力值"
            value={formatNumber(stats.totalPressure)}
            tone="red"
            sub={`${stats.pressureCount.critical} 严重 / ${stats.pressureCount.high} 高`}
          />
          <StatCard
            icon={AlertTriangle}
            label="接驳建议"
            value={stats.shuttle}
            suffix="条"
            tone="cyan"
            sub={`阈值 ${threshold}m`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-2 space-y-1">
        {!analysis ? (
          <div className="text-center py-16 text-slate-400">
            <RefreshCcw size={40} className="mx-auto mb-3 opacity-30 animate-pulse" />
            <div className="text-sm">请在左侧配置施工路段</div>
            <div className="text-xs text-slate-300 mt-1">分析结果将实时出现在这里</div>
          </div>
        ) : (
          <>
            <SectionHeader id="routes" title="受影响线路" count={analysis.affectedRoutes.length} icon={Bus} tone="blue" />
            {expandedSection.routes && (
              <div className="mb-2 pl-7 pr-1 space-y-1.5">
                {analysis.affectedRoutes.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center">暂无受影响线路</div>
                ) : (
                  analysis.affectedRoutes.map((rid) => {
                    const r = getRouteById(rid);
                    if (!r) return null;
                    const isDetour = analysis.detourRoutes.has(rid);
                    const detourAlt = analysis.detourRoutes.get(rid);
                    return (
                      <div
                        key={rid}
                        onMouseEnter={() => onRouteHover(rid)}
                        onMouseLeave={() => onRouteLeave()}
                        className="bg-white rounded-lg ring-1 ring-slate-200 p-2.5 hover:ring-blue-300 hover:shadow-sm cursor-pointer transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-6 rounded-sm"
                            style={{ backgroundColor: r.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                              {isDetour && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-violet-50 text-violet-700 ring-1 ring-violet-100 font-medium">
                                  <RefreshCcw size={10} />
                                  绕行
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {r.stops.length} 站 · 日均 {formatNumber(r.dailyRidership || 0)} 人次
                            </div>
                          </div>
                        </div>
                        {isDetour && detourAlt && detourAlt.length > 0 && (
                          <div className="mt-2 pl-4.5 text-[11px] text-slate-500 leading-relaxed border-l-2 border-violet-200 pl-2 ml-1">
                            绕行后停靠：
                            {detourAlt.slice(0, 6).map((sid, i) => (
                              <span key={sid}>
                                {i > 0 && <span className="text-slate-300 mx-1">→</span>}
                                <span className="text-slate-600">{getStopById(sid)?.name || sid}</span>
                              </span>
                            ))}
                            {detourAlt.length > 6 && (
                              <span className="text-violet-500 ml-1">+{detourAlt.length - 6}…</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <SectionHeader
              id="stops"
              title="封闭/取消站点"
              count={analysis.affectedStops.length}
              icon={MapPin}
              tone="amber"
            />
            {expandedSection.stops && (
              <div className="mb-2 pl-7 pr-1 space-y-1.5">
                {analysis.affectedStops.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center">当前无封闭站点</div>
                ) : (
                  analysis.affectedStops.map((s) => (
                    <div
                      key={s.id}
                      onMouseEnter={() => onStopHover(s.id)}
                      onMouseLeave={() => onStopLeave()}
                      className="bg-white rounded-lg ring-1 ring-slate-200 p-2.5 hover:ring-amber-300 hover:shadow-sm cursor-pointer transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                          <span className="text-sm font-semibold text-slate-800 truncate">{s.name}</span>
                          {s.isTransfer && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 ring-1 ring-blue-100 font-medium shrink-0">
                              换乘
                            </span>
                          )}
                        </div>
                        {s.peakFlow && (
                          <span className="text-[11px] text-slate-500 shrink-0">
                            高峰 {formatNumber(s.peakFlow)}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-1">
                        {s.routes.map((rid) => {
                          const r = getRouteById(rid);
                          return r ? (
                            <span
                              key={rid}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                              style={{ backgroundColor: r.color }}
                            >
                              {r.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <SectionHeader
              id="pressure"
              title="高峰换乘压力"
              count={analysis.peakPressure.length}
              icon={Users}
              tone="red"
            />
            {expandedSection.pressure && (
              <div className="mb-2 pl-7 pr-1 space-y-1.5">
                {analysis.peakPressure.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center">暂无压力数据</div>
                ) : (
                  analysis.peakPressure.slice(0, 30).map((p, i) => {
                    const meta = PRESSURE_LABEL[p.pressureLevel];
                    const ratio = Math.min(100, (p.pressure / (p.baseline * 3)) * 100);
                    return (
                      <div
                        key={i}
                        onMouseEnter={() =>
                          onHighlight([p.transferStopId], [p.routeId])
                        }
                        onMouseLeave={() => onHighlight([], [])}
                        className={clsx(
                          'rounded-lg p-2.5 ring-1 cursor-pointer transition-all hover:shadow-sm',
                          meta.bg,
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800 truncate">
                                {p.transferStopName}
                              </span>
                              <span className="text-xs text-slate-500">·</span>
                              <span className="text-xs text-slate-600 truncate">{p.routeName}</span>
                            </div>
                            <div className="mt-1.5 h-1.5 bg-white/60 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${ratio}%`,
                                  backgroundColor: p.color,
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1 text-[11px]">
                              <span className="text-slate-500">
                                基准 {formatNumber(p.baseline)}
                              </span>
                              <span className={clsx('font-semibold', meta.color)}>
                                ↑ {formatNumber(p.pressure)}
                              </span>
                            </div>
                          </div>
                          <span
                            className={clsx(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 shrink-0',
                              meta.bg,
                              meta.color,
                            )}
                          >
                            {meta.text}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <SectionHeader
              id="shuttle"
              title="临时接驳建议"
              count={analysis.shuttleSuggestions.length}
              icon={AlertCircle}
              tone="cyan"
            />
            {expandedSection.shuttle && (
              <div className="mb-4 pl-7 pr-1 space-y-1.5">
                {analysis.shuttleSuggestions.length === 0 ? (
                  <div className="text-xs text-slate-400 py-6 text-center bg-emerald-50 rounded-lg ring-1 ring-emerald-100">
                    ✓ 当前换乘距离均在阈值 {threshold}m 以内，无需额外接驳
                  </div>
                ) : (
                  analysis.shuttleSuggestions.map((s, i) => (
                    <div
                      key={i}
                      onMouseEnter={() => onHighlight([s.fromStopId, s.toStopId], s.routes)}
                      onMouseLeave={() => onHighlight([], [])}
                      className="bg-gradient-to-r from-cyan-50 to-sky-50 rounded-lg ring-1 ring-cyan-200 p-3 hover:ring-cyan-400 hover:shadow-sm cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cyan-600 text-white text-[10px] font-bold shrink-0">
                              A
                            </span>
                            <span className="text-sm font-semibold text-slate-800 truncate">
                              {s.fromStopName}
                            </span>
                          </div>
                          <div className="flex-1 flex items-center justify-center text-cyan-500">
                            <div className="flex-1 h-px bg-cyan-300 mx-1" />
                            <Bus size={14} />
                            <div className="flex-1 h-px bg-cyan-300 mx-1" />
                          </div>
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-bold shrink-0">
                              B
                            </span>
                            <span className="text-sm font-semibold text-slate-800 truncate">
                              {s.toStopName}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-cyan-700 font-semibold bg-white/70 px-2 py-0.5 rounded">
                          距离 {(s.distance / 1000).toFixed(2)} km
                        </span>
                        <span className="text-[11px] text-slate-500">
                          超阈值 {(s.distance - s.threshold)}m
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-cyan-200/60">
                        <div className="text-[11px] text-slate-600 leading-relaxed">
                          <span className="text-cyan-700 font-medium">原因：</span>
                          {s.reason}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
  sub,
}: {
  icon: any;
  label: string;
  value: number | string;
  suffix?: string;
  tone: 'blue' | 'amber' | 'red' | 'cyan';
  sub?: string;
}) {
  const map = {
    blue: 'from-blue-500 to-blue-600',
    amber: 'from-amber-500 to-orange-500',
    red: 'from-rose-500 to-red-600',
    cyan: 'from-cyan-500 to-sky-600',
  };
  return (
    <div className="relative overflow-hidden rounded-xl p-2.5 bg-white ring-1 ring-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[11px] text-slate-500 font-medium mb-1">{label}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-slate-800 leading-none">{value}</span>
            {suffix && <span className="text-[11px] text-slate-400">{suffix}</span>}
          </div>
          {sub && <div className="text-[10px] text-slate-400 mt-1">{sub}</div>}
        </div>
        <div
          className={clsx(
            'p-1.5 rounded-lg text-white bg-gradient-to-br shadow-sm',
            map[tone],
          )}
        >
          <Icon size={14} />
        </div>
      </div>
      <div
        className={clsx(
          'absolute -right-4 -bottom-4 w-16 h-16 rounded-full opacity-10 bg-gradient-to-br',
          map[tone],
        )}
      />
    </div>
  );
}
