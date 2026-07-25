import { create } from 'zustand';

export interface DomainMastery {
  domainId: string;
  name: string;
  certification: 'CompTIA Net+' | 'WatchGuard NSE';
  masteryPercentage: number;
}

export interface ActivityDay {
  date: string; // YYYY-MM-DD
  count: number; // e.g., questions answered or study sessions completed
}

interface StudyState {
  // Streaks and XP
  currentStreak: number;
  longestStreak: number;
  totalXP: number;

  // Domain Mastery
  domainMastery: DomainMastery[];

  // Activity Heatmap Data
  activityHistory: ActivityDay[];

  // Actions
  incrementStreak: () => void;
  resetStreak: () => void;
  addXP: (amount: number) => void;
  updateDomainMastery: (domainId: string, newPercentage: number) => void;
  logActivity: (date: string, count: number) => void;
}

export const useStudyStore = create<StudyState>((set) => ({
  currentStreak: 0,
  longestStreak: 0,
  totalXP: 0,

  domainMastery: [
    { domainId: 'net-concepts', name: 'Networking Concepts', certification: 'CompTIA Net+', masteryPercentage: 0 },
    { domainId: 'net-implement', name: 'Network Implementation', certification: 'CompTIA Net+', masteryPercentage: 0 },
    { domainId: 'net-ops', name: 'Network Operations', certification: 'CompTIA Net+', masteryPercentage: 0 },
    { domainId: 'net-sec', name: 'Network Security', certification: 'CompTIA Net+', masteryPercentage: 0 },
    { domainId: 'net-troubleshoot', name: 'Network Troubleshooting', certification: 'CompTIA Net+', masteryPercentage: 0 },
    { domainId: 'wg-fireboxes', name: 'Locally Managed Fireboxes', certification: 'WatchGuard NSE', masteryPercentage: 0 },
    { domainId: 'wg-proxies', name: 'Proxies/Subscription Services', certification: 'WatchGuard NSE', masteryPercentage: 0 },
    { domainId: 'wg-nat', name: 'NAT (SNAT, 1-to-1)', certification: 'WatchGuard NSE', masteryPercentage: 0 },
    { domainId: 'wg-vpns', name: 'VPNs (Mobile & BOVPN)', certification: 'WatchGuard NSE', masteryPercentage: 0 },
  ],

  activityHistory: [],

  incrementStreak: () => set((state) => {
    const newStreak = state.currentStreak + 1;
    return {
      currentStreak: newStreak,
      longestStreak: Math.max(state.longestStreak, newStreak),
    };
  }),

  resetStreak: () => set({ currentStreak: 0 }),

  addXP: (amount: number) => set((state) => ({ totalXP: state.totalXP + amount })),

  updateDomainMastery: (domainId: string, newPercentage: number) => set((state) => ({
    domainMastery: state.domainMastery.map((domain) =>
      domain.domainId === domainId
        ? { ...domain, masteryPercentage: newPercentage }
        : domain
    ),
  })),

  logActivity: (date: string, count: number) => set((state) => {
    const existingIndex = state.activityHistory.findIndex(a => a.date === date);
    if (existingIndex >= 0) {
      const newHistory = [...state.activityHistory];
      newHistory[existingIndex] = { ...newHistory[existingIndex], count: newHistory[existingIndex].count + count };
      return { activityHistory: newHistory };
    } else {
      return { activityHistory: [...state.activityHistory, { date, count }] };
    }
  }),
}));
