declare module 'virtual:questions/index' {
  const rows: { id: number; track: import('./types').Track; topic: import('../data/questions').Question['topic'] }[];
  export const qaIds: number[];
  export default rows;
}
declare module 'virtual:questions/local' { const rows: import('../data/questions').Question[]; export default rows; }
declare module 'virtual:questions/cloud' { const rows: import('../data/questions').Question[]; export default rows; }
declare module 'virtual:questions/network-plus' { const rows: import('../data/questions').Question[]; export default rows; }
