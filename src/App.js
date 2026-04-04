/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import { auth, db, googleProvider } from "./firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, query, orderBy, serverTimestamp, updateDoc, deleteDoc
} from "firebase/firestore";

/* ─── UPLOAD ─── */
const CLOUD="dhyikflzd", PRESET="lx1bc92x";
const compress=(file)=>new Promise(res=>{
  if(file.size<=7*1024*1024){res(file);return;}
  const rd=new FileReader();
  rd.onload=e=>{const img=new Image();img.onload=()=>{const s=Math.sqrt((7*1024*1024)/file.size);const c=document.createElement("canvas");c.width=Math.floor(img.width*s);c.height=Math.floor(img.height*s);c.getContext("2d").drawImage(img,0,0,c.width,c.height);c.toBlob(b=>res(new File([b],file.name,{type:"image/jpeg"})),"image/jpeg",0.85);};img.src=e.target.result;};rd.readAsDataURL(file);
});
const uploadImg=async(file)=>{const f=await compress(file);const fd=new FormData();fd.append("file",f);fd.append("upload_preset",PRESET);fd.append("cloud_name",CLOUD);const r=await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`,{method:"POST",body:fd});const d=await r.json();if(!d.secure_url)throw new Error(d.error?.message||"업로드 실패");return d.secure_url;};

/* ─── NOTIFICATIONS ─── */
const askNotif=async()=>{if(!("Notification"in window))return false;if(Notification.permission==="granted")return true;return(await Notification.requestPermission())==="granted";};
const notify=(title,body)=>{if(Notification.permission!=="granted")return;try{new Notification(title,{body,tag:"ours"});}catch(e){}};

/* ─── DESIGN ─── */
const THEMES={
  cream:    {name:"크림",    p:"#C47080",d:"#904858",l:"#F5ECEE",pale:"#FBF8F2",sub:"#9C8070",border:"rgba(160,110,80,.13)",card:"#FFFFFF",nav:"#FFFFFF",text:"#2C1E18",gold:"#C09040"},
  dusk:     {name:"더스크",  p:"#9A7090",d:"#7A5070",l:"#F2ECF5",pale:"#F8F5FA",sub:"#8A7090",border:"rgba(130,90,130,.13)",card:"#FFFFFF",nav:"#FFFFFF",text:"#1E1428",gold:"#C0A050"},
  sage:     {name:"세이지",  p:"#608070",d:"#406050",l:"#EBF2ED",pale:"#F4FAF5",sub:"#708878",border:"rgba(80,120,90,.13)",card:"#FFFFFF",nav:"#FFFFFF",text:"#101E14",gold:"#A09050"},
  midnight: {name:"미드나잇",p:"#C47080",d:"#904858",l:"#231520",pale:"#160E12",sub:"#A09098",border:"rgba(200,110,130,.18)",card:"#1E1228",nav:"#140C10",text:"#F0E8EE",gold:"#C8A050"},
};

/* ─── DIARY TEMPLATES ─── */
const DIARY_TEMPLATES = [
  { id:"standard",  name:"스탠다드",  desc:"제목·내용·사진·스티커" },
  { id:"magazine",  name:"매거진",    desc:"커버 사진이 크게 나오는 잡지 스타일" },
  { id:"minimal",   name:"미니멀",    desc:"날짜·내용만 심플하게" },
  { id:"polaroid",  name:"폴라로이드",desc:"사진 중심, 짧은 메모" },
];

const MOODS    = ["😊","🥰","😢","😤","😌","🤩","😴","🥳"];
const STICKERS = ["❤️","🌹","🌸","🦋","✨","🌙","⭐","🎀","💝","🌺","🍓","🎵","💫","🤍","🫶","💌","🫧","🍰","☁️","🌷"];
const MISSIONS = ["서로에게 칭찬 보내기","오늘 하늘 사진 공유","오늘 일기 남기기","좋아하는 노래 공유","손편지 한 줄 보내기","오늘 먹은 음식 자랑","데이트 장소 공유","사진 한 장 보내기","오늘 좋았던 일 공유"];
const EV_COLORS = ["#C47080","#7090C0","#608070","#C09040","#9070C0","#C07050"];
const WEEK = ["일","월","화","수","목","금","토"];

const todayStr=()=>{const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
const fmtDate=s=>s?s.replace(/-/g,"."):"";
const fmtMD=s=>{if(!s)return"";const p=s.split("-");return`${p[1]}월 ${p[2]}일`;};

export default function App(){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  const[couple,setCouple]=useState(null);
  const[showConnect,setShowConnect]=useState(false);
  const[myCode,setMyCode]=useState("");
  const[myName,setMyName]=useState("");
  const[myAvatar,setMyAvatar]=useState(null);
  const[partnerAvatar,setPartnerAvatar]=useState(null);
  const[sharedBg,setSharedBg]=useState(null);
  const[codeInput,setCodeInput]=useState("");
  const[dateInput,setDateInput]=useState("");
  const[setupStep,setSetupStep]=useState("code");
  const[tab,setTab]=useState("home");
  const[modal,setModal]=useState(null);
  const[themeKey,setThemeKey]=useState("cream");
  const T=THEMES[themeKey];

  // Calendar
  const[calDate,setCalDate]=useState(new Date());
  const[calView,setCalView]=useState("month"); // month|week|day
  const[selDay,setSelDay]=useState(null);
  const[events,setEvents]=useState({});
  const[eventForm,setEventForm]=useState({title:"",color:"#C47080"});
  const[editEvent,setEditEvent]=useState(null);

  // Chat
  const[messages,setMessages]=useState([]);
  const[chatInput,setChatInput]=useState("");
  const[unread,setUnread]=useState(0);
  const[prevCount,setPrevCount]=useState(0);
  const chatEnd=useRef(null);

  // Diary
  const[diaries,setDiaries]=useState([]);
  const[diaryFilter,setDiaryFilter]=useState("all");
  const[diaryTemplate,setDiaryTemplate]=useState("standard");
  const[diaryForm,setDiaryForm]=useState({title:"",content:"",mood:"😊",sticker:"",photoUrl:"",template:"standard"});
  const[editDiary,setEditDiary]=useState(null);

  // Photos
  const[photos,setPhotos]=useState([]);
  const[albums,setAlbums]=useState([{id:"default",name:"우리의 추억"}]);
  const[selAlbum,setSelAlbum]=useState("default");
  const[albumForm,setAlbumForm]=useState({name:""});
  const[photoDate,setPhotoDate]=useState(todayStr());

  // Missions
  const[missionsDone,setMissionsDone]=useState([]);
  const[missionsDate,setMissionsDate]=useState("");
  const[customMissions,setCustomMissions]=useState([]);
  const[missionMode,setMissionMode]=useState("random");
  const[newMission,setNewMission]=useState("");

  const[partnerOnline,setPartnerOnline]=useState(false);
  const[uploading,setUploading]=useState(false);
  const[diaryUpload,setDiaryUpload]=useState(false);
  const[nameInput,setNameInput]=useState("");
  const[settingsTab,setSettingsTab]=useState("profile");
  const[notifOn,setNotifOn]=useState(false);

  const bgRef=useRef(null);const photoRef=useRef(null);const chatPhotoRef=useRef(null);const avatarRef=useRef(null);const diaryPhotoRef=useRef(null);

  /* ── STYLES ── */
  const GS=`
    @import url('https://fonts.googleapis.com/css2?family=Tenor+Sans&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Noto+Sans+KR:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
    html,body,#root{height:100%;overflow:hidden}
    body{font-family:'Noto Sans KR',-apple-system,sans-serif;background:${T.pale};color:${T.text};overscroll-behavior:none;-webkit-font-smoothing:antialiased}
    input,textarea,button,select{font-family:'Noto Sans KR',-apple-system,sans-serif}
    textarea{resize:none} input[type=date]{-webkit-appearance:none}
    ::-webkit-scrollbar{width:0;height:0}
    .serif{font-family:'Cormorant Garamond',serif}
    .tenor{font-family:'Tenor Sans',Georgia,serif}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes scaleUp{from{opacity:0;transform:scale(.95) translateY(14px)}to{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes hb{0%,100%{transform:scale(1)}14%{transform:scale(1.12)}42%{transform:scale(1.07)}70%{transform:scale(1)}}
    @keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.2)}100%{transform:scale(1)}}
    .fu{animation:fadeUp .45s cubic-bezier(.16,1,.3,1) both}
    .fi{animation:fadeIn .28s ease both}
    .su{animation:scaleUp .4s cubic-bezier(.16,1,.3,1) both}
    .hb{animation:hb 2.6s ease-in-out infinite;display:inline-block}
    .spin{animation:spin 1s linear infinite;display:inline-block}
    .pop{animation:pop .3s ease}
    .fu1{animation-delay:.07s}.fu2{animation-delay:.14s}.fu3{animation-delay:.21s}
  `;

  const card={background:T.card,borderRadius:22,padding:"20px",marginBottom:12,boxShadow:`0 1px 0 ${T.border},0 4px 28px rgba(0,0,0,.05)`,border:`1px solid ${T.border}`};
  const btnP=(w="100%")=>({background:`linear-gradient(135deg,${T.p},${T.d})`,color:"#fff",border:"none",borderRadius:16,padding:"15px 22px",fontWeight:600,fontSize:15,cursor:"pointer",width:w,fontFamily:"'Noto Sans KR',sans-serif",boxShadow:`0 4px 20px ${T.p}38`});
  const btnS=(w="100%")=>({background:T.l,color:T.p,border:"none",borderRadius:16,padding:"14px 20px",fontWeight:600,fontSize:14,cursor:"pointer",width:w,fontFamily:"'Noto Sans KR',sans-serif"});
  const btnO=(w="100%")=>({background:"transparent",color:T.sub,border:`1px solid ${T.border}`,borderRadius:16,padding:"13px 20px",fontWeight:500,fontSize:14,cursor:"pointer",width:w,fontFamily:"'Noto Sans KR',sans-serif"});
  const inp={width:"100%",border:`1px solid ${T.border}`,borderRadius:14,padding:"13px 18px",fontSize:15,color:T.text,outline:"none",background:T.card,fontFamily:"'Noto Sans KR',sans-serif"};
  const pill=(a,c)=>({background:a?(c||T.p):T.l,color:a?"#fff":T.p,border:"none",borderRadius:50,padding:"7px 16px",fontWeight:500,fontSize:13,cursor:"pointer",flexShrink:0,fontFamily:"'Noto Sans KR',sans-serif",transition:"all .2s"});
  const goldRule={height:1,background:`linear-gradient(to right,transparent,${T.gold}44,transparent)`,margin:"2px 0"};

  /* ── AUTH ── */
  useEffect(()=>{
    const unsub=onAuthStateChanged(auth,async u=>{
      try{setUser(u);if(u)await initUser(u);else{setCouple(null);setShowConnect(false);}}
      catch(e){console.error(e);}finally{setLoading(false);}
    });
    return unsub;
  },[]);

  useEffect(()=>{
    if(!user)return;
    const ref=doc(db,"presence",user.uid);
    const up=()=>setDoc(ref,{online:true,lastSeen:serverTimestamp()},{merge:true});
    up();const iv=setInterval(up,30000);
    const bye=()=>setDoc(ref,{online:false,lastSeen:serverTimestamp()},{merge:true});
    window.addEventListener("beforeunload",bye);
    return()=>{clearInterval(iv);window.removeEventListener("beforeunload",bye);bye();};
  },[user]);

  useEffect(()=>{
    if(!couple?.partnerId)return;
    return onSnapshot(doc(db,"presence",couple.partnerId),snap=>{
      if(!snap.exists()){setPartnerOnline(false);return;}
      const d=snap.data(),last=d.lastSeen?.toDate?.();
      const on=d.online&&last&&(new Date()-last)<65000;
      if(on&&!partnerOnline&&notifOn)notify(`${couple.partnerName}이 접속했어요`,"지금 채팅해보세요 💕");
      setPartnerOnline(on);
    });
  },[couple,notifOn]);

  useEffect(()=>{
    if(messages.length>prevCount&&prevCount>0){
      const last=messages[messages.length-1];
      if(last?.from!==user?.uid&&tab!=="chat"&&notifOn){notify(last.fromName,last.type==="image"?"사진을 보냈어요 📸":last.text);setUnread(u=>u+1);}
    }
    setPrevCount(messages.length);
  },[messages]);
  useEffect(()=>{if(tab==="chat")setUnread(0);},[tab]);

  const initUser=async u=>{
    const ref=doc(db,"users",u.uid);const snap=await getDoc(ref);
    if(!snap.exists()){
      const code=Math.random().toString(36).substring(2,8).toUpperCase();
      await setDoc(ref,{uid:u.uid,name:u.displayName||"나",email:u.email,photoURL:u.photoURL||"",code,coupleId:null,createdAt:serverTimestamp()});
      setMyCode(code);setMyName(u.displayName||"나");setMyAvatar(u.photoURL||null);setShowConnect(true);
    }else{
      const d=snap.data();
      setMyCode(d.code);setMyName(d.name||u.displayName||"나");setMyAvatar(d.photoURL||u.photoURL||null);
      if(d.themeKey)setThemeKey(d.themeKey);
      if(d.missionMode)setMissionMode(d.missionMode);
      if(d.customMissions)setCustomMissions(d.customMissions);
      if(d.diaryTemplate)setDiaryTemplate(d.diaryTemplate);
      if(d.coupleId){await loadCouple(u.uid,d.coupleId);setShowConnect(false);}
      else setShowConnect(true);
    }
  };

  const loadCouple=async(myUid,cId)=>{
    const cSnap=await getDoc(doc(db,"couples",cId));if(!cSnap.exists())return;
    const cData=cSnap.data();
    const pId=cData.user1===myUid?cData.user2:cData.user1;
    const pSnap=await getDoc(doc(db,"users",pId));const pData=pSnap.exists()?pSnap.data():{};
    setCouple({coupleId:cId,partnerId:pId,partnerName:pData.name||"파트너",startDate:cData.startDate});
    setPartnerAvatar(pData.photoURL||null);
    if(cData.sharedBg)setSharedBg(cData.sharedBg);

    onSnapshot(query(collection(db,"couples",cId,"messages"),orderBy("createdAt")),s=>setMessages(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(collection(db,"couples",cId,"events"),s=>{const map={};s.docs.forEach(d=>{const ev={id:d.id,...d.data()};if(!map[ev.dateKey])map[ev.dateKey]=[];map[ev.dateKey].push(ev);});setEvents(map);});
    onSnapshot(query(collection(db,"couples",cId,"diaries"),orderBy("createdAt","desc")),s=>setDiaries(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(query(collection(db,"couples",cId,"photos"),orderBy("createdAt","desc")),s=>setPhotos(s.docs.map(d=>({id:d.id,...d.data()}))));
    onSnapshot(collection(db,"couples",cId,"albums"),s=>setAlbums([{id:"default",name:"우리의 추억"},...s.docs.map(d=>({id:d.id,...d.data()}))]));
    onSnapshot(doc(db,"couples",cId),s=>{if(s.exists()&&s.data().sharedBg)setSharedBg(s.data().sharedBg);});
    const mSnap=await getDoc(doc(db,"couples",cId,"missions","today"));
    if(mSnap.exists()&&mSnap.data().date===todayStr()){setMissionsDone(mSnap.data().completed||[]);setMissionsDate(mSnap.data().date);}
  };

  const savePrefs=async p=>{if(!user)return;await updateDoc(doc(db,"users",user.uid),p);};
  const loginGoogle=async()=>{try{await signInWithPopup(auth,googleProvider);}catch(e){alert(e.message);}};
  const logout=async()=>{
    if(user)await setDoc(doc(db,"presence",user.uid),{online:false,lastSeen:serverTimestamp()},{merge:true});
    await signOut(auth);
    setCouple(null);setMessages([]);setEvents({});setDiaries([]);setPhotos([]);setTab("home");setShowConnect(false);
  };

  const connectCouple=async()=>{
    if(!codeInput.trim())return;
    const snap=await getDocs(collection(db,"users"));
    const pDoc=snap.docs.find(d=>d.data().code===codeInput.toUpperCase());
    if(!pDoc){alert("코드를 찾을 수 없어요.");return;}if(pDoc.id===user.uid){alert("본인 코드는 안 돼요.");return;}
    setSetupStep("date");
  };
  const finishConnect=async()=>{
    if(!dateInput){alert("날짜를 선택해주세요.");return;}
    const snap=await getDocs(collection(db,"users"));
    const pDoc=snap.docs.find(d=>d.data().code===codeInput.toUpperCase());if(!pDoc)return;
    const cRef=await addDoc(collection(db,"couples"),{user1:user.uid,user2:pDoc.id,startDate:dateInput,createdAt:serverTimestamp()});
    await updateDoc(doc(db,"users",user.uid),{coupleId:cRef.id});
    await updateDoc(doc(db,"users",pDoc.id),{coupleId:cRef.id});
    await loadCouple(user.uid,cRef.id);setShowConnect(false);
  };

  const changeName=async()=>{if(!nameInput.trim())return;await updateDoc(doc(db,"users",user.uid),{name:nameInput.trim()});setMyName(nameInput.trim());setNameInput("");setModal(null);};
  const onAvatarUpload=async e=>{const file=e.target.files[0];if(!file)return;setUploading(true);try{const url=await uploadImg(file);await updateDoc(doc(db,"users",user.uid),{photoURL:url});setMyAvatar(url);}catch(err){alert(err.message);}finally{setUploading(false);}};
  const onBgUpload=async e=>{const file=e.target.files[0];if(!file||!couple)return;setUploading(true);try{const url=await uploadImg(file);await updateDoc(doc(db,"couples",couple.coupleId),{sharedBg:url});setSharedBg(url);}catch(err){alert(err.message);}finally{setUploading(false);}};

  const sendMsg=async(text)=>{const t=text||chatInput;if(!t.trim()||!couple)return;await addDoc(collection(db,"couples",couple.coupleId,"messages"),{text:t,from:user.uid,fromName:myName,type:"text",createdAt:serverTimestamp()});setChatInput("");};
  const onChatPhoto=async e=>{const file=e.target.files[0];if(!file)return;setUploading(true);try{const url=await uploadImg(file);await addDoc(collection(db,"couples",couple.coupleId,"messages"),{text:url,from:user.uid,fromName:myName,type:"image",createdAt:serverTimestamp()});}catch(err){alert(err.message);}finally{setUploading(false);}};
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[messages]);

  const saveEvent=async()=>{
    if(!selDay||!eventForm.title.trim()||!couple)return;
    const dateKey=`${calDate.getFullYear()}-${calDate.getMonth()+1}-${selDay}`;
    if(editEvent){await updateDoc(doc(db,"couples",couple.coupleId,"events",editEvent.id),{title:eventForm.title,color:eventForm.color});setEditEvent(null);}
    else{await addDoc(collection(db,"couples",couple.coupleId,"events"),{title:eventForm.title,dateKey,color:eventForm.color,who:user.uid,whoName:myName,createdAt:serverTimestamp()});}
    setEventForm({title:"",color:T.p});setModal(null);
  };
  const delEvent=async ev=>{if(!couple||!window.confirm("삭제할까요?"))return;await deleteDoc(doc(db,"couples",couple.coupleId,"events",ev.id));};

  const saveDiary=async()=>{
    if(!diaryForm.content.trim()||!couple)return;
    const now=new Date();
    const dateKey=selDay?`${calDate.getFullYear()}-${calDate.getMonth()+1}-${selDay}`:`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
    if(editDiary){await updateDoc(doc(db,"couples",couple.coupleId,"diaries",editDiary.id),{title:diaryForm.title,content:diaryForm.content,mood:diaryForm.mood,sticker:diaryForm.sticker,photoUrl:diaryForm.photoUrl||"",template:diaryForm.template});setEditDiary(null);}
    else{await addDoc(collection(db,"couples",couple.coupleId,"diaries"),{...diaryForm,dateKey,who:user.uid,whoName:myName,createdAt:serverTimestamp()});}
    setDiaryForm({title:"",content:"",mood:"😊",sticker:"",photoUrl:"",template:"standard"});setModal(null);
  };
  const delDiary=async d=>{if(!couple||!window.confirm("삭제할까요?"))return;await deleteDoc(doc(db,"couples",couple.coupleId,"diaries",d.id));};
  const onDiaryPhoto=async e=>{const file=e.target.files[0];if(!file)return;setDiaryUpload(true);try{const url=await uploadImg(file);setDiaryForm(f=>({...f,photoUrl:url}));}catch(err){alert(err.message);}finally{setDiaryUpload(false);}};

  const onPhotoUpload=async e=>{
    const files=Array.from(e.target.files);if(!files.length||!couple)return;setUploading(true);
    try{for(const f of files){const url=await uploadImg(f);await addDoc(collection(db,"couples",couple.coupleId,"photos"),{url,dateKey:photoDate||todayStr(),albumId:selAlbum,who:user.uid,whoName:myName,createdAt:serverTimestamp()});}}
    catch(err){alert(err.message);}finally{setUploading(false);}
  };
  const delPhoto=async p=>{if(!couple||!window.confirm("삭제할까요?"))return;await deleteDoc(doc(db,"couples",couple.coupleId,"photos",p.id));};
  const addAlbum=async()=>{if(!albumForm.name.trim()||!couple)return;const ref=await addDoc(collection(db,"couples",couple.coupleId,"albums"),{name:albumForm.name,createdAt:serverTimestamp()});setSelAlbum(ref.id);setAlbumForm({name:""});setModal(null);};

  const getTodayMissions=()=>{if(missionMode==="custom"&&customMissions.length>0)return customMissions.slice(0,3);const seed=new Date().toDateString();return[...MISSIONS].sort((a,b)=>(seed+a).length-(seed+b).length).slice(0,3);};
  const toggleMission=async i=>{if(!couple)return;const cur=missionsDate===todayStr()?missionsDone:[];const next=cur.includes(i)?cur.filter(x=>x!==i):[...cur,i];setMissionsDone(next);setMissionsDate(todayStr());await setDoc(doc(db,"couples",couple.coupleId,"missions","today"),{completed:next,date:todayStr(),updatedBy:user.uid});if(next.length===3&&notifOn)notify("🎉 오늘 미션 완료!","두 분 수고하셨어요");};

  const dday=()=>!couple?.startDate?1:Math.floor((new Date()-new Date(couple.startDate))/86400000)+1;

  /* ── CALENDAR HELPERS ── */
  const calDays=()=>{const y=calDate.getFullYear(),m=calDate.getMonth();const first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate();const arr=[];for(let i=0;i<first;i++)arr.push(null);for(let i=1;i<=last;i++)arr.push(i);return arr;};
  const dk=d=>`${calDate.getFullYear()}-${calDate.getMonth()+1}-${d}`;
  const todayDk=todayStr();
  const missionDone=missionsDate===todayStr()?missionsDone:[];
  const todayMissions=getTodayMissions();

  // Week view: get days of current week
  const getWeekDays=()=>{
    const now=calDate;const dow=now.getDay();const mon=new Date(now);mon.setDate(now.getDate()-dow);
    return Array.from({length:7},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);return d;});
  };

  /* ── AVATAR ── */
  const Av=({src,name,size=40,style={}})=>(
    <div style={{width:size,height:size,borderRadius:"50%",overflow:"hidden",background:`linear-gradient(135deg,${T.p}44,${T.p}88)`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.38,color:T.p,fontWeight:700,...style}}>
      {src?<img src={src} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(name||"?")[0]}
    </div>
  );

  /* ── DIARY CARD RENDERER ── */
  const DiaryCard=({d})=>{
    const isMe=d.who===user.uid;
    const tmpl=d.template||"standard";
    const borderColor=isMe?T.p:T.sub;

    if(tmpl==="magazine")return(
      <div style={{...card,padding:0,overflow:"hidden",marginBottom:16}}>
        {d.photoUrl&&<div style={{height:220,overflow:"hidden",position:"relative"}}>
          <img src={d.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 40%,rgba(0,0,0,.55))"}}/>
          <div style={{position:"absolute",bottom:16,left:18,right:18}}>
            {d.title&&<p style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:22,fontWeight:400,color:"#fff",marginBottom:4}}>{d.title}</p>}
            <p style={{fontSize:11,color:"rgba(255,255,255,.75)",letterSpacing:".06em"}}>{d.whoName} · {fmtDate(d.dateKey)}</p>
          </div>
          <span style={{position:"absolute",top:14,right:14,fontSize:22}}>{d.mood}</span>
        </div>}
        <div style={{padding:"16px 20px 18px"}}>
          {!d.photoUrl&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,color:T.sub}}>{d.whoName} · {fmtDate(d.dateKey)}</span><span style={{fontSize:20}}>{d.mood}</span></div>}
          <p style={{fontSize:14,color:T.sub,lineHeight:1.75}}>{d.content}</p>
          {d.sticker&&<p style={{marginTop:10,fontSize:24}}>{d.sticker}</p>}
          {isMe&&<div style={{display:"flex",gap:6,marginTop:12,justifyContent:"flex-end"}}>
            <button onClick={()=>{setEditDiary(d);setDiaryForm({title:d.title||"",content:d.content,mood:d.mood,sticker:d.sticker||"",photoUrl:d.photoUrl||"",template:d.template||"standard"});setModal("addDiary");}} style={{background:T.l,border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button>
            <button onClick={()=>delDiary(d)} style={{background:"#FEE8EC",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:"#C45050",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>}
        </div>
      </div>
    );

    if(tmpl==="minimal")return(
      <div style={{borderLeft:`2px solid ${borderColor}33`,paddingLeft:16,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,alignItems:"center"}}>
          <span style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:13,color:T.gold,letterSpacing:".04em"}}>{fmtDate(d.dateKey)}</span>
          <div style={{display:"flex",gap:4}}>
            <span style={{fontSize:16}}>{d.mood}</span>
            {isMe&&<>
              <button onClick={()=>{setEditDiary(d);setDiaryForm({title:d.title||"",content:d.content,mood:d.mood,sticker:d.sticker||"",photoUrl:d.photoUrl||"",template:d.template||"standard"});setModal("addDiary");}} style={{background:"none",border:"none",cursor:"pointer",color:T.sub,fontSize:13}}>✎</button>
              <button onClick={()=>delDiary(d)} style={{background:"none",border:"none",cursor:"pointer",color:"#C45050",fontSize:13}}>✕</button>
            </>}
          </div>
        </div>
        <p style={{fontSize:14,color:T.text,lineHeight:1.8}}>{d.content}</p>
        {d.sticker&&<p style={{marginTop:6,fontSize:20}}>{d.sticker}</p>}
      </div>
    );

    if(tmpl==="polaroid")return(
      <div style={{...card,padding:0,overflow:"hidden",width:"calc(50% - 6px)",display:"inline-block",verticalAlign:"top",marginRight:12,marginBottom:12}}>
        <div style={{height:160,background:T.l,overflow:"hidden"}}>
          {d.photoUrl?<img src={d.photoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>{d.mood}</div>}
        </div>
        <div style={{padding:"10px 12px 14px",background:"#fff"}}>
          <p style={{fontSize:12,color:T.sub,marginBottom:4}}>{fmtDate(d.dateKey)}</p>
          <p style={{fontSize:13,color:T.text,lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{d.content}</p>
          {d.sticker&&<p style={{marginTop:6,fontSize:18}}>{d.sticker}</p>}
        </div>
      </div>
    );

    // standard (default)
    return(
      <div style={{...card,padding:"18px 20px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Av src={isMe?myAvatar:partnerAvatar} name={d.whoName} size={32}/>
            <div><p style={{fontWeight:600,fontSize:14,color:T.text}}>{d.whoName}</p><p style={{fontSize:11,color:T.sub,marginTop:1}}>{fmtDate(d.dateKey)}</p></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:20}}>{d.mood}</span>
            {isMe&&<>
              <button onClick={()=>{setEditDiary(d);setDiaryForm({title:d.title||"",content:d.content,mood:d.mood,sticker:d.sticker||"",photoUrl:d.photoUrl||"",template:d.template||"standard"});setModal("addDiary");}} style={{background:T.l,border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button>
              <button onClick={()=>delDiary(d)} style={{background:"#FEE8EC",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:"#C45050",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </>}
          </div>
        </div>
        {d.photoUrl&&<img src={d.photoUrl} alt="" style={{width:"100%",borderRadius:14,marginBottom:12,maxHeight:220,objectFit:"cover"}}/>}
        {d.title&&<p style={{fontWeight:600,fontSize:16,color:T.text,marginBottom:8,borderLeft:`2px solid ${borderColor}`,paddingLeft:12}}>{d.title}</p>}
        <p style={{fontSize:14,color:T.sub,lineHeight:1.75,paddingLeft:d.title?14:0}}>{d.content}</p>
        {d.sticker&&<p style={{marginTop:10,fontSize:22}}>{d.sticker}</p>}
      </div>
    );
  };

  /* ══ LOADING ══ */
  if(loading)return(
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:THEMES.cream.pale}}>
      <style>{`@keyframes hb{0%,100%{transform:scale(1)}14%{transform:scale(1.12)}42%{transform:scale(1.07)}70%{transform:scale(1)}}.hb{animation:hb 2.6s ease-in-out infinite;display:inline-block;}`}</style>
      <div className="hb" style={{fontSize:52}}>❤️</div>
    </div>
  );

  /* ══ LOGIN ══ */
  if(!user)return(
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",position:"relative",overflow:"hidden",background:T.pale,display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"0 28px 56px"}}>
      <style>{GS}</style>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"58%",background:`linear-gradient(160deg,${T.l} 0%,${T.pale} 100%)`,borderRadius:"0 0 64px 64px"}}/>
      <div style={{position:"absolute",top:56,left:0,right:0,display:"flex",flexDirection:"column",alignItems:"center",padding:"0 32px"}}>
        <div style={{marginBottom:24}}>
          {/* Ours mini icon */}
          <svg width="80" height="80" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="li_bg" x1="0" y1="0" x2=".6" y2="1"><stop offset="0%" stopColor="#FBF8F2"/><stop offset="100%" stopColor="#F0E8DF"/></linearGradient>
              <linearGradient id="li_rh" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#D49098"/><stop offset="100%" stopColor="#904858"/></linearGradient>
              <linearGradient id="li_it" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2C1E18"/><stop offset="100%" stopColor="#4A3028"/></linearGradient>
              <linearGradient id="li_rs" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#D4A860" stopOpacity=".4"/><stop offset="100%" stopColor="#B08030" stopOpacity=".25"/></linearGradient>
            </defs>
            <rect width="1024" height="1024" rx="216" fill="url(#li_bg)"/>
            <circle cx="512" cy="480" r="346" fill="none" stroke="url(#li_rs)" stroke-width="1.3"/>
            <path d="M 512 668 C 306 538,214 424,236 318 C 256 222,350 176,418 190 C 458 198,492 222,512 254 C 532 222,566 198,606 190 C 674 176,768 222,788 318 C 810 424,718 538,512 668 Z" fill="none" stroke="url(#li_rh)" stroke-width="14" strokeLinejoin="round" strokeLinecap="round"/>
            <text x="512" y="860" textAnchor="middle" fontFamily="'Tenor Sans',Georgia,serif" fontSize="118" fontWeight="400" letterSpacing="34" fill="url(#li_it)">OURS</text>
          </svg>
        </div>
        <h1 className="fu serif" style={{fontSize:52,fontWeight:300,color:T.text,letterSpacing:"-.02em",lineHeight:1,textAlign:"center",marginBottom:10}}>Ours</h1>
        <p className="fu fu1" style={{fontSize:15,color:T.sub,fontWeight:300,letterSpacing:".06em"}}>우리만의 공간</p>
      </div>
      <div className="fu fu2" style={{position:"relative",display:"flex",flexDirection:"column",gap:12}}>
        <button onClick={loginGoogle} style={{...btnP(),borderRadius:18,fontSize:16,padding:"17px 24px",display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" opacity=".9"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" opacity=".7"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" opacity=".5"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" opacity=".3"/></svg>
          Google로 시작하기
        </button>
        <button style={{...btnO(),borderRadius:18,fontSize:15,padding:"16px",opacity:.4,cursor:"not-allowed"}}>카카오로 시작하기 (준비중)</button>
      </div>
      <p className="fu fu3" style={{position:"relative",marginTop:20,fontSize:12,color:T.sub,textAlign:"center",lineHeight:1.7}}>로그인하면 이용약관 및 개인정보처리방침에 동의합니다</p>
    </div>
  );

  /* ══ CONNECT ══ */
  if(showConnect)return(
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",background:T.pale,display:"flex",flexDirection:"column",padding:"60px 24px 40px",overflow:"auto"}}>
      <style>{GS}</style>
      <h1 className="fu serif" style={{fontSize:40,fontWeight:300,color:T.text,marginBottom:8,lineHeight:1.1}}>파트너와<br/>연결하기</h1>
      <p className="fu fu1" style={{color:T.sub,fontSize:14,marginBottom:32,lineHeight:1.7}}>코드를 교환해서 모든 기능을 함께 사용해요</p>
      <div className="fu fu1" style={{background:T.l,borderRadius:20,padding:"18px 22px",marginBottom:18,border:`1px solid ${T.border}`}}>
        <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>내 코드</p>
        <p className="tenor" style={{fontSize:34,color:T.p,letterSpacing:"10px",lineHeight:1}}>{myCode}</p>
      </div>
      <div className="fu fu2" style={{...card}}>
        {setupStep==="code"?(<>
          <p style={{fontSize:13,color:T.sub,marginBottom:10,fontWeight:500}}>파트너 코드 입력</p>
          <input style={{...inp,letterSpacing:6,textAlign:"center",fontSize:22,fontFamily:"'Tenor Sans',serif",marginBottom:16}} placeholder="XXXXXX" value={codeInput} onChange={e=>setCodeInput(e.target.value.toUpperCase())}/>
          <button style={btnP()} onClick={connectCouple}>다음 →</button>
        </>):(<>
          <p style={{fontSize:13,color:T.sub,marginBottom:10,fontWeight:500}}>사귄 날짜</p>
          <input type="date" style={{...inp,marginBottom:16}} value={dateInput} onChange={e=>setDateInput(e.target.value)}/>
          <button style={btnP()} onClick={finishConnect}>연결 완료</button>
          <button onClick={()=>setSetupStep("code")} style={{...btnO(),marginTop:10}}>← 뒤로</button>
        </>)}
      </div>
      <button onClick={()=>setShowConnect(false)} style={{marginTop:16,background:"none",border:"none",color:T.sub,fontSize:14,cursor:"pointer",padding:"8px"}}>나중에 연결하기</button>
      <button onClick={logout} style={{marginTop:8,background:"none",border:"none",color:T.sub,fontSize:12,cursor:"pointer",opacity:.6}}>로그아웃</button>
    </div>
  );

  /* ══ MAIN APP ══ */
  const TABS=[{id:"home",icon:"🏠",label:"홈"},{id:"calendar",icon:"📅",label:"달력"},{id:"chat",icon:"💬",label:"채팅"},{id:"photos",icon:"📸",label:"사진"},{id:"diary",icon:"📖",label:"일기"},{id:"settings",icon:"⚙️",label:"설정"}];

  return(
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",background:T.pale,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      <style>{GS}</style>
      <input ref={bgRef} type="file" accept="image/*" style={{display:"none"}} onChange={onBgUpload}/>
      <input ref={photoRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={onPhotoUpload}/>
      <input ref={chatPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={onChatPhoto}/>
      <input ref={avatarRef} type="file" accept="image/*" style={{display:"none"}} onChange={onAvatarUpload}/>
      <input ref={diaryPhotoRef} type="file" accept="image/*" style={{display:"none"}} onChange={onDiaryPhoto}/>

      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:76}}>

        {/* ══ HOME ══ */}
        {tab==="home"&&(
          <div className="fi">
            {/* Hero */}
            <div style={{position:"relative",borderRadius:"0 0 32px 32px",overflow:"hidden"}}>
              <div style={{background:sharedBg?`url(${sharedBg}) center/cover`:`linear-gradient(145deg,${T.p},${T.d})`,padding:"60px 24px 36px",minHeight:280,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                {sharedBg&&<div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.08),rgba(0,0,0,.52))"}}/>}
                <div style={{position:"absolute",top:54,left:24,right:24,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <Av src={myAvatar} name={myName} size={36} style={{border:"2px solid rgba(255,255,255,.5)"}}/>
                    <span style={{color:"rgba(255,255,255,.88)",fontSize:14,fontWeight:500}}>{myName}</span>
                  </div>
                  <button onClick={()=>setTab("settings")} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.22)",borderRadius:10,padding:"6px 12px",color:"rgba(255,255,255,.88)",fontSize:12,cursor:"pointer",backdropFilter:"blur(8px)",fontFamily:"'Noto Sans KR',sans-serif",fontWeight:500}}>⚙️</button>
                </div>
                <div style={{position:"relative"}}>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:4,letterSpacing:".02em"}}>{couple?"함께한 날":"오늘부터"}</p>
                  <p className="serif" style={{fontSize:72,fontWeight:300,color:"#fff",lineHeight:.88,letterSpacing:"-4px",marginBottom:10}}>D+{dday()}</p>
                  <p style={{fontSize:12,color:"rgba(255,255,255,.6)"}}>{couple?.startDate||todayStr()}</p>
                </div>
              </div>
            </div>

            {!couple&&<div onClick={()=>setShowConnect(true)} style={{margin:"16px 20px 0",background:T.l,borderRadius:18,padding:"16px 20px",border:`1.5px dashed ${T.p}55`,cursor:"pointer"}}><p style={{fontWeight:600,color:T.p,marginBottom:2}}>파트너와 연결하기</p><p style={{fontSize:13,color:T.sub}}>코드를 교환해서 모든 기능을 함께 써요</p></div>}

            {couple&&<div style={{padding:"16px 20px 0",display:"flex",gap:10,overflowX:"auto",scrollbarWidth:"none"}}>
              {[{l:"100일",t:100},{l:"200일",t:200},{l:"1주년",t:365},{l:"2주년",t:730}].map(a=>({...a,d:a.t-dday()+1})).filter(a=>a.d>0).slice(0,4).map((a,i)=>(
                <div key={i} style={{background:T.card,borderRadius:16,padding:"10px 16px",border:`1px solid ${T.border}`,flexShrink:0,textAlign:"center",minWidth:76}}>
                  <p style={{fontSize:11,color:T.sub,marginBottom:4}}>{a.l}</p>
                  <p className="tenor" style={{fontWeight:400,color:T.p,fontSize:15,letterSpacing:"-.02em"}}>D-{a.d}</p>
                </div>
              ))}
            </div>}

            {/* Mission */}
            <div style={{margin:"16px 20px 0"}}>
              <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>오늘의 미션</p>
              <div style={{...card,padding:"16px 20px"}}>
                {todayMissions.map((m,i)=>(
                  <div key={i} onClick={()=>toggleMission(i)} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<2?`1px solid ${T.border}`:"none",cursor:"pointer"}}>
                    <div style={{width:22,height:22,borderRadius:6,border:`1.5px solid ${missionDone.includes(i)?T.p:T.border}`,background:missionDone.includes(i)?T.p:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s"}}>
                      {missionDone.includes(i)&&<span style={{color:"#fff",fontSize:12}}>✓</span>}
                    </div>
                    <span style={{fontSize:14,color:missionDone.includes(i)?T.sub:T.text,textDecoration:missionDone.includes(i)?"line-through":"none",fontWeight:missionDone.includes(i)?300:400}}>{m}</span>
                  </div>
                ))}
                {missionDone.length===3&&<p style={{textAlign:"center",marginTop:12,fontSize:13,color:T.p,fontWeight:600}}>오늘 미션 완료 ✓</p>}
              </div>
            </div>

            {/* Recent diary */}
            {diaries.length>0&&<div style={{margin:"16px 20px 0"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase"}}>최근 일기</p>
                <button onClick={()=>setTab("diary")} style={{background:"none",border:"none",fontSize:13,color:T.p,cursor:"pointer",fontWeight:500}}>전체보기</button>
              </div>
              <DiaryCard d={diaries[0]}/>
            </div>}
            <div style={{height:20}}/>
          </div>
        )}

        {/* ══ CALENDAR ══ */}
        {tab==="calendar"&&(
          <div className="fi">
            <div style={{padding:"56px 20px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h1 className="serif" style={{fontSize:32,fontWeight:300,color:T.text}}>달력</h1>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {/* View toggle */}
                <div style={{display:"flex",background:T.l,borderRadius:12,padding:"3px",gap:2}}>
                  {[{id:"month",l:"월"},{id:"week",l:"주"},{id:"day",l:"일"}].map(v=>(
                    <button key={v.id} onClick={()=>setCalView(v.id)} style={{background:calView===v.id?T.card:"transparent",border:"none",borderRadius:9,padding:"5px 10px",fontSize:12,fontWeight:calView===v.id?700:400,color:calView===v.id?T.p:T.sub,cursor:"pointer",transition:"all .2s",boxShadow:calView===v.id?`0 1px 4px rgba(0,0,0,.08)`:"none"}}>{v.l}</button>
                  ))}
                </div>
                {couple&&<button onClick={()=>{setSelDay(null);setEditEvent(null);setEventForm({title:"",color:T.p});setModal("addEvent");}} style={{...btnP("auto"),padding:"9px 14px",fontSize:13,borderRadius:12}}>+</button>}
              </div>
            </div>

            {/* ─ MONTH VIEW ─ */}
            {calView==="month"&&(
              <>
                <div style={{...card,margin:"0 16px 14px",padding:"18px 14px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,padding:"0 2px"}}>
                    <button onClick={()=>setCalDate(d=>new Date(d.getFullYear(),d.getMonth()-1,1))} style={{background:T.l,border:"none",width:38,height:38,borderRadius:12,cursor:"pointer",fontSize:18,color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                    <p className="serif" style={{fontSize:22,fontWeight:300,color:T.text}}>{calDate.getFullYear()}년 {calDate.getMonth()+1}월</p>
                    <button onClick={()=>setCalDate(d=>new Date(d.getFullYear(),d.getMonth()+1,1))} style={{background:T.l,border:"none",width:38,height:38,borderRadius:12,cursor:"pointer",fontSize:18,color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:8}}>
                    {WEEK.map((d,i)=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:i===0?"#C45353":i===6?"#5370C4":T.sub,padding:"4px 0"}}>{d}</div>)}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
                    {calDays().map((day,i)=>{
                      if(!day)return<div key={i}/>;
                      const key=dk(day),evs=events[key]||[],isToday=key===todayDk;
                      const dayPhotos=photos.filter(p=>p.dateKey===key);
                      const hasDiary=diaries.some(d=>d.dateKey===key);
                      const dow=new Date(calDate.getFullYear(),calDate.getMonth(),day).getDay();
                      const mainPhoto=dayPhotos[0];
                      return(
                        <div key={i} onClick={()=>{setSelDay(day);setModal("dayDetail");}}
                          style={{aspectRatio:"1",borderRadius:12,cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",background:isToday?T.p:"transparent",transition:"all .15s"}}>
                          {mainPhoto&&!isToday&&<img src={mainPhoto.url} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.55,borderRadius:12}}/>}
                          {!mainPhoto&&(evs.length>0||hasDiary)&&!isToday&&<div style={{position:"absolute",inset:0,background:T.l,borderRadius:12}}/>}
                          <span style={{fontSize:13,fontWeight:isToday?700:600,color:isToday?"#fff":mainPhoto?"#fff":dow===0?"#C45353":dow===6?"#5370C4":T.text,position:"relative",zIndex:1,textShadow:mainPhoto&&!isToday?"0 1px 3px rgba(0,0,0,.5)":"none"}}>{day}</span>
                          {/* Event title (first event) */}
                          {evs.length>0&&!isToday&&!mainPhoto&&<span style={{fontSize:7,color:evs[0].color,fontWeight:700,position:"absolute",bottom:9,zIndex:1,maxWidth:"90%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:"-.01em"}}>{evs[0].title}</span>}
                          {/* Dots */}
                          <div style={{display:"flex",gap:2,position:"absolute",bottom:3,zIndex:2}}>
                            {evs.slice(0,2).map((ev,ei)=><div key={ei} style={{width:4,height:4,borderRadius:"50%",background:isToday||mainPhoto?"rgba(255,255,255,.8)":ev.color}}/>)}
                            {hasDiary&&<div style={{width:4,height:4,borderRadius:"50%",background:isToday||mainPhoto?"rgba(255,255,255,.8)":T.gold}}/>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Event list */}
                <div style={{padding:"0 20px"}}>
                  {Object.entries(events).filter(([k])=>k.startsWith(`${calDate.getFullYear()}-${calDate.getMonth()+1}-`)).flatMap(([k,evs])=>evs.map(ev=>({...ev,dateKey:k}))).sort((a,b)=>parseInt(a.dateKey.split("-")[2])-parseInt(b.dateKey.split("-")[2])).map((ev,i)=>(
                    <div key={i} style={{...card,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:4,height:32,borderRadius:4,background:ev.color,flexShrink:0}}/>
                      <div style={{flex:1}}><p style={{fontWeight:500,fontSize:14,color:T.text}}>{ev.title}</p><p style={{fontSize:12,color:T.sub,marginTop:2}}>{ev.whoName} · {ev.dateKey.split("-")[2]}일</p></div>
                      {ev.who===user.uid&&<div style={{display:"flex",gap:6}}>
                        <button onClick={()=>{setSelDay(parseInt(ev.dateKey.split("-")[2]));setEditEvent(ev);setEventForm({title:ev.title,color:ev.color});setModal("addEvent");}} style={{background:T.l,border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button>
                        <button onClick={()=>delEvent(ev)} style={{background:"#FEE8EC",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:"#C45050",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                      </div>}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ─ WEEK VIEW ─ */}
            {calView==="week"&&(
              <div style={{padding:"0 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <button onClick={()=>setCalDate(d=>{const n=new Date(d);n.setDate(d.getDate()-7);return n;})} style={{background:T.l,border:"none",width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:16,color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                  <p style={{fontSize:14,fontWeight:600,color:T.text}}>{calDate.toLocaleDateString("ko-KR",{month:"long",day:"numeric"})} 주</p>
                  <button onClick={()=>setCalDate(d=>{const n=new Date(d);n.setDate(d.getDate()+7);return n;})} style={{background:T.l,border:"none",width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:16,color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,marginBottom:16}}>
                  {getWeekDays().map((d,i)=>{
                    const key=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
                    const evs=events[key]||[];const isToday=key===todayDk;
                    const dayPhoto=photos.find(p=>p.dateKey===key);
                    const hasDiary=diaries.some(di=>di.dateKey===key);
                    return(
                      <div key={i} onClick={()=>{setCalDate(new Date(d));setSelDay(d.getDate());setModal("dayDetail");}} style={{cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                        <span style={{fontSize:10,color:i===0?"#C45353":i===6?"#5370C4":T.sub,fontWeight:600}}>{WEEK[i]}</span>
                        <div style={{width:"100%",aspectRatio:"1",borderRadius:12,overflow:"hidden",position:"relative",background:isToday?T.p:dayPhoto?"transparent":T.l,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {dayPhoto&&<img src={dayPhoto.url} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.6}}/>}
                          <span style={{fontSize:15,fontWeight:isToday?700:600,color:isToday?"#fff":T.text,position:"relative",zIndex:1,textShadow:dayPhoto?"0 1px 3px rgba(0,0,0,.5)":"none"}}>{d.getDate()}</span>
                          {(evs.length>0||hasDiary)&&<div style={{position:"absolute",bottom:3,display:"flex",gap:2,zIndex:2}}>
                            {evs.slice(0,1).map((ev,ei)=><div key={ei} style={{width:4,height:4,borderRadius:"50%",background:isToday?"rgba(255,255,255,.8)":ev.color}}/>)}
                            {hasDiary&&<div style={{width:4,height:4,borderRadius:"50%",background:isToday?"rgba(255,255,255,.8)":T.gold}}/>}
                          </div>}
                        </div>
                        {/* Event label */}
                        {evs.length>0&&<span style={{fontSize:8,color:evs[0].color,fontWeight:700,maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"center"}}>{evs[0].title}</span>}
                      </div>
                    );
                  })}
                </div>
                {/* Events of this week */}
                {getWeekDays().map(d=>{
                  const key=`${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
                  const evs=events[key]||[];const dayDiaries=diaries.filter(di=>di.dateKey===key);const dayPhotos=photos.filter(p=>p.dateKey===key);
                  if(!evs.length&&!dayDiaries.length&&!dayPhotos.length)return null;
                  return(
                    <div key={key} style={{marginBottom:16}}>
                      <p style={{fontSize:12,fontWeight:700,color:T.sub,marginBottom:8,letterSpacing:".04em"}}>{d.toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}</p>
                      {evs.map((ev,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",background:T.card,borderRadius:12,marginBottom:6,border:`1px solid ${T.border}`}}>
                        <div style={{width:3,height:20,borderRadius:3,background:ev.color}}/>
                        <span style={{fontSize:13,color:T.text,fontWeight:500}}>{ev.title}</span>
                      </div>)}
                      {dayDiaries.map((d,i)=><div key={i} style={{padding:"8px 14px",background:T.l,borderRadius:12,marginBottom:6}}>
                        <span style={{fontSize:13,color:T.p}}>{d.mood} {d.title||d.content.substring(0,20)+"..."}</span>
                      </div>)}
                      {dayPhotos.length>0&&<div style={{display:"flex",gap:4}}>
                        {dayPhotos.slice(0,4).map(p=><img key={p.id} src={p.url} alt="" style={{width:60,height:60,borderRadius:10,objectFit:"cover"}} onClick={()=>setModal({type:"imgView",url:p.url})}/>)}
                        {dayPhotos.length>4&&<div style={{width:60,height:60,borderRadius:10,background:T.l,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:T.sub,fontWeight:600}}>+{dayPhotos.length-4}</div>}
                      </div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ─ DAY VIEW ─ */}
            {calView==="day"&&(()=>{
              const key=`${calDate.getFullYear()}-${calDate.getMonth()+1}-${calDate.getDate()}`;
              const evs=events[key]||[];const dayDiaries=diaries.filter(d=>d.dateKey===key);const dayPhotos=photos.filter(p=>p.dateKey===key);
              return(
                <div style={{padding:"0 20px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                    <button onClick={()=>setCalDate(d=>{const n=new Date(d);n.setDate(d.getDate()-1);return n;})} style={{background:T.l,border:"none",width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:16,color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
                    <p className="serif" style={{fontSize:22,fontWeight:300,color:T.text}}>{calDate.toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"long"})}</p>
                    <button onClick={()=>setCalDate(d=>{const n=new Date(d);n.setDate(d.getDate()+1);return n;})} style={{background:T.l,border:"none",width:36,height:36,borderRadius:10,cursor:"pointer",fontSize:16,color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
                  </div>
                  {/* Day photos: large */}
                  {dayPhotos.length>0&&<div style={{marginBottom:20}}>
                    <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>사진</p>
                    {dayPhotos.length===1?<img src={dayPhotos[0].url} alt="" style={{width:"100%",borderRadius:18,maxHeight:300,objectFit:"cover",cursor:"pointer"}} onClick={()=>setModal({type:"imgView",url:dayPhotos[0].url})}/>:(
                      <div style={{display:"grid",gridTemplateColumns:dayPhotos.length===2?"1fr 1fr":dayPhotos.length===3?"2fr 1fr":"1fr 1fr",gridTemplateRows:dayPhotos.length===3?"1fr 1fr":"auto",gap:4}}>
                        {dayPhotos.slice(0,4).map((p,idx)=>(
                          <img key={p.id} src={p.url} alt="" style={{width:"100%",aspectRatio:dayPhotos.length===3&&idx===0?"auto":"1",height:dayPhotos.length===3&&idx===0?"100%":"auto",borderRadius:12,objectFit:"cover",cursor:"pointer",gridRow:dayPhotos.length===3&&idx===0?"1/3":"auto"}} onClick={()=>setModal({type:"imgView",url:p.url})}/>
                        ))}
                      </div>
                    )}
                  </div>}
                  {/* Events */}
                  {evs.length>0&&<div style={{marginBottom:20}}>
                    <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>일정</p>
                    {evs.map((ev,i)=><div key={i} style={{...card,padding:"12px 16px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:4,height:28,borderRadius:4,background:ev.color,flexShrink:0}}/>
                      <div style={{flex:1}}><p style={{fontWeight:500,fontSize:14,color:T.text}}>{ev.title}</p><p style={{fontSize:12,color:T.sub}}>{ev.whoName}</p></div>
                    </div>)}
                  </div>}
                  {/* Diaries */}
                  {dayDiaries.length>0&&<div style={{marginBottom:20}}>
                    <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>일기</p>
                    {dayDiaries.map(d=><DiaryCard key={d.id} d={d}/>)}
                  </div>}
                  {evs.length===0&&dayDiaries.length===0&&dayPhotos.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:T.sub}}><p style={{fontSize:36,marginBottom:10}}>🌸</p><p style={{fontSize:14}}>이날의 기록이 없어요</p></div>}
                  <div style={{display:"flex",gap:8,marginTop:16}}>
                    {couple&&<button onClick={()=>{setSelDay(calDate.getDate());setEditEvent(null);setEventForm({title:"",color:T.p});setModal("addEvent");}} style={{...btnS(),fontSize:13,padding:"12px",borderRadius:14}}>+ 일정</button>}
                    <button onClick={()=>{setSelDay(calDate.getDate());setEditDiary(null);setDiaryForm({title:"",content:"",mood:"😊",sticker:"",photoUrl:"",template:diaryTemplate});setModal("addDiary");}} style={{...btnS(),fontSize:13,padding:"12px",borderRadius:14}}>✍ 일기</button>
                    <button onClick={()=>setModal("photoUpload")} style={{...btnS(),fontSize:13,padding:"12px",borderRadius:14}}>📷 사진</button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ CHAT ══ */}
        {tab==="chat"&&(
          <div className="fi" style={{display:"flex",flexDirection:"column",height:"100%",position:"absolute",inset:0,paddingBottom:76}}>
            <div style={{background:T.card,padding:"54px 20px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:14,flexShrink:0}}>
              <div style={{position:"relative"}}>
                <Av src={partnerAvatar} name={couple?.partnerName} size={44}/>
                <div style={{position:"absolute",bottom:1,right:1,width:11,height:11,borderRadius:"50%",background:couple&&partnerOnline?"#72B888":T.border,border:`2px solid ${T.card}`}}/>
              </div>
              <div>
                <p style={{fontWeight:600,fontSize:16,color:T.text}}>{couple?.partnerName||"파트너"}</p>
                <p style={{fontSize:12,color:couple&&partnerOnline?"#72B888":T.sub,fontWeight:500,marginTop:2}}>{couple?(partnerOnline?"지금 접속 중":"오프라인"):"파트너 미연결"}</p>
              </div>
            </div>
            {!couple?(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
                <p style={{fontSize:48,marginBottom:16}}>💬</p>
                <p style={{fontWeight:600,fontSize:16,color:T.text,marginBottom:8}}>파트너와 연결 후 이용 가능해요</p>
                <button onClick={()=>setShowConnect(true)} style={{...btnP("auto"),padding:"13px 28px",borderRadius:16,marginTop:8}}>연결하러 가기</button>
              </div>
            ):(<>
              <div style={{flex:1,overflowY:"auto",padding:"18px 20px 8px",display:"flex",flexDirection:"column",gap:10,WebkitOverflowScrolling:"touch"}}>
                {messages.length===0&&<div style={{textAlign:"center",padding:"60px 20px",color:T.sub}}><p style={{fontSize:15}}>첫 메시지를 보내보세요</p></div>}
                {messages.map(msg=>{const isMe=msg.from===user.uid;return(
                  <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start",gap:4}}>
                    {!isMe&&<p style={{fontSize:12,color:T.sub,fontWeight:500,paddingLeft:2}}>{msg.fromName}</p>}
                    {msg.type==="image"?<img src={msg.text} alt="" onClick={()=>setModal({type:"imgView",url:msg.text})} style={{maxWidth:"70%",borderRadius:16,cursor:"pointer",boxShadow:"0 4px 20px rgba(0,0,0,.15)"}}/>:
                    <div style={{maxWidth:"78%",padding:"12px 16px",fontSize:15,lineHeight:1.55,background:isMe?`linear-gradient(135deg,${T.p},${T.d})`:T.card,color:isMe?"#fff":T.text,borderRadius:20,[isMe?"borderBottomRightRadius":"borderBottomLeftRadius"]:6,boxShadow:isMe?`0 4px 16px ${T.p}40`:`0 1px 4px rgba(0,0,0,.06)`,border:isMe?"none":`1px solid ${T.border}`}}>{msg.text}</div>}
                  </div>
                );})}
                <div ref={chatEnd}/>
              </div>
              <div style={{padding:"10px 16px",background:T.card,borderTop:`1px solid ${T.border}`,display:"flex",gap:8,alignItems:"center",flexShrink:0,paddingBottom:"max(12px,env(safe-area-inset-bottom))"}}>
                <button onClick={()=>setModal("sticker")} style={{background:"none",border:"none",fontSize:24,cursor:"pointer",padding:"4px",lineHeight:1,flexShrink:0}}>😊</button>
                <button onClick={()=>chatPhotoRef.current?.click()} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",padding:"4px",lineHeight:1,flexShrink:0,opacity:uploading?.5:1}}>📷</button>
                <div style={{flex:1,background:T.pale,borderRadius:24,display:"flex",alignItems:"center"}}>
                  <input style={{flex:1,background:"transparent",border:"none",outline:"none",fontSize:15,color:T.text,padding:"11px 16px",fontFamily:"'Noto Sans KR',sans-serif"}} placeholder="메시지를 입력하세요" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMsg()}/>
                </div>
                <button onClick={()=>sendMsg()} style={{background:`linear-gradient(135deg,${T.p},${T.d})`,border:"none",borderRadius:50,width:44,height:44,color:"white",fontSize:18,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 14px ${T.p}50`}}>↑</button>
              </div>
            </>)}
          </div>
        )}

        {/* ══ PHOTOS ══ */}
        {tab==="photos"&&(
          <div className="fi">
            <div style={{padding:"56px 20px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h1 className="serif" style={{fontSize:32,fontWeight:300,color:T.text}}>사진첩</h1>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>setModal("addAlbum")} style={{...btnS("auto"),padding:"10px 14px",fontSize:13,borderRadius:12}}>+ 폴더</button>
                <button onClick={()=>setModal("photoUpload")} disabled={uploading} style={{...btnP("auto"),padding:"10px 16px",fontSize:13,borderRadius:12}}>{uploading?"업로드중":"+ 사진"}</button>
              </div>
            </div>
            <div style={{padding:"0 20px 12px",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
              {albums.map(al=><button key={al.id} onClick={()=>setSelAlbum(al.id)} style={pill(selAlbum===al.id)}>{al.name}</button>)}
            </div>
            {photos.filter(p=>p.albumId===selAlbum).length===0?
              <div style={{textAlign:"center",padding:"80px 20px"}}><p style={{fontSize:44,marginBottom:16}}>📷</p><p style={{fontWeight:600,fontSize:16,color:T.text,marginBottom:8}}>사진이 없어요</p><button onClick={()=>setModal("photoUpload")} style={{...btnP("auto"),padding:"13px 28px",borderRadius:16,marginTop:8}}>사진 추가하기</button></div>:
              <div style={{padding:"0 20px"}}>
                {[...new Set(photos.filter(p=>p.albumId===selAlbum).map(p=>p.dateKey))].map(date=>(
                  <div key={date} style={{marginBottom:22}}>
                    <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",marginBottom:10,textTransform:"uppercase"}}>{fmtDate(date)}</p>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                      {photos.filter(p=>p.albumId===selAlbum&&p.dateKey===date).map(ph=>(
                        <div key={ph.id} style={{aspectRatio:"1",borderRadius:14,overflow:"hidden",position:"relative",cursor:"pointer"}} onClick={()=>setModal({type:"imgView",url:ph.url})}>
                          <img src={ph.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                          {ph.who===user.uid&&<button onClick={e=>{e.stopPropagation();delPhoto(ph);}} style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.55)",border:"none",borderRadius:"50%",width:24,height:24,color:"#fff",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>✕</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}

        {/* ══ DIARY ══ */}
        {tab==="diary"&&(
          <div className="fi">
            <div style={{padding:"56px 20px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h1 className="serif" style={{fontSize:32,fontWeight:300,color:T.text}}>일기</h1>
              <button onClick={()=>{setSelDay(null);setEditDiary(null);setDiaryForm({title:"",content:"",mood:"😊",sticker:"",photoUrl:"",template:diaryTemplate});setModal("addDiary");}} style={{...btnP("auto"),padding:"10px 18px",fontSize:14,borderRadius:14}}>+ 쓰기</button>
            </div>
            {couple&&<div style={{padding:"0 20px 14px",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
              {[{id:"all",l:"전체"},{id:"me",l:"내 일기"},{id:"partner",l:couple.partnerName}].map(f=>(
                <button key={f.id} onClick={()=>setDiaryFilter(f.id)} style={pill(diaryFilter===f.id)}>{f.l}</button>
              ))}
            </div>}
            {/* Polaroid layout needs special wrapping */}
            {diaryTemplate==="polaroid"?(
              <div style={{padding:"0 20px"}}>
                {diaries.filter(d=>diaryFilter==="all"||(diaryFilter==="me"?d.who===user.uid:d.who!==user.uid)).map(d=><DiaryCard key={d.id} d={d}/>)}
              </div>
            ):(
              <div style={{padding:"0 20px"}}>
                {diaries.filter(d=>diaryFilter==="all"||(diaryFilter==="me"?d.who===user.uid:d.who!==user.uid)).length===0?
                  <div style={{textAlign:"center",padding:"80px 20px"}}><p style={{fontSize:44,marginBottom:16}}>✍️</p><p style={{fontWeight:600,fontSize:16,color:T.text,marginBottom:24}}>일기가 없어요</p><button onClick={()=>setModal("addDiary")} style={{...btnP("auto"),padding:"13px 28px",borderRadius:16}}>첫 일기 쓰기</button></div>:
                  diaries.filter(d=>diaryFilter==="all"||(diaryFilter==="me"?d.who===user.uid:d.who!==user.uid)).map(d=><DiaryCard key={d.id} d={d}/>)
                }
              </div>
            )}
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab==="settings"&&(
          <div className="fi">
            <div style={{padding:"56px 20px 14px",display:"flex",alignItems:"center",gap:12}}>
              {/* Mini Ours logo */}
              <svg width="32" height="32" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="st_bg" x1="0" y1="0" x2=".6" y2="1"><stop offset="0%" stopColor="#FBF8F2"/><stop offset="100%" stopColor="#F0E8DF"/></linearGradient><linearGradient id="st_rh" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#D49098"/><stop offset="100%" stopColor="#904858"/></linearGradient><linearGradient id="st_it" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2C1E18"/><stop offset="100%" stopColor="#4A3028"/></linearGradient></defs>
                <rect width="1024" height="1024" rx="216" fill="url(#st_bg)"/>
                <path d="M 512 668 C 306 538,214 424,236 318 C 256 222,350 176,418 190 C 458 198,492 222,512 254 C 532 222,566 198,606 190 C 674 176,768 222,788 318 C 810 424,718 538,512 668 Z" fill="none" stroke="url(#st_rh)" stroke-width="16" strokeLinejoin="round" strokeLinecap="round"/>
                <text x="512" y="860" textAnchor="middle" fontFamily="'Tenor Sans',Georgia,serif" fontSize="118" fontWeight="400" letterSpacing="34" fill="url(#st_it)">OURS</text>
              </svg>
              <h1 className="tenor" style={{fontSize:26,fontWeight:400,color:T.text,letterSpacing:"4px"}}>OURS</h1>
            </div>
            <div style={{padding:"0 20px 14px",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
              {[{id:"profile",l:"프로필"},{id:"diary",l:"일기 설정"},{id:"notify",l:"알림"},{id:"theme",l:"테마"},{id:"home",l:"홈 꾸미기"},{id:"mission",l:"미션"},{id:"couple",l:"커플"}].map(s=>(
                <button key={s.id} onClick={()=>setSettingsTab(s.id)} style={pill(settingsTab===s.id)}>{s.l}</button>
              ))}
            </div>

            {settingsTab==="profile"&&<div style={{padding:"0 20px"}}>
              <div style={{...card,padding:"22px 20px"}}>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:18}}>
                  <div style={{position:"relative",cursor:"pointer"}} onClick={()=>avatarRef.current?.click()}>
                    <Av src={myAvatar} name={myName} size={72} style={{border:`2px solid ${T.border}`}}/>
                    <div style={{position:"absolute",bottom:0,right:0,width:24,height:24,borderRadius:"50%",background:T.p,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",border:`2px solid ${T.card}`}}>✎</div>
                  </div>
                  <div><p style={{fontWeight:700,fontSize:20,color:T.text}}>{myName}</p><p style={{fontSize:13,color:T.sub,marginTop:4}}>{user.email}</p></div>
                </div>
                <button onClick={()=>{setNameInput(myName);setModal("changeName");}} style={{...btnS(),borderRadius:14,marginBottom:12}}>이름 변경</button>
                <div style={{background:T.l,borderRadius:14,padding:"14px",textAlign:"center"}}>
                  <p style={{fontSize:11,color:T.sub,marginBottom:6,letterSpacing:".06em",textTransform:"uppercase"}}>내 코드</p>
                  <p className="tenor" style={{fontSize:26,color:T.p,letterSpacing:"8px"}}>{myCode}</p>
                </div>
              </div>
              <button onClick={logout} style={{...btnO(),borderRadius:14}}>로그아웃</button>
            </div>}

            {/* ─ DIARY TEMPLATE SETTINGS ─ */}
            {settingsTab==="diary"&&<div style={{padding:"0 20px"}}>
              <div style={{...card,padding:"20px"}}>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:14}}>기본 일기 템플릿</p>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {[
                    {id:"standard",  name:"스탠다드",   desc:"제목 · 내용 · 사진 · 기분 · 스티커",  icon:"📝"},
                    {id:"magazine",  name:"매거진",     desc:"커버 사진이 크게 나오는 잡지 스타일",   icon:"📰"},
                    {id:"minimal",   name:"미니멀",     desc:"날짜와 내용만 심플하게",               icon:"✏️"},
                    {id:"polaroid",  name:"폴라로이드", desc:"사진 중심, 짧은 메모 스타일",          icon:"📷"},
                  ].map(tmpl=>(
                    <button key={tmpl.id} onClick={()=>{setDiaryTemplate(tmpl.id);savePrefs({diaryTemplate:tmpl.id});}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:16,border:`1.5px solid ${diaryTemplate===tmpl.id?T.p:T.border}`,background:diaryTemplate===tmpl.id?T.l:T.card,cursor:"pointer",transition:"all .2s",textAlign:"left"}}>
                      <span style={{fontSize:24,flexShrink:0}}>{tmpl.icon}</span>
                      <div style={{flex:1}}>
                        <p style={{fontWeight:600,fontSize:14,color:T.text,marginBottom:2}}>{tmpl.name}</p>
                        <p style={{fontSize:12,color:T.sub}}>{tmpl.desc}</p>
                      </div>
                      {diaryTemplate===tmpl.id&&<span style={{color:T.p,fontWeight:700,fontSize:14,flexShrink:0}}>✓</span>}
                    </button>
                  ))}
                </div>
                <p style={{fontSize:12,color:T.sub,marginTop:14,lineHeight:1.6}}>💡 일기 작성 시 템플릿을 바꿀 수도 있어요</p>
              </div>
            </div>}

            {settingsTab==="notify"&&<div style={{padding:"0 20px"}}>
              <div style={{...card,padding:"22px 20px"}}>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:16}}>알림 설정</p>
                <div style={{background:T.l,borderRadius:16,padding:"16px 18px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><p style={{fontWeight:600,fontSize:15,color:T.text,marginBottom:4}}>브라우저 알림</p><p style={{fontSize:13,color:T.sub}}>채팅, 접속, 미션 알림</p></div>
                  <div style={{width:44,height:26,borderRadius:13,background:notifOn?T.p:T.border,position:"relative",cursor:"pointer",transition:"background .2s"}} onClick={async()=>{if(notifOn)return;const ok=await askNotif();setNotifOn(ok);if(ok)notify("Ours","알림이 설정되었어요 💕");}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:notifOn?21:3,transition:"left .2s",boxShadow:"0 1px 4px rgba(0,0,0,.2)"}}/>
                  </div>
                </div>
                {!notifOn&&<div style={{background:"#FFF8EC",borderRadius:14,padding:"14px 16px",border:"1px solid #F0D080"}}>
                  <p style={{fontSize:13,color:"#8A6010",lineHeight:1.6}}><strong>아이폰 알림 허용 방법</strong><br/>Safari → 주소창 왼쪽 AA → 웹사이트 설정 → 알림 허용</p>
                </div>}
                <div style={{...card,marginTop:12,padding:"18px 20px",background:T.l}}>
                  <p style={{fontWeight:600,fontSize:14,color:T.text,marginBottom:8}}>📱 앱처럼 설치하기</p>
                  <p style={{fontSize:13,color:T.sub,lineHeight:1.7}}><strong>아이폰:</strong> Safari → 공유 → "홈 화면에 추가"<br/><strong>안드로이드:</strong> Chrome → 메뉴 → "홈 화면에 추가"</p>
                </div>
              </div>
            </div>}

            {settingsTab==="theme"&&<div style={{padding:"0 20px"}}>
              <div style={{...card,padding:"20px"}}>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:14}}>테마 선택</p>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {Object.entries(THEMES).map(([key,th])=>(
                    <button key={key} onClick={()=>{setThemeKey(key);savePrefs({themeKey:key});}} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:16,border:`1.5px solid ${themeKey===key?th.p:T.border}`,background:themeKey===key?th.l:T.card,cursor:"pointer",transition:"all .2s"}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:`linear-gradient(135deg,${th.p},${th.d})`,flexShrink:0}}/>
                      <span style={{fontWeight:500,fontSize:15,color:T.text,flex:1,textAlign:"left"}}>{th.name}</span>
                      {themeKey===key&&<span style={{color:th.p,fontWeight:700}}>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>}

            {settingsTab==="home"&&<div style={{padding:"0 20px"}}>
              <div style={{...card,padding:"20px"}}>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>메인 배경 사진</p>
                <p style={{fontSize:13,color:T.sub,marginBottom:14,lineHeight:1.6}}>파트너와 실시간으로 공유돼요</p>
                {sharedBg&&<img src={sharedBg} alt="" style={{width:"100%",borderRadius:16,marginBottom:14,maxHeight:160,objectFit:"cover"}}/>}
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>bgRef.current?.click()} style={{...btnP(),borderRadius:14,fontSize:14}}>{uploading?"업로드 중...":"사진 선택"}</button>
                  {sharedBg&&<button onClick={async()=>{await updateDoc(doc(db,"couples",couple.coupleId),{sharedBg:""});setSharedBg(null);}} style={{...btnO("auto"),padding:"13px 16px",borderRadius:14,fontSize:14}}>제거</button>}
                </div>
              </div>
            </div>}

            {settingsTab==="mission"&&<div style={{padding:"0 20px"}}>
              <div style={{...card,padding:"20px"}}>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:14}}>미션 방식</p>
                <div style={{display:"flex",gap:8,marginBottom:18}}>
                  <button onClick={()=>{setMissionMode("random");savePrefs({missionMode:"random"});}} style={pill(missionMode==="random")}>랜덤</button>
                  <button onClick={()=>{setMissionMode("custom");savePrefs({missionMode:"custom"});}} style={pill(missionMode==="custom")}>직접 설정</button>
                </div>
                {missionMode==="custom"&&(<>
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <input style={{...inp,flex:1,fontSize:14}} placeholder="미션 입력..." value={newMission} onChange={e=>setNewMission(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&newMission.trim()){const n=[...customMissions,newMission.trim()];setCustomMissions(n);setNewMission("");savePrefs({customMissions:n,missionMode:"custom"});}}}/>
                    <button onClick={()=>{if(!newMission.trim())return;const n=[...customMissions,newMission.trim()];setCustomMissions(n);setNewMission("");savePrefs({customMissions:n,missionMode:"custom"});}} style={{...btnP("auto"),padding:"12px 16px",fontSize:14,borderRadius:12}}>추가</button>
                  </div>
                  {customMissions.map((m,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                      <span style={{flex:1,fontSize:14,color:T.text}}>{m}</span>
                      <button onClick={()=>{const n=customMissions.filter((_,idx)=>idx!==i);setCustomMissions(n);savePrefs({customMissions:n});}} style={{background:"#FEE8EC",border:"none",borderRadius:8,width:28,height:28,cursor:"pointer",color:"#C45050",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>
                  ))}
                </>)}
              </div>
            </div>}

            {settingsTab==="couple"&&couple&&<div style={{padding:"0 20px"}}>
              <div style={{...card,padding:"20px"}}>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:14}}>커플 정보</p>
                {[["파트너",couple.partnerName],["사귄 날짜",fmtDate(couple.startDate)],["함께한 날",`D+${dday()}`]].map(([k,v],i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:i<2?`1px solid ${T.border}`:"none"}}>
                    <span style={{color:T.sub,fontSize:14}}>{k}</span>
                    <span style={{fontWeight:600,fontSize:14,color:i===2?T.p:T.text}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>}
            <div style={{height:20}}/>
          </div>
        )}
      </div>

      {/* ── NAV ── */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:T.nav,borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"space-around",paddingTop:8,paddingBottom:"max(12px,env(safe-area-inset-bottom))",zIndex:50,boxShadow:`0 -1px 0 ${T.border}`}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 6px",minWidth:44,position:"relative"}}>
            <span style={{fontSize:tab===t.id?24:22,transition:"all .2s",filter:tab===t.id?"none":"grayscale(.3) opacity(.65)"}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:tab===t.id?700:400,color:tab===t.id?T.p:T.sub,fontFamily:"'Noto Sans KR',sans-serif",letterSpacing:"-.01em"}}>{t.label}</span>
            {t.id==="chat"&&unread>0&&<div style={{position:"absolute",top:0,right:4,width:16,height:16,borderRadius:"50%",background:"#C45050",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:700}}>{unread}</div>}
          </button>
        ))}
      </div>

      {/* ══ MODALS ══ */}
      {modal&&(
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.46)",zIndex:200,display:"flex",alignItems:modal?.type==="imgView"?"center":"flex-end",justifyContent:"center",backdropFilter:"blur(6px)"}}>
          {modal?.type==="imgView"&&(
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",maxWidth:430,padding:20}}>
              <img src={modal.url} alt="" style={{width:"100%",borderRadius:22,maxHeight:"80vh",objectFit:"contain",boxShadow:"0 8px 40px rgba(0,0,0,.4)"}}/>
              <button onClick={()=>setModal(null)} style={{...btnS(),marginTop:14,borderRadius:16}}>닫기</button>
            </div>
          )}
          {modal?.type!=="imgView"&&(
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:"28px 28px 0 0",padding:"20px 24px",width:"100%",maxWidth:430,maxHeight:"90vh",overflowY:"auto",animation:"scaleUp .4s cubic-bezier(.16,1,.3,1)",paddingBottom:"max(24px,env(safe-area-inset-bottom))"}}>
            <div style={{width:40,height:4,borderRadius:4,background:T.border,margin:"0 auto 18px"}}/>

            {/* DAY DETAIL */}
            {modal==="dayDetail"&&selDay&&(<>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                <h3 className="serif" style={{fontSize:26,fontWeight:300,color:T.text}}>{calDate.getMonth()+1}월 {selDay}일</h3>
                <button onClick={()=>setModal(null)} style={{background:T.l,border:"none",borderRadius:10,width:32,height:32,cursor:"pointer",color:T.sub,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
              {(events[dk(selDay)]||[]).length>0&&(<>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>일정</p>
                {(events[dk(selDay)]||[]).map((ev,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
                    <div style={{width:3,height:26,borderRadius:3,background:ev.color,flexShrink:0}}/>
                    <div style={{flex:1}}><p style={{fontWeight:500,fontSize:14,color:T.text}}>{ev.title}</p><p style={{fontSize:12,color:T.sub,marginTop:2}}>{ev.whoName}</p></div>
                    {ev.who===user.uid&&<><button onClick={()=>{setEditEvent(ev);setEventForm({title:ev.title,color:ev.color});setModal("addEvent");}} style={{background:T.l,border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:T.p,display:"flex",alignItems:"center",justifyContent:"center"}}>✎</button><button onClick={()=>delEvent(ev)} style={{background:"#FEE8EC",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",color:"#C45050",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></>}
                  </div>
                ))}
                <div style={{height:14}}/>
              </>)}
              {diaries.filter(d=>d.dateKey===dk(selDay)).length>0&&(<>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>일기</p>
                {diaries.filter(d=>d.dateKey===dk(selDay)).map((d,i)=>(
                  <div key={i} style={{background:T.pale,borderRadius:14,padding:"13px 16px",marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontWeight:600,fontSize:13,color:T.text}}>{d.whoName}</span><span style={{fontSize:16}}>{d.mood}</span></div>
                    {d.photoUrl&&<img src={d.photoUrl} alt="" style={{width:"100%",borderRadius:10,marginBottom:8,maxHeight:120,objectFit:"cover"}}/>}
                    {d.title&&<p style={{fontWeight:600,fontSize:14,color:T.text,marginBottom:4}}>{d.title}</p>}
                    <p style={{fontSize:13,color:T.sub,lineHeight:1.6}}>{d.content}</p>
                  </div>
                ))}
                <div style={{height:14}}/>
              </>)}
              {photos.filter(p=>p.dateKey===dk(selDay)).length>0&&(<>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>사진</p>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4,marginBottom:14}}>
                  {photos.filter(p=>p.dateKey===dk(selDay)).map(p=>(
                    <div key={p.id} style={{aspectRatio:"1",borderRadius:10,overflow:"hidden",cursor:"pointer"}} onClick={()=>setModal({type:"imgView",url:p.url})}>
                      <img src={p.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                    </div>
                  ))}
                </div>
              </>)}
              <div style={{display:"flex",gap:8}}>
                {couple&&<button onClick={()=>{setEditEvent(null);setEventForm({title:"",color:T.p});setModal("addEvent");}} style={{...btnS(),fontSize:13,padding:"12px",borderRadius:14}}>+ 일정</button>}
                <button onClick={()=>{setEditDiary(null);setDiaryForm({title:"",content:"",mood:"😊",sticker:"",photoUrl:"",template:diaryTemplate});setModal("addDiary");}} style={{...btnS(),fontSize:13,padding:"12px",borderRadius:14}}>✍ 일기</button>
                <button onClick={()=>setModal("photoUpload")} style={{...btnS(),fontSize:13,padding:"12px",borderRadius:14}}>📷 사진</button>
              </div>
            </>)}

            {/* ADD EVENT */}
            {modal==="addEvent"&&(<>
              <h3 className="serif" style={{fontSize:26,fontWeight:300,color:T.text,marginBottom:18}}>{editEvent?"일정 수정":"일정 추가"}</h3>
              <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>색상</p>
              <div style={{display:"flex",gap:10,marginBottom:18}}>{EV_COLORS.map(c=><div key={c} onClick={()=>setEventForm(f=>({...f,color:c}))} style={{width:32,height:32,borderRadius:"50%",background:c,cursor:"pointer",border:eventForm.color===c?`3px solid ${T.text}`:"3px solid transparent",transition:"border .15s"}}/>)}</div>
              <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>제목</p>
              <input style={{...inp,marginBottom:20}} placeholder="예: 영화 데이트" value={eventForm.title} onChange={e=>setEventForm(f=>({...f,title:e.target.value}))}/>
              <button style={{...btnP(),borderRadius:16}} onClick={saveEvent}>{editEvent?"수정하기":"추가하기"}</button>
            </>)}

            {/* ADD/EDIT DIARY */}
            {modal==="addDiary"&&(<>
              <h3 className="serif" style={{fontSize:26,fontWeight:300,color:T.text,marginBottom:16}}>{editDiary?"일기 수정":"일기 쓰기"}</h3>
              {/* Template selector */}
              <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>템플릿</p>
              <div style={{display:"flex",gap:8,marginBottom:18,overflowX:"auto",scrollbarWidth:"none"}}>
                {[{id:"standard",icon:"📝",name:"스탠다드"},{id:"magazine",icon:"📰",name:"매거진"},{id:"minimal",icon:"✏️",name:"미니멀"},{id:"polaroid",icon:"📷",name:"폴라로이드"}].map(tmpl=>(
                  <button key={tmpl.id} onClick={()=>setDiaryForm(f=>({...f,template:tmpl.id}))} style={{...pill(diaryForm.template===tmpl.id),display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                    <span style={{fontSize:14}}>{tmpl.icon}</span>{tmpl.name}
                  </button>
                ))}
              </div>
              <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>기분</p>
              <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>{MOODS.map(m=><span key={m} onClick={()=>setDiaryForm(d=>({...d,mood:m}))} style={{fontSize:28,cursor:"pointer",opacity:diaryForm.mood===m?1:.25,transform:diaryForm.mood===m?"scale(1.2)":"scale(1)",transition:"all .2s"}}>{m}</span>)}</div>
              {/* Photo */}
              <div style={{marginBottom:14}}>
                {diaryForm.photoUrl?
                  <div style={{position:"relative"}}><img src={diaryForm.photoUrl} alt="" style={{width:"100%",borderRadius:14,maxHeight:diaryForm.template==="magazine"?220:180,objectFit:"cover"}}/><button onClick={()=>setDiaryForm(f=>({...f,photoUrl:""}))} style={{position:"absolute",top:8,right:8,background:"rgba(0,0,0,.55)",border:"none",borderRadius:"50%",width:28,height:28,color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>✕</button></div>:
                  <button onClick={()=>diaryPhotoRef.current?.click()} style={{...btnS(),borderRadius:14,fontSize:14}}>{diaryUpload?"업로드 중...":"📷 사진 첨부하기"}</button>
                }
              </div>
              {diaryForm.template!=="minimal"&&diaryForm.template!=="polaroid"&&<input style={{...inp,marginBottom:10}} placeholder="제목 (선택)" value={diaryForm.title} onChange={e=>setDiaryForm(d=>({...d,title:e.target.value}))}/>}
              <textarea style={{...inp,minHeight:diaryForm.template==="polaroid"?80:130,marginBottom:14,lineHeight:1.75}} placeholder={diaryForm.template==="polaroid"?"짧은 메모...":"오늘 하루를 기록해보세요"} value={diaryForm.content} onChange={e=>setDiaryForm(d=>({...d,content:e.target.value}))}/>
              {diaryForm.template!=="minimal"&&(<>
                <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:10}}>스티커</p>
                <div style={{display:"flex",overflowX:"auto",gap:10,paddingBottom:12,marginBottom:18,scrollbarWidth:"none"}}>{STICKERS.map(st=><span key={st} onClick={()=>setDiaryForm(d=>({...d,sticker:d.sticker===st?"":st}))} style={{fontSize:26,cursor:"pointer",opacity:diaryForm.sticker===st?1:.3,flexShrink:0,transform:diaryForm.sticker===st?"scale(1.25)":"scale(1)",transition:"all .2s"}}>{st}</span>)}</div>
              </>)}
              <button style={{...btnP(),borderRadius:16}} onClick={saveDiary}>{editDiary?"수정하기":"저장하기"}</button>
            </>)}

            {/* PHOTO UPLOAD */}
            {modal==="photoUpload"&&(<>
              <h3 className="serif" style={{fontSize:26,fontWeight:300,color:T.text,marginBottom:18}}>사진 추가</h3>
              <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>날짜</p>
              <input type="date" style={{...inp,marginBottom:16}} value={photoDate} onChange={e=>setPhotoDate(e.target.value)}/>
              <p style={{fontSize:11,color:T.sub,fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>앨범</p>
              <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>{albums.map(al=><button key={al.id} onClick={()=>setSelAlbum(al.id)} style={pill(selAlbum===al.id)}>{al.name}</button>)}</div>
              <button style={{...btnP(),borderRadius:16}} onClick={()=>{photoRef.current?.click();setModal(null);}}>사진 선택하기 (여러 장 가능)</button>
            </>)}

            {/* ADD ALBUM */}
            {modal==="addAlbum"&&(<>
              <h3 className="serif" style={{fontSize:26,fontWeight:300,color:T.text,marginBottom:18}}>새 폴더 만들기</h3>
              <input style={{...inp,marginBottom:20}} placeholder="폴더 이름 (예: 제주도 여행)" value={albumForm.name} onChange={e=>setAlbumForm({name:e.target.value})}/>
              <button style={{...btnP(),borderRadius:16}} onClick={addAlbum}>만들기</button>
            </>)}

            {/* STICKER */}
            {modal==="sticker"&&(<>
              <h3 className="serif" style={{fontSize:24,fontWeight:300,color:T.text,marginBottom:16}}>스티커 보내기</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:16}}>{STICKERS.map(st=><span key={st} onClick={()=>{sendMsg(st);setModal(null);}} style={{fontSize:32,cursor:"pointer",textAlign:"center"}}>{st}</span>)}</div>
            </>)}

            {/* CHANGE NAME */}
            {modal==="changeName"&&(<>
              <h3 className="serif" style={{fontSize:26,fontWeight:300,color:T.text,marginBottom:18}}>이름 변경</h3>
              <input style={{...inp,marginBottom:20}} placeholder="새 이름" value={nameInput} onChange={e=>setNameInput(e.target.value)}/>
              <button style={{...btnP(),borderRadius:16}} onClick={changeName}>변경하기</button>
            </>)}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
