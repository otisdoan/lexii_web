import { create } from 'zustand';
import type { TargetScore, SelfAssessedLevel, DurationDays } from './types';

const ROADMAP_STORAGE_KEY = 'lexii_roadmap_state';

export interface RoadmapState {
  targetScore: TargetScore | null;
  selfAssessedLevel: SelfAssessedLevel | null;
  placementScore: number | null;
  placementAttemptId: string | null;
  durationDays: DurationDays | null;
  userRoadmapId: string | null;
  // Actions
  setTargetScore: (v: TargetScore | null) => void;
  setSelfAssessedLevel: (v: SelfAssessedLevel | null) => void;
  setPlacementScore: (v: number | null) => void;
  setPlacementAttemptId: (v: string | null) => void;
  setDurationDays: (v: DurationDays | null) => void;
  setUserRoadmapId: (v: string | null) => void;
  setSetup: (target: TargetScore, level: SelfAssessedLevel) => void;
  setPlacementResult: (score: number, attemptId: string | null) => void;
  setRoadmapCreated: (userRoadmapId: string) => void;
  clearRoadmap: () => void;
  getGap: () => number | null;
  isDurationDisabled: (days: DurationDays) => boolean;
}

type RoadmapPersisted = Pick<
  RoadmapState,
  'targetScore' | 'selfAssessedLevel' | 'placementScore' | 'placementAttemptId' | 'durationDays' | 'userRoadmapId'
>;

const defaultState: RoadmapPersisted = {
  targetScore: null,
  selfAssessedLevel: null,
  placementScore: null,
  placementAttemptId: null,
  durationDays: null,
  userRoadmapId: null,
};

function loadPersisted(): Partial<RoadmapState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ROADMAP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      targetScore: parsed.targetScore as RoadmapState['targetScore'],
      selfAssessedLevel: parsed.selfAssessedLevel as RoadmapState['selfAssessedLevel'],
      placementScore: typeof parsed.placementScore === 'number' ? parsed.placementScore : null,
      placementAttemptId: typeof parsed.placementAttemptId === 'string' ? parsed.placementAttemptId : null,
      durationDays: parsed.durationDays as RoadmapState['durationDays'],
      userRoadmapId: typeof parsed.userRoadmapId === 'string' ? parsed.userRoadmapId : null,
    };
  } catch {
    return {};
  }
}

function persist(state: RoadmapPersisted) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    //
  }
}

export const useRoadmapStore = create<RoadmapState>((set, get) => ({
  ...defaultState,
  ...loadPersisted(),

  setTargetScore: (v) => set((s) => {
    const next = { ...s, targetScore: v };
    persist(next);
    return next;
  }),

  setSelfAssessedLevel: (v) => set((s) => {
    const next = { ...s, selfAssessedLevel: v };
    persist(next);
    return next;
  }),

  setPlacementScore: (v) => set((s) => {
    const next = { ...s, placementScore: v };
    persist(next);
    return next;
  }),

  setPlacementAttemptId: (v) => set((s) => {
    const next = { ...s, placementAttemptId: v };
    persist(next);
    return next;
  }),

  setDurationDays: (v) => set((s) => {
    const next = { ...s, durationDays: v };
    persist(next);
    return next;
  }),

  setUserRoadmapId: (v) => set((s) => {
    const next = { ...s, userRoadmapId: v };
    persist(next);
    return next;
  }),

  setSetup: (target, level) => set((s) => {
    const next = { ...s, targetScore: target, selfAssessedLevel: level };
    persist(next);
    return next;
  }),

  setPlacementResult: (score, attemptId) => set((s) => {
    const next = { ...s, placementScore: score, placementAttemptId: attemptId };
    persist(next);
    return next;
  }),

  setRoadmapCreated: (userRoadmapId) => set((s) => {
    const next = { ...s, userRoadmapId };
    persist(next);
    return next;
  }),

  clearRoadmap: () => set(() => {
    const next = { ...defaultState };
    persist(next);
    return next;
  }),

  getGap: () => {
    const { targetScore, placementScore } = get();
    if (targetScore == null || placementScore == null) return null;
    return targetScore - placementScore;
  },

  isDurationDisabled: (days: DurationDays) => {
    const gap = get().getGap();
    if (gap == null || gap <= 400) return false;
    return days === 30 || days === 60;
  },
}));
