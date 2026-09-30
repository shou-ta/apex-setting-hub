import { useState } from 'react';
import { checkForUpdates, type UpdateResult } from './updateCheck';

export const appVersion = '1.0.0';

type Props = {
  lang: 'ja' | 'en';
  setLang: (lang: 'ja' | 'en') => void;
  invoke: (command: string) => Promise<unknown>;
};

export default function SidebarFooter({lang,setLang,invoke}: Props) {
  const ja = lang === 'ja';
  const [checking,setChecking] = useState(false);
  const [result,setResult] = useState<UpdateResult | null>(null);
  const [linkError,setLinkError] = useState(false);
  const openPage = (command: string) => void invoke(command).catch(() => setLinkError(true));
  const check = async () => {
    setChecking(true);
    setResult(null);
    setResult(await checkForUpdates(appVersion));
    setChecking(false);
  };
  const resultText = result?.status === 'available'
    ? ja ? `新しいバージョン ${result.latest} が公開されています。` : `Version ${result.latest} is available.`
    : result?.status === 'current'
      ? ja ? `最新版です（GitHub: ${result.latest}）。` : `Up to date (GitHub: ${result.latest}).`
      : result?.status === 'no-release'
        ? ja ? '公開済みのリリースはまだありません。' : 'No public releases are available yet.'
        : result?.status === 'rate-limited'
          ? ja ? 'GitHubへのアクセス制限中です。しばらくしてから再確認してください。' : 'GitHub rate limit reached. Try again later.'
          : result?.status === 'invalid-release'
            ? ja ? `リリースタグ「${result.latest}」のバージョンを比較できません。` : `Cannot compare release tag “${result.latest}”.`
            : ja ? '更新を確認できませんでした。接続を確認して再試行してください。' : 'Could not check for updates. Check your connection and retry.';
  return <div className="sidebar-bottom">
    <div className="language"><span>{ja?'言語':'Language'}</span><button className={ja?'active':''} onClick={()=>setLang('ja')}>日本語</button><button className={!ja?'active':''} onClick={()=>setLang('en')}>EN</button></div>
    <div className="version-row">
      <span className="version">v{appVersion} • Windows</span>
      <button className="github-link" type="button" aria-label="GitHub" title="GitHub" onClick={()=>openPage('open_github')}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg></button>
      <button className="update-check" type="button" disabled={checking} title={ja?'GitHub Releasesでアップデートを確認':'Check GitHub Releases for updates'} onClick={()=>void check()}>{checking?(ja?'確認中…':'Checking…'):(ja?'更新確認':'Updates')}</button>
    </div>
    {(result||linkError)&&<div className="modal-cover" onMouseDown={event=>{if(event.target===event.currentTarget){setResult(null);setLinkError(false);}}}><div className="modal update-dialog" role="dialog" aria-modal="true" aria-label={ja?'アップデート確認':'Update check'}><div className="modal-head"><h2>{ja?'アップデート確認':'Update check'}</h2><button className="icon-button" aria-label={ja?'閉じる':'Close'} onClick={()=>{setResult(null);setLinkError(false);}}>×</button></div><p>{linkError?(ja?'ブラウザーを開けませんでした。':'Could not open the browser.'):resultText}</p><div className="modal-foot"><span>v{appVersion} • Windows</span><button className="ghost" onClick={()=>openPage('open_github_releases')}>{ja?'GitHub Releasesを開く':'Open GitHub Releases'}</button></div></div></div>}
  </div>;
}
