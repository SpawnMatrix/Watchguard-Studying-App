import { version } from '../../package.json';
import { buildTimestamp } from '../releaseInfo';
export default function ReleaseFooter({compact=false}:{compact?:boolean}) {
 const commit=import.meta.env.VITE_APP_COMMIT_SHA;
 const builtAt=buildTimestamp(import.meta.env.VITE_APP_BUILD_DATE);
 const formatted=builtAt?new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(builtAt)):null;
 return <footer className={compact?'release-footer compact':'release-footer'}>
   <span>Version {version}{commit&&commit!=='unknown'?` · ${commit.slice(0,7)}`:''}</span>
   <span>{builtAt?<>Last built <time dateTime={builtAt} title={`Build time: ${builtAt} (UTC)`}>{formatted}</time></>:import.meta.env.DEV?'Development preview':'Build time unavailable'}</span>
   <span>Created by <strong>Julien Dumitrescu</strong></span>
   {!compact&&<span>Independent WatchGuard & Network+ study companion</span>}
 </footer>;
}
