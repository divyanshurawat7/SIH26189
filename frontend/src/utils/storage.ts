export interface RecentItem {
  id: string;
  type: string;
  name: string;
  timestamp: number;
}

const STORAGE_KEY = 'sih_recent_searches';

export const getRecentInvestigations = (): RecentItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveRecentInvestigation = (id: string, type: string, name?: string): RecentItem[] => {
  if (!id) return getRecentInvestigations();

  try {
    const current = getRecentInvestigations();
    const displayName = name || id;
    const newItem: RecentItem = { id, type, name: displayName, timestamp: Date.now() };
    
    // Filter out duplicate ID if it already exists
    const filtered = current.filter(item => item.id !== id);
    
    // Insert new/updated item at top, limit to 5
    const updated = [newItem, ...filtered].slice(0, 5);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
};
