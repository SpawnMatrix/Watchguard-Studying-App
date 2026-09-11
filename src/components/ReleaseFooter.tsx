import { version } from '../../package.json';
export default function ReleaseFooter({compact=false}:{compact?:boolean}) {
 const commit=import.meta.env.VITE_APP_COMMIT_SHA;
 return <footer className={compact?'release-footer compact':'release-footer'}><span>Version {version}{commit&&commit!=='unknown'?` · ${commit.slice(0,7)}`:''}</span><span>Created by <strong>Julien Dumitrescu</strong></span>{!compact&&<span>Independent WatchGuard & Network+ study companion</span>}</footer>;
}
