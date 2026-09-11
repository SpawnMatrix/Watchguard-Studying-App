export type Track = 'local' | 'network-plus' | 'cloud';
export type Difficulty = 'foundation' | 'applied' | 'advanced';
export interface SourceReference { title: string; section?: string; url?: string }
export interface Variant { templateId: number; seed: number; version: number }
export interface QuestionMetadata {
  track?: Track;
  difficulty?: Difficulty;
  objective?: string;
  sources?: SourceReference[];
  firewareVersion?: string;
  variant?: Variant;
  networkDiagram?: { label: string; detail: string }[];
}
export const trackLabels: Record<Track, string> = {
  local: 'Local Firebox', 'network-plus': 'Network+', cloud: 'WatchGuard Cloud',
};
export const LOCAL_GUIDE = 'Network Security Essentials for Locally-Managed Fireboxes · March 2023';
export const localSource = (section: string): SourceReference => ({ title: LOCAL_GUIDE, section });
export const NETWORK_SOURCE: SourceReference = {
  title: 'CompTIA Network+ N10-009 objectives',
  url: 'https://comptiacdn.azureedge.net/webcontent/docs/default-source/exam-objectives/comptia-network-n10-009-exam-objectives-%284-0%29-%281%29.pdf',
};
export const CLOUD_SOURCE: SourceReference = {
  title: 'WatchGuard: locally-managed and cloud-managed feature comparison',
  url: 'https://www.watchguard.com/help/docs/help-center/en-US/Content/en-US/WG-Cloud/Devices/device_mgmt_cloud_vs_local.html',
};
