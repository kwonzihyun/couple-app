/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc
} from "firebase/firestore";

/* ─── DESIGN TOKENS ─── */
const T = {
  rose:"#E8637A", roseDark:"#C94F64", roseLight:"#FDEEF1", rosePale:"#FDF6F8",
  cream:"#FFFBF9", stone:"#6B5B63", stoneMid:"#9C8A92", stoneLight:"#E8E0E3",
  white:"#FFFFFF", ink:"#2A1F23", sage:"#7BAF8E", gold:"#C9A96E", sky:"#6A9ED4",
};

const GS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'DM Sans',sans-serif;background:#FDF6F8;color:#2A1F23;overscroll-behavior:none}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#E8E0E3;border-radius:3px}
input,textarea,button{font-family:'DM Sans',sans-serif}
textarea{resize:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
.fade-up{animation:fadeUp .35s ease both}
.fade-in{animation:fadeIn .25s ease both}
.spin{animation:spin 1s linear infinite}
.pulse{animation:pulse 2.5s infinite}
`;

const STICKERS = ["❤️","💕","💖","🌹","🌸","🦋","✨","🌙","⭐","🎀","💝","🌺","🍓","🎵","💫","🤍","🫶","😍","🥰","💞","🐰","🐻","🎠","🌈","🎁"];
const MOODS = ["😊","🥰","😢","😠","😌","🤩","😴","🥳"];
const MISSIONS_LIST = [
  "서로에게 칭찬 한마디 보내기 💌",
  "오늘 하늘 사진 찍어서 공유하기 🌤️",
  "오늘 하루 일기 남기기 ✍️",
  "좋아하는 노래 공유하기 🎵",
  "손편지 한 줄 채팅으로 보내기 💕",
  "오늘 먹은 음식 자랑하기 🍱",
  "데이트하고 싶은 장소 공유하기 🗺️",
];
const EVENT_COLORS = [T.rose, T.sky, T.sage, T.gold, "#C77DFF", "#FF9F43"];

const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; };
const fmtDate = (s) => s ? s.replace(/-/g,".") : "";

/* ─── STYLES ─── */
const card = { background:T.white, borderRadius:20, padding:16, marginBottom:12, boxShadow:"0 1px 8px rgba(42,31,35,.07)" };
const btnS = (bg=T.rose, col=T.white) => ({ background:bg, color:col, border:"none", borderRadius:14, padding:"13px 20px", fontWeight:600, fontSize:15, cursor:"pointer", width:"100%", letterSpacing:"-.01em" });
const inp = { width:"100%", border:`1.5px solid ${T.stoneLight}`, borderRadius:12, padding:"11px 14px", fontSize:14, color:T.ink, outline:"none", background:T.white };
const pillS = (active, bg=T.rose) => ({ background:active?bg:T.roseLight, color:active?T.white:T.rose, border:"none", borderRadius:20, padding:"6px 14px", fontWeight:600, fontSize:13, cursor:"pointer", flexShrink:0 });
const navBtn = (active) => ({ display:"flex", flexDirection:"column", alignItems:"center", gap:3, background:"none", border:"none", cursor:"pointer", padding:"4px 10px", borderRadius:12 });

/* ════════════════════════════════════════════ */
export default function App() {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [coupleData, setCoupleData] = useState(null);
  const [showConnect, setShowConnect] = useState(false);
  const [myCode, setMyCode]       = useState("");
  const [myName, setMyName]       = useState("");
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [startDateInput, setStartDateInput]     = useState("");
  const [setupStep, setSetupStep] = useState("code");

  const [tab, setTab]     = useState("home");
  const [modal, setModal] = useState(null);

  // Calendar
  const [calDate, setCalDate] = useState(new Date());
  const [selDay, setSelDay]   = useState(null);
  const [events, setEvents]   = useState({});
  const [eventForm, setEventForm] = useState({ title:"", color:T.rose });

  // Chat
  const [messages, setMessages]   = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEnd = useRef(null);

  // Diary
  const [diaries, setDiaries]       = useState([]);
  const [diaryFilter, setDiaryFilter] = useState("all");
  const [diaryForm, setDiaryForm]   = useState({ title:"", content:"", mood:"😊", sticker:"" });

  // Missions
  const [missionsDone, setMissionsDone] = useState([]);
  const [missionsDate, setMissionsDate] = useState("");

  // ─── AUTH ───
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) await initUser(u);
        else { setCoupleData(null); setShowConnect(false); }
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    });
    return unsub;
  }, []);

  const initUser = async (u) => {
    const ref = doc(db, "users", u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const code = Math.random().toString(36).substring(2,8).toUpperCase();
      await setDoc(ref, { uid:u.uid, name:u.displayName||"나", email:u.email, code, coupleId:null, createdAt:serverTimestamp() });
      setMyCode(code); setMyName(u.displayName||"나");
      setShowConnect(true);
    } else {
      const data = snap.data();
      setMyCode(data.code); setMyName(data.name||u.displayName||"나");
      if (data.coupleId) {
        await loadCoupleData(u.uid, data.coupleId);
        setShowConnect(false);
      } else {
        setShowConnect(true);
      }
    }
  };

  const loadCoupleData = async (myUid, coupleId) => {
    const cSnap = await getDoc(doc(db, "couples", coupleId));
    if (!cSnap.exists()) return;
    const cData = cSnap.data();
    const partnerId = cData.user1===myUid ? cData.user2 : cData.user1;
    const pSnap = await getDoc(doc(db, "users", partnerId));
    const partnerName = pSnap.exists() ? pSnap.data().name : "파트너";
    setCoupleData({ coupleId, partnerId, partnerName, startDate:cData.startDate });

    // 실시간 채팅
    onSnapshot(query(collection(db,"couples",coupleId,"messages"), orderBy("createdAt")), (s) => {
      setMessages(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    // 실시간 일정
    onSnapshot(collection(db,"couples",coupleId,"events"), (s) => {
      const map = {};
      s.docs.forEach(d => {
        const ev = {id:d.id,...d.data()};
        if (!map[ev.dateKey]) map[ev.dateKey]=[];
        map[ev.dateKey].push(ev);
      });
      setEvents(map);
    });
    // 실시간 일기
    onSnapshot(query(collection(db,"couples",coupleId,"diaries"), orderBy("createdAt","desc")), (s) => {
      setDiaries(s.docs.map(d=>({id:d.id,...d.data()})));
    });
    // 미션
    const mSnap = await getDoc(doc(db,"couples",coupleId,"missions","today"));
    if (mSnap.exists() && mSnap.data().date===todayStr()) {
      setMissionsDone(mSnap.data().completed||[]);
      setMissionsDate(mSnap.data().date);
    }
  };

  // ─── LOGIN / LOGOUT ───
  const loginGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch(e) { alert("로그인 실패: " + e.message); }
  };
  const logout = async () => {
    await signOut(auth);
    setCoupleData(null); setMessages([]); setEvents({}); setDiaries([]);
    setTab("home"); setShowConnect(false);
  };

  // ─── COUPLE CONNECT ───
  const connectCouple = async () => {
    if (!partnerCodeInput.trim()) return;
    const snap = await getDocs(collection(db,"users"));
    const pDoc = snap.docs.find(d => d.data().code===partnerCodeInput.toUpperCase());
    if (!pDoc) { alert("코드를 찾을 수 없어요!"); return; }
    if (pDoc.id===user.uid) { alert("본인 코드는 안 돼요!"); return; }
    setSetupStep("date");
  };
  const finishConnect = async () => {
    if (!startDateInput) { alert("날짜를 선택해주세요!"); return; }
    const snap = await getDocs(collection(db,"users"));
    const pDoc = snap.docs.find(d => d.data().code===partnerCodeInput.toUpperCase());
    if (!pDoc) return;
    const cRef = await addDoc(collection(db,"couples"), { user1:user.uid, user2:pDoc.id, startDate:startDateInput, createdAt:serverTimestamp() });
    await updateDoc(doc(db,"users",user.uid), { coupleId:cRef.id });
    await updateDoc(doc(db,"users",pDoc.id), { coupleId:cRef.id });
    await loadCoupleData(user.uid, cRef.id);
    setShowConnect(false);
  };

  // ─── CHAT ───
  const sendMsg = async (text) => {
    const t = text || chatInput;
    if (!t.trim() || !coupleData) return;
    await addDoc(collection(db,"couples",coupleData.coupleId,"messages"), {
      text:t, from:user.uid, fromName:myName, createdAt:serverTimestamp()
    });
    setChatInput("");
  };
  useEffect(() => { chatEnd.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);

  // ─── EVENTS ───
  const addEvent = async () => {
    if (!selDay || !eventForm.title.trim() || !coupleData) return;
    const dateKey = `${calDate.getFullYear()}-${calDate.getMonth()+1}-${selDay}`;
    await addDoc(collection(db,"couples",coupleData.coupleId,"events"), {
      title:eventForm.title, dateKey, color:eventForm.color,
      who:user.uid, whoName:myName, createdAt:serverTimestamp()
    });
    setEventForm({title:"",color:T.rose}); setModal(null);
  };

  // ─── DIARY ───
  const addDiary = async () => {
    if (!diaryForm.content.trim() || !coupleData) return;
    const now = new Date();
    const dateKey = selDay
      ? `${calDate.getFullYear()}-${calDate.getMonth()+1}-${selDay}`
      : `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
    await addDoc(collection(db,"couples",coupleData.coupleId,"diaries"), {
      ...diaryForm, dateKey, who:user.uid, whoName:myName, createdAt:serverTimestamp()
    });
    setDiaryForm({title:"",content:"",mood:"😊",sticker:""}); setModal(null);
  };

  // ─── MISSIONS ───
  const toggleMission = async (i) => {
    if (!coupleData) return;
    const cur = missionsDate===todayStr() ? missionsDone : [];
    const next = cur.includes(i) ? cur.filter(x=>x!==i) : [...cur,i];
    setMissionsDone(next); setMissionsDate(todayStr());
    await setDoc(doc(db,"couples",coupleData.coupleId,"missions","today"), {
      completed:next, date:todayStr(), updatedBy:user.uid
    });
  };

  // ─── D-DAY ───
  const dday = () => {
    if (!coupleData?.startDate) return 1;
    return Math.floor((new Date()-new Date(coupleData.startDate))/86400000)+1;
  };
  const missionDone = missionsDate===todayStr() ? missionsDone : [];
  const todayMissions = MISSIONS_LIST.slice(0,3);

  // ─── CALENDAR ───
  const calDays = () => {
    const y=calDate.getFullYear(), m=calDate.getMonth();
    const first=new Date(y,m,1).getDay(), last=new Date(y,m+1,0).getDate();
    const arr=[]; for(let i=0;i<first;i++) arr.push(null); for(let i=1;i<=last;i++) arr.push(i); return arr;
  };
  const dk = (d) => `${calDate.getFullYear()}-${calDate.getMonth()+1}-${d}`;
  const todayDk = todayStr();

  /* ════ SCREENS ════ */

  // LOADING
  if (loading) return (
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:T.rosePale}}>
      <style>{GS}</style>
      <div style={{textAlign:"center"}}>
        <div className="pulse" style={{fontSize:52,marginBottom:12}}>💕</div>
        <p style={{color:T.stoneMid,fontSize:14}}>불러오는 중...</p>
      </div>
    </div>
  );

  // LOGIN
  if (!user) return (
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",background:`linear-gradient(170deg,${T.roseLight},${T.cream})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,textAlign:"center",position:"relative",overflow:"hidden"}}>
      <style>{GS}</style>
      <div style={{position:"absolute",top:-80,right:-80,width:240,height:240,borderRadius:"50%",background:T.rose,opacity:.05}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:180,height:180,borderRadius:"50%",background:T.rose,opacity:.04}}/>
      <div className="pulse" style={{fontSize:64,marginBottom:8}}>💕</div>
      <h1 className="fade-up" style={{fontFamily:"'DM Serif Display',serif",fontStyle:"italic",fontSize:38,color:T.roseDark,marginBottom:8}}>우리만의 공간</h1>
      <p className="fade-up" style={{color:T.stoneMid,fontSize:14,marginBottom:40,lineHeight:1.7}}>커플을 위한 특별한 일상 기록 앱</p>
      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:10}}>
        <button onClick={loginGoogle} style={{...btnS(T.white,T.ink),border:`1.5px solid ${T.stoneLight}`,display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:15}}>
          <span style={{fontSize:20}}>🔵</span> Google로 시작하기
        </button>
        <button style={{...btnS("#FEE500","#191919"),display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:15,opacity:.5}}>
          <span style={{fontSize:20}}>🟡</span> 카카오 (준비중)
        </button>
      </div>
      <p style={{marginTop:22,fontSize:11,color:T.stoneMid,lineHeight:1.6}}>로그인 시 서비스 이용약관에 동의합니다</p>
    </div>
  );

  // COUPLE CONNECT
  if (showConnect) return (
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",background:`linear-gradient(170deg,${T.roseLight},${T.cream})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,overflow:"hidden"}}>
      <style>{GS}</style>
      <div style={{fontSize:48,marginBottom:8}}>🔗</div>
      <h2 style={{fontFamily:"'DM Serif Display',serif",fontStyle:"italic",fontSize:28,color:T.roseDark,marginBottom:6}}>커플 연결하기</h2>
      <p style={{color:T.stoneMid,fontSize:13,marginBottom:24,lineHeight:1.6,textAlign:"center"}}>파트너와 코드를 교환해서 연결해요</p>
      <div style={{...card,width:"100%",marginBottom:12}}>
        <p style={{fontSize:12,color:T.stoneMid,marginBottom:6}}>📱 내 연결 코드 (파트너에게 공유)</p>
        <div style={{background:T.roseLight,borderRadius:12,padding:"14px",letterSpacing:6,fontSize:24,fontWeight:900,color:T.rose,textAlign:"center"}}>{myCode}</div>
        <p style={{fontSize:11,color:T.stoneMid,marginTop:6,textAlign:"center"}}>이 코드를 파트너에게 보내주세요</p>
      </div>
      <div style={{...card,width:"100%"}}>
        {setupStep==="code" ? (<>
          <p style={{fontSize:12,color:T.stoneMid,marginBottom:6}}>💕 파트너 코드 입력</p>
          <input style={{...inp,letterSpacing:4,textAlign:"center",fontSize:18,marginBottom:12}} placeholder="XXXXXX" value={partnerCodeInput} onChange={e=>setPartnerCodeInput(e.target.value.toUpperCase())}/>
          <button style={btnS()} onClick={connectCouple}>다음 →</button>
        </>) : (<>
          <p style={{fontSize:12,color:T.stoneMid,marginBottom:6}}>📅 사귄 날짜를 선택해주세요</p>
          <input type="date" style={{...inp,marginBottom:12}} value={startDateInput} onChange={e=>setStartDateInput(e.target.value)}/>
          <button style={btnS()} onClick={finishConnect}>💕 연결 완료!</button>
          <button onClick={()=>setSetupStep("code")} style={{marginTop:10,background:"none",border:"none",color:T.stoneMid,fontSize:13,cursor:"pointer",width:"100%"}}>← 뒤로</button>
        </>)}
      </div>
      <button onClick={()=>setShowConnect(false)} style={{marginTop:16,background:"none",border:"none",color:T.rose,fontSize:14,fontWeight:700,cursor:"pointer"}}>나중에 연결하기</button>
      <button onClick={logout} style={{marginTop:10,background:"none",border:"none",color:T.stoneMid,fontSize:12,cursor:"pointer"}}>로그아웃</button>
    </div>
  );

  // MAIN APP
  const tabs = [
    {id:"home",icon:"🏠",label:"홈"},
    {id:"calendar",icon:"📅",label:"달력"},
    {id:"chat",icon:"💬",label:"채팅"},
    {id:"diary",icon:"📖",label:"일기"},
    {id:"settings",icon:"⚙️",label:"설정"},
  ];

  return (
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",background:T.rosePale,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      <style>{GS}</style>
      <div style={{flex:1,overflowY:"auto",paddingBottom:72}}>

        {/* ══ HOME ══ */}
        {tab==="home" && (
          <div className="fade-in">
            <div style={{background:`linear-gradient(145deg,${T.rose},${T.roseDark})`,padding:"52px 20px 28px",color:T.white,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,.07)"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
                <div>
                  <p style={{fontSize:13,opacity:.8,marginBottom:2}}>안녕하세요 👋</p>
                  <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,fontStyle:"italic",marginBottom:18}}>
                    {myName} {coupleData ? `& ${coupleData.partnerName}` : ""}
                  </h2>
                </div>
              </div>
              <div style={{background:"rgba(255,255,255,.18)",borderRadius:18,padding:"16px 20px",backdropFilter:"blur(8px)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <p style={{fontSize:11,opacity:.8,marginBottom:2}}>{coupleData ? "함께한 날" : "오늘부터"}</p>
                  <p style={{fontFamily:"'DM Serif Display',serif",fontSize:50,lineHeight:1,letterSpacing:"-2px"}}>D+{dday()}</p>
                  <p style={{fontSize:11,opacity:.7,marginTop:4}}>{coupleData?.startDate || todayStr()} 시작</p>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="pulse" style={{fontSize:44}}>💑</div>
                  <p style={{fontSize:11,opacity:.8,marginTop:4}}>{new Date().toLocaleDateString("ko-KR",{month:"long",day:"numeric"})}</p>
                </div>
              </div>
            </div>

            {/* 커플 미연결 배너 */}
            {!coupleData && (
              <div onClick={()=>setShowConnect(true)} style={{margin:"12px 16px 0",background:`linear-gradient(135deg,${T.roseLight},${T.white})`,borderRadius:20,padding:16,border:`2px dashed ${T.rose}`,cursor:"pointer",textAlign:"center"}}>
                <p style={{fontWeight:700,color:T.rose,marginBottom:4}}>💕 파트너와 연결하기</p>
                <p style={{fontSize:12,color:T.stoneMid}}>코드를 교환해서 채팅·일정을 함께 써요</p>
              </div>
            )}

            {/* D-day 기념일 */}
            {coupleData && (
              <div style={{padding:"14px 16px 0",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
                {[{l:"100일",t:100},{l:"200일",t:200},{l:"1주년",t:365},{l:"2주년",t:730}]
                  .map(a=>({...a,d:a.t-dday()+1})).filter(a=>a.d>0)
                  .map((a,i)=>(
                    <div key={i} style={{background:T.white,borderRadius:12,padding:"8px 14px",boxShadow:"0 1px 6px rgba(42,31,35,.06)",flexShrink:0,textAlign:"center"}}>
                      <p style={{fontSize:11,color:T.stoneMid}}>{a.l}</p>
                      <p style={{fontWeight:700,color:T.rose,fontSize:13}}>D-{a.d}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* 미션 */}
            <div style={{margin:"12px 16px 0"}}>
              <div style={{...card,marginBottom:0,background:`linear-gradient(135deg,${T.roseLight},${T.white})`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <p style={{fontWeight:700,fontSize:14,color:T.roseDark}}>🌟 오늘의 커플 미션</p>
                  <span style={{fontSize:12,color:T.stoneMid,fontWeight:600}}>{missionDone.length}/3</span>
                </div>
                {todayMissions.map((m,i)=>(
                  <div key={i} onClick={()=>toggleMission(i)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<2?`1px solid ${T.roseLight}`:"none",cursor:"pointer"}}>
                    <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${missionDone.includes(i)?T.rose:T.stoneLight}`,background:missionDone.includes(i)?T.rose:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                      {missionDone.includes(i)&&<span style={{color:"white",fontSize:11,fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:13,color:missionDone.includes(i)?T.stoneMid:T.ink,textDecoration:missionDone.includes(i)?"line-through":"none"}}>{m}</span>
                  </div>
                ))}
                {missionDone.length===3&&<p style={{textAlign:"center",marginTop:10,fontSize:13,color:T.rose,fontWeight:700}}>🎉 오늘 미션 완료!</p>}
              </div>
            </div>

            {/* 빠른 메뉴 */}
            <div style={{padding:"12px 16px 0"}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                {[{icon:"📅",l:"달력",t:"calendar"},{icon:"💬",l:"채팅",t:"chat"},{icon:"📖",l:"일기",t:"diary"},{icon:"⚙️",l:"설정",t:"settings"}].map(m=>(
                  <button key={m.t} onClick={()=>setTab(m.t)} style={{background:T.white,border:"none",borderRadius:16,padding:"14px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,boxShadow:"0 1px 6px rgba(42,31,35,.06)"}}>
                    <span style={{fontSize:22}}>{m.icon}</span>
                    <span style={{fontSize:11,fontWeight:600,color:T.stone}}>{m.l}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 최근 일기 */}
            {diaries.length>0&&(
              <div style={{margin:"12px 16px 0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <p style={{fontWeight:700,fontSize:14}}>최근 일기</p>
                  <button onClick={()=>setTab("diary")} style={{background:"none",border:"none",fontSize:12,color:T.rose,cursor:"pointer",fontWeight:600}}>전체보기 →</button>
                </div>
                <div style={{...card,marginBottom:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{fontSize:13,color:T.stoneMid,fontWeight:500}}>{diaries[0].whoName}</span>
                    <span style={{fontSize:16}}>{diaries[0].mood} {diaries[0].sticker}</span>
                  </div>
                  {diaries[0].title&&<p style={{fontWeight:700,fontSize:14,marginBottom:4}}>{diaries[0].title}</p>}
                  <p style={{fontSize:13,color:T.stone,lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{diaries[0].content}</p>
                </div>
              </div>
            )}
            <div style={{height:12}}/>
          </div>
        )}

        {/* ══ CALENDAR ══ */}
        {tab==="calendar" && (
          <div className="fade-in">
            <div style={{padding:"52px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,fontStyle:"italic"}}>달력</h1>
              {coupleData&&<button onClick={()=>{setSelDay(null);setModal("addEvent");}} style={{...btnS(T.rose),width:"auto",padding:"8px 16px",fontSize:13}}>+ 일정</button>}
            </div>
            <div style={{...card,margin:"0 16px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <button style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:T.stone}} onClick={()=>setCalDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}>‹</button>
                <span style={{fontWeight:700,fontSize:15}}>{calDate.getFullYear()}년 {calDate.getMonth()+1}월</span>
                <button style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:T.stone}} onClick={()=>setCalDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:6}}>
                {["일","월","화","수","목","금","토"].map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:T.stoneMid,padding:"3px 0"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
                {calDays().map((day,i)=>{
                  if(!day) return <div key={i}/>;
                  const key=dk(day);
                  const evs=events[key]||[];
                  const isToday=key===todayDk;
                  return (
                    <div key={i} onClick={()=>{setSelDay(day);setModal("dayDetail");}} style={{aspectRatio:"1",borderRadius:10,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:isToday?T.rose:"transparent",transition:"background .15s",position:"relative"}}>
                      <span style={{fontSize:12,fontWeight:isToday?700:500,color:isToday?T.white:T.ink}}>{day}</span>
                      {evs.length>0&&(
                        <div style={{display:"flex",gap:2,position:"absolute",bottom:3}}>
                          {evs.slice(0,2).map((ev,ei)=><div key={ei} style={{width:4,height:4,borderRadius:"50%",background:isToday?T.white:ev.color}}/>)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 이번 달 일정 목록 */}
            <div style={{padding:"0 16px"}}>
              <p style={{fontWeight:700,fontSize:13,color:T.stoneMid,marginBottom:10}}>이번 달 일정</p>
              {Object.entries(events)
                .filter(([k])=>k.startsWith(`${calDate.getFullYear()}-${calDate.getMonth()+1}-`))
                .flatMap(([k,evs])=>evs.map(ev=>({...ev,dateKey:k})))
                .sort((a,b)=>parseInt(a.dateKey.split("-")[2])-parseInt(b.dateKey.split("-")[2]))
                .map((ev,i)=>(
                  <div key={i} style={{...card,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:3,height:32,borderRadius:4,background:ev.color,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <p style={{fontWeight:600,fontSize:14}}>{ev.title}</p>
                      <p style={{fontSize:11,color:T.stoneMid}}>{ev.whoName} · {ev.dateKey.split("-")[2]}일</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ══ CHAT ══ */}
        {tab==="chat" && (
          <div className="fade-in" style={{display:"flex",flexDirection:"column",height:"calc(100vh - 72px)"}}>
            <div style={{background:T.white,padding:"50px 16px 12px",borderBottom:`1px solid ${T.stoneLight}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${T.roseLight},${T.rose})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💕</div>
              <div>
                <p style={{fontWeight:700,fontSize:15}}>{coupleData?.partnerName||"파트너"}</p>
                <p style={{fontSize:12,color:coupleData?T.sage:T.stoneMid}}>{coupleData?"● 연결됨":"파트너 미연결"}</p>
              </div>
            </div>
            {!coupleData ? (
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:30,textAlign:"center"}}>
                <p style={{fontSize:40,marginBottom:12}}>💬</p>
                <p style={{fontWeight:700,fontSize:15,marginBottom:6}}>파트너와 연결 후 이용 가능해요</p>
                <p style={{color:T.stoneMid,fontSize:13,marginBottom:20}}>코드를 교환해서 연결해보세요</p>
                <button onClick={()=>setShowConnect(true)} style={{...btnS(),width:"auto",padding:"12px 24px"}}>연결하러 가기</button>
              </div>
            ) : (
              <>
                <div style={{flex:1,overflowY:"auto",padding:"16px 16px 0",display:"flex",flexDirection:"column",gap:10}}>
                  {messages.length===0&&(
                    <div style={{textAlign:"center",padding:"40px 20px",color:T.stoneMid}}>
                      <p style={{fontSize:32,marginBottom:8}}>💬</p>
                      <p style={{fontSize:14}}>첫 메시지를 보내보세요!</p>
                    </div>
                  )}
                  {messages.map(msg=>{
                    const isMe=msg.from===user.uid;
                    return (
                      <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
                        {!isMe&&<span style={{fontSize:11,color:T.stoneMid,marginBottom:3}}>{msg.fromName}</span>}
                        <div style={{maxWidth:"75%",padding:"10px 14px",borderRadius:18,fontSize:14,lineHeight:1.5,background:isMe?T.rose:T.white,color:isMe?T.white:T.ink,borderBottomRightRadius:isMe?4:18,borderBottomLeftRadius:isMe?18:4,boxShadow:"0 1px 4px rgba(42,31,35,.07)"}}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEnd}/>
                </div>
                <div style={{padding:"10px 12px",background:T.white,borderTop:`1px solid ${T.stoneLight}`,display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                  <button onClick={()=>setModal("sticker")} style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}}>😊</button>
                  <input style={{...inp,flex:1}} placeholder="메시지 입력..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()}/>
                  <button onClick={()=>sendMsg()} style={{background:T.rose,border:"none",borderRadius:12,width:40,height:40,color:"white",fontSize:18,cursor:"pointer",flexShrink:0}}>↑</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ DIARY ══ */}
        {tab==="diary" && (
          <div className="fade-in">
            <div style={{padding:"52px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,fontStyle:"italic"}}>일기</h1>
              <button onClick={()=>{setSelDay(null);setModal("addDiary");}} style={{...btnS(T.rose),width:"auto",padding:"8px 16px",fontSize:13}}>+ 쓰기</button>
            </div>
            {coupleData&&(
              <div style={{padding:"0 16px 12px",display:"flex",gap:8}}>
                {[{id:"all",l:"전체"},{id:"me",l:"내 일기"},{id:"partner",l:`${coupleData.partnerName} 일기`}].map(f=>(
                  <button key={f.id} onClick={()=>setDiaryFilter(f.id)} style={pillS(diaryFilter===f.id)}>{f.l}</button>
                ))}
              </div>
            )}
            {diaries.filter(d=>diaryFilter==="all"||(diaryFilter==="me"?d.who===user.uid:d.who!==user.uid)).length===0 ? (
              <div style={{textAlign:"center",padding:"60px 20px"}}>
                <div style={{fontSize:52,marginBottom:12}}>✍️</div>
                <p style={{fontWeight:700,fontSize:15,marginBottom:6}}>일기가 없어요</p>
                <button onClick={()=>setModal("addDiary")} style={{...btnS(),width:"auto",padding:"12px 24px",marginTop:8}}>첫 일기 쓰기</button>
              </div>
            ) : (
              <div style={{padding:"0 16px"}}>
                {diaries.filter(d=>diaryFilter==="all"||(diaryFilter==="me"?d.who===user.uid:d.who!==user.uid)).map(d=>(
                  <div key={d.id} style={{...card}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:30,height:30,borderRadius:"50%",background:d.who===user.uid?T.rose+"22":T.sky+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:d.who===user.uid?T.rose:T.sky}}>
                          {(d.whoName||"?")[0]}
                        </div>
                        <div>
                          <p style={{fontWeight:600,fontSize:13}}>{d.whoName}</p>
                          <p style={{fontSize:11,color:T.stoneMid}}>{fmtDate(d.dateKey)}</p>
                        </div>
                      </div>
                      <span style={{fontSize:18}}>{d.mood} {d.sticker}</span>
                    </div>
                    {d.title&&<p style={{fontWeight:700,fontSize:15,marginBottom:6,borderLeft:`3px solid ${d.who===user.uid?T.rose:T.sky}`,paddingLeft:10}}>{d.title}</p>}
                    <p style={{fontSize:13,color:T.stone,lineHeight:1.7,paddingLeft:d.title?13:0}}>{d.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab==="settings" && (
          <div className="fade-in">
            <div style={{padding:"52px 16px 12px"}}>
              <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,fontStyle:"italic"}}>설정</h1>
            </div>
            <div style={{...card,margin:"0 16px 12px"}}>
              <p style={{fontWeight:700,fontSize:14,marginBottom:12}}>👤 내 정보</p>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                {user.photoURL&&<img src={user.photoURL} alt="" style={{width:48,height:48,borderRadius:"50%",objectFit:"cover"}}/>}
                <div>
                  <p style={{fontWeight:700,fontSize:15}}>{myName}</p>
                  <p style={{fontSize:12,color:T.stoneMid}}>{user.email}</p>
                </div>
              </div>
              <p style={{fontSize:12,color:T.stoneMid,marginBottom:4}}>내 연결 코드</p>
              <div style={{background:T.roseLight,borderRadius:12,padding:"10px",letterSpacing:4,fontSize:18,fontWeight:900,color:T.rose,textAlign:"center"}}>{myCode}</div>
            </div>
            {coupleData&&(
              <div style={{...card,margin:"0 16px 12px"}}>
                <p style={{fontWeight:700,fontSize:14,marginBottom:12}}>💕 커플 정보</p>
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.roseLight}`}}>
                  <span style={{color:T.stoneMid,fontSize:13}}>파트너</span>
                  <span style={{fontWeight:600,fontSize:13}}>{coupleData.partnerName}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.roseLight}`}}>
                  <span style={{color:T.stoneMid,fontSize:13}}>사귄 날짜</span>
                  <span style={{fontWeight:600,fontSize:13}}>{fmtDate(coupleData.startDate)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0"}}>
                  <span style={{color:T.stoneMid,fontSize:13}}>함께한 날</span>
                  <span style={{fontWeight:700,fontSize:13,color:T.rose}}>D+{dday()}</span>
                </div>
              </div>
            )}
            <div style={{padding:"0 16px"}}>
              <button onClick={logout} style={{...btnS(T.roseLight,T.rose)}}>로그아웃</button>
            </div>
          </div>
        )}

      </div>

      {/* NAV */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:T.white,borderTop:`1px solid ${T.stoneLight}`,display:"flex",justifyContent:"space-around",padding:"10px 0 18px",zIndex:50,boxShadow:"0 -2px 12px rgba(42,31,35,.06)"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={navBtn(tab===t.id)}>
            <span style={{fontSize:22,transform:tab===t.id?"scale(1.15)":"scale(1)",transition:"transform .2s"}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:tab===t.id?T.rose:T.stoneMid}}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* MODALS */}
      {modal&&(
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(42,31,35,.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"28px 28px 0 0",padding:24,width:"100%",maxWidth:430,maxHeight:"85vh",overflowY:"auto",animation:"fadeUp .3s ease"}}>

            {/* DAY DETAIL */}
            {modal==="dayDetail"&&selDay&&(<>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
                <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,fontStyle:"italic"}}>{calDate.getMonth()+1}월 {selDay}일</h3>
                <button style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}} onClick={()=>setModal(null)}>×</button>
              </div>
              <p style={{fontWeight:700,fontSize:13,color:T.stoneMid,marginBottom:8}}>📌 일정</p>
              {(events[dk(selDay)]||[]).length===0&&<p style={{fontSize:13,color:T.stoneMid,marginBottom:12}}>일정이 없어요</p>}
              {(events[dk(selDay)]||[]).map((ev,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.roseLight}`}}>
                  <div style={{width:3,height:24,borderRadius:4,background:ev.color}}/>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:600,fontSize:13}}>{ev.title}</p>
                    <p style={{fontSize:11,color:T.stoneMid}}>{ev.whoName}</p>
                  </div>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:14}}>
                {coupleData&&<button onClick={()=>setModal("addEvent")} style={{...btnS(T.roseLight,T.rose),fontSize:13,padding:"9px"}}>+ 일정</button>}
                <button onClick={()=>setModal("addDiary")} style={{...btnS(T.roseLight,T.rose),fontSize:13,padding:"9px"}}>✍️ 일기</button>
              </div>
            </>)}

            {/* ADD EVENT */}
            {modal==="addEvent"&&(<>
              <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,fontStyle:"italic",marginBottom:18}}>일정 추가</h3>
              <p style={{fontSize:12,color:T.stoneMid,marginBottom:6}}>색상 선택</p>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                {EVENT_COLORS.map(c=>(
                  <div key={c} onClick={()=>setEventForm(f=>({...f,color:c}))} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",border:eventForm.color===c?"3px solid #333":"2px solid transparent"}}/>
                ))}
              </div>
              <p style={{fontSize:12,color:T.stoneMid,marginBottom:6}}>일정 제목</p>
              <input style={{...inp,marginBottom:16}} placeholder="예: 영화 데이트 🎬" value={eventForm.title} onChange={e=>setEventForm(f=>({...f,title:e.target.value}))}/>
              <button style={btnS()} onClick={addEvent}>추가하기</button>
            </>)}

            {/* ADD DIARY */}
            {modal==="addDiary"&&(<>
              <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,fontStyle:"italic",marginBottom:18}}>일기 쓰기</h3>
              <p style={{fontSize:12,color:T.stoneMid,marginBottom:8}}>오늘 기분은?</p>
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                {MOODS.map(m=>(
                  <span key={m} onClick={()=>setDiaryForm(d=>({...d,mood:m}))} style={{fontSize:24,cursor:"pointer",opacity:diaryForm.mood===m?1:.35,transform:diaryForm.mood===m?"scale(1.2)":"scale(1)",transition:"all .2s"}}>{m}</span>
                ))}
              </div>
              <input style={{...inp,marginBottom:8}} placeholder="제목 (선택)" value={diaryForm.title} onChange={e=>setDiaryForm(d=>({...d,title:e.target.value}))}/>
              <textarea style={{...inp,minHeight:110,marginBottom:10}} placeholder="오늘 어떤 하루였나요? 💕" value={diaryForm.content} onChange={e=>setDiaryForm(d=>({...d,content:e.target.value}))}/>
              <p style={{fontSize:12,color:T.stoneMid,marginBottom:8}}>스티커</p>
              <div style={{display:"flex",overflowX:"auto",gap:8,paddingBottom:8,marginBottom:14,scrollbarWidth:"none"}}>
                {STICKERS.map(st=><span key={st} onClick={()=>setDiaryForm(d=>({...d,sticker:st}))} style={{fontSize:24,cursor:"pointer",opacity:diaryForm.sticker===st?1:.4,flexShrink:0}}>{st}</span>)}
              </div>
              <button style={btnS()} onClick={addDiary}>저장하기</button>
            </>)}

            {/* STICKER */}
            {modal==="sticker"&&(<>
              <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,fontStyle:"italic",marginBottom:14}}>스티커 보내기</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
                {STICKERS.map(st=>(
                  <span key={st} onClick={()=>{sendMsg(st);setModal(null);}} style={{fontSize:30,cursor:"pointer",textAlign:"center"}}>{st}</span>
                ))}
              </div>
            </>)}

          </div>
        </div>
      )}
    </div>
  );
}
