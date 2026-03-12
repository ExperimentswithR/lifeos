import { useState, useEffect, useRef, useCallback } from "react";
import { PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { createClient } from "@supabase/supabase-js";
 
/* ─── Supabase Client ─── */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://kvywvqqmcftdtlnsfqae.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2eXd2cXFtY2Z0ZHRsbnNmcWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQwODUsImV4cCI6MjA4ODgzMDA4NX0.8kv-x1lvAPOTKTl_VI3NCB_X9ra3MXtb29VlxRVuj8U";
const supabase = createClient(supabaseUrl, supabaseKey);
 
/* ─── Auth Hook ─── */
function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
 
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);
 
  const loadProfile = async (uid) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).single();
    setProfile(data);
    setLoading(false);
  };
 
  const signInGoogle = () => supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin }
  });
 
  const signInEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password });
 
  const signUpEmail = (email, password, name) =>
    supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
 
  const signOut = () => supabase.auth.signOut();
 
  return { user, profile, loading, signInGoogle, signInEmail, signUpEmail, signOut };
}
 
/* ─── Data Persistence Hook ─── */
function useSupabaseData(user, initialData) {
  const [data, setData] = useState(initialData);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef(null);
 
  // Load on login
  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    (async () => {
      const { data: row } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", user.id)
        .single();
      if (row?.data && Object.keys(row.data).length > 0) {
        setData(row.data);
      }
      setLoaded(true);
    })();
  }, [user]);
 
  // Auto-save on change (debounced 2s)
  useEffect(() => {
    if (!user || !loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("user_data").upsert({
        user_id: user.id,
        data: data
      }, { onConflict: "user_id" });
    }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [data, user, loaded]);
 
  return [data, setData, loaded];
}
 
/* ─── Login Screen ─── */
function LoginScreen({ auth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
 
  const handleSubmit = async () => {
    setErr(""); setMsg("");
    if (mode === "login") {
      const { error } = await auth.signInEmail(email, pass);
      if (error) setErr(error.message);
    } else {
      const { error } = await auth.signUpEmail(email, pass, name);
      if (error) setErr(error.message);
      else setMsg("Check your email to confirm your account!");
    }
  };
 
  return (
    <div style={{minHeight:"100vh",background:"#f4f2f0",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit','Nunito',sans-serif",padding:20}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <div style={{background:"#fff",borderRadius:24,padding:"40px 36px",maxWidth:400,width:"100%",boxShadow:"0 8px 40px rgba(0,0,0,.06)"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:56,height:56,borderRadius:16,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff",fontWeight:800,marginBottom:12}}>{"\u2713"}</div>
          <h1 style={{fontSize:28,fontWeight:800,margin:"0 0 4px",color:"#1f1f23"}}>LifeOS</h1>
          <p style={{color:"#a1a1aa",margin:0,fontSize:14}}>Your complete life dashboard</p>
        </div>
 
        {/* Google */}
        <button onClick={auth.signInGoogle} style={{width:"100%",padding:"12px 0",borderRadius:12,border:"1px solid #e5e5e5",background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:14,fontWeight:600,color:"#3f3f46",marginBottom:16,transition:"all .2s",fontFamily:"'Outfit',sans-serif"}}>
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z" fill="#4285F4"/><path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853"/><path d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z" fill="#FBBC05"/><path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
 
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
          <div style={{flex:1,height:1,background:"#e5e5e5"}}/><span style={{fontSize:12,color:"#a1a1aa",fontWeight:500}}>OR</span><div style={{flex:1,height:1,background:"#e5e5e5"}}/>
        </div>
 
        {/* Email form */}
        <div style={{display:"grid",gap:10,marginBottom:16}}>
          {mode === "signup" && <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={{padding:"12px 16px",borderRadius:12,border:"1px solid #e5e5e5",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif"}}/>}
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" style={{padding:"12px 16px",borderRadius:12,border:"1px solid #e5e5e5",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif"}}/>
          <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" type="password" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} style={{padding:"12px 16px",borderRadius:12,border:"1px solid #e5e5e5",fontSize:14,outline:"none",fontFamily:"'Outfit',sans-serif"}}/>
        </div>
 
        {err && <div style={{padding:"10px 14px",borderRadius:10,background:"#fef2f2",color:"#dc2626",fontSize:13,marginBottom:12}}>{err}</div>}
        {msg && <div style={{padding:"10px 14px",borderRadius:10,background:"#f0fdf4",color:"#16a34a",fontSize:13,marginBottom:12}}>{msg}</div>}
 
        <button onClick={handleSubmit} style={{width:"100%",padding:"12px 0",borderRadius:12,border:"none",background:"#4f6cf0",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginBottom:14,fontFamily:"'Outfit',sans-serif"}}>
          {mode === "login" ? "Sign In" : "Create Account"}
        </button>
 
        <div style={{textAlign:"center",fontSize:13,color:"#a1a1aa"}}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => {setMode(mode === "login" ? "signup" : "login"); setErr(""); setMsg("");}} style={{color:"#6366f1",cursor:"pointer",fontWeight:600}}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}
 
/* ─── Loading Screen ─── */
function LoadingScreen() {
  return (
    <div style={{minHeight:"100vh",background:"#f4f2f0",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Outfit',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:20,color:"#fff",fontWeight:800,marginBottom:12,animation:"pulse 1.5s infinite"}}>{"\u2713"}</div>
        <div style={{fontSize:16,fontWeight:600,color:"#3f3f46"}}>Loading LifeOS...</div>
        <style>{`@keyframes pulse { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.7; transform:scale(.95) } }`}</style>
      </div>
    </div>
  );
}
 
/* ═══ DATA ═══ */
const D0 = {
  inv:[{id:1,n:"Nifty 50 Index",ty:"Mutual Fund",v:245000,i:200000,r:22.5},{id:2,n:"HDFC Bank",ty:"Stock",v:85000,i:72000,r:18.1},{id:3,n:"PPF Account",ty:"Fixed Income",v:340000,i:320000,r:6.3},{id:4,n:"Gold ETF",ty:"Commodity",v:60000,i:50000,r:20.0}],
  cash:125000,
  debt:[{id:1,n:"Education Loan",tot:500000,rem:320000,emi:12000,rate:8.5,due:"15th"},{id:2,n:"Personal Loan",tot:150000,rem:85000,emi:5500,rate:12,due:"5th"}],
  cc:[{id:1,n:"HDFC Regalia",lim:200000,used:45000,due:"2026-04-10",min:2250},{id:2,n:"SBI SimplyCLICK",lim:100000,used:22000,due:"2026-04-15",min:1100}],
  bills:[{id:1,n:"Rent",a:18000,due:"Apr 1",cat:"Housing",ap:true},{id:2,n:"Electricity",a:2200,due:"Apr 7",cat:"Utility",ap:false},{id:3,n:"Internet",a:999,due:"Apr 12",cat:"Utility",ap:true},{id:4,n:"Phone",a:599,due:"Apr 18",cat:"Utility",ap:true},{id:5,n:"Gym",a:2500,due:"Apr 5",cat:"Health",ap:false}],
  inc:[{id:1,s:"Salary",a:85000,d:"Apr 1",rec:true},{id:2,s:"Freelance",a:15000,d:"Apr 15",rec:false}],
  exp:[{id:1,n:"Groceries",a:3200,d:"Mar 1",l:"Food"},{id:2,n:"Dinner out",a:2400,d:"Mar 2",l:"Food",sp:true,splits:[{name:"Rahul",pct:33.3,amt:800},{name:"Priya",pct:33.3,amt:800}],paid:"me"},{id:3,n:"Uber",a:1800,d:"Mar 3",l:"Transport"},{id:4,n:"Netflix",a:649,d:"Mar 4",l:"Entertainment",sp:true,splits:[{name:"Amit",pct:50,amt:325}],paid:"me"},{id:5,n:"Books",a:1200,d:"Mar 5",l:"Education"},{id:6,n:"Zara shirt",a:1999,d:"Mar 6",l:"Shopping"},{id:7,n:"Medicine",a:450,d:"Mar 7",l:"Health"},{id:8,n:"Trip fuel",a:2800,d:"Mar 8",l:"Travel",sp:true,splits:[{name:"Rahul",pct:33.3,amt:933},{name:"Amit",pct:33.3,amt:933}],paid:"me"},{id:9,n:"Movie tickets",a:900,d:"Mar 9",l:"Entertainment",sp:true,splits:[{name:"Me",pct:50,amt:450}],paid:"Priya"}],
  labels:["Food","Transport","Entertainment","Education","Shopping","Health","Housing","Utility","Travel","Other"],
  goals:[{id:1,n:"Emergency Fund",tgt:500000,cur:310000,dl:"Dec 26",plan:"Save 25k/mo",notes:"On track",cat:"Financial",streak:12},{id:2,n:"System Design",tgt:100,cur:45,dl:"Jun 26",plan:"2 ch/week",notes:"Distributed sys done",cat:"Career",u:"%",streak:5},{id:3,n:"Half Marathon",tgt:21,cur:12,dl:"Sep 26",plan:"Run 4x/week",notes:"12km best",cat:"Health",u:"km",streak:8},{id:4,n:"Read 24 Books",tgt:24,cur:5,dl:"Dec 26",plan:"30min/day",notes:"Atomic Habits",cat:"Personal",streak:3}],
  proj:[{id:1,n:"API Migration",st:"In Progress",pri:"High",dl:"Apr 15",prog:65,tasks:[{id:1,t:"Design arch",d:true},{id:2,t:"Auth middleware",d:true},{id:3,t:"Migrate endpoints",d:false},{id:4,t:"Load test",d:false}],notes:"Blocked on DevOps"},{id:2,n:"Analytics Dashboard",st:"Planning",pri:"Medium",dl:"May 01",prog:25,tasks:[{id:1,t:"Requirements",d:true},{id:2,t:"UI mockups",d:false},{id:3,t:"Backend API",d:false}],notes:"Waiting PM"},{id:3,n:"Perf Sprint",st:"Completed",pri:"High",dl:"Mar 01",prog:100,tasks:[{id:1,t:"Profile",d:true},{id:2,t:"Optimize DB",d:true},{id:3,t:"Caching",d:true}],notes:"40% faster!"}],
  cmts:[],
  trend:[{m:"Oct",i:85000,e:52000},{m:"Nov",i:90000,e:48000},{m:"Dec",i:95000,e:68000},{m:"Jan",i:85000,e:45000},{m:"Feb",i:100000,e:55000},{m:"Mar",i:100000,e:58000}]
};
 
const rs = (n) => "\u20B9" + Number(n).toLocaleString("en-IN");
const PC = ["#f9a8d4","#a7f3d0","#93c5fd","#fcd34d","#c4b5fd","#fdba74","#6ee7b7","#fda4af","#67e8f9","#d8b4fe"];
const cC = {Financial:"#059669",Career:"#0284c7",Health:"#e11d48",Personal:"#7c3aed"};
const cG = {Financial:"linear-gradient(135deg,#a7f3d0,#6ee7b7)",Career:"linear-gradient(135deg,#93c5fd,#60a5fa)",Health:"linear-gradient(135deg,#fda4af,#f472b6)",Personal:"linear-gradient(135deg,#c4b5fd,#a78bfa)"};
const sC = {Planning:["#d97706","\uD83D\uDCDD"],"In Progress":["#0284c7","\uD83D\uDD27"],Review:["#7c3aed","\uD83D\uDD0D"],Completed:["#059669","\u2705"],"On Hold":["#78716c","\u23F8"]};
const pC = {High:"#e11d48",Medium:"#d97706",Low:"#0284c7"};
 
/* ═══ BLOOM PALETTE ═══ */
const bg = "#fef7f0";
const card = "#ffffff";
const brd = "#fde8d8";
const rose = "#e11d48";
const peach = "#fb923c";
const sage = "#059669";
const sky = "#0284c7";
const lav = "#7c3aed";
const txt = "#3f3f46";
const dim = "#a1a1aa";
const warm = "#78716c";
 
const tt_s = {background:"#fff",border:"1px solid #fde8d8",borderRadius:12,fontSize:12,fontFamily:"'Outfit',sans-serif",boxShadow:"0 4px 16px rgba(0,0,0,.06)"};
const th_s = {textAlign:"left",padding:"8px 12px",fontSize:11,fontWeight:700,color:warm,textTransform:"uppercase",letterSpacing:.5,borderBottom:"1px solid "+brd};
const td_s = {padding:"10px 12px",borderBottom:"1px solid "+brd+"80",fontSize:13,color:txt};
 
 
/* ═══ HOOKS ═══ */
function useDrag(items, set) {
  const a = useRef(null), b = useRef(null);
  return {
    ds: (i) => { a.current = i; },
    de: (i) => { b.current = i; },
    dd: () => { if (a.current == null || b.current == null) return; const c = [...items]; const [r] = c.splice(a.current, 1); c.splice(b.current, 0, r); set(c); a.current = b.current = null; }
  };
}
 
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, color) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, color }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);
  return { toasts, push };
}
 
function dlCSV(r, fn) { const c = r.map((x) => x.map((v) => '"' + v + '"').join(",")).join("\n"); const el = document.createElement("a"); el.href = URL.createObjectURL(new Blob([c], { type: "text/csv" })); el.download = fn; el.click(); }
function dlAll(d) {
  dlCSV([["Name","Type","Invested","Value","Ret%"], ...d.inv.map((i) => [i.n, i.ty, i.i, i.v, i.r])], "investments.csv");
  dlCSV([["Name","Amt","Date","Label"], ...d.exp.map((e) => [e.n, e.a, e.d, e.l])], "expenses.csv");
  dlCSV([["Goal","Cat","Target","Current"], ...d.goals.map((g) => [g.n, g.cat, g.tgt, g.cur])], "goals.csv");
}
 
/* ═══ ATOMS ═══ */
function PB({ v, color, h = 7 }) {
  return (<div style={{height:h,borderRadius:12,background:"#f5ede6",overflow:"hidden"}}><div style={{height:"100%",width:Math.min(v,100)+"%",borderRadius:12,background:color||"linear-gradient(90deg,#f9a8d4,#c084fc)",transition:"width .8s cubic-bezier(.4,0,.2,1)"}}/></div>);
}
 
function Bg({ color, children }) {
  return (<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 10px",borderRadius:20,background:(color||lav)+"15",color:color||lav,fontSize:11,fontWeight:700}}>{children}</span>);
}
 
function Bt({ color, solid, children, onClick, style }) {
  const [h, setH] = useState(false);
  const c = color || lav;
  return (<button onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick} style={{display:"inline-flex",alignItems:"center",gap:5,padding:solid?"9px 18px":"7px 14px",borderRadius:12,background:solid?c:c+"12",color:solid?"#fff":c,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,whiteSpace:"nowrap",transition:"all .2s",transform:h?"translateY(-1px)":"none",boxShadow:h&&solid?"0 4px 12px "+c+"30":"none",...(style||{})}}>{children}</button>);
}
 
function In({ style, ...p }) {
  return (<input {...p} style={{background:"#faf5f0",border:"1px solid "+brd,borderRadius:12,padding:"10px 14px",color:txt,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"'Outfit',sans-serif",transition:"border .2s",...(style||{})}} onFocus={(e) => {e.target.style.borderColor="#c084fc";if(p.onFocus)p.onFocus(e)}} onBlur={(e) => {e.target.style.borderColor=brd;if(p.onBlur)p.onBlur(e)}} />);
}
 
function Se({ children, ...p }) {
  return (<select {...p} style={{background:"#faf5f0",border:"1px solid "+brd,borderRadius:12,padding:"10px 14px",color:txt,fontSize:13,outline:"none",fontFamily:"'Outfit',sans-serif"}}>{children}</select>);
}
 
function Card({ children, style, hover, onClick }) {
  const [h, setH] = useState(false);
  return (<div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} onClick={onClick} style={{background:card,borderRadius:20,padding:"18px 20px",border:"1px solid "+(h&&hover?"#fbbf24":brd),boxShadow:h&&hover?"0 8px 28px rgba(251,191,36,.1)":"0 2px 10px rgba(0,0,0,.03)",transition:"all .3s cubic-bezier(.4,0,.2,1)",transform:h&&hover?"translateY(-2px)":"none",cursor:onClick?"pointer":"default",...(style||{})}}>{children}</div>);
}
 
function Md({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.3)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16,animation:"fadeIn .2s"}} onClick={onClose}>
      <div style={{background:card,borderRadius:24,border:"1px solid "+brd,padding:26,maxWidth:480,width:"100%",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.1)",animation:"slideUp .3s"}} onClick={(e) => e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <b style={{fontSize:17,color:txt}}>{title}</b>
          <span onClick={onClose} style={{cursor:"pointer",color:dim,fontSize:18,width:32,height:32,borderRadius:10,background:"#faf5f0",display:"flex",alignItems:"center",justifyContent:"center"}}>{"\u2715"}</span>
        </div>
        {children}
      </div>
    </div>
  );
}
 
function Nt({ sid, data, setData, toast }) {
  const [tx, setTx] = useState("");
  const cs = data.cmts.filter((c) => c.sid === sid);
  const add = () => { if (!tx.trim()) return; setData((d) => ({...d, cmts:[...d.cmts, {id:Date.now(), sid, text:tx.trim(), dt:new Date().toLocaleDateString("en-IN")}]})); setTx(""); if (toast) toast("Note added!", sage); };
  return (
    <div style={{marginTop:16,borderTop:"1px solid "+brd,paddingTop:12}}>
      <div style={{fontSize:11,color:warm,fontWeight:700,marginBottom:8,letterSpacing:.5}}>{"\uD83D\uDCAC"} NOTES</div>
      {cs.map((c) => (<div key={c.id} style={{background:"#faf5f0",borderRadius:10,padding:"8px 12px",marginBottom:4,fontSize:13}}><span style={{color:txt}}>{c.text}</span> <span style={{color:dim,fontSize:11}}>{c.dt}</span></div>))}
      <div style={{display:"flex",gap:8}}><In value={tx} onChange={(e) => setTx(e.target.value)} placeholder="Add note..." onKeyDown={(e) => e.key === "Enter" && add()}/><Bt solid onClick={add}>Add</Bt></div>
    </div>
  );
}
 
function Toasts({ toasts }) {
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:900,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map((t) => (
        <div key={t.id} style={{background:card,border:"1px solid "+brd,borderRadius:14,padding:"10px 18px",boxShadow:"0 8px 24px rgba(0,0,0,.1)",display:"flex",alignItems:"center",gap:8,animation:"slideIn .3s",fontSize:13,fontWeight:600,color:t.color||sage}}>
          <div style={{width:6,height:6,borderRadius:3,background:t.color||sage}}/>{t.msg}
        </div>
      ))}
    </div>
  );
}
 
function Empty({ emoji, msg }) {
  return (<div style={{textAlign:"center",padding:"32px 20px",color:dim}}><div style={{fontSize:40,marginBottom:8}}>{emoji}</div><div style={{fontSize:14,fontWeight:500}}>{msg}</div></div>);
}
 
 
/* ═══ FOCUS TIMER ═══ */
function FocusTimer() {
  const [open, setOpen] = useState(false);
  const [dur, setDur] = useState(25);
  const [mins, setMins] = useState(25);
  const [secs, setSecs] = useState(0);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState("work");
  const [sessions, setSessions] = useState(0);
  const [theme, setTheme] = useState("pine");
  const ref = useRef(null);
  const themes = [{id:"sprout",e:"\uD83C\uDF31",l:"Sprout",c:"#22c55e"},{id:"pine",e:"\uD83C\uDF32",l:"Pine",c:"#059669"},{id:"bloom",e:"\uD83C\uDF38",l:"Bloom",c:"#ec4899"},{id:"sun",e:"\uD83C\uDF1E",l:"Sun",c:"#f59e0b"}];
  const presets = [10,25,35,50,60,90];
  const ct = themes.find((t) => t.id === theme) || themes[1];
  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setSecs((s) => { if (s === 0) { setMins((m) => { if (m === 0) { clearInterval(ref.current); setRunning(false); if (mode === "work") { setSessions((x) => x+1); setMode("break"); setDur(5); setMins(5); } else { setMode("work"); setDur(25); setMins(25); } return 0; } return m-1; }); return 59; } return s-1; });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running, mode]);
  const pickDur = (m) => { if (running) return; setDur(m); setMins(m); setSecs(0); setMode("work"); };
  const total = dur * 60;
  const elapsed = total - (mins * 60 + secs);
  const pct = total > 0 ? (elapsed / total) * 100 : 0;
  const R = 120, C = 2 * Math.PI * R;
  if (!open) return (<div onClick={() => setOpen(true)} style={{position:"fixed",bottom:86,right:24,zIndex:500,width:44,height:44,borderRadius:22,background:"#fff",border:"1px solid #ebe8e4",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,.08)",fontSize:18,transition:"transform .2s"}}>{"\u23F1"}</div>);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(245,243,240,.97)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:600,flexDirection:"column"}} onClick={() => { if (!running) setOpen(false); }}>
      <div style={{width:"100%",maxWidth:480,padding:"0 24px",textAlign:"center"}} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:32}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{background:"#1a1a2e",color:"#fff",borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:700}}>{sessions}h</div>
            <span style={{fontSize:12,fontWeight:600,color:warm}}>TODAY</span>
          </div>
          <span onClick={() => setOpen(false)} style={{cursor:"pointer",width:36,height:36,borderRadius:10,border:"1px solid #e5e5e5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:dim}}>{"\u2715"}</span>
        </div>
        {/* Large ring */}
        <div style={{position:"relative",display:"inline-block",marginBottom:32}}>
          <svg width={260} height={260} style={{transform:"rotate(-90deg)"}}>
            <circle cx={130} cy={130} r={R} fill="none" stroke="#e8e5e0" strokeWidth={8}/>
            <circle cx={130} cy={130} r={R} fill="none" stroke={ct.c} strokeWidth={8} strokeDasharray={C} strokeDashoffset={C - (pct / 100) * C} strokeLinecap="round" style={{transition:"stroke-dashoffset .5s ease"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:52,marginBottom:4}}>{ct.e}</div>
            <div style={{fontSize:52,fontWeight:800,color:"#1a1a2e",fontVariantNumeric:"tabular-nums",letterSpacing:-2}}>{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}</div>
          </div>
        </div>
        {/* Theme selector */}
        <div style={{marginBottom:28}}>
          <div style={{fontSize:11,fontWeight:700,color:dim,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12,textAlign:"left"}}>Select Theme</div>
          <div style={{display:"flex",gap:12,justifyContent:"flex-start"}}>
            {themes.map((t) => (
              <div key={t.id} onClick={() => !running && setTheme(t.id)} style={{width:72,padding:"12px 0",borderRadius:14,border:theme===t.id?"2px solid "+t.c:"2px solid #e8e5e0",background:theme===t.id?"#fff":"#faf8f5",textAlign:"center",cursor:running?"default":"pointer",transition:"all .2s",position:"relative"}}>
                <div style={{fontSize:22,marginBottom:2}}>{t.e}</div>
                <div style={{fontSize:11,fontWeight:600,color:theme===t.id?t.c:dim}}>{t.l}</div>
                {theme===t.id && <div style={{position:"absolute",bottom:-7,left:"50%",transform:"translateX(-50%)",width:6,height:6,borderRadius:3,background:t.c}}/>}
              </div>
            ))}
          </div>
        </div>
        {/* Duration */}
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:11,fontWeight:700,color:dim,textTransform:"uppercase",letterSpacing:1.5}}>Duration</span>
            <span style={{fontSize:16,fontWeight:800,color:"#1a1a2e"}}>{dur} min</span>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"space-between"}}>
            {presets.map((p) => (
              <div key={p} onClick={() => pickDur(p)} style={{flex:1,padding:"8px 0",borderRadius:10,textAlign:"center",fontSize:13,fontWeight:700,cursor:running?"default":"pointer",background:dur===p?"#1a1a2e":"#f4f2f0",color:dur===p?"#fff":"#78716c",transition:"all .2s"}}>{p}</div>
            ))}
          </div>
        </div>
        {/* Start button */}
        <button onClick={() => { if (!running && mins === 0 && secs === 0) { setMins(dur); setSecs(0); } setRunning(!running); }} style={{width:"100%",padding:"18px 0",borderRadius:16,border:"none",background:running?"#dc2626":"#1a1a2e",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:running?"0 4px 20px rgba(220,38,38,.3)":"0 4px 20px rgba(26,26,46,.2)",transition:"all .2s",marginBottom:12}}>
          {running ? "\u23F8  Pause Focus" : "\u26A1  Start Focus"}
        </button>
        {running && <div onClick={() => { setRunning(false); setMins(dur); setSecs(0); }} style={{fontSize:13,color:dim,cursor:"pointer",fontWeight:600}}>Reset Timer</div>}
        {mode === "break" && <div style={{marginTop:8,padding:"10px 16px",borderRadius:12,background:"#ecfdf5",color:"#059669",fontSize:13,fontWeight:600}}>Break time! Relax for {dur} min</div>}
      </div>
    </div>
  );
}
 
/* ═══ QUICK ADD ═══ */
function QuickAdd({ data, setData, toast }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("exp");
  const [fm, setFm] = useState({});
  const F = (k, v) => setFm((f) => ({...f, [k]: v}));
  const sv = () => {
    const id = Date.now();
    if (type === "exp" && fm.n && fm.a) { setData((x) => ({...x, exp:[...x.exp, {id, n:fm.n, a:+fm.a, d:new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"}), l:fm.l||"Other"}]})); if (toast) toast("Expense added!", peach); }
    else if (type === "goal" && fm.n && fm.tgt) { setData((x) => ({...x, goals:[...x.goals, {id, n:fm.n, tgt:+fm.tgt, cur:0, dl:"", plan:"", notes:"", cat:fm.cat||"Personal", streak:0}]})); if (toast) toast("Goal created!", sage); }
    else if (type === "proj" && fm.n) { setData((x) => ({...x, proj:[...x.proj, {id, n:fm.n, st:"Planning", pri:"Medium", dl:"", prog:0, tasks:[], notes:""}]})); if (toast) toast("Project started!", sky); }
    setOpen(false); setFm({});
  };
  if (!open) return (<div onClick={() => setOpen(true)} style={{position:"fixed",bottom:24,right:24,zIndex:500,width:52,height:52,borderRadius:26,background:"#6366f1",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 4px 20px rgba(99,102,241,.35)",fontSize:24,color:"#fff",fontWeight:300,transition:"transform .2s"}}>{"\u002B"}</div>);
  return (
    <Md open={true} onClose={() => setOpen(false)} title={"\u26A1 Quick Add"}>
      <div style={{display:"flex",gap:6,marginBottom:14}}>{[["exp","\uD83D\uDCB8 Expense"],["goal","\uD83C\uDFAF Goal"],["proj","\uD83D\uDE80 Project"]].map(([k,l]) => (<Bt key={k} solid={type===k} color={type===k?lav:dim} onClick={() => {setType(k);setFm({})}}>{l}</Bt>))}</div>
      <div style={{display:"grid",gap:10}}>
        <In placeholder="Name" value={fm.n||""} onChange={(e) => F("n",e.target.value)}/>
        {type === "exp" && <><In placeholder="Amount" type="number" value={fm.a||""} onChange={(e) => F("a",e.target.value)}/><Se value={fm.l||"Other"} onChange={(e) => F("l",e.target.value)}>{data.labels.map((l) => (<option key={l}>{l}</option>))}</Se></>}
        {type === "goal" && <><In placeholder="Target" type="number" value={fm.tgt||""} onChange={(e) => F("tgt",e.target.value)}/><Se value={fm.cat||"Personal"} onChange={(e) => F("cat",e.target.value)}>{["Financial","Career","Health","Personal"].map((c) => (<option key={c}>{c}</option>))}</Se></>}
        <Bt solid onClick={sv} style={{justifyContent:"center"}}>Save</Bt>
      </div>
    </Md>
  );
}
 
/* ═══ SEARCH ═══ */
function Search({ data, go }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = [];
  if (q.length >= 2) {
    const ql = q.toLowerCase();
    data.exp.forEach((e) => { if (e.n.toLowerCase().includes(ql)) results.push({t:"Expense",n:e.n,sub:rs(e.a),pg:"exp"}); });
    data.goals.forEach((g) => { if (g.n.toLowerCase().includes(ql)) results.push({t:"Goal",n:g.n,sub:Math.round(g.cur/g.tgt*100)+"%",pg:"goals"}); });
    data.proj.forEach((p) => { if (p.n.toLowerCase().includes(ql)) results.push({t:"Project",n:p.n,sub:p.st,pg:"proj"}); });
    data.inv.forEach((i) => { if (i.n.toLowerCase().includes(ql)) results.push({t:"Investment",n:i.n,sub:rs(i.v),pg:"fin"}); });
  }
  return (
    <div style={{position:"relative"}}>
      <div onClick={() => setOpen(!open)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",background:"#faf5f0",borderRadius:12,cursor:"pointer",border:"1px solid "+brd}}>
        <span style={{color:dim}}>{"\uD83D\uDD0D"}</span>
        {open ? <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." style={{border:"none",background:"transparent",outline:"none",fontSize:13,color:txt,fontFamily:"'Outfit',sans-serif",width:140}}/> : <span style={{fontSize:13,color:dim}}>Search</span>}
      </div>
      {open && results.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:6,background:card,borderRadius:14,border:"1px solid "+brd,boxShadow:"0 12px 32px rgba(0,0,0,.1)",overflow:"hidden",zIndex:50,maxHeight:240,overflowY:"auto"}}>
          {results.slice(0,8).map((r, i) => (
            <div key={i} onClick={() => {go(r.pg);setOpen(false);setQ("")}} style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid "+brd+"60",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13}}>
              <div><Bg color={r.t==="Expense"?peach:r.t==="Goal"?sage:r.t==="Project"?sky:lav}>{r.t}</Bg> <span style={{marginLeft:8,fontWeight:600}}>{r.n}</span></div>
              <span style={{color:dim,fontSize:12}}>{r.sub}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
 
 
/* ═══ MINI CALENDAR ═══ */
function MiniCal({ data }) {
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const vd = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const yr = vd.getFullYear(), mo = vd.getMonth();
  const dim2 = new Date(yr, mo + 1, 0).getDate();
  const sd = new Date(yr, mo, 1).getDay();
  const today = now.getDate(), isCur = offset === 0;
  const dlD = {};
  data.proj.forEach((p) => { const m2 = (p.dl||"").match(/(\w+)\s+(\d+)/); if (m2) { const mN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; const mi = mN.indexOf(m2[1]); if (mi === mo) { const dy = parseInt(m2[2]); dlD[dy] = (dlD[dy]||[]); dlD[dy].push({n:p.n,c:sC[p.st]?sC[p.st][0]:sky}); }}});
  const mNm = vd.toLocaleString("en-IN",{month:"long",year:"numeric"});
  const cells = []; for (let i=0;i<sd;i++) cells.push(null); for (let d=1;d<=dim2;d++) cells.push(d);
  return (
    <Card hover style={{padding:"16px 18px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span onClick={() => setOffset(offset-1)} style={{cursor:"pointer",color:warm,fontSize:18,padding:"0 6px"}}>{"\u2039"}</span>
        <b style={{fontSize:13,color:txt}}>{"\uD83D\uDCC5"} {mNm}</b>
        <span onClick={() => setOffset(offset+1)} style={{cursor:"pointer",color:warm,fontSize:18,padding:"0 6px"}}>{"\u203A"}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,textAlign:"center"}}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (<div key={d} style={{fontSize:10,fontWeight:700,color:warm,padding:4}}>{d}</div>))}
        {cells.map((d, i) => { if (!d) return (<div key={"e"+i}/>); const isT = isCur && d === today; const hasDl = dlD[d]; return (
          <div key={i} title={hasDl?hasDl.map((x)=>x.n).join(", "):""} style={{position:"relative",padding:"6px 0",borderRadius:8,fontSize:12,fontWeight:isT?800:500,color:isT?"#fff":hasDl?txt:dim,background:isT?"linear-gradient(135deg,#f472b6,#fbbf24)":"transparent",cursor:hasDl?"pointer":"default"}}>
            {d}
            {hasDl && (<div style={{position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",display:"flex",gap:2}}>{hasDl.map((x,j) => (<div key={j} style={{width:4,height:4,borderRadius:2,background:x.c}}/>))}</div>)}
          </div>
        );})}
      </div>
    </Card>
  );
}
 
/* ═══ TASK COLUMNS ═══ */
function TaskCols({ data }) {
  const all = [];
  data.proj.forEach((p) => { if (p.st === "Completed") return; p.tasks.forEach((tk) => { if (!tk.d) all.push({...tk, proj:p.n, pri:p.pri, dl:p.dl}); }); });
  const hi = all.filter((t) => t.pri === "High"), rest = all.filter((t) => t.pri !== "High");
  const todayT = [...hi.slice(0,3), ...rest.slice(0, Math.max(0, 3-hi.length))];
  const weekT = all.filter((t) => !todayT.find((x) => x.id === t.id)).slice(0,5);
  const TI = ({ tk }) => (<div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",background:"#faf5f0",borderRadius:10,marginBottom:5}}><div style={{width:7,height:7,borderRadius:4,background:pC[tk.pri]||sky,marginTop:5,flexShrink:0}}/><div><div style={{fontSize:13,fontWeight:600,color:txt}}>{tk.t}</div><div style={{fontSize:11,color:dim,marginTop:1}}>{tk.proj} {"\u00B7"} {tk.dl}</div></div></div>);
  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12}}>
      <Card hover><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><div style={{width:7,height:7,borderRadius:4,background:rose}}/><b style={{fontSize:13,color:txt}}>{"\uD83D\uDD25"} Today</b><Bg color={rose}>{todayT.length}</Bg></div>{todayT.length===0?<div style={{fontSize:13,color:dim,padding:"10px 0"}}>All clear! {"\uD83C\uDF89"}</div>:todayT.map((t) => (<TI key={t.id} tk={t}/>))}</Card>
      <Card hover><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}><div style={{width:7,height:7,borderRadius:4,background:sky}}/><b style={{fontSize:13,color:txt}}>{"\uD83D\uDCC6"} This Week</b><Bg color={sky}>{weekT.length}</Bg></div>{weekT.length===0?<div style={{fontSize:13,color:dim,padding:"10px 0"}}>Nothing upcoming {"\u2728"}</div>:weekT.map((t) => (<TI key={t.id} tk={t}/>))}</Card>
    </div>
  );
}
 
/* ═══ WEEKLY SUMMARY ═══ */
function WeekSum({ data }) {
  const te = data.exp.reduce((s,e) => s+e.a, 0);
  const ti = data.inc.reduce((s,e) => s+e.a, 0);
  const td = data.proj.reduce((s,p) => s+p.tasks.filter((t)=>t.d).length, 0);
  return (
    <div style={{background:"linear-gradient(135deg,#fef3c7,#fde68a,#fbcfe8)",borderRadius:18,padding:"14px 20px",marginBottom:18,display:"flex",flexWrap:"wrap",gap:16,alignItems:"center"}}>
      <span style={{fontSize:13,fontWeight:700,color:"#92400e"}}>{"\uD83D\uDCCA"} This period</span>
      {[["Spent",rs(te),"\uD83D\uDCB8"],["Earned",rs(ti),"\uD83D\uDCB0"],["Saved",rs(ti-te),"\uD83C\uDF1F"],["Tasks done",td+"","\u2705"]].map(([l,v,e],i) => (
        <div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:13}}><span>{e}</span><span style={{color:"#78716c"}}>{l}:</span><b style={{color:"#92400e"}}>{v}</b></div>
      ))}
    </div>
  );
}
 
 
/* ═══ DASHBOARD ═══ */
function Dash({ data, setData, go, toast }) {
  const d = data;
  const tv = d.inv.reduce((s,x) => s+x.v, 0);
  const tdr = d.debt.reduce((s,x) => s+x.rem, 0);
  const cu = d.cc.reduce((s,x) => s+x.used, 0);
  const cl = d.cc.reduce((s,x) => s+x.lim, 0);
  const tb = d.bills.reduce((s,x) => s+x.a, 0);
  const tinc = d.inc.reduce((s,x) => s+x.a, 0);
  const nw = tv + d.cash - tdr - cu;
  const risk = Math.min(100, Math.round(tdr/(tv+d.cash+1)*100));
  const ccU = cl ? Math.round(cu/cl*100) : 0;
  const gp = d.goals.length ? Math.round(d.goals.reduce((s,g) => s+(g.cur/g.tgt)*100, 0)/d.goals.length) : 0;
  const ebl = {}; d.exp.forEach((e) => { ebl[e.l] = (ebl[e.l]||0)+e.a; });
  const pie = Object.entries(ebl).map(([name, value]) => ({name, value}));
 
  return (
    <div style={{animation:"fadeIn .4s"}}>
      <div style={{marginBottom:6}}><h1 style={{fontSize:26,fontWeight:800,margin:0,color:txt}}>Dashboard</h1><p style={{color:warm,margin:"3px 0 0",fontSize:14}}>Your complete life overview</p></div>
      <WeekSum data={d}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:11,marginBottom:20}}>
        {[{l:"Net Worth",v:rs(nw),e:"\uD83D\uDCB0",g:"linear-gradient(145deg,#fef3c7,#fed7aa)",tc:"#92400e"},{l:"Investments",v:rs(tv),e:"\uD83D\uDCC8",g:"linear-gradient(145deg,#d1fae5,#a7f3d0)",tc:"#065f46"},{l:"Cash",v:rs(d.cash),e:"\uD83C\uDFE6",g:"linear-gradient(145deg,#dbeafe,#93c5fd)",tc:"#1e40af"},{l:"Debt",v:rs(tdr),e:"\uD83D\uDCB3",g:"linear-gradient(145deg,#ffe4e6,#fda4af)",tc:"#9f1239"},{l:"Income",v:rs(tinc),e:"\uD83E\uDD11",g:"linear-gradient(145deg,#ede9fe,#c4b5fd)",tc:"#5b21b6"},{l:"Bills",v:rs(tb),e:"\uD83D\uDCCB",g:"linear-gradient(145deg,#fce7f3,#f9a8d4)",tc:"#9d174d"}].map((m,i) => (
          <div key={i} style={{background:m.g,borderRadius:18,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-6,right:-4,fontSize:36,opacity:.12}}>{m.e}</div>
            <div style={{fontSize:10,fontWeight:700,color:m.tc,opacity:.7,textTransform:"uppercase",letterSpacing:.5}}>{m.l}</div>
            <div style={{fontSize:18,fontWeight:800,color:m.tc,marginTop:4}}>{m.v}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:14,marginBottom:14}}>
        <Card hover><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:txt}}>{"\uD83C\uDF38"} Income vs Expense</div>
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={d.trend}><defs><linearGradient id="aI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity={.25}/><stop offset="100%" stopColor="#34d399" stopOpacity={0}/></linearGradient><linearGradient id="aE" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f472b6" stopOpacity={.2}/><stop offset="100%" stopColor="#f472b6" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#f5ede6" strokeDasharray="4 4"/><XAxis dataKey="m" stroke={dim} fontSize={11} tickLine={false}/><YAxis stroke={dim} fontSize={11} tickLine={false} tickFormatter={(v) => (v/1000)+"k"}/><Tooltip contentStyle={tt_s} formatter={(v) => rs(v)}/><Area type="monotone" dataKey="i" name="Income" stroke="#34d399" fill="url(#aI)" strokeWidth={2.5}/><Area type="monotone" dataKey="e" name="Expense" stroke="#f472b6" fill="url(#aE)" strokeWidth={2.5}/><Legend wrapperStyle={{fontSize:11}}/></AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card hover><div style={{fontSize:14,fontWeight:700,marginBottom:12,color:txt}}>{"\uD83C\uDF69"} Spending</div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <ResponsiveContainer width="48%" height={175}><PieChart><Pie data={pie} cx="50%" cy="50%" innerRadius={38} outerRadius={68} paddingAngle={3} dataKey="value" strokeWidth={0} cornerRadius={5}>{pie.map((_,i) => (<Cell key={i} fill={PC[i%PC.length]}/>))}</Pie><Tooltip contentStyle={tt_s} formatter={(v) => rs(v)}/></PieChart></ResponsiveContainer>
            <div style={{display:"flex",flexDirection:"column",gap:4}}>{pie.map((p,i) => (<div key={i} style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}><div style={{width:8,height:8,borderRadius:4,background:PC[i%PC.length]}}/><span style={{color:warm}}>{p.name}</span><b style={{color:txt,marginLeft:"auto"}}>{rs(p.value)}</b></div>))}</div>
          </div>
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginBottom:14}}>
        <Card hover><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:txt}}>{"\u26A0\uFE0F"} Risk</div>
          <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:10}}>
            <div style={{position:"relative",display:"inline-block"}}><svg width={56} height={56} style={{transform:"rotate(-90deg)"}}><circle cx={28} cy={28} r={23} fill="none" stroke="#f5ede6" strokeWidth={6}/><circle cx={28} cy={28} r={23} fill="none" stroke={risk>50?rose:risk>30?"#d97706":sage} strokeWidth={6} strokeDasharray={2*Math.PI*23} strokeDashoffset={2*Math.PI*23-(risk/100)*2*Math.PI*23} strokeLinecap="round" style={{transition:"all .6s"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:risk>50?rose:risk>30?"#d97706":sage}}>{risk}%</div></div>
            <div><div style={{fontSize:11,color:warm}}>Debt-to-Asset</div></div>
          </div>
          <div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:warm}}>CC Util</span><b style={{color:ccU>30?"#d97706":sage}}>{ccU}%</b></div><PB v={ccU} color={ccU>30?"#d97706":sage}/></div>
          <div><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}><span style={{color:warm}}>Goals</span><b style={{color:lav}}>{gp}%</b></div><PB v={gp} color={lav}/></div>
        </Card>
        <Card hover><div style={{fontSize:13,fontWeight:700,marginBottom:12,color:txt}}>{"\uD83D\uDCB3"} Credit Cards</div>
          {d.cc.map((c) => { const u = Math.round(c.used/c.lim*100); return (<div key={c.id} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><b style={{color:txt}}>{c.n}</b><span style={{color:warm}}>{rs(c.used)}/{rs(c.lim)}</span></div><PB v={u} color={u>30?"#f472b6":sage}/><div style={{fontSize:11,color:dim,marginTop:2}}>Due {c.due} {"\u00B7"} Min {rs(c.min)}</div></div>);})}
        </Card>
        <Card hover><div style={{fontSize:13,fontWeight:700,marginBottom:10,color:txt}}>{"\uD83E\uDD67"} Allocation</div>
          <ResponsiveContainer width="100%" height={145}><PieChart><Pie data={d.inv.map((x)=>({name:x.ty,value:x.v}))} cx="50%" cy="50%" outerRadius={55} dataKey="value" strokeWidth={0} paddingAngle={2}>{d.inv.map((_,i)=>(<Cell key={i} fill={PC[(i+2)%PC.length]}/>))}</Pie><Tooltip contentStyle={tt_s} formatter={(v) => rs(v)}/><Legend wrapperStyle={{fontSize:10}}/></PieChart></ResponsiveContainer>
        </Card>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
        <Card hover><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><b style={{fontSize:13,color:txt}}>{"\uD83C\uDFAF"} Goals</b><Bg color={lav}>{gp}% avg</Bg></div>
          {d.goals.map((g) => { const p = Math.round(g.cur/g.tgt*100); return (<div key={g.id} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12,marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{color:txt,fontWeight:600}}>{g.n}</span>{g.streak>0&&<span style={{fontSize:10,color:"#d97706"}}>{"\uD83D\uDD25"}{g.streak}d</span>}</div><b style={{color:cC[g.cat]}}>{p}%</b></div><PB v={p} color={cC[g.cat]}/></div>);})}
          <div onClick={() => go("goals")} style={{marginTop:8,fontSize:12,color:lav,cursor:"pointer",fontWeight:700}}>View all {"\u2192"}</div>
        </Card>
        <Card hover><div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}><b style={{fontSize:13,color:txt}}>{"\uD83D\uDE80"} Projects</b><Bg color={sky}>{d.proj.filter((p)=>p.st!=="Completed").length} active</Bg></div>
          {d.proj.filter((p)=>p.st!=="Completed").map((p) => (<div key={p.id} style={{background:"#faf5f0",borderRadius:12,padding:"10px 12px",marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><b style={{fontSize:13,color:txt}}>{p.n}</b><Bg color={pC[p.pri]}>{p.pri}</Bg></div><PB v={p.prog} color={sky} h={5}/><div style={{fontSize:11,color:dim,marginTop:3}}>{p.tasks.filter((x)=>x.d).length}/{p.tasks.length} tasks {"\u00B7"} Due {p.dl}</div></div>))}
          <div onClick={() => go("proj")} style={{marginTop:8,fontSize:12,color:sky,cursor:"pointer",fontWeight:700}}>View all {"\u2192"}</div>
        </Card>
      </div>
      <Nt sid="dash" data={data} setData={setData} toast={toast}/>
    </div>
  );
}
 
 
/* ═══ FINANCE ═══ */
function Fin({ data, setData, toast }) {
  const d = data;
  const [ml, setMl] = useState(null);
  const [fm, setFm] = useState({});
  const tv = d.inv.reduce((s,x) => s+x.v, 0);
  const ti = d.inv.reduce((s,x) => s+x.i, 0);
  const F = (k,v) => setFm((f)=>({...f,[k]:v}));
  const op = (tp) => { const df = {inv:{n:"",ty:"Mutual Fund",v:"",i:"",r:""},debt:{n:"",tot:"",rem:"",emi:"",rate:"",due:""},cc:{n:"",lim:"",used:"",due:"",min:""},bill:{n:"",a:"",due:"",cat:d.labels[0],ap:false},inc:{s:"",a:"",d:"",rec:false},cash:{cash:d.cash}}; setFm(df[tp]||{}); setMl(tp); };
  const sv = () => { const id = Date.now(); const h = { inv:(x)=>({...x,inv:[...x.inv,{id,n:fm.n,ty:fm.ty,v:+fm.v,i:+fm.i,r:+fm.r}]}), debt:(x)=>({...x,debt:[...x.debt,{id,n:fm.n,tot:+fm.tot,rem:+fm.rem,emi:+fm.emi,rate:+fm.rate,due:fm.due}]}), cc:(x)=>({...x,cc:[...x.cc,{id,n:fm.n,lim:+fm.lim,used:+fm.used,due:fm.due,min:+fm.min}]}), bill:(x)=>({...x,bills:[...x.bills,{id,n:fm.n,a:+fm.a,due:fm.due,cat:fm.cat,ap:fm.ap}]}), inc:(x)=>({...x,inc:[...x.inc,{id,s:fm.s,a:+fm.a,d:fm.d,rec:fm.rec}]}), cash:(x)=>({...x,cash:+fm.cash}) }; if(h[ml])setData(h[ml]); setMl(null); if(toast)toast("Saved!",sage); };
  const del = (k,id) => { setData((x)=>({...x,[k]:x[k].filter((y)=>y.id!==id)})); if(toast)toast("Removed",rose); };
 
  return (
    <div style={{animation:"fadeIn .4s"}}>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:22}}>
        <div><h1 style={{fontSize:26,fontWeight:800,margin:0,color:txt}}>Finance</h1><p style={{color:warm,margin:"3px 0 0",fontSize:14}}>Investments, debts, cards, bills & income</p></div>
        <Bt color={sage} onClick={() => dlCSV([["Name","Type","Invested","Value","Ret%"],...d.inv.map((x)=>[x.n,x.ty,x.i,x.v,x.r])],"investments.csv")}>{"\u2B07"} CSV</Bt>
      </div>
 
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><b style={{fontSize:15,color:txt}}>{"\uD83D\uDCC8"} Investments {"\u2014"} {rs(tv)}</b><Bt color={sage} onClick={() => op("inv")}>+ Add</Bt></div>
      <Card style={{overflow:"auto",marginBottom:20,padding:0}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Name","Type","Invested","Current","Returns",""].map((h,i) => (<th key={i} style={th_s}>{h}</th>))}</tr></thead>
          <tbody>{d.inv.map((x)=>(<tr key={x.id}><td style={{...td_s,fontWeight:700}}>{x.n}</td><td style={td_s}><Bg color={sky}>{x.ty}</Bg></td><td style={td_s}>{rs(x.i)}</td><td style={{...td_s,fontWeight:700}}>{rs(x.v)}</td><td style={{...td_s,fontWeight:700,color:x.r>=0?sage:rose}}>{x.r>=0?"+":""}{x.r}%</td><td style={td_s}><span onClick={()=>del("inv",x.id)} style={{cursor:"pointer",color:dim}}>{"\uD83D\uDDD1"}</span></td></tr>))}</tbody>
        </table>
        <div style={{padding:"10px 12px",borderTop:"1px solid "+brd,display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:warm}}>P&L</span><b style={{color:tv>=ti?sage:rose}}>{rs(tv-ti)} ({Math.round((tv-ti)/(ti||1)*100)}%)</b></div>
      </Card>
 
      <div style={{background:"linear-gradient(135deg,#dbeafe,#c4b5fd)",borderRadius:18,padding:2,marginBottom:20}}><div style={{background:card,borderRadius:16,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{fontSize:11,color:warm,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>{"\uD83C\uDFE6"} Cash</div><div style={{fontSize:26,fontWeight:800,color:txt,marginTop:3}}>{rs(d.cash)}</div></div><Bt color={sky} onClick={() => op("cash")}>Update</Bt></div></div>
 
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><b style={{fontSize:15,color:txt}}>{"\uD83D\uDCB3"} Debts</b><Bt color={peach} onClick={() => op("debt")}>+ Add</Bt></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12,marginBottom:20}}>
        {d.debt.map((x) => { const p = Math.round((x.tot-x.rem)/x.tot*100); return (
          <div key={x.id} style={{background:"linear-gradient(145deg,#fef3c7,#fed7aa)",borderRadius:18,padding:2}}><div style={{background:card,borderRadius:16,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><b style={{color:txt}}>{x.n}</b><span onClick={()=>del("debt",x.id)} style={{cursor:"pointer",color:dim}}>{"\uD83D\uDDD1"}</span></div>
            <PB v={p} color="#d97706"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:10,fontSize:12}}>{[["Rem",rs(x.rem)],["EMI",rs(x.emi)+"/mo"],["Rate",x.rate+"%"],["Due",x.due]].map(([l,v],i)=>(<div key={i}><span style={{color:dim}}>{l}</span><div style={{fontWeight:700,color:txt}}>{v}</div></div>))}</div>
          </div></div>
        );})}
      </div>
 
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><b style={{fontSize:15,color:txt}}>{"\uD83D\uDC8E"} Credit Cards</b><Bt color={lav} onClick={() => op("cc")}>+ Add</Bt></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12,marginBottom:20}}>
        {d.cc.map((x) => { const u = Math.round(x.used/x.lim*100); return (
          <div key={x.id} style={{background:"linear-gradient(145deg,#ede9fe,#c4b5fd)",borderRadius:18,padding:2}}><div style={{background:card,borderRadius:16,padding:"14px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><b style={{color:txt}}>{x.n}</b><span onClick={()=>del("cc",x.id)} style={{cursor:"pointer",color:dim}}>{"\uD83D\uDDD1"}</span></div>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
              <div style={{position:"relative"}}><svg width={52} height={52} style={{transform:"rotate(-90deg)"}}><circle cx={26} cy={26} r={21} fill="none" stroke="#f5ede6" strokeWidth={6}/><circle cx={26} cy={26} r={21} fill="none" stroke={u>30?"#f472b6":sage} strokeWidth={6} strokeDasharray={2*Math.PI*21} strokeDashoffset={2*Math.PI*21-(u/100)*2*Math.PI*21} strokeLinecap="round"/></svg><div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800}}>{u}%</div></div>
              <div><div style={{fontSize:18,fontWeight:800,color:txt}}>{rs(x.used)}</div><div style={{fontSize:11,color:dim}}>of {rs(x.lim)}</div></div>
            </div>
            <div style={{fontSize:12,color:warm}}>Due {x.due} {"\u00B7"} Min {rs(x.min)}</div>
          </div></div>
        );})}
      </div>
 
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><b style={{fontSize:15,color:txt}}>{"\uD83D\uDCCB"} Bills</b><Bt color={rose} onClick={() => op("bill")}>+ Add</Bt></div>
      <Card style={{overflow:"auto",marginBottom:20,padding:0}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Bill","Amt","Due","Cat","Auto",""].map((h,i)=>(<th key={i} style={th_s}>{h}</th>))}</tr></thead>
          <tbody>{d.bills.map((x)=>(<tr key={x.id}><td style={{...td_s,fontWeight:700}}>{x.n}</td><td style={{...td_s,fontWeight:700}}>{rs(x.a)}</td><td style={td_s}>{x.due}</td><td style={td_s}><Bg color={sky}>{x.cat}</Bg></td><td style={td_s}>{x.ap?"\u2713":"\u2014"}</td><td style={td_s}><span onClick={()=>del("bills",x.id)} style={{cursor:"pointer",color:dim}}>{"\uD83D\uDDD1"}</span></td></tr>))}</tbody>
        </table>
      </Card>
 
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}><b style={{fontSize:15,color:txt}}>{"\uD83E\uDD11"} Income</b><Bt color={sage} onClick={() => op("inc")}>+ Add</Bt></div>
      <Card style={{overflow:"auto",padding:0}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Source","Amt","Date","Rec",""].map((h,i)=>(<th key={i} style={th_s}>{h}</th>))}</tr></thead>
          <tbody>{d.inc.map((x)=>(<tr key={x.id}><td style={{...td_s,fontWeight:700}}>{x.s}</td><td style={{...td_s,fontWeight:700,color:sage}}>{rs(x.a)}</td><td style={td_s}>{x.d}</td><td style={td_s}>{x.rec?"\u2713":"\u2014"}</td><td style={td_s}><span onClick={()=>del("inc",x.id)} style={{cursor:"pointer",color:dim}}>{"\uD83D\uDDD1"}</span></td></tr>))}</tbody>
        </table>
      </Card>
      <Nt sid="fin" data={d} setData={setData} toast={toast}/>
 
      <Md open={ml==="inv"} onClose={()=>setMl(null)} title="Add Investment"><div style={{display:"grid",gap:10}}><In placeholder="Name" value={fm.n||""} onChange={(e)=>F("n",e.target.value)}/><Se value={fm.ty||""} onChange={(e)=>F("ty",e.target.value)}>{["Mutual Fund","Stock","Fixed Income","Commodity","Crypto","Other"].map((x)=>(<option key={x}>{x}</option>))}</Se><In placeholder="Invested" type="number" value={fm.i||""} onChange={(e)=>F("i",e.target.value)}/><In placeholder="Value" type="number" value={fm.v||""} onChange={(e)=>F("v",e.target.value)}/><In placeholder="Returns %" type="number" value={fm.r||""} onChange={(e)=>F("r",e.target.value)}/><Bt solid color={sage} onClick={sv} style={{justifyContent:"center"}}>Save</Bt></div></Md>
      <Md open={ml==="debt"} onClose={()=>setMl(null)} title="Add Debt"><div style={{display:"grid",gap:10}}><In placeholder="Name" value={fm.n||""} onChange={(e)=>F("n",e.target.value)}/><In placeholder="Total" type="number" value={fm.tot||""} onChange={(e)=>F("tot",e.target.value)}/><In placeholder="Remaining" type="number" value={fm.rem||""} onChange={(e)=>F("rem",e.target.value)}/><In placeholder="EMI" type="number" value={fm.emi||""} onChange={(e)=>F("emi",e.target.value)}/><In placeholder="Rate %" type="number" value={fm.rate||""} onChange={(e)=>F("rate",e.target.value)}/><In placeholder="Due date" value={fm.due||""} onChange={(e)=>F("due",e.target.value)}/><Bt solid color={peach} onClick={sv} style={{justifyContent:"center"}}>Save</Bt></div></Md>
      <Md open={ml==="cc"} onClose={()=>setMl(null)} title="Add Card"><div style={{display:"grid",gap:10}}><In placeholder="Name" value={fm.n||""} onChange={(e)=>F("n",e.target.value)}/><In placeholder="Limit" type="number" value={fm.lim||""} onChange={(e)=>F("lim",e.target.value)}/><In placeholder="Used" type="number" value={fm.used||""} onChange={(e)=>F("used",e.target.value)}/><In placeholder="Due date" value={fm.due||""} onChange={(e)=>F("due",e.target.value)}/><In placeholder="Min due" type="number" value={fm.min||""} onChange={(e)=>F("min",e.target.value)}/><Bt solid color={lav} onClick={sv} style={{justifyContent:"center"}}>Save</Bt></div></Md>
      <Md open={ml==="bill"} onClose={()=>setMl(null)} title="Add Bill"><div style={{display:"grid",gap:10}}><In placeholder="Name" value={fm.n||""} onChange={(e)=>F("n",e.target.value)}/><In placeholder="Amount" type="number" value={fm.a||""} onChange={(e)=>F("a",e.target.value)}/><In placeholder="Due" value={fm.due||""} onChange={(e)=>F("due",e.target.value)}/><Bt solid color={rose} onClick={sv} style={{justifyContent:"center"}}>Save</Bt></div></Md>
      <Md open={ml==="inc"} onClose={()=>setMl(null)} title="Add Income"><div style={{display:"grid",gap:10}}><In placeholder="Source" value={fm.s||""} onChange={(e)=>F("s",e.target.value)}/><In placeholder="Amount" type="number" value={fm.a||""} onChange={(e)=>F("a",e.target.value)}/><In placeholder="Date" value={fm.d||""} onChange={(e)=>F("d",e.target.value)}/><Bt solid color={sage} onClick={sv} style={{justifyContent:"center"}}>Save</Bt></div></Md>
      <Md open={ml==="cash"} onClose={()=>setMl(null)} title="Update Cash"><div style={{display:"grid",gap:10}}><In placeholder="Balance" type="number" value={fm.cash||""} onChange={(e)=>F("cash",e.target.value)}/><Bt solid color={sky} onClick={sv} style={{justifyContent:"center"}}>Update</Bt></div></Md>
    </div>
  );
}
 
 
/* ═══ EXPENSES ═══ */
function Exp({ data, setData, toast }) {
  const d = data;
  const [ml, setMl] = useState(null);
  const [fm, setFm] = useState({});
  const [fl, setFl] = useState("All");
  const [so, setSo] = useState(false);
  const [tab, setTab] = useState("expenses");
  const fil = d.exp.filter((e) => (fl==="All"||e.l===fl)&&(!so||e.sp));
  const dy = {}; d.exp.forEach((e)=>{dy[e.d]=(dy[e.d]||0)+e.a});
  const bD = Object.entries(dy).sort().slice(-8).map(([d2,a])=>({d:d2.replace("Mar ",""),a}));
  const F = (k,v) => setFm((f)=>({...f,[k]:v}));
 
  /* Split logic — parse names, build splits array with custom % */
  const addSplitPerson = () => {
    const nm = (fm.newPerson||"").trim();
    if (!nm) return;
    const cur = fm.splitList || [];
    setFm((f) => ({...f, splitList:[...cur, {name:nm, pct:""}], newPerson:""}));
  };
  const updSplitPct = (idx, pct) => {
    setFm((f) => {
      const sl = [...(f.splitList||[])];
      sl[idx] = {...sl[idx], pct};
      return {...f, splitList:sl};
    });
  };
  const rmSplit = (idx) => {
    setFm((f) => ({...f, splitList:(f.splitList||[]).filter((_,i) => i!==idx)}));
  };
 
  const sv = () => {
    if (ml==="add" && fm.n && fm.a) {
      const amt = +fm.a;
      let splits = [];
      if (fm.sp && (fm.splitList||[]).length > 0) {
        const sl = fm.splitList;
        const hasCustom = sl.some((s) => s.pct && +s.pct > 0);
        if (hasCustom) {
          splits = sl.map((s) => ({name:s.name, pct:+s.pct, amt:Math.round(amt * (+s.pct)/100)}));
        } else {
          const eq = Math.round(100/(sl.length+1)*10)/10;
          splits = sl.map((s) => ({name:s.name, pct:eq, amt:Math.round(amt*eq/100)}));
        }
      }
      setData((x)=>({...x,exp:[...x.exp,{id:Date.now(),n:fm.n,a:amt,d:fm.d||new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short"}),l:fm.l||"Other",sp:fm.sp&&splits.length>0,splits:splits.length?splits:undefined,paid:fm.paid||"me"}]}));
      if(toast)toast("Expense added!",peach);
    } else if (ml==="label"&&fm.nl&&fm.nl.trim()) {
      setData((x)=>({...x,labels:[...x.labels,fm.nl.trim()]}));
      if(toast)toast("Label created!",lav);
    }
    setMl(null);
  };
 
  /* ─── Debt calculator: who owes whom ─── */
  const debts = {};
  d.exp.forEach((e) => {
    if (!e.sp || !e.splits) return;
    const payer = e.paid || "me";
    e.splits.forEach((s) => {
      if (s.name === "Me" && payer !== "me") {
        /* I owe the payer */
        const k = payer;
        debts[k] = debts[k] || {owed:0, owes:0, items:[]};
        debts[k].owed += s.amt;
        debts[k].items.push({n:e.n,a:s.amt,dir:"i_owe"});
      } else if (s.name !== "Me" && payer === "me") {
        /* They owe me */
        const k = s.name;
        debts[k] = debts[k] || {owed:0, owes:0, items:[]};
        debts[k].owes += s.amt;
        debts[k].items.push({n:e.n,a:s.amt,dir:"they_owe"});
      }
    });
  });
  const debtList = Object.entries(debts).map(([name,d2]) => ({name,...d2,net:d2.owes-d2.owed})).sort((a,b) => Math.abs(b.net)-Math.abs(a.net));
  const totalOwed = debtList.reduce((s,x) => s+(x.net>0?x.net:0), 0);
  const totalIOwe = debtList.reduce((s,x) => s+(x.net<0?Math.abs(x.net):0), 0);
 
  return (
    <div style={{animation:"fadeIn .4s"}}>
      <h1 style={{fontSize:26,fontWeight:800,margin:"0 0 4px",color:txt}}>Expenses</h1>
      <p style={{color:warm,margin:"0 0 18px",fontSize:14}}>Track, label, split & settle</p>
 
      {/* Tabs: Expenses | Settlements */}
      <div style={{display:"flex",gap:4,marginBottom:18,background:"#f4f2f0",borderRadius:12,padding:3,width:"fit-content"}}>
        {[["expenses","\uD83D\uDCB8 Expenses"],["settle","\uD83E\uDD1D Settlements"]].map(([k,l]) => (
          <div key={k} onClick={() => setTab(k)} style={{padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",background:tab===k?"#fff":"transparent",color:tab===k?txt:dim,boxShadow:tab===k?"0 1px 4px rgba(0,0,0,.06)":"none",transition:"all .2s"}}>{l}</div>
        ))}
      </div>
 
      {tab === "expenses" && (<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:11,marginBottom:18}}>
          {[{e:"\uD83D\uDCB8",l:"Total Spent",v:rs(d.exp.reduce((s,e)=>s+e.a,0)),g:"linear-gradient(145deg,#fce7f3,#f9a8d4)",tc:"#9d174d"},{e:"\uD83E\uDD1D",l:"Owed to You",v:rs(totalOwed),g:"linear-gradient(145deg,#d1fae5,#a7f3d0)",tc:"#065f46"},{e:"\uD83D\uDCB3",l:"You Owe",v:rs(totalIOwe),g:"linear-gradient(145deg,#fef3c7,#fde68a)",tc:"#92400e"}].map((m,i)=>(
            <div key={i} style={{background:m.g,borderRadius:16,padding:"14px 16px"}}><div style={{fontSize:16}}>{m.e}</div><div style={{fontSize:10,color:m.tc,fontWeight:700,textTransform:"uppercase"}}>{m.l}</div><div style={{fontSize:18,fontWeight:800,color:m.tc}}>{m.v}</div></div>
          ))}
        </div>
        <Card hover style={{marginBottom:16}}><div style={{fontSize:13,fontWeight:700,marginBottom:10,color:txt}}>{"\uD83D\uDCCA"} Daily Spending</div>
          <ResponsiveContainer width="100%" height={130}><BarChart data={bD}><CartesianGrid stroke="#f5ede6" strokeDasharray="3 3"/><XAxis dataKey="d" stroke={dim} fontSize={11}/><YAxis stroke={dim} fontSize={11} tickFormatter={(v)=>(v/1000)+"k"}/><Tooltip contentStyle={tt_s} formatter={(v)=>rs(v)}/><Bar dataKey="a" name="Spent" fill="#f472b6" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
        </Card>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14,alignItems:"center"}}>
          <Se value={fl} onChange={(e)=>setFl(e.target.value)}><option>All</option>{d.labels.map((l)=>(<option key={l}>{l}</option>))}</Se>
          <label style={{display:"flex",alignItems:"center",gap:5,fontSize:13,color:warm}}><input type="checkbox" checked={so} onChange={(e)=>setSo(e.target.checked)}/> Split only</label>
          <div style={{flex:1}}/>
          <Bt color={lav} onClick={()=>{setFm({nl:""});setMl("label")}}>+ Label</Bt>
          <Bt color={peach} onClick={()=>{setFm({n:"",a:"",d:"",l:d.labels[0],sp:false,splitList:[],newPerson:"",paid:"me"});setMl("add")}}>+ Expense</Bt>
        </div>
        <Card style={{overflow:"auto",marginBottom:14,padding:0}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{["Expense","Amt","Date","Label","Split",""].map((h,i)=>(<th key={i} style={th_s}>{h}</th>))}</tr></thead>
            <tbody>{fil.length===0?<tr><td colSpan={6}><Empty emoji={"\uD83D\uDE0A"} msg="No expenses match your filter"/></td></tr>:fil.map((e)=>{
              const sp = e.splits || (e.w ? e.w.map((n) => ({name:n, amt:e.pp||0})) : []);
              return (
              <tr key={e.id}><td style={{...td_s,fontWeight:700}}>{e.n}</td><td style={{...td_s,fontWeight:700}}>{rs(e.a)}</td><td style={td_s}>{e.d}</td><td style={td_s}><Bg color={sky}>{e.l}</Bg></td><td style={td_s}>{e.sp?<div><Bg color={lav}>Split</Bg>{sp.map((s,i)=>(<div key={i} style={{fontSize:11,color:dim,marginTop:2}}>{s.name}: {rs(s.amt)}{s.pct?" ("+s.pct+"%)":""}</div>))}{e.paid&&e.paid!=="me"&&<div style={{fontSize:11,color:sage,marginTop:2}}>Paid by {e.paid}</div>}</div>:"\u2014"}</td><td style={td_s}><span onClick={()=>{setData((x)=>({...x,exp:x.exp.filter((y)=>y.id!==e.id)}));if(toast)toast("Removed",rose)}} style={{cursor:"pointer",color:dim}}>{"\uD83D\uDDD1"}</span></td></tr>
            );})}</tbody>
          </table>
        </Card>
      </>)}
 
      {tab === "settle" && (<>
        {/* Settlement dashboard */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:11,marginBottom:18}}>
          <div style={{background:"linear-gradient(145deg,#d1fae5,#a7f3d0)",borderRadius:16,padding:"16px 18px"}}><div style={{fontSize:10,fontWeight:700,color:"#065f46",textTransform:"uppercase"}}>People owe you</div><div style={{fontSize:26,fontWeight:800,color:"#065f46",marginTop:4}}>{rs(totalOwed)}</div></div>
          <div style={{background:"linear-gradient(145deg,#fef3c7,#fde68a)",borderRadius:16,padding:"16px 18px"}}><div style={{fontSize:10,fontWeight:700,color:"#92400e",textTransform:"uppercase"}}>You owe others</div><div style={{fontSize:26,fontWeight:800,color:"#92400e",marginTop:4}}>{rs(totalIOwe)}</div></div>
          <div style={{background:"linear-gradient(145deg,#ede9fe,#c4b5fd)",borderRadius:16,padding:"16px 18px"}}><div style={{fontSize:10,fontWeight:700,color:"#5b21b6",textTransform:"uppercase"}}>Net balance</div><div style={{fontSize:26,fontWeight:800,color:totalOwed-totalIOwe>=0?"#065f46":"#dc2626",marginTop:4}}>{totalOwed-totalIOwe>=0?"+":""}{rs(totalOwed-totalIOwe)}</div></div>
        </div>
        {debtList.length === 0 ? <Empty emoji={"\uD83E\uDD1D"} msg="No splits yet \u2014 add a split expense to track debts"/> : (
          <div style={{display:"grid",gap:12}}>
            {debtList.map((p) => (
              <Card key={p.name} hover>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:40,height:40,borderRadius:12,background:p.net>=0?"#d1fae5":"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:p.net>=0?"#065f46":"#92400e"}}>{p.name.charAt(0)}</div>
                    <div><div style={{fontWeight:700,fontSize:15,color:txt}}>{p.name}</div><div style={{fontSize:12,color:dim}}>{p.items.length} transaction{p.items.length!==1?"s":""}</div></div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:20,fontWeight:800,color:p.net>=0?"#059669":"#d97706"}}>{p.net>=0?"+":""}{rs(p.net)}</div>
                    <div style={{fontSize:11,color:dim}}>{p.net>=0?"owes you":"you owe"}</div>
                  </div>
                </div>
                <div style={{borderTop:"1px solid "+brd,paddingTop:8}}>
                  {p.items.map((it,i) => (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13}}>
                      <span style={{color:warm}}>{it.n}</span>
                      <span style={{fontWeight:600,color:it.dir==="they_owe"?"#059669":"#d97706"}}>{it.dir==="they_owe"?"+":"-"}{rs(it.a)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </>)}
 
      <Nt sid="exp" data={d} setData={setData} toast={toast}/>
 
      {/* ─── Add Expense Modal (enhanced with custom split %) ─── */}
      <Md open={ml==="add"} onClose={()=>setMl(null)} title="Add Expense">
        <div style={{display:"grid",gap:10}}>
          <In placeholder="Description" value={fm.n||""} onChange={(e)=>F("n",e.target.value)}/>
          <In placeholder="Amount" type="number" value={fm.a||""} onChange={(e)=>F("a",e.target.value)}/>
          <In type="date" value={fm.d||""} onChange={(e)=>F("d",e.target.value)}/>
          <Se value={fm.l||""} onChange={(e)=>F("l",e.target.value)}>{d.labels.map((l)=>(<option key={l}>{l}</option>))}</Se>
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:warm}}><input type="checkbox" checked={fm.sp||false} onChange={(e)=>F("sp",e.target.checked)}/> Split this expense</label>
          {fm.sp && (<>
            <div style={{fontSize:11,fontWeight:700,color:dim,textTransform:"uppercase",letterSpacing:1}}>Who paid?</div>
            <Se value={fm.paid||"me"} onChange={(e)=>F("paid",e.target.value)}>
              <option value="me">I paid</option>
              {(fm.splitList||[]).map((s) => (<option key={s.name} value={s.name}>{s.name} paid</option>))}
            </Se>
            <div style={{fontSize:11,fontWeight:700,color:dim,textTransform:"uppercase",letterSpacing:1}}>Split with</div>
            {(fm.splitList||[]).map((s, i) => (
              <div key={i} style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{flex:1,padding:"8px 14px",background:"#faf5f0",borderRadius:12,fontSize:13,fontWeight:600,color:txt}}>{s.name}</div>
                <In placeholder="%" type="number" style={{width:70}} value={s.pct} onChange={(e) => updSplitPct(i, e.target.value)}/>
                <span onClick={() => rmSplit(i)} style={{cursor:"pointer",color:dim,fontSize:14}}>{"\u2715"}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:8}}>
              <In placeholder="Person name" value={fm.newPerson||""} onChange={(e)=>F("newPerson",e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&addSplitPerson()}/>
              <Bt color={sky} onClick={addSplitPerson}>Add</Bt>
            </div>
            <div style={{fontSize:11,color:dim,fontStyle:"italic"}}>Leave % blank for equal split. Your share is calculated automatically.</div>
          </>)}
          <Bt solid color={peach} onClick={sv} style={{justifyContent:"center"}}>Save Expense</Bt>
        </div>
      </Md>
      <Md open={ml==="label"} onClose={()=>setMl(null)} title="New Label"><div style={{display:"grid",gap:10}}><In placeholder="Label name" value={fm.nl||""} onChange={(e)=>F("nl",e.target.value)}/><Bt solid color={lav} onClick={sv} style={{justifyContent:"center"}}>Create</Bt></div></Md>
    </div>
  );
}
 
 
/* ═══ GOALS ═══ */
function Gls({ data, setData, toast }) {
  const d = data;
  const [ml, setMl] = useState(null);
  const [fm, setFm] = useState({});
  const [ex, setEx] = useState(null);
  const { ds, de, dd } = useDrag(d.goals, (ng) => setData((x) => ({...x, goals:ng})));
  const F = (k,v) => setFm((f) => ({...f,[k]:v}));
  const sv = () => { setData((x) => ({...x, goals:[...x.goals, {id:Date.now(), n:fm.n, tgt:+fm.tgt, cur:+fm.cur, dl:fm.dl, plan:fm.plan, notes:fm.notes, cat:fm.cat, u:fm.u, streak:0}]})); setMl(null); if(toast)toast("Goal created!",sage); };
  return (
    <div style={{animation:"fadeIn .4s"}}>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:22}}>
        <div><h1 style={{fontSize:26,fontWeight:800,margin:0,color:txt}}>Goals</h1><p style={{color:warm,margin:"3px 0 0",fontSize:14}}>Drag to reorder {"\u00B7"} Click to expand</p></div>
        <Bt color={lav} onClick={() => {setFm({n:"",tgt:"",cur:"",dl:"",plan:"",notes:"",cat:"Personal",u:""});setMl("add")}}>+ Goal</Bt>
      </div>
 
      <Card hover style={{marginBottom:16,padding:16}}>
        <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:txt}}>{"\uD83D\uDCCA"} Progress</div>
        <ResponsiveContainer width="100%" height={Math.max(100,d.goals.length*42)}>
          <BarChart data={d.goals.map((g)=>({n:g.n.slice(0,16),p:Math.round(g.cur/g.tgt*100)}))} layout="vertical"><CartesianGrid stroke="#f5ede6" strokeDasharray="3 3"/><XAxis type="number" domain={[0,100]} stroke={dim} fontSize={11}/><YAxis type="category" dataKey="n" width={120} stroke={dim} fontSize={11}/><Tooltip contentStyle={tt_s} formatter={(v)=>v+"%"}/><Bar dataKey="p" name="Progress" radius={[0,6,6,0]}>{d.goals.map((g,i)=>(<Cell key={i} fill={cC[g.cat]||lav}/>))}</Bar></BarChart>
        </ResponsiveContainer>
      </Card>
 
      {d.goals.length === 0 && <Empty emoji={"\uD83C\uDFAF"} msg="No goals yet \u2014 set your first one!"/>}
      <div style={{display:"grid",gap:12}}>
        {d.goals.map((g, idx) => { const p = Math.round(g.cur/g.tgt*100); const isE = ex === g.id; return (
          <div key={g.id} draggable onDragStart={() => ds(idx)} onDragEnter={() => de(idx)} onDragEnd={dd} onDragOver={(e) => e.preventDefault()}>
            <div style={{background:cG[g.cat]||cG.Personal,borderRadius:20,padding:2}}>
              <div style={{background:card,borderRadius:18,padding:"16px 18px"}}>
                <div style={{display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={() => setEx(isE?null:g.id)}>
                  <div style={{display:"flex",gap:10,flex:1,alignItems:"flex-start"}}>
                    <span style={{cursor:"grab",opacity:.3,paddingTop:3,fontSize:16}}>{"\u2807"}</span>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginBottom:7}}>
                        <b style={{fontSize:14,color:txt}}>{g.n}</b><Bg color={cC[g.cat]}>{g.cat}</Bg>
                        {g.streak > 0 && <span style={{fontSize:11,color:"#d97706",fontWeight:700}}>{"\uD83D\uDD25"} {g.streak}d streak</span>}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}><div style={{flex:1,maxWidth:350}}><PB v={p} color={cC[g.cat]}/></div><b style={{fontSize:14,color:cC[g.cat]}}>{p}%</b></div>
                      <div style={{fontSize:12,color:dim}}>{g.cur}{g.u?" "+g.u:""} / {g.tgt}{g.u?" "+g.u:""} {"\u00B7"} {g.dl}</div>
                    </div>
                  </div>
                  <span style={{color:dim,transform:isE?"rotate(180deg)":"",transition:"transform .2s"}}>{"\u25BE"}</span>
                </div>
                {isE && (
                  <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid "+brd}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                      <div><div style={{fontSize:11,color:dim,fontWeight:700,marginBottom:4}}>PLAN</div><div style={{background:"#faf5f0",borderRadius:10,padding:10,fontSize:13,color:txt}}>{g.plan||"\u2014"}</div></div>
                      <div><div style={{fontSize:11,color:dim,fontWeight:700,marginBottom:4}}>NOTES</div><div style={{background:"#faf5f0",borderRadius:10,padding:10,fontSize:13,color:txt}}>{g.notes||"\u2014"}</div></div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <In type="number" placeholder="Update progress" style={{width:140}} onKeyDown={(e) => {if(e.key==="Enter"&&e.target.value){setData((x)=>({...x,goals:x.goals.map((y)=>y.id===g.id?{...y,cur:+e.target.value}:y)}));e.target.value="";if(toast)toast("Progress updated!",cC[g.cat])}}}/>
                      <span style={{fontSize:12,color:dim}}>Enter {"\u21B5"}</span>
                      <div style={{flex:1}}/><Bt color={rose} onClick={() => {setData((x) => ({...x, goals:x.goals.filter((y) => y.id !== g.id)})); if(toast)toast("Goal removed",rose)}}>{"\uD83D\uDDD1"} Remove</Bt>
                    </div>
                    <Nt sid={"g"+g.id} data={d} setData={setData} toast={toast}/>
                  </div>
                )}
              </div>
            </div>
          </div>
        );})}
      </div>
      <Md open={ml==="add"} onClose={() => setMl(null)} title="New Goal"><div style={{display:"grid",gap:10}}><In placeholder="Goal name" value={fm.n||""} onChange={(e) => F("n",e.target.value)}/><Se value={fm.cat||"Personal"} onChange={(e) => F("cat",e.target.value)}>{["Financial","Career","Health","Personal"].map((c)=>(<option key={c}>{c}</option>))}</Se><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}><In placeholder="Target" type="number" value={fm.tgt||""} onChange={(e) => F("tgt",e.target.value)}/><In placeholder="Current" type="number" value={fm.cur||""} onChange={(e) => F("cur",e.target.value)}/><In placeholder="Unit" value={fm.u||""} onChange={(e) => F("u",e.target.value)}/></div><In placeholder="Deadline" value={fm.dl||""} onChange={(e) => F("dl",e.target.value)}/><In placeholder="Plan" value={fm.plan||""} onChange={(e) => F("plan",e.target.value)}/><Bt solid color={lav} onClick={sv} style={{justifyContent:"center"}}>Create</Bt></div></Md>
    </div>
  );
}
 
/* ═══ PROJECTS ═══ */
function Prj({ data, setData, toast }) {
  const d = data;
  const [ml, setMl] = useState(null);
  const [fm, setFm] = useState({});
  const [ex, setEx] = useState(null);
  const [nt2, setNt2] = useState("");
  const { ds, de, dd } = useDrag(d.proj, (np) => setData((x) => ({...x, proj:np})));
  const F = (k,v) => setFm((f) => ({...f,[k]:v}));
  const sv = () => { setData((x) => ({...x, proj:[...x.proj, {id:Date.now(), n:fm.n, st:fm.st, pri:fm.pri, dl:fm.dl, prog:0, tasks:[], notes:fm.notes}]})); setMl(null); if(toast)toast("Project created!",sky); };
  const tog = (pid,tid) => setData((x) => ({...x, proj:x.proj.map((p) => { if(p.id!==pid) return p; const ts=p.tasks.map((k)=>k.id===tid?{...k,d:!k.d}:k); return {...p,tasks:ts,prog:ts.length?Math.round(ts.filter((k)=>k.d).length/ts.length*100):0}; })}));
  const addT = (pid) => { if(!nt2.trim())return; setData((x)=>({...x,proj:x.proj.map((p)=>{if(p.id!==pid)return p; const ts=[...p.tasks,{id:Date.now(),t:nt2.trim(),d:false}]; return{...p,tasks:ts,prog:Math.round(ts.filter((k)=>k.d).length/ts.length*100)}; })})); setNt2(""); if(toast)toast("Task added!",sky); };
 
  return (
    <div style={{animation:"fadeIn .4s"}}>
      <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:22}}>
        <div><h1 style={{fontSize:26,fontWeight:800,margin:0,color:txt}}>Projects</h1><p style={{color:warm,margin:"3px 0 0",fontSize:14}}>Drag to reorder {"\u00B7"} Click to expand</p></div>
        <Bt color={sky} onClick={() => {setFm({n:"",st:"Planning",pri:"Medium",dl:"",notes:""});setMl("add")}}>+ Project</Bt>
      </div>
 
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14,marginBottom:18}}>
        <MiniCal data={d}/>
        <TaskCols data={d}/>
      </div>
 
      {d.proj.length === 0 && <Empty emoji={"\uD83D\uDE80"} msg="No projects yet \u2014 start building!"/>}
      <div style={{display:"grid",gap:12}}>
        {d.proj.map((p, idx) => { const isE = ex === p.id; const sc = sC[p.st] || sC.Planning; return (
          <div key={p.id} draggable onDragStart={() => ds(idx)} onDragEnter={() => de(idx)} onDragEnd={dd} onDragOver={(e) => e.preventDefault()}>
            <Card hover style={{borderLeft:"4px solid "+sc[0],boxShadow:"0 0 16px "+sc[0]+"08"}}>
              <div style={{display:"flex",justifyContent:"space-between",cursor:"pointer"}} onClick={() => setEx(isE?null:p.id)}>
                <div style={{display:"flex",gap:10,flex:1,alignItems:"flex-start"}}>
                  <span style={{cursor:"grab",opacity:.3,paddingTop:3,fontSize:16}}>{"\u2807"}</span>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginBottom:7}}><b style={{fontSize:14,color:txt}}>{sc[1]} {p.n}</b><Bg color={sc[0]}>{p.st}</Bg><Bg color={pC[p.pri]}>{p.pri}</Bg></div>
                    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}><div style={{flex:1,maxWidth:350}}><PB v={p.prog} color={sc[0]}/></div><b style={{fontSize:14,color:sc[0]}}>{p.prog}%</b></div>
                    <div style={{fontSize:12,color:dim}}>{p.tasks.filter((x)=>x.d).length}/{p.tasks.length} tasks {"\u00B7"} Due {p.dl}</div>
                  </div>
                </div>
                <span style={{color:dim,transform:isE?"rotate(180deg)":"",transition:"transform .2s"}}>{"\u25BE"}</span>
              </div>
              {isE && (
                <div style={{marginTop:14,paddingTop:14,borderTop:"1px solid "+brd}}>
                  <div style={{display:"flex",gap:7,marginBottom:14,flexWrap:"wrap"}}>{Object.entries(sC).map(([s,cfg]) => (<Bt key={s} color={cfg[0]} solid={p.st===s} onClick={() => setData((x)=>({...x,proj:x.proj.map((y)=>y.id===p.id?{...y,st:s}:y)}))}>{cfg[1]} {s}</Bt>))}</div>
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,color:dim,fontWeight:700,marginBottom:6}}>TASKS</div>
                    {p.tasks.map((tk) => (
                      <div key={tk.id} onClick={() => tog(p.id,tk.id)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+brd+"40",cursor:"pointer"}}>
                        <div style={{width:22,height:22,borderRadius:7,border:"2px solid "+(tk.d?sage:brd),background:tk.d?sage+"18":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:sage,fontWeight:800,transition:"all .2s"}}>{tk.d&&"\u2713"}</div>
                        <span style={{fontSize:13,color:tk.d?dim:txt,textDecoration:tk.d?"line-through":"none",transition:"all .2s"}}>{tk.t}</span>
                      </div>
                    ))}
                    <div style={{display:"flex",gap:8,marginTop:8}}><In placeholder="Add task..." value={nt2} onChange={(e) => setNt2(e.target.value)} onKeyDown={(e) => e.key==="Enter"&&addT(p.id)}/><Bt solid color={sky} onClick={() => addT(p.id)}>Add</Bt></div>
                  </div>
                  {p.notes && <div style={{background:"#faf5f0",borderRadius:10,padding:"8px 12px",fontSize:13,color:warm,marginBottom:10}}>{"\uD83D\uDCA1"} {p.notes}</div>}
                  <div style={{display:"flex",justifyContent:"flex-end"}}><Bt color={rose} onClick={() => {setData((x)=>({...x,proj:x.proj.filter((y)=>y.id!==p.id)})); if(toast)toast("Project deleted",rose)}}>{"\uD83D\uDDD1"} Delete</Bt></div>
                  <Nt sid={"p"+p.id} data={d} setData={setData} toast={toast}/>
                </div>
              )}
            </Card>
          </div>
        );})}
      </div>
      <Md open={ml==="add"} onClose={() => setMl(null)} title="New Project"><div style={{display:"grid",gap:10}}><In placeholder="Project name" value={fm.n||""} onChange={(e) => F("n",e.target.value)}/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Se value={fm.st||"Planning"} onChange={(e) => F("st",e.target.value)}>{["Planning","In Progress","Review","On Hold"].map((s)=>(<option key={s}>{s}</option>))}</Se><Se value={fm.pri||"Medium"} onChange={(e) => F("pri",e.target.value)}>{["High","Medium","Low"].map((p2)=>(<option key={p2}>{p2}</option>))}</Se></div><In placeholder="Deadline" value={fm.dl||""} onChange={(e) => F("dl",e.target.value)}/><In placeholder="Notes" value={fm.notes||""} onChange={(e) => F("notes",e.target.value)}/><Bt solid color={sky} onClick={sv} style={{justifyContent:"center"}}>Create</Bt></div></Md>
    </div>
  );
}
 
 
/* ═══ APP SHELL ═══ */
/* ═══ ADMIN DASHBOARD ═══ */
function Admin({ supabase, toast }) {
  const [users, setUsers] = useState([]);
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
 
  useEffect(() => { loadUsers(); }, []);
 
  const loadUsers = async () => {
    setLoading(true);
    // Get all profiles
    const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    // Get all user data
    const { data: allData } = await supabase.from("user_data").select("*");
    const dataMap = {};
    (allData || []).forEach((d) => { dataMap[d.user_id] = d; });
 
    const combined = (profiles || []).map((p) => {
      const ud = dataMap[p.id]?.data || {};
      const expTotal = (ud.exp || []).reduce((s, e) => s + (e.a || 0), 0);
      const invTotal = (ud.inv || []).reduce((s, e) => s + (e.v || 0), 0);
      const goalPct = (ud.goals || []).length ? Math.round((ud.goals || []).reduce((s, g) => s + (g.cur / g.tgt) * 100, 0) / ud.goals.length) : 0;
      const projActive = (ud.proj || []).filter((p2) => p2.st !== "Completed").length;
      return {
        ...p,
        userData: ud,
        stats: { expTotal, invTotal, goalPct, projActive, expCount: (ud.exp || []).length, goalCount: (ud.goals || []).length, projCount: (ud.proj || []).length },
        lastUpdate: dataMap[p.id]?.updated_at
      };
    });
    setUsers(combined);
    setLoading(false);
  };
 
  const rs = (n) => "\u20B9" + Number(n || 0).toLocaleString("en-IN");
  const ago = (d) => {
    if (!d) return "Never";
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  };
 
  const selUser = users.find((u) => u.id === sel);
 
  return (
    <div style={{animation:"fadeIn .4s"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:800,margin:0,color:"#3f3f46"}}>{"\uD83D\uDC51"} Admin Dashboard</h1>
          <p style={{color:"#78716c",margin:"3px 0 0",fontSize:14}}>{users.length} users {"\u00B7"} All data visible</p>
        </div>
        <button onClick={loadUsers} style={{padding:"8px 16px",borderRadius:10,border:"1px solid #e5e5e5",background:"#fff",cursor:"pointer",fontSize:13,fontWeight:600,color:"#78716c",fontFamily:"'Outfit',sans-serif"}}>{"\u21BB"} Refresh</button>
      </div>
 
      {loading ? (
        <div style={{textAlign:"center",padding:40,color:"#a1a1aa",fontSize:14}}>Loading users...</div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:sel?"300px 1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
          {/* User List */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {users.map((u) => (
              <div key={u.id} onClick={() => setSel(sel === u.id ? null : u.id)} style={{
                background:sel===u.id?"#eef2ff":"#fff",
                borderRadius:16,padding:"14px 16px",
                border:"1px solid "+(sel===u.id?"#6366f1":"#f0ede9"),
                cursor:"pointer",transition:"all .2s"
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:14}}>
                      {(u.display_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:700,fontSize:14,color:"#3f3f46"}}>{u.display_name || "Unknown"}</div>
                      <div style={{fontSize:11,color:"#a1a1aa"}}>{u.email}</div>
                    </div>
                  </div>
                  {u.is_admin && <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:6,background:"#fef3c7",color:"#92400e"}}>ADMIN</span>}
                </div>
                <div style={{display:"flex",gap:12,fontSize:11,color:"#78716c"}}>
                  <span>{u.stats.expCount} expenses</span>
                  <span>{u.stats.goalCount} goals</span>
                  <span>{u.stats.projCount} projects</span>
                  <span style={{marginLeft:"auto",color:"#a1a1aa"}}>{ago(u.lastUpdate)}</span>
                </div>
              </div>
            ))}
          </div>
 
          {/* Selected User Detail */}
          {selUser && (
            <div style={{background:"#fff",borderRadius:16,padding:"20px 22px",border:"1px solid #f0ede9"}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:20}}>
                  {(selUser.display_name || "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{fontSize:18,fontWeight:800,color:"#3f3f46"}}>{selUser.display_name}</div>
                  <div style={{fontSize:13,color:"#a1a1aa"}}>{selUser.email} {"\u00B7"} Joined {new Date(selUser.created_at).toLocaleDateString("en-IN")}</div>
                </div>
              </div>
 
              {/* Stats Grid */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:10,marginBottom:20}}>
                {[
                  {l:"Expenses",v:rs(selUser.stats.expTotal),c:"#9d174d",bg:"linear-gradient(145deg,#fce7f3,#f9a8d4)"},
                  {l:"Investments",v:rs(selUser.stats.invTotal),c:"#065f46",bg:"linear-gradient(145deg,#d1fae5,#a7f3d0)"},
                  {l:"Goals Avg",v:selUser.stats.goalPct+"%",c:"#5b21b6",bg:"linear-gradient(145deg,#ede9fe,#c4b5fd)"},
                  {l:"Active Projects",v:selUser.stats.projActive+"",c:"#1e40af",bg:"linear-gradient(145deg,#dbeafe,#93c5fd)"},
                ].map((m,i) => (
                  <div key={i} style={{background:m.bg,borderRadius:14,padding:"12px 14px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:m.c,textTransform:"uppercase"}}>{m.l}</div>
                    <div style={{fontSize:18,fontWeight:800,color:m.c,marginTop:3}}>{m.v}</div>
                  </div>
                ))}
              </div>
 
              {/* Recent Expenses */}
              {(selUser.userData.exp || []).length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#a1a1aa",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Recent Expenses</div>
                  {(selUser.userData.exp || []).slice(-5).reverse().map((e, i) => (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f4f2f0",fontSize:13}}>
                      <span style={{color:"#3f3f46",fontWeight:600}}>{e.n}</span>
                      <span style={{fontWeight:700,color:"#3f3f46"}}>{rs(e.a)}</span>
                    </div>
                  ))}
                </div>
              )}
 
              {/* Goals */}
              {(selUser.userData.goals || []).length > 0 && (
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#a1a1aa",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Goals</div>
                  {(selUser.userData.goals || []).map((g, i) => {
                    const p = Math.round((g.cur || 0) / (g.tgt || 1) * 100);
                    return (
                      <div key={i} style={{marginBottom:8}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
                          <span style={{fontWeight:600,color:"#3f3f46"}}>{g.n}</span>
                          <span style={{fontWeight:700,color:p>50?"#059669":"#d97706"}}>{p}%</span>
                        </div>
                        <div style={{height:5,borderRadius:4,background:"#f0ede9",overflow:"hidden"}}>
                          <div style={{height:"100%",width:p+"%",borderRadius:4,background:p>50?"#059669":"#d97706",transition:"width .5s"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
 
              {/* Projects */}
              {(selUser.userData.proj || []).length > 0 && (
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#a1a1aa",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Projects</div>
                  {(selUser.userData.proj || []).map((p, i) => (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #f4f2f0",fontSize:13}}>
                      <span style={{fontWeight:600,color:"#3f3f46"}}>{p.n}</span>
                      <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:8,background:p.st==="Completed"?"#d1fae5":p.st==="In Progress"?"#dbeafe":"#fef3c7",color:p.st==="Completed"?"#065f46":p.st==="In Progress"?"#1e40af":"#92400e"}}>{p.st}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
 
 
/* ═══ APP WITH AUTH ═══ */
export default function App() {
  const auth = useAuth();
 
  if (auth.loading) return <LoadingScreen />;
  if (!auth.user) return <LoginScreen auth={auth} />;
  return <AppInner auth={auth} />;
}
 
function AppInner({ auth }) {
  const [data, setData, dataLoaded] = useSupabaseData(auth?.user, D0);
  const actualData = data || D0;
  const setActualData = setData;
  const [page, setPage] = useState("dash");
  const [mob, setMob] = useState(false);
  const [nav, setNav] = useState(false);
  const { toasts, push } = useToast();
  const isAdmin = auth?.profile?.is_admin;
 
  useEffect(() => { const c = () => setMob(window.innerWidth < 768); c(); window.addEventListener("resize", c); return () => window.removeEventListener("resize", c); }, []);
 
  /* Nav config: grouped with section labels, each icon has unique color */
  const overviewTabs = [
    {id:"dash",l:"Dashboard",e:"\u2302",ic:"#6366f1",ibg:"#eef2ff"},
    {id:"fin",l:"Finance",e:"\u20B9",ic:"#059669",ibg:"#ecfdf5"},
    {id:"exp",l:"Expenses",e:"\u25C8",ic:"#ea580c",ibg:"#fff7ed"},
  ];
  const workTabs = [
    {id:"goals",l:"Goals",e:"\u25CE",ic:"#d97706",ibg:"#fffbeb"},
    {id:"proj",l:"Projects",e:"\u25C7",ic:"#0284c7",ibg:"#f0f9ff"},
  ];
  const allTabs = [...overviewTabs, ...workTabs];
 
  const goPage = (p) => { setPage(p); setNav(false); };
 
  const pg = {
    dash: <Dash data={actualData} setData={setActualData} go={goPage} toast={push}/>,
    fin: <Fin data={actualData} setData={setActualData} toast={push}/>,
    exp: <Exp data={actualData} setData={setActualData} toast={push}/>,
    goals: <Gls data={actualData} setData={setActualData} toast={push}/>,
    proj: <Prj data={actualData} setData={setActualData} toast={push}/>,
    admin: isAdmin ? <Admin supabase={supabase} toast={push}/> : null
  };
 
  const anim = `
    @keyframes fadeIn { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
    @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
    @keyframes slideIn { from { opacity:0; transform:translateX(40px) } to { opacity:1; transform:translateX(0) } }
  `;
 
  /* Nav item — bare icons, Tracker style */
  const NavItem = ({ tab, active, onClick }) => (
    <div onClick={onClick} style={{
      display:"flex",alignItems:"center",gap:12,
      padding:"10px 18px",margin:"1px 10px",borderRadius:10,cursor:"pointer",
      background:active?"#4f6cf0":"transparent",
      color:active?"#fff":"#52525b",
      fontSize:14.5,fontWeight:active?600:500,
      transition:"all .18s ease"
    }}>
      <span style={{fontSize:17,color:active?"#fff":tab.ic,width:22,textAlign:"center",transition:"color .18s"}}>{tab.e}</span>
      {tab.l}
    </div>
  );
 
  const SectionLabel = ({ children, action }) => (
    <div style={{fontSize:10.5,fontWeight:700,color:"#6366f1",textTransform:"uppercase",letterSpacing:1.8,padding:"20px 28px 8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      {children}
      {action && <span style={{fontSize:16,color:dim,cursor:"pointer",lineHeight:1}}>{action}</span>}
    </div>
  );
 
  return (
    <div style={{background:"#f4f2f0",color:txt,minHeight:"100vh",width:"100%",fontFamily:"'Outfit','Nunito',sans-serif",fontSize:14,lineHeight:1.6,overflowX:"hidden"}}>
      <style>{anim}</style>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
 
      {/* Desktop Sidebar */}
      {!mob && (
        <div style={{width:240,background:card,borderRight:"1px solid #f0ede9",position:"fixed",top:0,left:0,bottom:0,zIndex:100,display:"flex",flexDirection:"column"}}>
          {/* Logo + Avatar */}
          <div style={{padding:"20px 20px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:11,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#fff",fontWeight:800}}>{"\u2713"}</div>
              <span style={{fontSize:18,fontWeight:800,color:txt,letterSpacing:-.3}}>LifeOS</span>
            </div>
            <div style={{width:32,height:32,borderRadius:10,border:"1.5px solid #d4d4d8",background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"#a1a1aa",cursor:"pointer"}}>{"\u263A"}</div>
          </div>
 
          {/* Search */}
          <div style={{padding:"0 14px 6px"}}><Search data={actualData} go={goPage}/></div>
 
          {/* Overview section */}
          <SectionLabel>Overview</SectionLabel>
          {overviewTabs.map((t) => (<NavItem key={t.id} tab={t} active={page===t.id} onClick={() => goPage(t.id)}/>))}
 
          {/* Workspace section */}
          <SectionLabel>Workspace</SectionLabel>
          {workTabs.map((t) => (<NavItem key={t.id} tab={t} active={page===t.id} onClick={() => goPage(t.id)}/>))}
 
          {/* Admin section */}
          {isAdmin && (<>
            <SectionLabel>Admin</SectionLabel>
            <NavItem tab={{id:"admin",l:"All Users",e:"\u2605",ic:"#d97706"}} active={page==="admin"} onClick={() => goPage("admin")}/>
          </>)}
 
          <div style={{flex:1}}/>
 
          {/* Bottom actions */}
          <div style={{padding:"10px 12px",borderTop:"1px solid #ebe8e4",display:"flex",flexDirection:"column",gap:2}}>
            <div onClick={() => dlAll(actualData)} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 14px",borderRadius:12,cursor:"pointer",color:warm,fontSize:13,fontWeight:600,transition:"all .2s"}}>
              <span style={{fontSize:17,color:dim,width:22,textAlign:"center"}}>{"\u2B07"}</span>
              Export All
            </div>
            <div style={{display:"flex",alignItems:"center",gap:11,padding:"9px 14px",borderRadius:12,cursor:"pointer",color:warm,fontSize:13,fontWeight:600}}>
              <span style={{fontSize:17,color:dim,width:22,textAlign:"center"}}>{"\u2699"}</span>
              Settings
            </div>
          </div>
        </div>
      )}
 
      {/* Mobile Header */}
      {mob && (
        <>
          <div style={{position:"fixed",top:0,left:0,right:0,zIndex:100,background:"rgba(255,255,255,.92)",backdropFilter:"blur(12px)",borderBottom:"1px solid #ebe8e4",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:32,height:32,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#fff",fontWeight:800}}>{"\u2713"}</div>
              <b style={{fontSize:16,color:txt}}>LifeOS</b>
            </div>
            <span onClick={() => setNav(!nav)} style={{cursor:"pointer",color:txt,fontSize:22,width:36,height:36,borderRadius:10,background:"#f4f2f0",display:"flex",alignItems:"center",justifyContent:"center"}}>{nav ? "\u2715" : "\u2630"}</span>
          </div>
          {nav && (
            <div style={{position:"fixed",inset:0,background:"rgba(255,255,255,.97)",backdropFilter:"blur(16px)",zIndex:200,paddingTop:60}}>
              <SectionLabel>Overview</SectionLabel>
              {overviewTabs.map((t) => (<NavItem key={t.id} tab={t} active={page===t.id} onClick={() => goPage(t.id)}/>))}
              <SectionLabel>Workspace</SectionLabel>
              {workTabs.map((t) => (<NavItem key={t.id} tab={t} active={page===t.id} onClick={() => goPage(t.id)}/>))}
              <div style={{padding:"14px 22px",borderTop:"1px solid #ebe8e4",marginTop:14}}>
                <div onClick={() => dlAll(actualData)} style={{padding:"8px 0",color:warm,fontSize:13,cursor:"pointer"}}>{"\u2B07"} Export All</div>
              </div>
            </div>
          )}
        </>
      )}
 
      {/* Main Content — white card on gray bg */}
      <div style={{marginLeft:mob?0:240,padding:mob?"64px 12px 100px":"20px 28px 40px",position:"relative",zIndex:1}}>
        <div style={{background:"#fff",borderRadius:18,padding:mob?"18px 16px":"28px 32px",minHeight:"calc(100vh - 80px)",boxShadow:"0 1px 4px rgba(0,0,0,.03)"}}>
          {pg[page]}
        </div>
      </div>
 
      {/* Floating Widgets */}
      <FocusTimer/>
      <QuickAdd data={actualData} setData={setActualData} toast={push}/>
      <Toasts toasts={toasts}/>
    </div>
  );
}