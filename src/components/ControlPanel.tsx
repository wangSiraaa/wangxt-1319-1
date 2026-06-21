'use client';

import { useMemo, useState, useEffect } from 'react';
import clsx from 'clsx';
import { AlertTriangle, Ban, Save, FolderOpen, Trash2, Settings, X } from 'lucide-react';
import type { ConstructionSegment, UserPlan } from '@/types';
import { STOPS, ROUTES, getStopById, getRouteById } from '@/data/transitData';
import { listPlans, savePlan, deletePlan, getPlan } from '@/lib/indexedDBService';

interface ControlPanelProps {
  segments: ConstructionSegment[];
  setSegments: (s: ConstructionSegment[]) => void;
  excludedStops: string[];
  setExcludedStops: (s: string[]) => void;
  threshold: number;
  setThreshold: (n: number) => void;
  highlightedStops: string[];
  highlightedRoutes: string[];
  onHighlightChange: (stops: string[], routes: string[]) => void;
  onLoadPlan: (plan: UserPlan) => void;
}

export default function ControlPanel({
  segments,
  setSegments,
  excludedStops,
  setExcludedStops,
  threshold,
  setThreshold,
  highlightedStops,
  highlightedRoutes,
  onHighlightChange,
  onLoadPlan,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<'construction' | 'excluded' | 'settings' | 'plans'>('construction');
  const [stopSearch, setStopSearch] = useState('');
  const [routeFilter, setRouteFilter] = useState<string>('');
  const [saveDialog, setSaveDialog] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planList, setPlanList] = useState<UserPlan[]>([]);
  const [notes, setNotes] = useState('');
  const [loadingPlans, setLoadingPlans] = useState(false);

  useEffect(() => {
    refreshPlans();
  }, []);

  const refreshPlans = async () => {
    setLoadingPlans(true);
    try {
      const list = await listPlans();
      setPlanList(list);
    } finally {
      setLoadingPlans(false);
    }
  };

  const closedStopSet = useMemo(() => {
    const s = new Set<string>();
    for (const seg of segments) for (const id of seg.affectedStops) s.add(id);
    return s;
  }, [segments]);

  const filteredStops = useMemo(() => {
    const q = stopSearch.trim().toLowerCase();
    let list = STOPS;
    if (routeFilter) {
      list = list.filter((s) => s.routes.includes(routeFilter));
    }
    if (q) {
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
      );
    }
    return list;
  }, [stopSearch, routeFilter]);

  const toggleStopInConstruction = (stopId: string, segIdx: number) => {
    const next = segments.slice();
    const cur = new Set(next[segIdx].affectedStops);
    if (cur.has(stopId)) cur.delete(stopId);
    else cur.add(stopId);
    next[segIdx] = { ...next[segIdx], affectedStops: Array.from(cur) };
    setSegments(next);
  };

  const addSegment = () => {
    const idx = segments.length + 1;
    setSegments([
      ...segments,
      {
        id: `seg_${Date.now()}`,
        affectedStops: [],
        description: `施工路段 #${idx}`,
      },
    ]);
  };

  const removeSegment = (idx: number) => {
    const next = segments.slice();
    next.splice(idx, 1);
    setSegments(next);
  };

  const updateSegmentDescription = (idx: number, desc: string) => {
    const next = segments.slice();
    next[idx] = { ...next[idx], description: desc };
    setSegments(next);
  };

  const toggleExcludedStop = (stopId: string) => {
    if (closedStopSet.has(stopId)) return;
    const cur = new Set(excludedStops);
    if (cur.has(stopId)) cur.delete(stopId);
    else cur.add(stopId);
    setExcludedStops(Array.from(cur));
  };

  const onStopHover = (stopId: string) => {
    onHighlightChange([stopId], []);
  };

  const onRouteHover = (routeId: string) => {
    const route = getRouteById(routeId);
    onHighlightChange(route ? route.stops : [], [routeId]);
  };

  const clearAll = () => {
    setSegments([]);
    setExcludedStops([]);
    onHighlightChange([], []);
  };

  const doSavePlan = async () => {
    if (!planName.trim()) return;
    const plan = await savePlan({
      name: planName.trim(),
      constructionSegments: segments,
      excludedStops,
      threshold,
      notes: notes.trim() || undefined,
    });
    setSaveDialog(false);
    setPlanName('');
    setNotes('');
    refreshPlans();
    return plan;
  };

  const doLoadPlan = async (id: string) => {
    const plan = await getPlan(id);
    if (plan) onLoadPlan(plan);
  };

  const doDeletePlan = async (id: string) => {
    await deletePlan(id);
    refreshPlans();
  };

  const TabButton = ({ id, label, icon: Icon, badge }: { id: typeof activeTab; label: string; icon: any; badge?: number }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={clsx(
        'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
        activeTab === id
          ? 'bg-white shadow text-blue-700 ring-1 ring-blue-100'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
      )}
    >
      <Icon size={16} />
      <span>{label}</span>
      {typeof badge === 'number' && badge > 0 && (
        <span className="ml-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-xs">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <div className="p-3 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={18} />
            施工与分析配置
          </h2>
          <button
            onClick={clearAll}
            className="text-xs text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1"
          >
            <X size={14} /> 清空
          </button>
        </div>
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          <TabButton id="construction" label="施工" icon={AlertTriangle} badge={segments.length} />
          <TabButton id="excluded" label="取消站点" icon={Ban} badge={excludedStops.length} />
          <TabButton id="settings" label="阈值" icon={Settings} />
          <TabButton id="plans" label="方案" icon={FolderOpen} badge={planList.length} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {activeTab === 'construction' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-700">施工路段</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  共 {segments.length} 段，受影响站点 {closedStopSet.size} 个
                </div>
              </div>
              <button
                onClick={addSegment}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-colors"
              >
                + 新增路段
              </button>
            </div>

            {segments.length === 0 && (
              <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white/60">
                <AlertTriangle size={36} className="mx-auto mb-2 opacity-40" />
                <div className="text-sm">点击"新增路段"开始模拟施工影响</div>
              </div>
            )}

            {segments.map((seg, idx) => (
              <div key={seg.id} className="bg-white rounded-xl shadow-sm ring-1 ring-slate-200 overflow-hidden">
                <div className="p-3 bg-gradient-to-r from-red-50 to-amber-50 border-b border-slate-100 flex items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <input
                      value={seg.description}
                      onChange={(e) => updateSegmentDescription(idx, e.target.value)}
                      className="w-full font-semibold text-sm text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 focus:outline-none pb-0.5"
                    />
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        封闭 {seg.affectedStops.length} 站
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSegment(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={stopSearch}
                      onChange={(e) => setStopSearch(e.target.value)}
                      placeholder="搜索站点名称…"
                      className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                    />
                    <select
                      value={routeFilter}
                      onChange={(e) => setRouteFilter(e.target.value)}
                      className="text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none bg-white"
                    >
                      <option value="">全部线路</option>
                      {ROUTES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="max-h-56 overflow-y-auto scrollbar-thin border border-slate-100 rounded-lg divide-y divide-slate-50">
                    {filteredStops.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">无匹配站点</div>
                    ) : (
                      filteredStops.map((s) => {
                        const checked = seg.affectedStops.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            onMouseEnter={() => onStopHover(s.id)}
                            onMouseLeave={() => onHighlightChange(highlightedStops.filter((x) => x !== s.id), [])}
                            className={clsx(
                              'flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors',
                              checked ? 'bg-red-50' : 'hover:bg-slate-50',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleStopInConstruction(s.id, idx)}
                              className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-slate-800 truncate flex items-center gap-1.5">
                                {s.name}
                                {s.isTransfer && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-medium">
                                    换乘
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {s.routes.map((rid) => getRouteById(rid)?.name).join(' / ')}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'excluded' && (
          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-slate-700">取消停靠站点</div>
              <div className="text-xs text-slate-500 mt-0.5">
                临时过站不停车，不标记为施工封闭，站点仍可作为换乘通过
              </div>
            </div>
            <div className="flex gap-2">
              <input
                value={stopSearch}
                onChange={(e) => setStopSearch(e.target.value)}
                placeholder="搜索站点名称…"
                className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
              />
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none"
              >
                <option value="">全部线路</option>
                {ROUTES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {excludedStops.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-3 bg-orange-50 rounded-xl ring-1 ring-orange-100">
                {excludedStops.map((sid) => {
                  const s = getStopById(sid);
                  return (
                    <span
                      key={sid}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-orange-700 text-xs font-medium ring-1 ring-orange-200"
                    >
                      {s?.name || sid}
                      <button
                        onClick={() => toggleExcludedStop(sid)}
                        className="hover:text-red-600 ml-1"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[480px] overflow-y-auto scrollbar-thin">
              {filteredStops.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">无匹配站点</div>
              ) : (
                filteredStops.map((s) => {
                  const closed = closedStopSet.has(s.id);
                  const checked = excludedStops.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      onMouseEnter={() => onStopHover(s.id)}
                      onMouseLeave={() => onHighlightChange(highlightedStops.filter((x) => x !== s.id), [])}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors border-b border-slate-50 last:border-0',
                        closed ? 'opacity-40 cursor-not-allowed bg-slate-50' : checked ? 'bg-orange-50' : 'hover:bg-slate-50',
                      )}
                    >
                      <input
                        type="checkbox"
                        disabled={closed}
                        checked={checked}
                        onChange={() => toggleExcludedStop(s.id)}
                        className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 disabled:cursor-not-allowed"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-800 truncate flex items-center gap-1.5">
                          {s.name}
                          {s.isTransfer && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-medium">
                              换乘
                            </span>
                          )}
                          {closed && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-medium">
                              施工中
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          {s.routes.map((rid) => getRouteById(rid)?.name).join(' / ')}
                        </div>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 ring-1 ring-slate-200 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-700">换乘距离阈值</label>
                  <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                    {threshold} m
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={3000}
                  step={50}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="custom-slider w-full"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>200m</span>
                  <span>1600m</span>
                  <span>3000m</span>
                </div>
                <div className="text-xs text-slate-500 mt-2 leading-relaxed">
                  超过阈值的换乘站之间会提示新增临时接驳线，用于疏散大流量客流。
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 ring-1 ring-slate-200 space-y-3">
              <div className="text-sm font-semibold text-slate-700">当前方案摘要</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-red-500 font-medium">施工路段</div>
                  <div className="text-2xl font-bold text-red-700 mt-1">{segments.length}</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-orange-500 font-medium">取消站点</div>
                  <div className="text-2xl font-bold text-orange-700 mt-1">{excludedStops.length}</div>
                </div>
                <div className="p-3 bg-sky-50 rounded-lg col-span-2">
                  <div className="text-sky-500 font-medium">总封闭站点</div>
                  <div className="text-2xl font-bold text-sky-700 mt-1">
                    {closedStopSet.size + excludedStops.filter((s) => !closedStopSet.has(s)).length}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-700 mb-2">备注</div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="记录本次分析的背景信息、特殊说明…"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
              />
            </div>

            <button
              onClick={() => setSaveDialog(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Save size={16} />
              保存当前方案到本地
            </button>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="space-y-3">
            <button
              onClick={() => setSaveDialog(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors"
            >
              <Save size={16} />
              新建方案快照
            </button>

            {loadingPlans ? (
              <div className="text-center py-10 text-slate-400 text-sm">加载中…</div>
            ) : planList.length === 0 ? (
              <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white/60">
                <FolderOpen size={36} className="mx-auto mb-2 opacity-40" />
                <div className="text-sm">暂无已保存方案</div>
              </div>
            ) : (
              <div className="space-y-2">
                {planList.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white rounded-xl p-3 ring-1 ring-slate-200 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          更新于 {new Date(p.updatedAt).toLocaleString('zh-CN', { hour12: false })}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
                            施工 {p.constructionSegments.length}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 ring-1 ring-orange-100">
                            取消 {p.excludedStops.length}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                            阈值 {p.threshold}m
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => doLoadPlan(p.id!)}
                          title="加载"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <FolderOpen size={16} />
                        </button>
                        <button
                          onClick={() => doDeletePlan(p.id!)}
                          title="删除"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {saveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">保存方案</h3>
              <button
                onClick={() => setSaveDialog(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">方案名称</label>
                <input
                  autoFocus
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="例如：南京路地铁施工绕行方案 V1"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">备注说明</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="可记录施工时间、联系人、注意事项…"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setSaveDialog(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                disabled={!planName.trim()}
                onClick={doSavePlan}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
