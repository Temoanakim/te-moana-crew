import React, { useEffect, useMemo, useState } from "react";
import "./index.css";

async function fileToDataURL(file){
  return await new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = e => reject(e);
    r.readAsDataURL(file);
  });
}

function TextInput({ label, value, onChange, type="text", disabled=false, placeholder }) {
  return (
    <label className="block text-sm">
      {label && <span className="text-gray-700">{label}</span>}
      <input disabled={disabled} type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-2 ${disabled?"bg-gray-100":""}`}/>
    </label>
  );
}
function Select({ label, value, onChange, options, disabled=false }) {
  const opts = options.map(o => typeof o === "string" ? {value:o, label:o} : o);
  return (
    <label className="block text-sm">
      {label && <span className="text-gray-700">{label}</span>}
      <select disabled={disabled} value={value} onChange={e=>onChange(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-2 bg-white ${disabled?"bg-gray-100":""}`}>
        {opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
function TextArea({ label, value, onChange, disabled=false, rows=4 }){
  return (
    <label className="block text-sm">
      {label && <span className="text-gray-700">{label}</span>}
      <textarea disabled={disabled} rows={rows} value={value} onChange={e=>onChange(e.target.value)} className={`mt-1 w-full rounded-xl border px-3 py-2 ${disabled?"bg-gray-100":""}`}/>
    </label>
  );
}
function Section({ title, right, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border p-4 md:p-6 mb-4">
      {(title||right) && <div className="flex items-center justify-between mb-3">
        {title && <h3 className="text-lg font-semibold">{title}</h3>}{right}
      </div>}
      {children}
    </div>
  );
}
function Button({ children, onClick, kind="primary", disabled=false }){
  const cls = kind==="primary" ? "bg-gray-900 text-white" : "border";
  return <button disabled={disabled} className={`rounded-xl px-4 py-2 ${cls} disabled:opacity-60`} onClick={onClick}>{children}</button>
}
function Chip({ children, tone="default" }){
  const map = {
    default:"bg-gray-100 text-gray-800 border-gray-200",
    green:"bg-green-50 text-green-700 border-green-200",
    red:"bg-red-50 text-red-700 border-red-200",
    blue:"bg-blue-50 text-blue-700 border-blue-200",
    amber:"bg-amber-50 text-amber-800 border-amber-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${map[tone]||map.default}`}>{children}</span>
}

const vessels = ["Mahina","Temu","Miss Kat","Teari'i"];
const vesselEngines = {
  "Mahina": ["Honda BF350 (Port)","Honda BF350 (Starboard)"],
  "Temu": ["Honda 150"],
  "Miss Kat": ["Honda 100"],
  "Teari'i": ["Yamaha 200"]
};

const TRIP_TYPES = [
  { value: "Fishing Charter", label: "Fishing Charter (5h)", defaultHours: 5 },
  { value: "Whale Watch", label: "Whale Watch (2h)", defaultHours: 2 },
  { value: "Lagoon Cruise", label: "Lagoon Cruise (3h)", defaultHours: 3 },
];

// local storage
const LS_KEY = "te-moana-v15-working";
function loadState(){ try{ const t = localStorage.getItem(LS_KEY); return t? JSON.parse(t):null; }catch{ return null; } }
function saveState(s){ try{ localStorage.setItem(LS_KEY, JSON.stringify(s)); }catch{} }

function TabButton({ id, active, label, onClick }){
  return <button className={`px-3 py-2 rounded-xl ${active?"bg-gray-900 text-white":"hover:bg-gray-100"}`} onClick={()=>onClick(id)}>{label}</button>
}

// Flexible time parsing
function normalizeTime(input){
  if(!input) return "";
  let s = String(input).trim().toLowerCase().replace(/\s+/g,"");
  const ampm = s.endsWith("am") || s.endsWith("pm") ? s.slice(-2) : "";
  if(ampm) s = s.slice(0,-2);
  s = s.replace(".",":");
  if(/^\d{3,4}$/.test(s)){
    const hh = s.length===3? s.slice(0,1): s.slice(0,2);
    const mm = s.slice(-2);
    s = `${hh}:${mm}`;
  }
  if(/^\d{1,2}:\d{2}$/.test(s)){
    let [hh,mm] = s.split(":").map(Number);
    if(ampm==="pm" && hh<12) hh+=12;
    if(ampm==="am" && hh===12) hh=0;
    hh = Math.max(0,Math.min(23,hh)); mm = Math.max(0,Math.min(59,mm));
    return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`;
  }
  if(/^\d{1,2}$/.test(s)){
    let hh = parseInt(s,10);
    if(ampm==="pm" && hh<12) hh+=12;
    if(ampm==="am" && hh===12) hh=0;
    return `${String(hh).padStart(2,"0")}:00`;
  }
  return input;
}

function Today({ onOpenTrip, trips, setTrips }){
  const today = new Date().toISOString().slice(0,10);
  const dateTomorrow = new Date(Date.now()+24*3600*1000).toISOString().slice(0,10);
  const [date,setDate] = useState(today);
  const [q,setQ] = useState("");
  const list = useMemo(()=> (trips||[]).filter(t=>t.date===date).filter(t => [t.product,t.vessel,t.captain].join(" ").toLowerCase().includes(q.toLowerCase())), [trips,date,q]);
  const scheduled = list.filter(t=>t.status==="Scheduled");
  const active = list.filter(t=>t.status==="Underway");
  const completed = list.filter(t=>t.status==="Completed");
  const upcomingTomorrow = useMemo(()=> (trips||[]).filter(t=>t.date===dateTomorrow && t.status==="Scheduled"), [trips,dateTomorrow]);

  const [adding,setAdding] = useState(false);
  const [draft,setDraft] = useState({ id:"", date, start:"07:00", plannedDurationHrs:5, product:"Fishing Charter", vessel:vessels[0], captain:"", deckhand:"", capacity:6, pax:0, status:"Scheduled" });
  const save = ()=>{
    const id = `T-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    setTrips(prev => [{...draft, id, date: draft.date, start: normalizeTime(draft.start) }, ...prev]);
    setAdding(false);
  };

  const setTemplate = (tpl)=>{
    if(tpl==="am") setDraft(d=>({...d, start:"07:00" }));
    if(tpl==="pm") setDraft(d=>({...d, start:"13:00" }));
  };
  const setType = (type)=>{
    const found = TRIP_TYPES.find(t=>t.value===type);
    setDraft(d=>({...d, product:type, plannedDurationHrs: found? found.defaultHours: d.plannedDurationHrs }));
  };

  const CompletedCard = ({ t })=>{
    const r = t.return||{};
    const chips = [];
    if(r.issues){
      chips.push(<Chip tone="red" key="i">Issues: {r.issues.type||"Reported"}</Chip>);
    }
    if(r.catch){
      const s = r.catch.species || "—"; const q = r.catch.quantity||"—"; const w = r.catch.weight? `${r.catch.weight}kg`:"—";
      chips.push(<Chip tone="green" key="c">Catch: {s} ×{q} {w}</Chip>);
    }
    const sc = (r.strikes||[]).length;
    if(sc>0){
      chips.push(<Chip tone="amber" key="s">Strikes: {sc}</Chip>);
    }
    if(chips.length===0) chips.push(<Chip key="n">No issues/fish/strikes</Chip>);
    return (
      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div><h4 className="font-semibold">{t.product}</h4><p className="text-sm text-gray-600">{t.date} • {t.start} → {r.timeReturn||"—"} • {t.vessel}</p></div>
          <span className="text-xs bg-gray-100 text-gray-800 border border-gray-200 rounded-full px-2 py-0.5">Completed</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{chips}</div>
        <div className="mt-3"><Button kind="secondary" onClick={()=>onOpenTrip(t)}>Open details…</Button></div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm"><span className="text-gray-700">Date</span><input type="date" className="ml-2 mt-1 rounded-xl border px-3 py-2" value={date} onChange={e=>setDate(e.target.value)}/></label>
        <input className="rounded-xl border px-3 py-2 w-80" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/>
        <Button kind="secondary" onClick={()=>{setAdding(a=>!a); setDraft(d=>({...d,date}))}}>{adding? "Cancel":" + Add trip"}</Button>
      </div>

      {adding && (
        <Section title="New trip" right={<div className="flex gap-2"><Button kind="secondary" onClick={()=>setTemplate('am')}>AM (7–12)</Button><Button kind="secondary" onClick={()=>setTemplate('pm')}>PM (1–6)</Button></div>}>
          <div className="grid md:grid-cols-3 gap-3">
            <TextInput label="Date" type="date" value={draft.date} onChange={v=>setDraft(s=>({...s,date:v}))}/>
            <TextInput label="Start time (e.g. 7, 700, 7:00, 1:15pm)" value={draft.start} onChange={v=>setDraft(s=>({...s,start:v}))}/>
            <Select label="Trip type" value={draft.product} onChange={setType} options={TRIP_TYPES}/>
            <TextInput label="Planned duration (hrs)" type="number" value={draft.plannedDurationHrs} onChange={v=>setDraft(s=>({...s,plannedDurationHrs:Number(v)||0}))}/>
            <Select label="Vessel" value={draft.vessel} onChange={v=>setDraft(s=>({...s,vessel:v}))} options={vessels}/>
            <TextInput label="Captain" value={draft.captain} onChange={v=>setDraft(s=>({...s,captain:v}))}/>
            <TextInput label="Deckhand" value={draft.deckhand} onChange={v=>setDraft(s=>({...s,deckhand:v}))}/>
            <TextInput label="Capacity" type="number" value={draft.capacity} onChange={v=>setDraft(s=>({...s,capacity:Number(v)||0}))}/>
            <TextInput label="Booked pax" type="number" value={draft.pax} onChange={v=>setDraft(s=>({...s,pax:Number(v)||0}))}/>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={save}>Save trip</Button>
            <Button kind="secondary" onClick={()=>setAdding(false)}>Cancel</Button>
          </div>
        </Section>
      )}

      <Section title="To depart (Scheduled)">
        {scheduled.length===0? <p className="text-sm text-gray-600">No scheduled trips for this date.</p> : (
          <div className="grid md:grid-cols-2 gap-4">
            {scheduled.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div><h4 className="font-semibold">{t.product}</h4><p className="text-sm text-gray-600">{t.date} • {t.start} • {t.vessel}</p></div>
                </div>
                <div className="mt-3 text-sm grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Captain</span><div className="font-medium">{t.captain||"—"}</div></div>
                  <div><span className="text-gray-500">Deckhand</span><div className="font-medium">{t.deckhand||"—"}</div></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button onClick={()=>onOpenTrip(t)}>Open trip</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <ActiveSection active={active} onOpenTrip={onOpenTrip}/>

      <Section title="Completed trips">
        {completed.length===0? <p className="text-sm text-gray-600">No completed trips yet.</p> : (
          <div className="grid md:grid-cols-2 gap-4">
            {completed.map(t => <CompletedCard key={t.id} t={t}/>)}
          </div>
        )}
      </Section>

      <Section title="Upcoming (Tomorrow)">
        {upcomingTomorrow.length===0? <p className="text-sm text-gray-600">No trips planned for tomorrow.</p> : (
          <div className="grid md:grid-cols-2 gap-4">
            {upcomingTomorrow.map(t => (
              <div key={t.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div><h4 className="font-semibold">{t.product}</h4><p className="text-sm text-gray-600">{t.date} • {t.start} • {t.vessel}</p></div>
                </div>
                <div className="mt-3 text-sm grid grid-cols-2 gap-2">
                  <div><span className="text-gray-500">Captain</span><div className="font-medium">{t.captain||"—"}</div></div>
                  <div><span className="text-gray-500">Deckhand</span><div className="font-medium">{t.deckhand||"—"}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function ActiveSection({ active, onOpenTrip }){
  const [, setTick] = useState(0);
  useEffect(()=>{ const id = setInterval(()=>setTick(x=>x+1), 30*1000); return ()=>clearInterval(id); }, []);

  function parseTimeToMinutes(t){
    if(!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
    const [hh,mm] = t.split(":").map(Number);
    return hh*60+mm;
  }

  return (
    <Section title="Active trips (Underway)">
      {active.length===0? <p className="text-sm text-gray-600">No active trips.</p> : (
        <div className="grid md:grid-cols-1 gap-4">
          {active.map(t => {
            const startM = parseTimeToMinutes(t.actualStart || t.start || "00:00") || 0;
            const now = new Date();
            const nowM = now.getHours()*60 + now.getMinutes();
            let elapsed = nowM - startM; if (elapsed<0) elapsed += 1440;
            const dueAtM = startM + (t.plannedDurationHrs||5)*60;
            let diff = dueAtM - nowM; if (diff<-1440) diff = -1440;
            const overdue = diff <= 0;
            const fmt = (m)=>{
              const abs = Math.abs(m);
              return `${Math.floor(abs/60)}h ${String(abs%60).padStart(2,"0")}m`;
            };
            return (
              <div key={t.id} className="bg-white rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div><h4 className="font-semibold">{t.product} — {t.vessel}</h4><p className="text-sm text-gray-600">Started {t.actualStart || t.start} • Duration {t.plannedDurationHrs||5}h</p></div>
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">Underway</span>
                </div>
                <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-xl border bg-gray-50"><div className="text-gray-600">Elapsed</div><div className="text-lg font-semibold">{fmt(elapsed)}</div></div>
                  <div className={`p-3 rounded-xl border ${overdue? "bg-red-50 border-red-200": "bg-gray-50"}`}>
                    <div className={`${overdue? "text-red-700":"text-gray-600"}`}>{overdue? "Overdue by":"Due in"}</div>
                    <div className={`text-lg font-semibold ${overdue? "text-red-700":""}`}>{fmt(diff)}</div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={()=>onOpenTrip(t)}>Return & complete</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function TripDetail({ trip, onBack, engines, setEngines, updateTrip }){
  const engineNames = vesselEngines[trip.vessel] || [];
  const [pre,setPre] = useState({
    fuelStart: trip?.pre?.fuelStart || "",
    timeDeparture: trip.actualStart || trip.start || "",
    paxCount: trip.pax||0,
    lifejackets:"OK", fireExt:"OK", firstAid:"OK", flares:"OK", epirb:"OK", navLights:"OK", vhf:"OK",
    engOil:"OK", fuelFilters:"Clean", underCover:"OK", battery:"OK", props:"OK", bilge:"Working",
    engineBefore: trip?.pre?.engineBefore || Object.fromEntries(engineNames.map((n,i)=>[String(i), ""])),
  });
  const abnormalKeys = {
    lifejackets: {bad:"Issue", label:"Lifejackets"},
    fireExt: {bad:"Issue", label:"Fire extinguisher"},
    firstAid: {bad:"Issue", label:"First aid kit"},
    flares: {bad:"Issue", label:"Flares"},
    epirb: {bad:"Issue", label:"EPIRB"},
    navLights: {bad:"Issue", label:"Navigation lights"},
    vhf: {bad:"Issue", label:"VHF radio"},
    engOil: {bad:"Low", label:"Engine oil level"},
    fuelFilters: {bad:"Dirty", label:"Fuel filters"},
    underCover: {bad:"Issue", label:"Under-cover check"},
    battery: {bad:"Corroded", label:"Battery terminals"},
    props: {bad:"Issue", label:"Propellers / external"},
    bilge: {bad:"Not working", label:"Bilge pumps"},
  };
  const [preIssueNotes, setPreIssueNotes] = useState({});
  const [preIssuePhotos, setPreIssuePhotos] = useState({});
  const addPrePhotos = async (k, files)=>{
    const arr = Array.from(files||[]);
    const datas = await Promise.all(arr.map(fileToDataURL));
    setPreIssuePhotos(prev => ({...prev, [k]: [...(prev[k]||[]), ...datas]}));
  };

  const [ret,setRet] = useState({ fuelEnd: trip?.return?.fuelEnd || "", timeReturn: trip?.return?.timeReturn || "", engineAfter: trip?.return?.engineAfter || Object.fromEntries(engineNames.map((n,i)=>[String(i), ""])) });

  const [anyIssues, setAnyIssues] = useState(trip?.return?.issues? "Yes":"No");
  const [issueType, setIssueType] = useState(trip?.return?.issues?.type || "Fishing equipment");
  const [issueNotes, setIssueNotes] = useState(trip?.return?.issues?.notes || "");
  const [issuePhotos, setIssuePhotos] = useState(trip?.return?.issues?.photos || []);
  const [anyFish, setAnyFish] = useState(trip?.return?.catch? "Yes":"No");
  const [species, setSpecies] = useState(trip?.return?.catch?.species || "Tuna");
  const [speciesOther, setSpeciesOther] = useState("");
  const [quantity, setQuantity] = useState(trip?.return?.catch?.quantity || "");
  const [weight, setWeight] = useState(trip?.return?.catch?.weight || "");
  const [fishPhotos, setFishPhotos] = useState(trip?.return?.catch?.photos || []);
  const [strikes, setStrikes] = useState(trip?.return?.strikes||[]);

  // GUIDED (mobile) mode
  const [guided, setGuided] = useState(false);
  const engineFields = engineNames.map((name,i)=>({key:`engineBefore.${i}`, label:`Engine before — ${name}`, type:"number"}));
  const guidedFields = [
    {key:"lifejackets", label:"Lifejackets", type:"select", opts:["OK","Issue"]},
    {key:"fireExt", label:"Fire extinguisher", type:"select", opts:["OK","Issue"]},
    {key:"firstAid", label:"First aid kit", type:"select", opts:["OK","Issue"]},
    {key:"flares", label:"Flares", type:"select", opts:["OK","Issue"]},
    {key:"epirb", label:"EPIRB", type:"select", opts:["OK","Issue"]},
    {key:"navLights", label:"Navigation lights", type:"select", opts:["OK","Issue"]},
    {key:"vhf", label:"VHF radio", type:"select", opts:["OK","Issue"]},
    {key:"engOil", label:"Engine oil level", type:"select", opts:["OK","Low"]},
    {key:"fuelFilters", label:"Fuel filters", type:"select", opts:["Clean","Dirty"]},
    {key:"underCover", label:"Under-cover check", type:"select", opts:["OK","Issue"]},
    {key:"battery", label:"Battery terminals", type:"select", opts:["OK","Corroded"]},
    {key:"props", label:"Propellers / external", type:"select", opts:["OK","Issue"]},
    {key:"bilge", label:"Bilge pumps", type:"select", opts:["Working","Not working"]},
    {key:"fuelStart", label:"Fuel at start (L)", type:"number"},
    {key:"timeDeparture", label:"Time of Departure (e.g. 7, 700, 7:00, 1:15pm)", type:"time"},
    {key:"paxCount", label:"Passenger count", type:"number"},
    ...engineFields,
  ];
  const [step, setStep] = useState(0);
  const totalSteps = guidedFields.length;

  const setValue = (key, val)=>{
    if(key.startsWith("engineBefore.")){
      const idx = key.split(".")[1];
      setPre(p=>({...p, engineBefore:{...p.engineBefore, [idx]: val}}));
    }else if(key==="fuelStart") setPre(p=>({...p, fuelStart: val}));
    else if(key==="timeDeparture") setPre(p=>({...p, timeDeparture: val}));
    else if(key==="paxCount") setPre(p=>({...p, paxCount: Number(val)||0}));
    else setPre(p=>({...p, [key]: val}));
  };
  const valueOf = (key)=> key.startsWith("engineBefore.") ? (pre.engineBefore[key.split(".")[1]]||"") : pre[key];
  const abnormalFor = (key)=>({lifejackets:"Issue", fireExt:"Issue", firstAid:"Issue", flares:"Issue", epirb:"Issue", navLights:"Issue", vhf:"Issue", engOil:"Low", fuelFilters:"Dirty", underCover:"Issue", battery:"Corroded", props:"Issue", bilge:"Not working"})[key];

  const GuidedPane = ()=>{
    const f = guidedFields[step];
    const current = valueOf(f.key);
    const isSelect = f.type==="select";
    const isAbnormal = isSelect && current === abnormalFor(f.key);
    return (
      <Section title={`Guided checklist — Step ${step+1} of ${totalSteps}`} right={<Button kind="secondary" onClick={()=>setGuided(false)}>Exit</Button>}>
        <div className="md:hidden block text-xs text-gray-500 mb-2">Mobile-friendly one-by-one entry</div>
        <div className="space-y-4">
          <div className="text-base font-medium">{f.label}</div>
          {isSelect ? (
            <div className="grid grid-cols-2 gap-3">
              {f.opts.map(opt => (
                <button key={opt} onClick={()=>setValue(f.key,opt)} className={`rounded-2xl px-4 py-6 border text-lg ${current===opt? "bg-gray-900 text-white":"bg-white hover:bg-gray-50"}`}>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              <TextInput type={f.type==="number"?"number":"text"} value={current||""} onChange={v=>setValue(f.key,v)} placeholder={f.type==="time"?"e.g. 7, 700, 7:00, 1:15pm":""}/>
            </div>
          )}

          {isAbnormal && (
            <div className="mt-2 p-3 rounded-xl border bg-yellow-50">
              <TextArea label="Explain the issue (or add a photo below)" value={preIssueNotes[f.key]||""} onChange={v=>setPreIssueNotes(prev=>({...prev,[f.key]:v}))}/>
              <label className="block text-sm mt-2">
                <span className="text-gray-700">Photos</span>
                <input type="file" multiple accept="image/*" className="mt-1" onChange={e=>addPrePhotos(f.key, e.target.files)}/>
              </label>
              { (preIssuePhotos[f.key]||[]).length>0 && <div className="grid grid-cols-4 gap-2 mt-2">{(preIssuePhotos[f.key]||[]).map((src,i)=>(<img key={i} src={src} alt="" className="w-full h-16 object-cover rounded-lg border"/>))}</div> }
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button kind="secondary" onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}>← Back</Button>
            <div className="text-xs text-gray-600">Step {step+1} / {totalSteps}</div>
            <Button onClick={()=>setStep(s=>Math.min(totalSteps-1,s+1))} disabled={step===totalSteps-1}>Next →</Button>
          </div>
        </div>
      </Section>
    );
  };

  const validatePre = ()=>{
    const missing = [];
    const reqSelects = ["lifejackets","fireExt","firstAid","flares","epirb","navLights","vhf","engOil","fuelFilters","underCover","battery","props","bilge"];
    reqSelects.forEach(k => { if(!pre[k]) missing.push(k); });
    if(!pre.fuelStart) missing.push("fuelStart");
    const normDep = normalizeTime(pre.timeDeparture);
    if(!normDep || !/^\d{2}:\d{2}$/.test(normDep)) missing.push("timeDeparture (e.g. 7, 700, 7:00, 1:15pm)");
    engineNames.forEach((name,i)=>{
      const v = pre.engineBefore[String(i)];
      if(v==="" || v==null || isNaN(parseFloat(v))) missing.push(`engineBefore: ${name}`);
    });
    Object.entries(abnormalKeys).forEach(([k,meta])=>{
      if(pre[k]===meta.bad){
        const notes = preIssueNotes[k];
        const photos = preIssuePhotos[k]||[];
        if(!notes && photos.length===0){
          missing.push(`${meta.label} — add explanation or photo`);
        }
      }
    });
    return {missing, normDep};
  };

  const departNow = ()=>{
    const {missing, normDep} = validatePre();
    if(missing.length){
      alert("Cannot depart. Please complete:\\n- " + missing.join("\\n- "));
      if(!guided){
        if(window.confirm("Open Guided checklist to finish step-by-step?")){
          setGuided(true);
        }
      }
      return;
    }
    const prePayload = { fuelStart: pre.fuelStart, engineBefore: pre.engineBefore, timeDeparture: normDep };
    updateTrip(trip.id, { status:"Underway", lockedPre:true, actualStart: normDep, pre: prePayload });
    alert("Pre‑departure saved. Trip is now Underway.");
    onBack();
  };

  const validateReturn = ()=>{
    const errs = [];
    const normRet = normalizeTime(ret.timeReturn);
    if(!normRet || !/^\d{2}:\d{2}$/.test(normRet)) errs.push("timeReturn (e.g. 12, 1200, 12:00, 12:15pm)");
    if(ret.fuelEnd==="" || isNaN(parseFloat(ret.fuelEnd))) errs.push("fuelEnd (number)");
    (vesselEngines[trip.vessel]||[]).forEach((name,i)=>{
      const v = ret.engineAfter[String(i)];
      if(v==="" || v==null || isNaN(parseFloat(v))) errs.push(`engineAfter: ${name}`);
    });
    return {errs, normRet};
  };

  const completionGuardFlowDetail = ()=>{
    if (anyIssues==="No"){
      const issues = window.confirm("Are there any issues to report? (Yes/No)");
      if (issues){ setAnyIssues("Yes"); alert("Please fill the Issues section before completing."); return {blocked:true}; }
    }
    if (anyFish==="No"){
      const fish = window.confirm("Did you catch any fish? (Yes/No)");
      if (fish){ setAnyFish("Yes"); alert("Please fill the Fish section before completing."); return {blocked:true}; }
    }
    if (anyFish==="No" && (strikes||[]).length===0){
      const strikesYes = window.confirm("Any strikes (hook-ups) to report? (Yes/No)");
      if (strikesYes){
        alert("Please add at least one Strike entry (time/species/notes).");
        return {blocked:true};
      }
    }
    return {blocked:false};
  };

  const saveReturn = ()=>{
    const flow = completionGuardFlowDetail();
    if(flow.blocked) return;
    const {errs, normRet} = validateReturn();
    if(errs.length){
      alert("Cannot complete. Please fill:\\n- " + errs.join("\\n- "));
      return;
    }
    setEngines(prev => {
      const next = {...prev};
      (vesselEngines[trip.vessel]||[]).forEach((name,i)=>{
        const key = `${trip.vessel}::${name}`;
        const after = parseFloat(ret.engineAfter[String(i)]||"");
        if(!isNaN(after)){
          next[key] = Math.max(after, next[key]||0);
        }
      });
      return next;
    });
    updateTrip(trip.id, {
      status:"Completed",
      return: {
        fuelEnd: ret.fuelEnd, timeReturn: normRet, engineAfter: ret.engineAfter,
        issues: anyIssues==="Yes" ? { type: issueType, notes: issueNotes, photos: issuePhotos } : null,
        catch: anyFish==="Yes" ? { species: species==="Other"? speciesOther: species, quantity, weight, photos: fishPhotos } : null,
        strikes
      }
    });
    alert("Return saved. Trip marked Completed.");
    onBack();
  };

  return (
    <div className="space-y-4">
      <Button kind="secondary" onClick={onBack}>← Back</Button>

      <Section title={`Trip — ${trip.product} (${trip.vessel})`} right={<div className="text-sm text-gray-600">Planned {trip.start} • {trip.plannedDurationHrs||5}h</div>}>
        <div className="grid md:grid-cols-4 gap-3">
          <TextInput label="Date" type="date" value={trip.date} onChange={v=>updateTrip(trip.id,{date:v})} disabled={!!trip.lockedPre}/>
          <TextInput label="Start time (e.g. 7, 700, 7:00, 1:15pm)" value={pre.timeDeparture} onChange={v=>setPre(p=>({...p,timeDeparture:v}))} disabled={!!trip.lockedPre}/>
          <Select label="Trip type" value={trip.product} onChange={v=>updateTrip(trip.id,{product:v})} options={[{value:"Fishing Charter",label:"Fishing Charter (5h)"},{value:"Whale Watch",label:"Whale Watch (2h)"},{value:"Lagoon Cruise",label:"Lagoon Cruise (3h)"}]} disabled={!!trip.lockedPre}/>
          <TextInput label="Planned duration (hrs)" type="number" value={trip.plannedDurationHrs||5} onChange={v=>updateTrip(trip.id,{plannedDurationHrs:Number(v)||0})} disabled={!!trip.lockedPre}/>
        </div>
        <div className="grid md:grid-cols-4 gap-3 mt-3">
          <Select label="Vessel" value={trip.vessel} onChange={v=>updateTrip(trip.id,{vessel:v})} options={vessels} disabled={!!trip.lockedPre}/>
          <TextInput label="Booked pax" type="number" value={pre.paxCount} onChange={v=>setPre(p=>({...p,paxCount:Number(v)||0}))} disabled={!!trip.lockedPre}/>
          <TextInput label="Captain" value={trip.captain||""} onChange={v=>updateTrip(trip.id,{captain:v})} disabled={!!trip.lockedPre}/>
          <TextInput label="Deckhand" value={trip.deckhand||""} onChange={v=>updateTrip(trip.id,{deckhand:v})} disabled={!!trip.lockedPre}/>
        </div>
      </Section>

      {!trip.lockedPre && (
        <Section title="Guided checklist (mobile friendly)">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">One item per screen with progress and big OK/Issue buttons.</div>
            <Button kind="secondary" onClick={()=>{setGuided(true); setStep(0);}}>Start guided</Button>
          </div>
        </Section>
      )}

      {guided ? <GuidedPane/> : (
        <>
          <Section title="Pre‑departure checks">
            <div className="grid md:grid-cols-3 gap-3">
              {Object.entries({
                lifejackets:["OK","Issue"],
                fireExt:["OK","Issue"],
                firstAid:["OK","Issue"],
                flares:["OK","Issue"],
                epirb:["OK","Issue"],
                navLights:["OK","Issue"],
                vhf:["OK","Issue"],
                engOil:["OK","Low"],
                fuelFilters:["Clean","Dirty"],
                underCover:["OK","Issue"],
                battery:["OK","Corroded"],
                props:["OK","Issue"],
                bilge:["Working","Not working"],
              }).map(([k,opts])=>{
                const labels = {
                  lifejackets:"Lifejackets",fireExt:"Fire extinguisher",firstAid:"First aid kit",flares:"Flares",epirb:"EPIRB",navLights:"Navigation lights",vhf:"VHF radio",
                  engOil:"Engine oil level", fuelFilters:"Fuel filters", underCover:"Under-cover check", battery:"Battery terminals", props:"Propellers / external", bilge:"Bilge pumps"
                };
                const badMap = {lifejackets:"Issue",fireExt:"Issue",firstAid:"Issue",flares:"Issue",epirb:"Issue",navLights:"Issue",vhf:"Issue",engOil:"Low",fuelFilters:"Dirty",underCover:"Issue",battery:"Corroded",props:"Issue",bilge:"Not working"};
                const isBad = pre[k]===badMap[k];
                return (
                  <div key={k}>
                    <Select label={labels[k]} value={pre[k]} onChange={v=>setPre(p=>({...p,[k]:v}))} options={opts}/>
                    {isBad && (
                      <div className="mt-2 p-2 rounded-xl border bg-yellow-50">
                        <TextArea label="Explain the issue (or add a photo below)" value={preIssueNotes[k]||""} onChange={v=>setPreIssueNotes(prev=>({...prev,[k]:v}))}/>
                        <label className="block text-sm mt-2">
                          <span className="text-gray-700">Photos</span>
                          <input type="file" multiple accept="image/*" className="mt-1" onChange={e=>addPrePhotos(k, e.target.files)}/>
                        </label>
                        {(preIssuePhotos[k]||[]).length>0 && <div className="grid grid-cols-4 gap-2 mt-2">{(preIssuePhotos[k]||[]).map((src,i)=>(<img key={i} src={src} alt="" className="w-full h-16 object-cover rounded-lg border"/>))}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="grid md:grid-cols-3 gap-3 mt-4">
              <TextInput label="Fuel at start (L)" value={pre.fuelStart} onChange={v=>setPre(p=>({...p,fuelStart:v}))}/>
              <TextInput label="Time of Departure (e.g. 7, 700, 7:00, 1:15pm)" value={pre.timeDeparture} onChange={v=>setPre(p=>({...p,timeDeparture:v}))}/>
              <TextInput label="Passenger count" type="number" value={pre.paxCount} onChange={v=>setPre(p=>({...p,paxCount:Number(v)||0}))}/>
            </div>

            <div className="mt-4">
              <div className="font-medium mb-1">Engine hours (before)</div>
              <div className="grid md:grid-cols-2 gap-3">
                {engineNames.map((name,i)=>(
                  <TextInput key={i} label={name} type="number" value={pre.engineBefore[String(i)]||""} onChange={v=>setPre(p=>({...p,engineBefore:{...p.engineBefore,[String(i)]:v}}))}/>
                ))}
              </div>
            </div>

            {!trip.lockedPre && <div className="flex justify-end mt-4"><Button onClick={departNow}>Depart now & lock pre‑departure</Button></div>}
            {trip.lockedPre && <p className="text-xs text-gray-500 mt-2">Pre‑departure is locked. Trip is Underway.</p>}
          </Section>
        </>
      )}

      <Section title="Return — details (all required except Issues/Fish/Strikes)">
        <div className="grid md:grid-cols-3 gap-3">
          <TextInput label="Fuel at end (L)" value={ret.fuelEnd} onChange={v=>setRet(r=>({...r,fuelEnd:v}))}/>
          <TextInput label="Time of Return (e.g. 12, 1200, 12:00, 12:15pm)" value={ret.timeReturn} onChange={v=>setRet(r=>({...r,timeReturn:v}))}/>
        </div>

        <div className="mt-4">
          <div className="font-medium mb-1">Engine hours (after)</div>
          <div className="grid md:grid-cols-2 gap-3">
            {engineNames.map((name,i)=>(
              <TextInput key={i} label={name} type="number" value={ret.engineAfter[String(i)]||""} onChange={v=>setRet(p=>({...p,engineAfter:{...p.engineAfter,[String(i)]:v}}))}/>
            ))}
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div>
            <div className="font-medium mb-2">Any issues?</div>
            <Select value={anyIssues} onChange={setAnyIssues} options={["No","Yes"]}/>
            {anyIssues==="Yes" && (
              <div className="mt-3 space-y-3">
                <Select label="Issue type" value={issueType} onChange={setIssueType} options={["Fishing equipment","Vessel issues","Other"]}/>
                <TextArea label="Describe the issue" value={issueNotes} onChange={setIssueNotes}/>
                <label className="block text-sm">
                  <span className="text-gray-700">Photos (optional)</span>
                  <input type="file" multiple accept="image/*" className="mt-1" onChange={e=>{const f=e.target.files; if(f){const arr=[...f]; Promise.all(arr.map(fileToDataURL)).then(datas=>setIssuePhotos(p=>[...p,...datas]));}}}/>
                </label>
                {issuePhotos.length>0 && <div className="grid grid-cols-4 gap-2 mt-2">{issuePhotos.map((src,i)=>(<img key={i} src={src} alt="" className="w-full h-20 object-cover rounded-lg border"/>))}</div>}
              </div>
            )}
          </div>

          <div>
            <div className="font-medium mb-2">Any fish caught?</div>
            <Select value={anyFish} onChange={setAnyFish} options={["No","Yes"]}/>
            {anyFish==="Yes" && (
              <div className="mt-3 space-y-3">
                <Select label="Species" value={species} onChange={setSpecies} options={["Tuna","Mahimahi","Marlin","Wahoo","Other"]}/>
                {species==="Other" && <TextInput label="Specify species" value={speciesOther} onChange={setSpeciesOther} placeholder="Type species name…"/>}
                <div className="grid grid-cols-2 gap-3">
                  <TextInput label="Quantity" type="number" value={quantity} onChange={setQuantity}/>
                  <TextInput label="Weight (kg)" type="number" value={weight} onChange={setWeight}/>
                </div>
                <label className="block text-sm">
                  <span className="text-gray-700">Photos (optional)</span>
                  <input type="file" multiple accept="image/*" className="mt-1" onChange={e=>{const f=e.target.files; if(f){const arr=[...f]; Promise.all(arr.map(fileToDataURL)).then(datas=>setFishPhotos(p=>[...p,...datas]));}}}/>
                </label>
                {fishPhotos.length>0 && <div className="grid grid-cols-4 gap-2 mt-2">{fishPhotos.map((src,i)=>(<img key={i} src={src} alt="" className="w-full h-20 object-cover rounded-lg border"/>))}</div>}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="font-medium mb-2">Strikes</div>
          <div className="text-xs text-gray-600 mb-2">Optional — record any hook-ups if no fish landed.</div>
          <StrikeEditor strikes={strikes} setStrikes={setStrikes}/>
        </div>

        <div className="flex justify-end mt-4"><Button onClick={saveReturn}>Save return & complete</Button></div>
      </Section>
    </div>
  );
}

function StrikeEditor({ strikes, setStrikes }){
  const add = ()=> setStrikes(prev => [{ id:`S-${Date.now()}`, at:"", species:"", notes:"" }, ...prev]);
  const upd = (id, patch)=> setStrikes(prev => prev.map(s => s.id===id? {...s, ...patch}: s));
  const del = (id)=> setStrikes(prev => prev.filter(s => s.id!==id));
  return (
    <div className="space-y-2">
      <Button kind="secondary" onClick={add}>+ Add strike</Button>
      <div className="overflow-auto mt-2">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-gray-600"><th>Time</th><th>Species</th><th>How lost / notes</th><th></th></tr></thead>
          <tbody>
            {strikes.length===0? <tr><td colSpan="4" className="p-2 text-gray-500">No strikes recorded.</td></tr> : strikes.map(s=>(
              <tr key={s.id} className="border-t">
                <td className="w-32"><TextInput value={s.at} onChange={v=>upd(s.id,{at:v})} placeholder="HH:MM"/></td>
                <td className="w-48"><TextInput value={s.species} onChange={v=>upd(s.id,{species:v})} placeholder="Tuna / Wahoo / ..."/></td>
                <td><TextInput value={s.notes} onChange={v=>upd(s.id,{notes:v})} placeholder="How did it come off?"/></td>
                <td className="whitespace-nowrap"><button className="text-xs underline" onClick={()=>del(s.id)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Maintenance({ engines }){
  const rows = Object.entries(engines).map(([key,hours])=>{
    const [vessel, engine] = key.split("::");
    return { key, vessel, engine, currentHours: hours||0 };
  });
  return (
    <Section title="Engine hours (synced from Return)">
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-gray-600"><th>Vessel</th><th>Engine</th><th>Current hours</th></tr></thead>
          <tbody>{rows.length===0? <tr><td colSpan="3" className="text-gray-500 p-2">No engine data yet. Save a trip Return to populate.</td></tr> : rows.map(r=>(
            <tr key={r.key} className="border-t"><td>{r.vessel}</td><td>{r.engine}</td><td>{r.currentHours}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </Section>
  );
}

function Equipment({ rodReels, setRodReels, lures, setLures }){
  const rrStatuses = ["Serviceable","Needs repair","Out of service"];
  const locations = ["Office", ...vessels];
  const addRR = ()=> setRodReels(prev => [{ id:`RR-${Date.now()}`, rodSerial:"", reelSerial:"", brand:"", model:"", lineClass:"", status:"Serviceable", assignedTo:"Office", lastServiced:"", notes:"" }, ...prev]);
  const updateRR = (id, patch)=> setRodReels(prev => prev.map(r => r.id===id? {...r, ...patch} : r));
  const removeRR = (id)=> setRodReels(prev => prev.filter(r => r.id!==id));

  const addLureStock = (brand="Pakula", colour="Lumo", size="Medium", qty=1)=>{
    const n = Math.max(1, parseInt(qty,10)||1); const ts = Date.now();
    const items = Array.from({length:n}).map((_,i)=> ({ id:`L-${ts+i}`, brand, colour, size, status:"Stock", assignedTo:"Office", usageCount:0, lastUsed:"" }));
    setLures(prev => [...items, ...prev]);
  };
  const updateLure = (id, patch)=> setLures(prev => prev.map(l => l.id===id? {...l, ...patch} : l));

  return (
    <div className="space-y-6">
      <Section title="Rod & Reel Sets" right={<Button kind="secondary" onClick={addRR}>+ Add set</Button>}>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-gray-600"><th>ID</th><th>Rod SN</th><th>Reel SN</th><th>Brand</th><th>Model</th><th>Line</th><th>Status</th><th>Assigned</th><th>Last serviced</th><th>Notes</th><th></th></tr></thead>
            <tbody>
              {rodReels.length===0? <tr><td colSpan="11" className="p-2 text-gray-500">No sets yet.</td></tr> : rodReels.map(rr => (
                <tr key={rr.id} className="border-t">
                  <td className="whitespace-nowrap">{rr.id}</td>
                  <td><TextInput value={rr.rodSerial} onChange={v=>updateRR(rr.id,{rodSerial:v})}/></td>
                  <td><TextInput value={rr.reelSerial} onChange={v=>updateRR(rr.id,{reelSerial:v})}/></td>
                  <td><TextInput value={rr.brand} onChange={v=>updateRR(rr.id,{brand:v})}/></td>
                  <td><TextInput value={rr.model} onChange={v=>updateRR(rr.id,{model:v})}/></td>
                  <td><TextInput value={rr.lineClass} onChange={v=>updateRR(rr.id,{lineClass:v})}/></td>
                  <td><Select value={rr.status} onChange={v=>updateRR(rr.id,{status:v})} options={rrStatuses}/></td>
                  <td><Select value={rr.assignedTo} onChange={v=>updateRR(rr.id,{assignedTo:v})} options={locations}/></td>
                  <td><TextInput value={rr.lastServiced} onChange={v=>updateRR(rr.id,{lastServiced:v})}/></td>
                  <td><TextInput value={rr.notes} onChange={v=>updateRR(rr.id,{notes:v})}/></td>
                  <td className="whitespace-nowrap"><button className="text-xs underline" onClick={()=>removeRR(rr.id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Lures (stock & in use)" right={<Button kind="secondary" onClick={()=>addLureStock()}>+ Add to stock</Button>}>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="text-left text-gray-600"><th>ID</th><th>Brand</th><th>Colour</th><th>Size</th><th>Status</th><th>Assigned</th><th>Usage</th><th>Last used</th></tr></thead>
            <tbody>
              {lures.length===0? <tr><td colSpan="8" className="p-2 text-gray-500">No lures yet.</td></tr> : lures.map(l => (
                <tr key={l.id} className="border-t">
                  <td className="whitespace-nowrap">{l.id}</td>
                  <td><TextInput value={l.brand} onChange={v=>updateLure(l.id,{brand:v})}/></td>
                  <td><TextInput value={l.colour} onChange={v=>updateLure(l.id,{colour:v})}/></td>
                  <td><TextInput value={l.size||""} onChange={v=>updateLure(l.id,{size:v})}/></td>
                  <td><Select value={l.status} onChange={v=>updateLure(l.id,{status:v})} options={["In use","Stock","Damaged","Lost"]}/></td>
                  <td><Select value={l.assignedTo} onChange={v=>updateLure(l.id,{assignedTo:v})} options={["Office","Mahina","Temu","Miss Kat","Teari'i"]}/></td>
                  <td>{l.usageCount||0}</td>
                  <td>{l.lastUsed||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

export default function App(){
  const today = new Date().toISOString().slice(0,10);
  const seedTrips = [
    { id:"T-AM", date: today, start:"07:00", plannedDurationHrs:5, product:"Fishing Charter", vessel:"Mahina", captain:"Katoa", deckhand:"Toru", capacity:6, pax:5, status:"Scheduled" },
    { id:"T-PM", date: today, start:"13:00", plannedDurationHrs:5, product:"Fishing Charter", vessel:"Temu", captain:"Moana", deckhand:"Hemi", capacity:6, pax:4, status:"Scheduled" },
  ];
  const state0 = loadState();
  const [trips,setTrips] = useState(state0?.trips || seedTrips);
  const [engines,setEngines] = useState(state0?.engines || {});
  const [rodReels,setRodReels] = useState(state0?.rodReels || []);
  const [lures,setLures] = useState(state0?.lures || []);
  useEffect(()=>{ saveState({ trips, engines, rodReels, lures }); }, [trips, engines, rodReels, lures]);

  const [tab,setTab] = useState("dashboard");
  const [openTrip,setOpenTrip] = useState(null);
  const updateTrip = (id, patch)=> setTrips(prev => prev.map(t => t.id===id? {...t, ...patch} : t));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-semibold">Te Moana Crew</div>
          <nav className="flex gap-1">
            <TabButton id="dashboard" label="Dashboard" active={tab==="dashboard"} onClick={setTab}/>
            <TabButton id="trips" label="Trips" active={tab==="trips"} onClick={setTab}/>
            <TabButton id="maintenance" label="Maintenance" active={tab==="maintenance"} onClick={setTab}/>
            <TabButton id="equipment" label="Equipment" active={tab==="equipment"} onClick={setTab}/>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {tab==="dashboard" && !openTrip && <Today onOpenTrip={setOpenTrip} trips={trips} setTrips={setTrips}/>}
        {tab==="dashboard" && openTrip && <TripDetail trip={openTrip} onBack={()=>setOpenTrip(null)} engines={engines} setEngines={setEngines} updateTrip={updateTrip}/>}
        {tab==="maintenance" && <Maintenance engines={engines}/>}
        {tab==="equipment" && <Equipment rodReels={rodReels} setRodReels={setRodReels} lures={lures} setLures={setLures}/>}
      </main>
    </div>
  );
}
