/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect, useCallback } from "react";
import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc
} from "firebase/firestore";

/* ─── CLOUDINARY ─── */
const CLOUD = "dhyikflzd";
const PRESET = "lx1bc92x";
const uploadImg = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", PRESET);
  fd.append("cloud_name", CLOUD);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method:"POST", body:fd });
  const d = await r.json();
  if (!d.secure_url) throw new Error(d.error?.message || "업로드 실패");
  return d.secure_url;
};

/* ─── THEMES ─── */
const THEMES = {
  rose:     { name:"🌸 로즈",    p:"#D4607A", d:"#B04060", l:"#FEF0F3", pale:"#FDF7F8", sub:"#9C8088", border:"#EAD8DC", card:"#FFFFFF", nav:"#FFFFFF", text:"#1E1215", grad:"linear-gradient(135deg,#E8637A,#C04060)" },
  gold:     { name:"✨ 골드",    p:"#C09050", d:"#906830", l:"#FDF4E3", pale:"#FEFBF5", sub:"#9C8460", border:"#E8D8B0", card:"#FFFFFF", nav:"#FFFFFF", text:"#1E170A", grad:"linear-gradient(135deg,#D4A060,#A06830)" },
  lavender: { name:"💜 라벤더",  p:"#8860C0", d:"#6040A0", l:"#F2EAFF", pale:"#F8F5FF", sub:"#806898", border:"#D8C8F0", card:"#FFFFFF", nav:"#FFFFFF", text:"#1A1228", grad:"linear-gradient(135deg,#9870D0,#6040A0)" },
  sage:     { name:"🌿 세이지",  p:"#508870", d:"#306850", l:"#E8F4EE", pale:"#F4FAF6", sub:"#607868", border:"#C0D8C8", card:"#FFFFFF", nav:"#FFFFFF", text:"#101E16", grad:"linear-gradient(135deg,#60A880,#306850)" },
  midnight: { name:"🌙 미드나잇",p:"#E8607A", d:"#C04060", l:"#281828", pale:"#180F18", sub:"#A090A8", border:"#382848", card:"#221530", nav:"#180F18", text:"#F0E8F4", grad:"linear-gradient(135deg,#E8607A,#C04060)" },
};

const STICKERS = ["❤️","💕","💖","🌹","🌸","🦋","✨","🌙","⭐","🎀","💝","🌺","🍓","🎵","💫","🤍","🫶","😍","🥰","💞","🐰","🐻","🎠","🌈","🎁","💌","🫧","🍰","☁️","🌷"];
const MOODS   = ["😊","🥰","😢","😤","😌","🤩","😴","🥳","😇","🤭"];
const MISSIONS = ["서로에게 칭찬 보내기 💌","오늘 하늘 사진 공유 🌤️","오늘 일기 남기기 ✍️","좋아하는 노래 공유 🎵","손편지 한 줄 보내기 💕","오늘 먹은 음식 자랑 🍱","데이트 장소 공유 🗺️","최근 사진 보내주기 📸","오늘 좋았던 일 공유 ☀️"];
const EV_COLORS = ["#D4607A","#4A90D9","#50A870","#C09050","#8860C0","#E07040"];
const DAYS_KR = ["일","월","화","수","목","금","토"];

const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; };
const fmtDate  = s => s ? s.replace(/-/g,".") : "";
const fmtMonthDay = s => { if(!s) return ""; const p=s.split("-"); return `${p[1]}월 ${p[2]}일`; };

export default function App() {
  const [user, setUser]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [couple, setCouple]         = useState(null); // { coupleId, partnerId, partnerName, startDate }
  const [showConnect, setShowConnect] = useState(false);
  const [myCode, setMyCode]         = useState("");
  const [myName, setMyName]         = useState("");
  const [myAvatar, setMyAvatar]     = useState(null);
  const [partnerAvatar, setPartnerAvatar] = useState(null);
  const [sharedBg, setSharedBg]     = useState(null);
  const [codeInput, setCodeInput]   = useState("");
  const [dateInput, setDateInput]   = useState("");
  const [setupStep, setSetupStep]   = useState("code");

  const [tab, setTab]   = useState("home");
  const [modal, setModal] = useState(null);
  const [themeKey, setThemeKey] = useState("rose");
  const T = { ...THEMES[themeKey] };

  // Calendar
  const [calDate, setCalDate] = useState(new Date());
  const [selDay, setSelDay]   = useState(null);
  const [events, setEvents]   = useState({});
  const [eventForm, setEventForm] = useState({ title:"", color:"#D4607A" });
  const [editEvent, setEditEvent] = useState(null);

  // Chat
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatEnd = useRef(null);

  // Diary
  const [diaries, setDiaries]     = useState([]);
  const [diaryFilter, setDiaryFilter] = useState("all");
  const [diaryForm, setDiaryForm] = useState({ title:"", content:"", mood:"😊", sticker:"", photoUrl:"" });
  const [editDiary, setEditDiary] = useState(null);

  // Photos
  const [photos, setPhotos]     = useState([]);
  const [albums, setAlbums]     = useState([{id:"default",name:"우리의 추억"}]);
  const [selAlbum, setSelAlbum] = useState("default");
  const [albumForm, setAlbumForm] = useState({ name:"" });
  const [photoDateInput, setPhotoDateInput] = useState(todayStr());

  // Missions
  const [missionsDone, setMissionsDone] = useState([]);
  const [missionsDate, setMissionsDate] = useState("");
  const [customMissions, setCustomMissions] = useState([]);
  const [missionMode, setMissionMode] = useState("random");
  const [newMission, setNewMission] = useState("");

  // Online
  const [partnerOnline, setPartnerOnline] = useState(false);

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [diaryUploading, setDiaryUploading] = useState(false);

  // Settings
  const [nameInput, setNameInput] = useState("");
  const [settingsTab, setSettingsTab] = useState("profile");

  // Refs
  const bgRef        = useRef(null);
  const photoRef     = useRef(null);
  const chatPhotoRef = useRef(null);
  const avatarRef    = useRef(null);
  const diaryPhotoRef = useRef(null);

  /* ── COMPUTED ── */
  const card  = { background:T.card, borderRadius:20, padding:16, marginBottom:12, boxShadow:`0 2px 16px ${T.text}09` };
  const btnPrimary = (w="100%") => ({ background:T.grad, color:"#fff", border:"none", borderRadius:14, padding:"14px 20px", fontWeight:700, fontSize:15, cursor:"pointer", width:w, letterSpacing:"-.01em", boxShadow:`0 4px 14px ${T.p}44` });
  const btnLight = (w="100%") => ({ background:T.l, color:T.p, border:"none", borderRadius:14, padding:"13px 20px", fontWeight:600, fontSize:14, cursor:"pointer", width:w });
  const btnGhost = (w="100%") => ({ background:"none", color:T.sub, border:`1.5px solid ${T.border}`, borderRadius:14, padding:"12px 20px", fontWeight:600, fontSize:14, cursor:"pointer", width:w });
  const inp   = { width:"100%", border:`1.5px solid ${T.border}`, borderRadius:14, padding:"13px 16px", fontSize:15, color:T.text, outline:"none", background:T.card };
  const pill  = (a) => ({ background:a?T.p:T.l, color:a?"#fff":T.p, border:"none", borderRadius:20, padding:"7px 16px", fontWeight:600, fontSize:13, cursor:"pointer", flexShrink:0 });

  const GS = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&family=Pretendard:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body,#root{height:100%;overflow:hidden}
    body{font-family:'Pretendard',sans-serif;background:${T.pale};color:${T.text};overscroll-behavior:none;-webkit-font-smoothing:antialiased}
    ::-webkit-scrollbar{width:2px}::-webkit-scrollbar-thumb{background:${T.border};border-radius:2px}
    input,textarea,button,select{font-family:'Pretendard',sans-serif;color:${T.text}}
    textarea{resize:none}
    input[type=date]{-webkit-appearance:none;appearance:none}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
    @keyframes shimmer{0%{opacity:.6}50%{opacity:1}100%{opacity:.6}}
    .fu{animation:fadeUp .4s cubic-bezier(.16,1,.3,1) both}
    .fi{animation:fadeIn .25s ease both}
    .spin{animation:spin 1s linear infinite}
    .pulse{animation:pulse 2.8s ease-in-out infinite}
    .shimmer{animation:shimmer 2s ease-in-out infinite}
  `;

  /* ── AUTH ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      try { setUser(u); if(u) await initUser(u); else { setCouple(null); setShowConnect(false); } }
      catch(e) { console.error(e); } finally { setLoading(false); }
    });
    return unsub;
  }, []);

  /* ── PRESENCE ── */
  useEffect(() => {
    if (!user) return;
    const ref = doc(db,"presence",user.uid);
    const update = () => setDoc(ref,{ online:true, lastSeen:serverTimestamp() },{ merge:true });
    update();
    const iv = setInterval(update, 30000);
    const bye = () => setDoc(ref,{ online:false, lastSeen:serverTimestamp() },{ merge:true });
    window.addEventListener("beforeunload", bye);
    return () => { clearInterval(iv); window.removeEventListener("beforeunload", bye); bye(); };
  }, [user]);

  useEffect(() => {
    if (!couple?.partnerId) return;
    const unsub = onSnapshot(doc(db,"presence",couple.partnerId), snap => {
      if (!snap.exists()) { setPartnerOnline(false); return; }
      const d = snap.data();
      const last = d.lastSeen?.toDate?.();
      setPartnerOnline(d.online && last && (new Date()-last) < 65000);
    });
    return unsub;
  }, [couple]);

  const initUser = async u => {
    const ref  = doc(db,"users",u.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const code = Math.random().toString(36).substring(2,8).toUpperCase();
      await setDoc(ref,{ uid:u.uid, name:u.displayName||"나", email:u.email, photoURL:u.photoURL||"", code, coupleId:null, createdAt:serverTimestamp() });
      setMyCode(code); setMyName(u.displayName||"나"); setMyAvatar(u.photoURL||null);
      setShowConnect(true);
    } else {
      const d = snap.data();
      setMyCode(d.code); setMyName(d.name||u.displayName||"나"); setMyAvatar(d.photoURL||u.photoURL||null);
      if (d.themeKey)       setThemeKey(d.themeKey);
      if (d.missionMode)    setMissionMode(d.missionMode);
      if (d.customMissions) setCustomMissions(d.customMissions);
      if (d.coupleId) { await loadCouple(u.uid, d.coupleId); setShowConnect(false); }
      else setShowConnect(true);
    }
  };

  const loadCouple = async (myUid, coupleId) => {
    const cSnap = await getDoc(doc(db,"couples",coupleId));
    if (!cSnap.exists()) return;
    const cData = cSnap.data();
    const partnerId = cData.user1===myUid ? cData.user2 : cData.user1;
    const pSnap    = await getDoc(doc(db,"users",partnerId));
    const pData    = pSnap.exists() ? pSnap.data() : {};
    setCouple({ coupleId, partnerId, partnerName:pData.name||"파트너", startDate:cData.startDate });
    setPartnerAvatar(pData.photoURL||null);
    if (cData.sharedBg) setSharedBg(cData.sharedBg);

    // realtime listeners
    onSnapshot(query(collection(db,"couples",coupleId,"messages"), orderBy("createdAt")), s =>
      setMessages(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(collection(db,"couples",coupleId,"events"), s => {
      const map={};
      s.docs.forEach(d=>{ const ev={id:d.id,...d.data()}; if(!map[ev.dateKey]) map[ev.dateKey]=[]; map[ev.dateKey].push(ev); });
      setEvents(map);
    });
    onSnapshot(query(collection(db,"couples",coupleId,"diaries"), orderBy("createdAt","desc")), s =>
      setDiaries(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(query(collection(db,"couples",coupleId,"photos"), orderBy("createdAt","desc")), s =>
      setPhotos(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(collection(db,"couples",coupleId,"albums"), s =>
      setAlbums([{id:"default",name:"우리의 추억"}, ...s.docs.map(d=>({id:d.id,...d.data()}))]));
    onSnapshot(doc(db,"couples",coupleId), s => {
      if (s.exists() && s.data().sharedBg) setSharedBg(s.data().sharedBg);
    });

    const mSnap = await getDoc(doc(db,"couples",coupleId,"missions","today"));
    if (mSnap.exists() && mSnap.data().date===todayStr()) {
      setMissionsDone(mSnap.data().completed||[]); setMissionsDate(mSnap.data().date);
    }
  };

  const savePrefs = async patch => { if(!user) return; await updateDoc(doc(db,"users",user.uid), patch); };

  /* ── LOGIN ── */
  const loginGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch(e) { alert("로그인 실패: "+e.message); }
  };
  const logout = async () => {
    if (user) await setDoc(doc(db,"presence",user.uid),{ online:false, lastSeen:serverTimestamp() },{ merge:true });
    await signOut(auth);
    setCouple(null); setMessages([]); setEvents({}); setDiaries([]); setPhotos([]);
    setTab("home"); setShowConnect(false);
  };

  /* ── CONNECT ── */
  const connectCouple = async () => {
    if (!codeInput.trim()) return;
    const snap = await getDocs(collection(db,"users"));
    const pDoc = snap.docs.find(d=>d.data().code===codeInput.toUpperCase());
    if (!pDoc) { alert("코드를 찾을 수 없어요!"); return; }
    if (pDoc.id===user.uid) { alert("본인 코드는 안 돼요!"); return; }
    setSetupStep("date");
  };
  const finishConnect = async () => {
    if (!dateInput) { alert("날짜를 선택해주세요!"); return; }
    const snap = await getDocs(collection(db,"users"));
    const pDoc = snap.docs.find(d=>d.data().code===codeInput.toUpperCase());
    if (!pDoc) return;
    const cRef = await addDoc(collection(db,"couples"),{ user1:user.uid, user2:pDoc.id, startDate:dateInput, createdAt:serverTimestamp() });
    await updateDoc(doc(db,"users",user.uid),{ coupleId:cRef.id });
    await updateDoc(doc(db,"users",pDoc.id),{ coupleId:cRef.id });
    await loadCouple(user.uid, cRef.id);
    setShowConnect(false);
  };

  /* ── NAME & AVATAR ── */
  const changeName = async () => {
    if (!nameInput.trim()) return;
    await updateDoc(doc(db,"users",user.uid),{ name:nameInput.trim() });
    setMyName(nameInput.trim()); setNameInput(""); setModal(null);
  };
  const onAvatarUpload = async e => {
    const file = e.target.files[0]; if(!file) return;
    setUploading(true);
    try {
      const url = await uploadImg(file);
      await updateDoc(doc(db,"users",user.uid),{ photoURL:url });
      setMyAvatar(url);
    } catch(err) { alert(err.message); } finally { setUploading(false); }
  };

  /* ── SHARED BG ── */
  const onBgUpload = async e => {
    const file = e.target.files[0]; if(!file||!couple) return;
    setUploading(true);
    try {
      const url = await uploadImg(file);
      await updateDoc(doc(db,"couples",couple.coupleId),{ sharedBg:url });
      setSharedBg(url);
    } catch(err) { alert(err.message); } finally { setUploading(false); }
  };

  /* ── CHAT ── */
  const sendMsg = async (text) => {
    const t = text||chatInput;
    if (!t.trim()||!couple) return;
    await addDoc(collection(db,"couples",couple.coupleId,"messages"),{ text:t, from:user.uid, fromName:myName, type:"text", createdAt:serverTimestamp() });
    setChatInput("");
  };
  const onChatPhoto = async e => {
    const file = e.target.files[0]; if(!file) return;
    setUploading(true);
    try {
      const url = await uploadImg(file);
      await addDoc(collection(db,"couples",couple.coupleId,"messages"),{ text:url, from:user.uid, fromName:myName, type:"image", createdAt:serverTimestamp() });
    } catch(err) { alert(err.message); } finally { setUploading(false); }
  };
  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  /* ── EVENTS ── */
  const saveEvent = async () => {
    if (!selDay||!eventForm.title.trim()||!couple) return;
    const dateKey = `${calDate.getFullYear()}-${calDate.getMonth()+1}-${selDay}`;
    if (editEvent) {
      await updateDoc(doc(db,"couples",couple.coupleId,"events",editEvent.id),{ title:eventForm.title, color:eventForm.color });
      setEditEvent(null);
    } else {
      await addDoc(collection(db,"couples",couple.coupleId,"events"),{ title:eventForm.title, dateKey, color:eventForm.color, who:user.uid, whoName:myName, createdAt:serverTimestamp() });
    }
    setEventForm({title:"",color:T.p}); setModal(null);
  };
  const delEvent = async ev => {
    if (!couple||!window.confirm("일정을 삭제할까요?")) return;
    await deleteDoc(doc(db,"couples",couple.coupleId,"events",ev.id));
  };

  /* ── DIARY ── */
  const saveDiary = async () => {
    if (!diaryForm.content.trim()||!couple) return;
    const now = new Date();
    const dateKey = selDay ? `${calDate.getFullYear()}-${calDate.getMonth()+1}-${selDay}` : `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
    if (editDiary) {
      await updateDoc(doc(db,"couples",couple.coupleId,"diaries",editDiary.id),{ title:diaryForm.title, content:diaryForm.content, mood:diaryForm.mood, sticker:diaryForm.sticker, photoUrl:diaryForm.photoUrl||"" });
      setEditDiary(null);
    } else {
      await addDoc(collection(db,"couples",couple.coupleId,"diaries"),{ ...diaryForm, dateKey, who:user.uid, whoName:myName, createdAt:serverTimestamp() });
    }
    setDiaryForm({title:"",content:"",mood:"😊",sticker:"",photoUrl:""}); setModal(null);
  };
  const delDiary = async d => {
    if (!couple||!window.confirm("일기를 삭제할까요?")) return;
    await deleteDoc(doc(db,"couples",couple.coupleId,"diaries",d.id));
  };
  const onDiaryPhoto = async e => {
    const file = e.target.files[0]; if(!file) return;
    setDiaryUploading(true);
    try { const url = await uploadImg(file); setDiaryForm(f=>({...f,photoUrl:url})); }
    catch(err) { alert(err.message); } finally { setDiaryUploading(false); }
  };

  /* ── PHOTOS ── */
  const onPhotoUpload = async e => {
    const files = Array.from(e.target.files);
    if (!files.length||!couple) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadImg(file);
        const dateKey = photoDateInput || todayStr();
        await addDoc(collection(db,"couples",couple.coupleId,"photos"),{ url, dateKey, albumId:selAlbum, who:user.uid, whoName:myName, createdAt:serverTimestamp() });
      }
    } catch(err) { alert(err.message); } finally { setUploading(false); }
  };
  const delPhoto = async p => {
    if (!couple||!window.confirm("사진을 삭제할까요?")) return;
    await deleteDoc(doc(db,"couples",couple.coupleId,"photos",p.id));
  };
  const addAlbum = async () => {
    if (!albumForm.name.trim()||!couple) return;
    const ref = await addDoc(collection(db,"couples",couple.coupleId,"albums"),{ name:albumForm.name, createdAt:serverTimestamp() });
    setSelAlbum(ref.id); setAlbumForm({name:""}); setModal(null);
  };

  /* ── MISSIONS ── */
  const getTodayMissions = () => {
    if (missionMode==="custom"&&customMissions.length>0) return customMissions.slice(0,3);
    const seed = new Date().toDateString();
    return [...MISSIONS].sort((a,b)=>(seed+a).length-(seed+b).length).slice(0,3);
  };
  const toggleMission = async i => {
    if (!couple) return;
    const cur  = missionsDate===todayStr() ? missionsDone : [];
    const next = cur.includes(i) ? cur.filter(x=>x!==i) : [...cur,i];
    setMissionsDone(next); setMissionsDate(todayStr());
    await setDoc(doc(db,"couples",couple.coupleId,"missions","today"),{ completed:next, date:todayStr(), updatedBy:user.uid });
  };

  /* ── D-DAY ── */
  const dday = () => !couple?.startDate ? 1 : Math.floor((new Date()-new Date(couple.startDate))/86400000)+1;

  /* ── CALENDAR ── */
  const calDays = () => {
    const y=calDate.getFullYear(), m=calDate.getMonth();
    const first=new Date(y,m,1).getDay(), last=new Date(y,m+1,0).getDate();
    const arr=[]; for(let i=0;i<first;i++) arr.push(null); for(let i=1;i<=last;i++) arr.push(i); return arr;
  };
  const dk      = d => `${calDate.getFullYear()}-${calDate.getMonth()+1}-${d}`;
  const todayDk = todayStr();
  const missionDone   = missionsDate===todayStr() ? missionsDone : [];
  const todayMissions = getTodayMissions();

  /* ══════ SCREENS ══════ */
  if (loading) return (
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:T.pale}}>
      <style>{GS}</style>
      <div style={{textAlign:"center"}}>
        <div className="pulse" style={{fontSize:56,marginBottom:16}}>💕</div>
        <p style={{color:T.sub,fontSize:14,fontWeight:500}}>잠시만요...</p>
      </div>
    </div>
  );

  /* LOGIN */
  if (!user) return (
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center",background:`linear-gradient(170deg,${T.l} 0%,${T.pale} 55%,${T.pale} 100%)`}}>
      <style>{GS}</style>
      <div style={{position:"absolute",top:-100,right:-100,width:300,height:300,borderRadius:"50%",background:T.p,opacity:.06}}/>
      <div style={{position:"absolute",bottom:-80,left:-80,width:220,height:220,borderRadius:"50%",background:T.p,opacity:.04}}/>
      <div className="fu" style={{fontSize:72,marginBottom:8}} >💕</div>
      <h1 className="fu" style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:42,color:T.d,marginBottom:10,animationDelay:".06s",lineHeight:1.1}}>우리만의<br/>공간</h1>
      <p className="fu" style={{color:T.sub,fontSize:15,marginBottom:48,lineHeight:1.7,animationDelay:".12s"}}>커플을 위한 특별한 일상 기록</p>
      <div className="fu" style={{width:"100%",display:"flex",flexDirection:"column",gap:12,animationDelay:".18s"}}>
        <button onClick={loginGoogle} style={{...btnPrimary(),display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontSize:16,borderRadius:18}}>
          <span style={{fontSize:22}}>G</span> Google로 시작하기
        </button>
        <button style={{...btnGhost(),display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontSize:15,borderRadius:18,opacity:.5}}>
          <span style={{fontSize:22}}>🟡</span> 카카오 (준비중)
        </button>
      </div>
      <p className="fu" style={{marginTop:28,fontSize:12,color:T.sub,lineHeight:1.7,animationDelay:".24s"}}>로그인하면 서비스 이용약관 및<br/>개인정보처리방침에 동의한 것으로 봅니다</p>
    </div>
  );

  /* COUPLE CONNECT */
  if (showConnect) return (
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",background:`linear-gradient(170deg,${T.l},${T.pale})`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,overflow:"hidden"}}>
      <style>{GS}</style>
      <div style={{fontSize:56,marginBottom:10}}>🔗</div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontStyle:"italic",fontSize:30,color:T.d,marginBottom:8}}>커플 연결하기</h2>
      <p style={{color:T.sub,fontSize:14,marginBottom:28,textAlign:"center",lineHeight:1.6}}>파트너와 코드를 교환해서 연결해요</p>
      <div style={{...card,width:"100%",maxWidth:380,marginBottom:12,padding:20}}>
        <p style={{fontSize:12,color:T.sub,marginBottom:8,fontWeight:600}}>📱 내 연결 코드 (파트너에게 공유하세요)</p>
        <div style={{background:T.l,borderRadius:14,padding:"16px",letterSpacing:8,fontSize:26,fontWeight:800,color:T.p,textAlign:"center"}}>{myCode}</div>
      </div>
      <div style={{...card,width:"100%",maxWidth:380,padding:20}}>
        {setupStep==="code"?(<>
          <p style={{fontSize:13,color:T.sub,marginBottom:8,fontWeight:600}}>💕 파트너 코드 입력</p>
          <input style={{...inp,letterSpacing:6,textAlign:"center",fontSize:20,marginBottom:14,borderRadius:14}} placeholder="XXXXXX" value={codeInput} onChange={e=>setCodeInput(e.target.value.toUpperCase())}/>
          <button style={btnPrimary()} onClick={connectCouple}>다음 →</button>
        </>):(<>
          <p style={{fontSize:13,color:T.sub,marginBottom:8,fontWeight:600}}>📅 사귄 날짜</p>
          <input type="date" style={{...inp,marginBottom:14}} value={dateInput} onChange={e=>setDateInput(e.target.value)}/>
          <button style={btnPrimary()} onClick={finishConnect}>💕 연결 완료!</button>
          <button onClick={()=>setSetupStep("code")} style={{marginTop:10,background:"none",border:"none",color:T.sub,fontSize:13,cursor:"pointer",width:"100%",padding:"8px"}}>← 뒤로</button>
        </>)}
      </div>
      <button onClick={()=>setShowConnect(false)} style={{marginTop:18,background:"none",border:"none",color:T.p,fontSize:14,fontWeight:700,cursor:"pointer"}}>나중에 연결하기</button>
      <button onClick={logout} style={{marginTop:10,background:"none",border:"none",color:T.sub,fontSize:13,cursor:"pointer"}}>로그아웃</button>
    </div>
  );

  /* MAIN APP */
  const tabs=[{id:"home",icon:"🏠",label:"홈"},{id:"calendar",icon:"📅",label:"달력"},{id:"chat",icon:"💬",label:"채팅"},{id:"photos",icon:"📸",label:"사진"},{id:"diary",icon:"📖",label:"일기"}];

  return (
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",background:T.pale,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      <style>{GS}</style>
      <input ref={bgRef} type="file" accept="image/*" style={{display:"none"}} onChange={onBgUpload}/>
      <input ref={photoRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={onPhotoUpload}/>
      <input ref={chatPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={onChatPhoto}/>
      <input ref={avatarRef} type="file" accept="image/*" style={{display:"none"}} onChange={onAvatarUpload}/>
      <input ref={diaryPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={onDiaryPhoto}/>

      <div style={{flex:1,overflowY:"auto",paddingBottom:76,WebkitOverflowScrolling:"touch"}}>

        {/* ══ HOME ══ */}
        {tab==="home"&&(
          <div className="fi">
            {/* Hero */}
            <div style={{position:"relative",overflow:"hidden",borderRadius:"0 0 32px 32px",marginBottom:4}}>
              <div style={{background:sharedBg?`url(${sharedBg}) center/cover`:T.grad,padding:"56px 22px 32px",position:"relative"}}>
                {sharedBg&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.42)"}}/>}
                <div style={{position:"absolute",top:-40,right:-40,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,.06)"}}/>
                <div style={{position:"relative"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {myAvatar
                        ? <img src={myAvatar} alt="" style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(255,255,255,.6)"}}/>
                        : <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(255,255,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🌸</div>
                      }
                      <div>
                        <p style={{fontSize:12,color:"rgba(255,255,255,.75)",fontWeight:500}}>안녕하세요</p>
                        <p style={{fontSize:16,color:"#fff",fontWeight:700}}>{myName} {couple?`& ${couple.partnerName}`:""}</p>
                      </div>
                    </div>
                    <button onClick={()=>setTab("settings")} style={{background:"rgba(255,255,255,.18)",border:"none",borderRadius:12,padding:"8px 12px",color:"white",fontSize:13,cursor:"pointer",fontWeight:600,backdropFilter:"blur(8px)"}}>⚙️</button>
                  </div>
                  {/* D-Day */}
                  <div style={{background:"rgba(255,255,255,.15)",borderRadius:22,padding:"18px 22px",backdropFilter:"blur(12px)",display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid rgba(255,255,255,.2)"}}>
                    <div>
                      <p style={{fontSize:12,color:"rgba(255,255,255,.75)",marginBottom:4,fontWeight:500}}>{couple?"함께한 날":"오늘부터 시작"}</p>
                      <p style={{fontFamily:"'Playfair Display',serif",fontSize:54,lineHeight:1,color:"#fff",fontWeight:600,letterSpacing:"-2px"}}>D+{dday()}</p>
                      <p style={{fontSize:12,color:"rgba(255,255,255,.65)",marginTop:6}}>{couple?.startDate||todayStr()} 시작</p>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div className="pulse" style={{fontSize:48}}>💑</div>
                      <p style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:6}}>{new Date().toLocaleDateString("ko-KR",{month:"long",day:"numeric"})}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 미연결 */}
            {!couple&&(
              <div onClick={()=>setShowConnect(true)} style={{margin:"16px 16px 0",background:`linear-gradient(135deg,${T.l},${T.card})`,borderRadius:20,padding:"16px 18px",border:`1.5px dashed ${T.p}`,cursor:"pointer",textAlign:"center"}}>
                <p style={{fontWeight:700,color:T.p,marginBottom:4,fontSize:15}}>💕 파트너와 연결하기</p>
                <p style={{fontSize:13,color:T.sub}}>코드를 교환해서 모든 기능을 함께 써요</p>
              </div>
            )}

            {/* 기념일 */}
            {couple&&(
              <div style={{padding:"16px 16px 0",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
                {[{l:"100일",t:100},{l:"200일",t:200},{l:"1주년",t:365},{l:"2주년",t:730}]
                  .map(a=>({...a,d:a.t-dday()+1})).filter(a=>a.d>0)
                  .map((a,i)=>(
                    <div key={i} style={{background:T.card,borderRadius:14,padding:"10px 16px",boxShadow:`0 2px 12px ${T.text}08`,flexShrink:0,textAlign:"center",minWidth:72}}>
                      <p style={{fontSize:11,color:T.sub,marginBottom:2,fontWeight:500}}>{a.l}</p>
                      <p style={{fontWeight:800,color:T.p,fontSize:14}}>D-{a.d}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* 미션 */}
            <div style={{margin:"16px 16px 0"}}>
              <div style={{background:T.card,borderRadius:22,padding:18,boxShadow:`0 2px 16px ${T.text}08`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <p style={{fontWeight:700,fontSize:15,color:T.text}}>🌟 오늘의 커플 미션</p>
                  <span style={{fontSize:13,color:T.sub,fontWeight:600,background:T.l,borderRadius:20,padding:"3px 10px"}}>{missionDone.length}/3</span>
                </div>
                {todayMissions.map((m,i)=>(
                  <div key={i} onClick={()=>toggleMission(i)} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:i<2?`1px solid ${T.l}`:"none",cursor:"pointer"}}>
                    <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${missionDone.includes(i)?T.p:T.border}`,background:missionDone.includes(i)?T.p:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s",boxShadow:missionDone.includes(i)?`0 2px 8px ${T.p}44`:"none"}}>
                      {missionDone.includes(i)&&<span style={{color:"white",fontSize:12,fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:14,color:missionDone.includes(i)?T.sub:T.text,textDecoration:missionDone.includes(i)?"line-through":"none",fontWeight:missionDone.includes(i)?400:500}}>{m}</span>
                  </div>
                ))}
                {missionDone.length===3&&<div style={{textAlign:"center",marginTop:12,padding:"10px",background:T.l,borderRadius:12}}><p style={{fontSize:14,color:T.p,fontWeight:700}}>🎉 오늘 미션 완료! 수고했어요</p></div>}
              </div>
            </div>

            {/* 최근 일기 */}
            {diaries.length>0&&(
              <div style={{margin:"16px 16px 0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <p style={{fontWeight:700,fontSize:15,color:T.text}}>✍️ 최근 일기</p>
                  <button onClick={()=>setTab("diary")} style={{background:"none",border:"none",fontSize:13,color:T.p,cursor:"pointer",fontWeight:600}}>전체보기 →</button>
                </div>
                <div style={{...card,marginBottom:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:13,color:T.sub,fontWeight:500}}>{diaries[0].whoName} · {fmtMonthDay(diaries[0].dateKey)}</span>
                    <span style={{fontSize:18}}>{diaries[0].mood} {diaries[0].sticker}</span>
                  </div>
                  {diaries[0].title&&<p style={{fontWeight:700,fontSize:15,marginBottom:6,color:T.text}}>{diaries[0].title}</p>}
                  <p style={{fontSize:14,color:T.sub,lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{diaries[0].content}</p>
                  {diaries[0].photoUrl&&<img src={diaries[0].photoUrl} alt="" style={{width:"100%",borderRadius:12,marginTop:10,maxHeight:140,objectFit:"cover"}}/>}
                </div>
              </div>
            )}
            <div style={{height:16}}/>
          </div>
        )}

        {/* ══ CALENDAR ══ */}
        {tab==="calendar"&&(
          <div className="fi">
            <div style={{padding:"52px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontStyle:"italic",color:T.text}}>달력</h1>
              {couple&&<button onClick={()=>{setSelDay(null);setEditEvent(null);setEventForm({title:"",color:T.p});setModal("addEvent");}} style={{...btnPrimary("auto"),padding:"9px 18px",fontSize:14,borderRadius:14}}>+ 일정</button>}
            </div>
            <div style={{...card,margin:"0 16px 12px",padding:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <button style={{background:T.l,border:"none",width:36,height:36,borderRadius:12,cursor:"pointer",fontSize:18,color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setCalDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}>‹</button>
                <div style={{textAlign:"center"}}>
                  <p style={{fontWeight:800,fontSize:18,color:T.text}}>{calDate.getFullYear()}년 {calDate.getMonth()+1}월</p>
                </div>
                <button style={{background:T.l,border:"none",width:36,height:36,borderRadius:12,cursor:"pointer",fontSize:18,color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setCalDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}>›</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:8}}>
                {DAYS_KR.map((d,i)=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:i===0?"#E05050":i===6?"#5050E0":T.sub,padding:"4px 0"}}>{d}</div>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                {calDays().map((day,i)=>{
                  if(!day) return <div key={i}/>;
                  const key=dk(day), evs=events[key]||[], isToday=key===todayDk;
                  const dayPhoto = photos.find(p=>p.dateKey===key);
                  const dayDiary = diaries.find(d=>d.dateKey===key);
                  const dow = (new Date(calDate.getFullYear(),calDate.getMonth(),day).getDay());
                  return (
                    <div key={i} onClick={()=>{setSelDay(day);setModal("dayDetail");}}
                      style={{aspectRatio:"1",borderRadius:12,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:isToday?T.p:dayPhoto?"transparent":"transparent",position:"relative",overflow:"hidden",transition:"all .15s"}}>
                      {dayPhoto&&!isToday&&<img src={dayPhoto.url} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",borderRadius:12,opacity:.55}}/>}
                      {!dayPhoto&&!isToday&&<div style={{position:"absolute",inset:0,borderRadius:12,background:evs.length>0?T.l:"transparent"}}/>}
                      <span style={{fontSize:13,fontWeight:isToday?800:600,color:isToday?"#fff":dow===0?"#E05050":dow===6?"#5050E0":T.text,position:"relative",zIndex:1}}>{day}</span>
                      <div style={{display:"flex",gap:2,position:"absolute",bottom:4,zIndex:1}}>
                        {evs.slice(0,2).map((ev,ei)=><div key={ei} style={{width:4,height:4,borderRadius:"50%",background:isToday?"rgba(255,255,255,.8)":ev.color}}/>)}
                        {dayDiary&&<div style={{width:4,height:4,borderRadius:"50%",background:isToday?"rgba(255,255,255,.8)":"#C09050"}}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 이번달 일정 */}
            <div style={{padding:"0 16px 8px"}}>
              <p style={{fontWeight:700,fontSize:14,color:T.sub,marginBottom:10}}>이번 달 일정</p>
              {Object.entries(events)
                .filter(([k])=>k.startsWith(`${calDate.getFullYear()}-${calDate.getMonth()+1}-`))
                .flatMap(([k,evs])=>evs.map(ev=>({...ev,dateKey:k})))
                .sort((a,b)=>parseInt(a.dateKey.split("-")[2])-parseInt(b.dateKey.split("-")[2]))
                .map((ev,i)=>(
                  <div key={i} style={{...card,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:4,height:36,borderRadius:4,background:ev.color,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <p style={{fontWeight:600,fontSize:14,color:T.text}}>{ev.title}</p>
                      <p style={{fontSize:12,color:T.sub,marginTop:2}}>{ev.whoName} · {ev.dateKey.split("-")[2]}일</p>
                    </div>
                    {ev.who===user.uid&&(
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>{setSelDay(parseInt(ev.dateKey.split("-")[2]));setEditEvent(ev);setEventForm({title:ev.title,color:ev.color});setModal("addEvent");}} style={{background:T.l,border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                        <button onClick={()=>delEvent(ev)} style={{background:"#FEE8EC",border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ══ CHAT ══ */}
        {tab==="chat"&&(
          <div className="fi" style={{display:"flex",flexDirection:"column",height:"100%",position:"absolute",inset:0,paddingBottom:76}}>
            {/* Header */}
            <div style={{background:T.card,padding:"52px 18px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12,flexShrink:0,boxShadow:`0 1px 8px ${T.text}08`}}>
              <div style={{position:"relative"}}>
                {partnerAvatar
                  ? <img src={partnerAvatar} alt="" style={{width:44,height:44,borderRadius:"50%",objectFit:"cover",border:`2px solid ${T.l}`}}/>
                  : <div style={{width:44,height:44,borderRadius:"50%",background:T.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>💕</div>
                }
                <div style={{position:"absolute",bottom:1,right:1,width:11,height:11,borderRadius:"50%",background:couple&&partnerOnline?"#4CAF50":"#9E9E9E",border:`2px solid ${T.card}`}}/>
              </div>
              <div>
                <p style={{fontWeight:700,fontSize:16,color:T.text}}>{couple?.partnerName||"파트너"}</p>
                <p style={{fontSize:12,color:couple&&partnerOnline?"#4CAF50":T.sub,fontWeight:500}}>{couple?(partnerOnline?"지금 접속 중":"오프라인"):"파트너 미연결"}</p>
              </div>
            </div>
            {/* Messages */}
            {!couple?(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:30,textAlign:"center"}}>
                <p style={{fontSize:48,marginBottom:14}}>💬</p>
                <p style={{fontWeight:700,fontSize:16,marginBottom:8,color:T.text}}>파트너와 연결 후 이용 가능해요</p>
                <button onClick={()=>setShowConnect(true)} style={{...btnPrimary("auto"),padding:"12px 28px",borderRadius:16}}>연결하러 가기</button>
              </div>
            ):(
              <>
                <div style={{flex:1,overflowY:"auto",padding:"16px 16px 8px",display:"flex",flexDirection:"column",gap:8,WebkitOverflowScrolling:"touch"}}>
                  {messages.length===0&&(
                    <div style={{textAlign:"center",padding:"50px 20px",color:T.sub}}>
                      <p style={{fontSize:40,marginBottom:10}}>💬</p>
                      <p style={{fontSize:15,fontWeight:500}}>첫 메시지를 보내보세요!</p>
                    </div>
                  )}
                  {messages.map(msg=>{
                    const isMe=msg.from===user.uid;
                    return (
                      <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:4}}>
                        {!isMe&&<span style={{fontSize:12,color:T.sub,marginLeft:4,fontWeight:500}}>{msg.fromName}</span>}
                        {msg.type==="image"?(
                          <img src={msg.text} alt="" style={{maxWidth:"72%",borderRadius:18,cursor:"pointer",boxShadow:`0 2px 12px ${T.text}18`}} onClick={()=>setModal({type:"imgView",url:msg.text})}/>
                        ):(
                          <div style={{maxWidth:"78%",padding:"11px 16px",borderRadius:20,fontSize:15,lineHeight:1.5,background:isMe?T.p:T.card,color:isMe?"#fff":T.text,[isMe?"borderBottomRightRadius":"borderBottomLeftRadius"]:6,boxShadow:isMe?`0 3px 12px ${T.p}44`:`0 1px 6px ${T.text}0a`,fontWeight:400}}>
                            {msg.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={chatEnd}/>
                </div>
                {/* Input */}
                <div style={{padding:"10px 14px 10px",background:T.card,borderTop:`1px solid ${T.border}`,display:"flex",gap:8,alignItems:"center",flexShrink:0,boxShadow:`0 -2px 12px ${T.text}06`}}>
                  <button onClick={()=>setModal("sticker")} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",flexShrink:0,padding:"4px",lineHeight:1}}>😊</button>
                  <button onClick={()=>chatPhotoRef.current?.click()} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",flexShrink:0,padding:"4px",lineHeight:1}}>{uploading?"⏳":"📷"}</button>
                  <div style={{flex:1,background:T.pale,borderRadius:24,padding:"10px 16px",display:"flex",alignItems:"center"}}>
                    <input
                      style={{width:"100%",border:"none",background:"transparent",fontSize:15,color:T.text,outline:"none"}}
                      placeholder="메시지 입력..."
                      value={chatInput}
                      onChange={e=>setChatInput(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&sendMsg()}
                    />
                  </div>
                  <button onClick={()=>sendMsg()} style={{background:T.grad,border:"none",borderRadius:50,width:44,height:44,color:"white",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 3px 10px ${T.p}44`}}>↑</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ PHOTOS ══ */}
        {tab==="photos"&&(
          <div className="fi">
            <div style={{padding:"52px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontStyle:"italic",color:T.text}}>사진첩</h1>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setModal("addAlbum")} style={{...btnLight("auto"),padding:"9px 14px",fontSize:13,borderRadius:14}}>+ 폴더</button>
                <button onClick={()=>setModal("photoUpload")} disabled={uploading} style={{...btnPrimary("auto"),padding:"9px 16px",fontSize:13,borderRadius:14}}>{uploading?"업로드중":"+ 사진"}</button>
              </div>
            </div>
            {/* Album tabs */}
            <div style={{padding:"0 16px 12px",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
              {albums.map(al=><button key={al.id} onClick={()=>setSelAlbum(al.id)} style={pill(selAlbum===al.id)}>{al.name}</button>)}
            </div>
            {photos.filter(p=>p.albumId===selAlbum).length===0?(
              <div style={{textAlign:"center",padding:"70px 20px"}}>
                <div style={{fontSize:56,marginBottom:14}}>📷</div>
                <p style={{fontWeight:700,fontSize:16,marginBottom:8,color:T.text}}>사진이 없어요</p>
                <p style={{color:T.sub,fontSize:14,marginBottom:24}}>소중한 순간을 기록해보세요</p>
                <button onClick={()=>setModal("photoUpload")} style={{...btnPrimary("auto"),padding:"12px 28px",borderRadius:16}}>사진 추가하기</button>
              </div>
            ):(
              <div style={{padding:"0 16px"}}>
                {[...new Set(photos.filter(p=>p.albumId===selAlbum).map(p=>p.dateKey))].map(date=>(
                  <div key={date} style={{marginBottom:20}}>
                    <p style={{fontWeight:700,fontSize:13,color:T.sub,marginBottom:10,letterSpacing:".02em"}}>{fmtDate(date)}</p>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5}}>
                      {photos.filter(p=>p.albumId===selAlbum&&p.dateKey===date).map(ph=>(
                        <div key={ph.id} style={{aspectRatio:"1",borderRadius:14,overflow:"hidden",position:"relative",cursor:"pointer",boxShadow:`0 2px 10px ${T.text}12`}} onClick={()=>setModal({type:"imgView",url:ph.url})}>
                          <img src={ph.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          {ph.who===user.uid&&(
                            <button onClick={e=>{e.stopPropagation();delPhoto(ph);}} style={{position:"absolute",top:5,right:5,background:"rgba(0,0,0,.5)",border:"none",borderRadius:"50%",width:24,height:24,color:"white",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ DIARY ══ */}
        {tab==="diary"&&(
          <div className="fi">
            <div style={{padding:"52px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontStyle:"italic",color:T.text}}>일기</h1>
              <button onClick={()=>{setSelDay(null);setEditDiary(null);setDiaryForm({title:"",content:"",mood:"😊",sticker:"",photoUrl:""});setModal("addDiary");}} style={{...btnPrimary("auto"),padding:"9px 18px",fontSize:14,borderRadius:14}}>+ 쓰기</button>
            </div>
            {couple&&(
              <div style={{padding:"0 16px 12px",display:"flex",gap:8}}>
                {[{id:"all",l:"전체"},{id:"me",l:"내 일기"},{id:"partner",l:couple.partnerName}].map(f=>(
                  <button key={f.id} onClick={()=>setDiaryFilter(f.id)} style={pill(diaryFilter===f.id)}>{f.l}</button>
                ))}
              </div>
            )}
            {diaries.filter(d=>diaryFilter==="all"||(diaryFilter==="me"?d.who===user.uid:d.who!==user.uid)).length===0?(
              <div style={{textAlign:"center",padding:"70px 20px"}}>
                <div style={{fontSize:56,marginBottom:14}}>✍️</div>
                <p style={{fontWeight:700,fontSize:16,marginBottom:8,color:T.text}}>일기가 없어요</p>
                <button onClick={()=>setModal("addDiary")} style={{...btnPrimary("auto"),padding:"12px 28px",borderRadius:16,marginTop:8}}>첫 일기 쓰기</button>
              </div>
            ):(
              <div style={{padding:"0 16px"}}>
                {diaries.filter(d=>diaryFilter==="all"||(diaryFilter==="me"?d.who===user.uid:d.who!==user.uid)).map(d=>(
                  <div key={d.id} style={{...card,padding:18}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:34,height:34,borderRadius:"50%",background:d.who===user.uid?T.p+"22":T.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:d.who===user.uid?T.p:T.sub}}>
                          {(d.whoName||"?")[0]}
                        </div>
                        <div>
                          <p style={{fontWeight:700,fontSize:14,color:T.text}}>{d.whoName}</p>
                          <p style={{fontSize:12,color:T.sub}}>{fmtDate(d.dateKey)}</p>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:20}}>{d.mood}</span>
                        {d.who===user.uid&&(<>
                          <button onClick={()=>{setEditDiary(d);setDiaryForm({title:d.title||"",content:d.content,mood:d.mood,sticker:d.sticker||"",photoUrl:d.photoUrl||""});setModal("addDiary");}} style={{background:T.l,border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                          <button onClick={()=>delDiary(d)} style={{background:"#FEE8EC",border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                        </>)}
                      </div>
                    </div>
                    {d.photoUrl&&<img src={d.photoUrl} alt="" style={{width:"100%",borderRadius:14,marginBottom:10,maxHeight:180,objectFit:"cover",boxShadow:`0 2px 10px ${T.text}12`}}/>}
                    {d.title&&<p style={{fontWeight:700,fontSize:16,marginBottom:8,borderLeft:`3px solid ${d.who===user.uid?T.p:T.sub}`,paddingLeft:12,color:T.text}}>{d.title}</p>}
                    <p style={{fontSize:14,color:T.sub,lineHeight:1.75,paddingLeft:d.title?15:0}}>{d.content}</p>
                    {d.sticker&&<p style={{marginTop:8,fontSize:24}}>{d.sticker}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab==="settings"&&(
          <div className="fi">
            <div style={{padding:"52px 16px 16px"}}>
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontStyle:"italic",color:T.text}}>설정</h1>
            </div>
            {/* Settings sub-tabs */}
            <div style={{padding:"0 16px 16px",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
              {[{id:"profile",l:"👤 프로필"},{id:"theme",l:"🎨 테마"},{id:"home",l:"🏠 홈 꾸미기"},{id:"mission",l:"🌟 미션"},{id:"couple",l:"💕 커플"}].map(s=>(
                <button key={s.id} onClick={()=>setSettingsTab(s.id)} style={pill(settingsTab===s.id)}>{s.l}</button>
              ))}
            </div>

            {settingsTab==="profile"&&(
              <div style={{padding:"0 16px"}}>
                <div style={{...card,padding:20}}>
                  <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                    <div style={{position:"relative",cursor:"pointer"}} onClick={()=>avatarRef.current?.click()}>
                      {myAvatar
                        ? <img src={myAvatar} alt="" style={{width:70,height:70,borderRadius:"50%",objectFit:"cover",border:`3px solid ${T.p}`}}/>
                        : <div style={{width:70,height:70,borderRadius:"50%",background:T.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>🌸</div>
                      }
                      <div style={{position:"absolute",bottom:0,right:0,width:24,height:24,borderRadius:"50%",background:T.p,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",border:`2px solid ${T.card}`}}>✏️</div>
                    </div>
                    <div>
                      <p style={{fontWeight:800,fontSize:18,color:T.text}}>{myName}</p>
                      <p style={{fontSize:13,color:T.sub,marginTop:2}}>{user.email}</p>
                    </div>
                  </div>
                  <button onClick={()=>{setNameInput(myName);setModal("changeName");}} style={{...btnLight(),marginBottom:10,borderRadius:14}}>✏️ 이름 변경</button>
                  <p style={{fontSize:12,color:T.sub,marginBottom:8,fontWeight:600}}>내 연결 코드</p>
                  <div style={{background:T.l,borderRadius:14,padding:"12px",letterSpacing:6,fontSize:20,fontWeight:900,color:T.p,textAlign:"center"}}>{myCode}</div>
                </div>
                <button onClick={logout} style={{...btnGhost(),margin:"0 0 8px",borderRadius:14}}>로그아웃</button>
              </div>
            )}

            {settingsTab==="theme"&&(
              <div style={{padding:"0 16px"}}>
                <div style={{...card,padding:20}}>
                  <p style={{fontWeight:700,fontSize:15,marginBottom:14,color:T.text}}>테마 선택</p>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {Object.entries(THEMES).map(([key,th])=>(
                      <button key={key} onClick={()=>{setThemeKey(key);savePrefs({themeKey:key});}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:16,border:`2px solid ${themeKey===key?th.p:T.border}`,background:themeKey===key?th.l:T.card,cursor:"pointer",transition:"all .2s"}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:th.grad,flexShrink:0,boxShadow:`0 2px 8px ${th.p}44`}}/>
                        <span style={{fontWeight:600,fontSize:15,color:T.text,flex:1,textAlign:"left"}}>{th.name}</span>
                        {themeKey===key&&<span style={{color:th.p,fontWeight:800,fontSize:16}}>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {settingsTab==="home"&&(
              <div style={{padding:"0 16px"}}>
                <div style={{...card,padding:20}}>
                  <p style={{fontWeight:700,fontSize:15,marginBottom:14,color:T.text}}>🖼️ 메인 배경 사진</p>
                  <p style={{fontSize:13,color:T.sub,marginBottom:12,lineHeight:1.6}}>배경 사진은 파트너와 공유돼요 💕</p>
                  {sharedBg&&<img src={sharedBg} alt="" style={{width:"100%",borderRadius:14,marginBottom:12,maxHeight:140,objectFit:"cover"}}/>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>bgRef.current?.click()} style={{...btnPrimary(),borderRadius:14,fontSize:14}}>{uploading?"업로드중...":"📷 사진 선택"}</button>
                    {sharedBg&&<button onClick={async()=>{await updateDoc(doc(db,"couples",couple.coupleId),{sharedBg:""});setSharedBg(null);}} style={{...btnLight("auto"),padding:"13px 16px",borderRadius:14,fontSize:14}}>제거</button>}
                  </div>
                </div>
              </div>
            )}

            {settingsTab==="mission"&&(
              <div style={{padding:"0 16px"}}>
                <div style={{...card,padding:20}}>
                  <p style={{fontWeight:700,fontSize:15,marginBottom:14,color:T.text}}>미션 방식</p>
                  <div style={{display:"flex",gap:8,marginBottom:16}}>
                    <button onClick={()=>{setMissionMode("random");savePrefs({missionMode:"random"});}} style={pill(missionMode==="random")}>랜덤 미션</button>
                    <button onClick={()=>{setMissionMode("custom");savePrefs({missionMode:"custom"});}} style={pill(missionMode==="custom")}>직접 설정</button>
                  </div>
                  {missionMode==="custom"&&(<>
                    <div style={{display:"flex",gap:8,marginBottom:12}}>
                      <input style={{...inp,flex:1,borderRadius:12,fontSize:14}} placeholder="미션 입력..." value={newMission} onChange={e=>setNewMission(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(()=>{if(!newMission.trim())return;const n=[...customMissions,newMission.trim()];setCustomMissions(n);setNewMission("");savePrefs({customMissions:n,missionMode:"custom"});})()}/>
                      <button onClick={()=>{if(!newMission.trim())return;const n=[...customMissions,newMission.trim()];setCustomMissions(n);setNewMission("");savePrefs({customMissions:n,missionMode:"custom"});}} style={{...btnPrimary("auto"),padding:"12px 16px",borderRadius:12,fontSize:14}}>추가</button>
                    </div>
                    {customMissions.map((m,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                        <span style={{flex:1,fontSize:14,color:T.text}}>{m}</span>
                        <button onClick={()=>{const n=customMissions.filter((_,idx)=>idx!==i);setCustomMissions(n);savePrefs({customMissions:n});}} style={{background:"#FEE8EC",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",color:"#D04050",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                      </div>
                    ))}
                    {customMissions.length===0&&<p style={{fontSize:13,color:T.sub,textAlign:"center",padding:"12px 0"}}>미션을 추가해주세요</p>}
                  </>)}
                </div>
              </div>
            )}

            {settingsTab==="couple"&&couple&&(
              <div style={{padding:"0 16px"}}>
                <div style={{...card,padding:20}}>
                  <p style={{fontWeight:700,fontSize:15,marginBottom:14,color:T.text}}>💕 커플 정보</p>
                  {[["파트너",couple.partnerName],["사귄 날짜",fmtDate(couple.startDate)],["함께한 날",`D+${dday()}`]].map(([k,v],i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<2?`1px solid ${T.l}`:"none"}}>
                      <span style={{color:T.sub,fontSize:14}}>{k}</span>
                      <span style={{fontWeight:700,fontSize:14,color:i===2?T.p:T.text}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{height:16}}/>
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:T.nav,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-around",padding:"8px 0",paddingBottom:"max(12px, env(safe-area-inset-bottom))",zIndex:50,boxShadow:`0 -2px 16px ${T.text}08`}}>
        {[...tabs,{id:"settings",icon:"⚙️",label:"설정"}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",padding:"4px 10px",borderRadius:14,minWidth:48}}>
            <span style={{fontSize:24,transform:tab===t.id?"scale(1.1)":"scale(1)",transition:"transform .2s",filter:tab===t.id?"none":"grayscale(.3)"}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:tab===t.id?T.p:T.sub,letterSpacing:"-.01em"}}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ══ MODALS ══ */}
      {modal&&(
        <div onClick={()=>typeof modal==="string"?setModal(null):setModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:200,display:"flex",alignItems:modal?.type==="imgView"?"center":"flex-end",justifyContent:"center",backdropFilter:"blur(4px)"}}>

          {/* IMAGE VIEWER */}
          {modal?.type==="imgView"&&(
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,padding:20}}>
              <img src={modal.url} alt="" style={{width:"100%",borderRadius:22,maxHeight:"80vh",objectFit:"contain",boxShadow:"0 8px 40px rgba(0,0,0,.4)"}}/>
              <button onClick={()=>setModal(null)} style={{...btnLight(),marginTop:14,borderRadius:16,fontSize:15}}>닫기</button>
            </div>
          )}

          {modal?.type!=="imgView"&&(
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:"28px 28px 0 0",padding:"24px 20px",width:"100%",maxWidth:430,maxHeight:"90vh",overflowY:"auto",animation:"fadeUp .35s cubic-bezier(.16,1,.3,1)",paddingBottom:"max(24px, env(safe-area-inset-bottom))"}}>

            {/* DAY DETAIL */}
            {modal==="dayDetail"&&selDay&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontStyle:"italic",color:T.text}}>{calDate.getMonth()+1}월 {selDay}일</h3>
                <button style={{background:T.l,border:"none",borderRadius:12,width:36,height:36,cursor:"pointer",fontSize:18,color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setModal(null)}>×</button>
              </div>
              {/* Events */}
              {(events[dk(selDay)]||[]).length>0&&(<>
                <p style={{fontWeight:700,fontSize:13,color:T.sub,marginBottom:10,textTransform:"uppercase",letterSpacing:".05em"}}>일정</p>
                {(events[dk(selDay)]||[]).map((ev,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.l}`}}>
                    <div style={{width:4,height:28,borderRadius:4,background:ev.color,flexShrink:0}}/>
                    <div style={{flex:1}}><p style={{fontWeight:600,fontSize:14,color:T.text}}>{ev.title}</p><p style={{fontSize:12,color:T.sub,marginTop:2}}>{ev.whoName}</p></div>
                    {ev.who===user.uid&&(<>
                      <button onClick={()=>{setEditEvent(ev);setEventForm({title:ev.title,color:ev.color});setModal("addEvent");}} style={{background:T.l,border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button>
                      <button onClick={()=>delEvent(ev)} style={{background:"#FEE8EC",border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button>
                    </>)}
                  </div>
                ))}
                <div style={{height:16}}/>
              </>)}
              {/* Diaries */}
              {diaries.filter(d=>d.dateKey===dk(selDay)).length>0&&(<>
                <p style={{fontWeight:700,fontSize:13,color:T.sub,marginBottom:10,textTransform:"uppercase",letterSpacing:".05em"}}>일기</p>
                {diaries.filter(d=>d.dateKey===dk(selDay)).map((d,i)=>(
                  <div key={i} style={{background:T.pale,borderRadius:14,padding:"12px 14px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontWeight:600,fontSize:13,color:T.text}}>{d.whoName}</span>
                      <span style={{fontSize:16}}>{d.mood} {d.sticker}</span>
                    </div>
                    {d.photoUrl&&<img src={d.photoUrl} alt="" style={{width:"100%",borderRadius:10,marginBottom:6,maxHeight:120,objectFit:"cover"}}/>}
                    {d.title&&<p style={{fontWeight:700,fontSize:14,color:T.text,marginBottom:4}}>{d.title}</p>}
                    <p style={{fontSize:13,color:T.sub,lineHeight:1.6}}>{d.content}</p>
                  </div>
                ))}
                <div style={{height:16}}/>
              </>)}
              {/* Photos */}
              {photos.filter(p=>p.dateKey===dk(selDay)).length>0&&(<>
                <p style={{fontWeight:700,fontSize:13,color:T.sub,marginBottom:10,textTransform:"uppercase",letterSpacing:".05em"}}>사진</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:16}}>
                  {photos.filter(p=>p.dateKey===dk(selDay)).map(p=>(
                    <div key={p.id} style={{aspectRatio:"1",borderRadius:12,overflow:"hidden",cursor:"pointer"}} onClick={()=>setModal({type:"imgView",url:p.url})}>
                      <img src={p.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    </div>
                  ))}
                </div>
              </>)}
              {/* Actions */}
              <div style={{display:"flex",gap:8}}>
                {couple&&<button onClick={()=>{setEditEvent(null);setEventForm({title:"",color:T.p});setModal("addEvent");}} style={{...btnLight(),fontSize:13,padding:"11px",borderRadius:14}}>📅 일정</button>}
                <button onClick={()=>{setEditDiary(null);setDiaryForm({title:"",content:"",mood:"😊",sticker:"",photoUrl:""});setModal("addDiary");}} style={{...btnLight(),fontSize:13,padding:"11px",borderRadius:14}}>✍️ 일기</button>
                <button onClick={()=>{setModal("photoUpload");}} style={{...btnLight(),fontSize:13,padding:"11px",borderRadius:14}}>📸 사진</button>
              </div>
            </>)}

            {/* ADD/EDIT EVENT */}
            {modal==="addEvent"&&(<>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontStyle:"italic",marginBottom:20,color:T.text}}>{editEvent?"일정 수정":"일정 추가"}</h3>
              <p style={{fontSize:13,color:T.sub,marginBottom:8,fontWeight:600}}>색상</p>
              <div style={{display:"flex",gap:10,marginBottom:18}}>{EV_COLORS.map(c=><div key={c} onClick={()=>setEventForm(f=>({...f,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,cursor:"pointer",border:eventForm.color===c?"3px solid "+T.text:"2px solid transparent",boxShadow:eventForm.color===c?`0 2px 8px ${c}66`:"none",transition:"all .2s"}}/>)}</div>
              <p style={{fontSize:13,color:T.sub,marginBottom:8,fontWeight:600}}>일정 제목</p>
              <input style={{...inp,marginBottom:20,borderRadius:14}} placeholder="예: 영화 데이트 🎬" value={eventForm.title} onChange={e=>setEventForm(f=>({...f,title:e.target.value}))}/>
              <button style={{...btnPrimary(),borderRadius:16}} onClick={saveEvent}>{editEvent?"수정하기":"추가하기"}</button>
            </>)}

            {/* ADD/EDIT DIARY */}
            {modal==="addDiary"&&(<>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontStyle:"italic",marginBottom:20,color:T.text}}>{editDiary?"일기 수정":"일기 쓰기"}</h3>
              <p style={{fontSize:13,color:T.sub,marginBottom:10,fontWeight:600}}>기분</p>
              <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>{MOODS.map(m=><span key={m} onClick={()=>setDiaryForm(d=>({...d,mood:m}))} style={{fontSize:28,cursor:"pointer",opacity:diaryForm.mood===m?1:.3,transform:diaryForm.mood===m?"scale(1.25)":"scale(1)",transition:"all .2s"}}>{m}</span>)}</div>
              {/* 사진 첨부 */}
              <div style={{marginBottom:14}}>
                {diaryForm.photoUrl?(
                  <div style={{position:"relative",marginBottom:8}}>
                    <img src={diaryForm.photoUrl} alt="" style={{width:"100%",borderRadius:14,maxHeight:160,objectFit:"cover"}}/>
                    <button onClick={()=>setDiaryForm(f=>({...f,photoUrl:""}))} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.5)",border:"none",borderRadius:"50%",width:28,height:28,color:"white",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>✕</button>
                  </div>
                ):(
                  <button onClick={()=>diaryPhotoRef.current?.click()} style={{...btnLight(),borderRadius:14,fontSize:14}}>
                    {diaryUploading?"📷 업로드 중...":"📷 사진 첨부하기"}
                  </button>
                )}
              </div>
              <input style={{...inp,marginBottom:10,borderRadius:14}} placeholder="제목 (선택)" value={diaryForm.title} onChange={e=>setDiaryForm(d=>({...d,title:e.target.value}))}/>
              <textarea style={{...inp,minHeight:120,marginBottom:12,borderRadius:14,lineHeight:1.7,fontSize:15}} placeholder="오늘 어떤 하루였나요? 💕" value={diaryForm.content} onChange={e=>setDiaryForm(d=>({...d,content:e.target.value}))}/>
              <p style={{fontSize:13,color:T.sub,marginBottom:10,fontWeight:600}}>스티커</p>
              <div style={{display:"flex",overflowX:"auto",gap:8,paddingBottom:10,marginBottom:18,scrollbarWidth:"none"}}>{STICKERS.map(st=><span key={st} onClick={()=>setDiaryForm(d=>({...d,sticker:d.sticker===st?"":st}))} style={{fontSize:28,cursor:"pointer",opacity:diaryForm.sticker===st?1:.35,flexShrink:0,transform:diaryForm.sticker===st?"scale(1.2)":"scale(1)",transition:"all .2s"}}>{st}</span>)}</div>
              <button style={{...btnPrimary(),borderRadius:16}} onClick={saveDiary}>{editDiary?"수정하기":"저장하기"}</button>
            </>)}

            {/* PHOTO UPLOAD */}
            {modal==="photoUpload"&&(<>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontStyle:"italic",marginBottom:20,color:T.text}}>사진 추가</h3>
              <p style={{fontSize:13,color:T.sub,marginBottom:8,fontWeight:600}}>날짜 선택</p>
              <input type="date" style={{...inp,marginBottom:14,borderRadius:14}} value={photoDateInput} onChange={e=>setPhotoDateInput(e.target.value)}/>
              <p style={{fontSize:13,color:T.sub,marginBottom:8,fontWeight:600}}>앨범 선택</p>
              <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>{albums.map(al=><button key={al.id} onClick={()=>setSelAlbum(al.id)} style={pill(selAlbum===al.id)}>{al.name}</button>)}</div>
              <button style={{...btnPrimary(),borderRadius:16}} onClick={()=>{photoRef.current?.click();setModal(null);}}>📸 사진 선택하기 (여러 장 가능)</button>
            </>)}

            {/* ADD ALBUM */}
            {modal==="addAlbum"&&(<>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontStyle:"italic",marginBottom:20,color:T.text}}>새 폴더 만들기</h3>
              <input style={{...inp,marginBottom:18,borderRadius:14}} placeholder="폴더 이름 (예: 제주도 여행 ✈️)" value={albumForm.name} onChange={e=>setAlbumForm({name:e.target.value})}/>
              <button style={{...btnPrimary(),borderRadius:16}} onClick={addAlbum}>만들기</button>
            </>)}

            {/* STICKER */}
            {modal==="sticker"&&(<>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontStyle:"italic",marginBottom:16,color:T.text}}>스티커 보내기</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14}}>
                {STICKERS.map(st=><span key={st} onClick={()=>{sendMsg(st);setModal(null);}} style={{fontSize:34,cursor:"pointer",textAlign:"center",transition:"transform .15s"}}>{st}</span>)}
              </div>
            </>)}

            {/* CHANGE NAME */}
            {modal==="changeName"&&(<>
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontStyle:"italic",marginBottom:20,color:T.text}}>이름 변경</h3>
              <input style={{...inp,marginBottom:18,borderRadius:14}} placeholder="새 이름" value={nameInput} onChange={e=>setNameInput(e.target.value)}/>
              <button style={{...btnPrimary(),borderRadius:16}} onClick={changeName}>변경하기</button>
            </>)}

          </div>
          )}
        </div>
      )}
    </div>
  );
}
