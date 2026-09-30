export default function SettingNote({label,text}:{label:string;text:string}) {
  return <details className="setting-note"><summary>{label}</summary><p>{text}</p></details>;
}
