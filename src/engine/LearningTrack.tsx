import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Track } from './types';
import { useAccount } from '../account/AccountGate';

export const learningTrackLabels: Record<Track,string> = {
  'network-plus': 'Network+', local: 'WatchGuard — Locally-Managed Fireboxes', cloud: 'WatchGuard — Cloud-Managed Fireboxes',
};
export function parseTrack(value: unknown): Track { return value === 'network-plus' || value === 'cloud' ? value : 'local'; }
const Context=createContext<{track:Track;setTrack:(track:Track)=>void}>({track:'local',setTrack:()=>{}});
export const useLearningTrack=()=>useContext(Context);
export function LearningTrackProvider({children}:{children:ReactNode}) {
  const {username}=useAccount();
  return <TrackPreference key={username || 'device'} owner={username || 'device'}>{children}</TrackPreference>;
}
function TrackPreference({owner,children}:{owner:string;children:ReactNode;key?:string}) {
  const key=`watchguard-learning-track:${owner}`;
  const [track,update]=useState<Track>(()=>{try{return parseTrack(localStorage.getItem(key));}catch{return 'local';}});
  const setTrack=(next:Track)=>{update(next);try{localStorage.setItem(key,next);}catch{/* Preference remains usable when storage is unavailable. */}};
  return <Context.Provider value={{track,setTrack}}>{children}</Context.Provider>;
}
export function LearningTrackSwitcher() {
  const {track,setTrack}=useLearningTrack();
  return <label className="track-switcher"><span className="eyebrow">LEARNING TRACK</span><select aria-label="Learning track" value={track} onChange={e=>setTrack(e.target.value as Track)}>{Object.entries(learningTrackLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}<option disabled value="soon">More coming soon</option></select></label>;
}
