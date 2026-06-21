export interface BusStop {
  id: string;
  name: string;
  lng: number;
  lat: number;
  routes: string[];
  isTransfer: boolean;
  peakFlow?: number;
  transferCount?: number;
}

export interface BusRoute {
  id: string;
  name: string;
  color: string;
  stops: string[];
  detourStops?: string[];
  path: [number, number][];
  detourPath?: [number, number][];
  dailyRidership?: number;
}

export interface ConstructionSegment {
  id: string;
  affectedStops: string[];
  description: string;
  startDate?: string;
  endDate?: string;
}

export interface ImpactAnalysis {
  affectedRoutes: string[];
  affectedStops: BusStop[];
  affectedTransferStops: BusStop[];
  detourRoutes: Map<string, string[]>;
  totalAffectedStops: number;
  totalAffectedRoutes: number;
  peakPressure: PeakPressureItem[];
  shuttleSuggestions: ShuttleSuggestion[];
}

export interface PeakPressureItem {
  routeId: string;
  routeName: string;
  transferStopId: string;
  transferStopName: string;
  baseline: number;
  pressure: number;
  pressureLevel: 'low' | 'medium' | 'high' | 'critical';
  color: string;
}

export interface ShuttleSuggestion {
  fromStopId: string;
  fromStopName: string;
  toStopId: string;
  toStopName: string;
  distance: number;
  threshold: number;
  reason: string;
  routes: string[];
}

export interface UserPlan {
  id?: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  constructionSegments: ConstructionSegment[];
  excludedStops: string[];
  threshold: number;
  notes?: string;
}

export interface AnalysisState {
  constructionSegments: ConstructionSegment[];
  excludedStops: string[];
  transferThreshold: number;
  analysisResult: ImpactAnalysis | null;
}
