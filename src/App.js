/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useRef, useEffect } from "react";
import { auth, db, googleProvider } from "./firebase";
import {
  signInWithPopup, signOut, onAuthStateChanged
} from "firebase/auth";
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  onSnapshot, query, orderBy, serverTimestamp, updateDoc
} from "firebase/firestore";

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
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.fade-up{animation:fadeUp .4s ease both}
.fade-in{animation:fadeIn .25s ease both}
.spin{animation:spin 1s linear infinite}
`;

const MISSIONS = ["나에게 칭찬 한마디 💌", "오늘 하늘 사진 찍기 📸", "오늘 하루 일기 남기기 ✍️"];
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; };
const card = { background:T.white, borderRadius:20, padding:16, marginBottom:12, boxShadow:"0 1px 8px rgba(42,31,35,.06)" };
const btnS = (bg=T.rose,col=T.white) => ({ background:bg, color:col, border:"none", borderRadius:14, padding:"13px 20px", fontWeight:600, fontSize:15, cursor:"pointer", width:"100%" });
const inp = { width:"100%", border:`1.5px solid ${T.stoneLight}`, borderRadius:12, padding:"11px 14px", fontSize:14, color:T.ink, outline:"none", background:T.white };

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coupleData, setCoupleData] = useState(null);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [messages, setMessages] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [diaryForm, setDiaryForm] = useState({ content:"" });
  const [myCode, setMyCode] = useState("");
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [setupStep, setSetupStep] = useState("code");
  const [showConnect, setShowConnect] = useState(true); // 연결 화면 표시 여부
  const chatEnd = useRef(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) { await initUser(u); }
        else { setCoupleData(null); setShowConnect(true); }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    });
    return unsub;
  }, []);

  const initUser = async (u) => {
    const userRef = doc(db, "users", u.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const code = Math.random().toString(36).substring(2,8).toUpperCase();
      await setDoc(userRef, { uid:u.uid, name:u.displayName||"나", email:u.email, code, coupleId:null, createdAt:serverTimestamp() });
      setMyCode(code);
    } else {
      const data = snap.data();
      setMyCode(data.code);
      if (data.coupleId) { await loadCoupleData(u.uid, data.coupleId); setShowConnect(false); }
    }
  };

  const loadCoupleData = async (myUid, coupleId) => {
    const coupleRef = doc(db, "couples", coupleId);
    const snap = await getDoc(coupleRef);
    if (!snap.exists()) return;
    const data = snap.data();
    const partnerId = data.user1 === myUid ? data.user2 : data.user1;
    const partnerSnap = await getDoc(doc(db, "users", partnerId));
    setCoupleData({ coupleId, partnerId, partnerName: partnerSnap.exists() ? partnerSnap.data().name : "파트너", startDate: data.startDate });

    onSnapshot(query(collection(db, "couples", coupleId, "messages"), orderBy("createdAt")), (s) => {
      setMessages(s.docs.map(d => ({ id:d.id, ...d.data() })));
    });
    onSnapshot(query(collection(db, "couples", coupleId, "diaries"), orderBy("createdAt","desc")), (s) => {
      setDiaries(s.docs.map(d => ({ id:d.id, ...d.data() })));
    });
  };

  const loginGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch (e) { alert(e.message); }
  };

  const logout = async () => { await signOut(auth); setCoupleData(null); setTab("home"); };

  const connectCouple = async () => {
    if (!partnerCodeInput.trim()) return;
    const usersSnap = await getDocs(collection(db, "users"));
    const partnerDoc = usersSnap.docs.find(d => d.data().code === partnerCodeInput.toUpperCase());
    if (!partnerDoc) { alert("코드를 찾을 수 없어요."); return; }
    if (partnerDoc.id === user.uid) { alert("본인 코드는 안 돼요!"); return; }
    setSetupStep("date");
  };

  const finishConnect = async () => {
    const usersSnap = await getDocs(collection(db, "users"));
    const partnerDoc = usersSnap.docs.find(d => d.data().code === partnerCodeInput.toUpperCase());
    const coupleRef = await addDoc(collection(db, "couples"), { user1: user.uid, user2: partnerDoc.id, startDate: startDateInput || todayStr(), createdAt: serverTimestamp() });
    await updateDoc(doc(db, "users", user.uid), { coupleId: coupleRef.id });
    await updateDoc(doc(db, "users", partnerDoc.id), { coupleId: coupleRef.id });
    await loadCoupleData(user.uid, coupleRef.id);
    setShowConnect(false);
  };

  const sendMsg = async () => {
    if (!chatInput.trim() || !coupleData) return;
    await addDoc(collection(db, "couples", coupleData.coupleId, "messages"), { text: chatInput, from: user.uid, fromName: user.displayName, createdAt: serverTimestamp() });
    setChatInput("");
  };

  const addDiary = async () => {
    if (!diaryForm.content.trim()) return;
    const path = coupleData ? collection(db, "couples", coupleData.coupleId, "diaries") : collection(db, "users", user.uid, "soloDiaries");
    await addDoc(path, { content: diaryForm.content, dateKey: todayStr(), who: user.uid, whoName: user.displayName, createdAt: serverTimestamp() });
    if (!coupleData) { // 솔로 일기인 경우 실시간 대신 한 번 더 로드
        const s = await getDocs(query(path, orderBy("createdAt","desc")));
        setDiaries(s.docs.map(d=>({id:d.id, ...d.data()})));
    }
    setDiaryForm({ content:"" }); setModal(null);
  };

  const dday = () => coupleData ? Math.floor((new Date() - new Date(coupleData.startDate)) / 86400000) + 1 : 1;

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  if (loading) return <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:T.rosePale }}><style>{GS}</style>💕</div>;

  if (!user) return (
    <div style={{ maxWidth:430, margin:"0 auto", height:"100%", background:`linear-gradient(170deg,${T.roseLight},${T.cream})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:30 }}>
      <style>{GS}</style>
      <h1 style={{ fontFamily:"'DM Serif Display',serif", color:T.roseDark, marginBottom:40 }}>우리만의 공간</h1>
      <button onClick={loginGoogle} style={btnS(T.white, T.ink)}>Google로 시작하기</button>
    </div>
  );

  // 파트너 미연결 시 보여주는 "연결 화면" (skip 가능)
  if (showConnect && !coupleData) return (
    <div style={{ maxWidth:430, margin:"0 auto", height:"100%", background:T.cream, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:25 }}>
      <style>{GS}</style>
      <div style={{ ...card, width:"100%", textAlign:"center" }}>
        <h2 style={{ marginBottom:20 }}>커플 연결하기 🔗</h2>
        <p style={{ fontSize:12, color:T.stoneMid }}>내 코드</p>
        <div style={{ background:T.roseLight, padding:15, borderRadius:10, fontSize:24, fontWeight:900, color:T.rose, margin:"10px 0 20px" }}>{myCode}</div>
        {setupStep === "code" ? (
          <>
            <input style={inp} placeholder="파트너 코드" value={partnerCodeInput} onChange={e => setPartnerCodeInput(e.target.value.toUpperCase())} />
            <button style={{ ...btnS(), marginTop:10 }} onClick={connectCouple}>다음 단계</button>
          </>
        ) : (
          <>
            <input type="date" style={inp} value={startDateInput} onChange={e => setStartDateInput(e.target.value)} />
            <button style={{ ...btnS(), marginTop:10 }} onClick={finishConnect}>연결 완료!</button>
          </>
        )}
        <button onClick={() => setShowConnect(false)} style={{ marginTop:25, background:"none", border:"none", color:T.rose, fontSize:14, fontWeight:700 }}>나중에 연결하기 (혼자 시작)</button>
        <button onClick={logout} style={{ marginTop:15, background:"none", border:"none", color:T.stoneMid, fontSize:12 }}>로그아웃</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth:430, margin:"0 auto", height:"100%", background:T.rosePale, display:"flex", flexDirection:"column", position:"relative" }}>
      <style>{GS}</style>
      <div style={{ flex:1, overflowY:"auto", paddingBottom:80 }}>
        {tab === "home" && (
          <div className="fade-in">
            <div style={{ background:T.rose, padding:"50px 20px", color:"white", textAlign:"center" }}>
              <p style={{ opacity:0.8 }}>{coupleData ? "함께한 지" : "오늘부터"}</p>
              <h1 style={{ fontSize:50, fontFamily:"'DM Serif Display',serif" }}>D+{dday()}</h1>
              <p style={{ marginTop:10 }}>{user.displayName} {coupleData ? `❤️ ${coupleData.partnerName}` : "(파트너를 연결하세요)"}</p>
            </div>
            <div style={{ padding:16 }}>
              {!coupleData && (
                <div style={{ ...card, border:`2px dashed ${T.rose}`, textAlign:"center" }} onClick={() => setShowConnect(true)}>
                  <p style={{ color:T.rose, fontWeight:700 }}>💕 파트너와 연결하고 채팅을 시작하세요!</p>
                  <p style={{ fontSize:12, color:T.stoneMid, marginTop:5 }}>여기를 눌러 코드 입력하기</p>
                </div>
              )}
              <div style={card}>
                <h3 style={{ marginBottom:10 }}>오늘의 미션 🌟</h3>
                {MISSIONS.map((m, i) => <div key={i} style={{ padding:"8px 0", borderBottom:i<2?`1px solid ${T.roseLight}`:"none" }}>{m}</div>)}
              </div>
              <button onClick={logout} style={{ width:"100%", marginTop:20, background:"none", border:"none", color:T.stoneMid }}>로그아웃</button>
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 80px)", justifyContent: coupleData ? "space-between" : "center", alignItems:"center" }}>
            {coupleData ? (
                <>
                <div style={{ flex:1, overflowY:"auto", padding:20, width:"100%" }}>
                    {messages.map((m, i) => <div key={i} style={{ textAlign: m.from === user.uid ? "right" : "left", marginBottom:10 }}><div style={{ display:"inline-block", padding:"8px 12px", borderRadius:15, background:m.from === user.uid ? T.rose : "white", color:m.from === user.uid ? "white" : T.ink }}>{m.text}</div></div>)}
                    <div ref={chatEnd} />
                </div>
                <div style={{ padding:10, background:"white", display:"flex", gap:5, width:"100%" }}>
                    <input style={inp} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter" && sendMsg()} placeholder="메시지 입력" />
                    <button onClick={sendMsg} style={{ ...btnS(), width:60 }}>전송</button>
                </div>
                </>
            ) : (
                <div style={{ textAlign:"center", padding:20 }}>
                    <p style={{ fontSize:40 }}>💬</p>
                    <p style={{ marginTop:10, color:T.stoneMid }}>파트너와 연결된 후<br/>채팅을 이용할 수 있어요!</p>
                    <button onClick={() => setShowConnect(true)} style={{ ...btnS(), marginTop:20 }}>연결하러 가기</button>
                </div>
            )}
          </div>
        )}

        {tab === "diary" && (
          <div className="fade-in" style={{ padding:20 }}>
            <h2 style={{ marginBottom:20 }}>{coupleData ? "커플 일기" : "나의 일기"} 📖</h2>
            <button style={{ ...btnS(), marginBottom:20 }} onClick={() => setModal("addDiary")}>오늘의 일기 쓰기 ✍️</button>
            {diaries.map((d, i) => <div key={i} style={card}><p style={{fontSize:12, color:T.rose, fontWeight:700}}>{d.whoName}</p><p>{d.content}</p></div>)}
          </div>
        )}
      </div>

      <div style={{ position:"absolute", bottom:0, width:"100%", height:70, background:"white", display:"flex", justifyContent:"space-around", alignItems:"center", borderTop:`1px solid ${T.stoneLight}` }}>
        <div onClick={() => setTab("home")} style={{ opacity:tab==="home"?1:0.4 }}>🏠<p style={{fontSize:10}}>홈</p></div>
        <div onClick={() => setTab("chat")} style={{ opacity:tab==="chat"?1:0.4 }}>💬<p style={{fontSize:10}}>채팅</p></div>
        <div onClick={() => setTab("diary")} style={{ opacity:tab==="diary"?1:0.4 }}>📖<p style={{fontSize:10}}>일기</p></div>
      </div>

      {modal === "addDiary" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }} onClick={() => setModal(null)}>
          <div style={{ background:"white", padding:20, borderRadius:20, width:"90%", maxWidth:350 }} onClick={e => e.stopPropagation()}>
            <textarea style={{ ...inp, height:150, marginBottom:10 }} placeholder="내용을 작성하세요" value={diaryForm.content} onChange={e => setDiaryForm({content:e.target.value})} />
            <button style={btnS()} onClick={addDiary}>저장하기</button>
          </div>
        </div>
      )}
    </div>
  );
}