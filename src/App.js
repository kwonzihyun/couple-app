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

/* ─── 디자인 토큰 (테마 컬러) ─── */
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

const STICKERS = ["❤️","💕","💖","🌹","🌸","🦋","✨","🌙","⭐","🎀","💝","🌺","🍓","🎵","💫","🤍","🫶","😍","🥰","💞"];
const MISSIONS = ["서로에게 칭찬 한마디 💌", "함께 찍은 사진 올리기 📸", "오늘 하루 일기 남기기 ✍️"];

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
};

/* ─── 공통 스타일 ─── */
const card = { background:T.white, borderRadius:20, padding:16, marginBottom:12, boxShadow:"0 1px 8px rgba(42,31,35,.06)" };
const btnS = (bg=T.rose,col=T.white) => ({ background:bg, color:col, border:"none", borderRadius:14, padding:"13px 20px", fontWeight:600, fontSize:15, cursor:"pointer", width:"100%" });
const inp = { width:"100%", border:`1.5px solid ${T.stoneLight}`, borderRadius:12, padding:"11px 14px", fontSize:14, color:T.ink, outline:"none", background:T.white };

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coupleData, setCoupleData] = useState(null);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [calDate, setCalDate] = useState(new Date());
  const [selDay, setSelDay] = useState(null);
  const [messages, setMessages] = useState([]);
  const [events, setEvents] = useState({});
  const [diaries, setDiaries] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [diaryForm, setDiaryForm] = useState({ title:"", content:"", mood:"😊", sticker:"" });
  const [myCode, setMyCode] = useState("");
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [setupStep, setSetupStep] = useState("code");
  const [missions, setMissions] = useState({ completed:[], date:todayStr() });
  const [authLoading, setAuthLoading] = useState(false);
  const chatEnd = useRef(null);

  /* ── 1. 초기 실행 (유저 확인 및 로딩 해제) ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          // 데이터베이스 연결 시도 (실패해도 catch에서 처리)
          await initUser(u);
        } else {
          setCoupleData(null);
        }
      } catch (err) {
        console.error("데이터 초기화 에러:", err);
      } finally {
        // 어떤 경우에도 "불러오는 중..." 화면을 끝냅니다.
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  /* ── 2. 유저 Firestore 등록 및 내 코드 생성 ── */
  const initUser = async (u) => {
    try {
      const userRef = doc(db, "users", u.uid);
      const snap = await getDoc(userRef);
      
      if (!snap.exists()) {
        const code = Math.random().toString(36).substring(2,8).toUpperCase();
        const userData = {
          uid: u.uid,
          name: u.displayName || "나",
          email: u.email,
          code,
          coupleId: null,
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, userData);
        setMyCode(code);
      } else {
        const data = snap.data();
        setMyCode(data.code);
        if (data.coupleId) {
          await loadCoupleData(u.uid, data.coupleId);
        }
      }
    } catch (e) {
      console.error("initUser 에러:", e);
      // Firestore가 생성되지 않았거나 규칙이 잘못되었을 때 발생합니다.
    }
  };

  /* ── 3. 커플 데이터 및 실시간 데이터 로드 ── */
  const loadCoupleData = async (myUid, coupleId) => {
    try {
      const coupleRef = doc(db, "couples", coupleId);
      const snap = await getDoc(coupleRef);
      if (!snap.exists()) return;
      
      const data = snap.data();
      const partnerId = data.user1 === myUid ? data.user2 : data.user1;
      
      // 파트너 이름 가져오기
      const partnerSnap = await getDoc(doc(db, "users", partnerId));
      const partnerName = partnerSnap.exists() ? partnerSnap.data().name : "파트너";
      
      setCoupleData({ coupleId, partnerId, partnerName, startDate: data.startDate });

      // 실시간 채팅 구독
      onSnapshot(query(collection(db, "couples", coupleId, "messages"), orderBy("createdAt")), (s) => {
        setMessages(s.docs.map(d => ({ id:d.id, ...d.data() })));
      });
      // 실시간 일기 구독
      onSnapshot(query(collection(db, "couples", coupleId, "diaries"), orderBy("createdAt","desc")), (s) => {
        setDiaries(s.docs.map(d => ({ id:d.id, ...d.data() })));
      });
    } catch (e) {
      console.error("데이터 로딩 실패:", e);
    }
  };

  /* ── 4. 로그인 / 로그아웃 ── */
  const loginGoogle = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      alert("로그인 실패! (환경변수나 도메인 설정을 확인하세요): " + e.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCoupleData(null);
    setTab("home");
  };

  /* ── 5. 커플 연결 로직 ── */
  const connectCouple = async () => {
    if (!partnerCodeInput.trim()) return;
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const partnerDoc = usersSnap.docs.find(d => d.data().code === partnerCodeInput.toUpperCase());
      
      if (!partnerDoc) { alert("해당 코드를 가진 유저가 없어요."); return; }
      if (partnerDoc.id === user.uid) { alert("자신의 코드는 입력할 수 없어요!"); return; }
      
      setSetupStep("date");
    } catch (e) {
      alert("연결 시도 중 오류가 발생했습니다.");
    }
  };

  const finishConnect = async () => {
    if (!startDateInput) { alert("날짜를 선택해주세요."); return; }
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      const partnerDoc = usersSnap.docs.find(d => d.data().code === partnerCodeInput.toUpperCase());
      
      const coupleRef = await addDoc(collection(db, "couples"), {
        user1: user.uid,
        user2: partnerDoc.id,
        startDate: startDateInput,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "users", user.uid), { coupleId: coupleRef.id });
      await updateDoc(doc(db, "users", partnerDoc.id), { coupleId: coupleRef.id });

      await loadCoupleData(user.uid, coupleRef.id);
    } catch (e) {
      alert("연결 완료 중 오류가 발생했습니다.");
    }
  };

  /* ── 6. 메시지 및 일기 작성 ── */
  const sendMsg = async () => {
    if (!chatInput.trim() || !coupleData) return;
    await addDoc(collection(db, "couples", coupleData.coupleId, "messages"), {
      text: chatInput, from: user.uid, fromName: user.displayName, createdAt: serverTimestamp(),
    });
    setChatInput("");
  };

  const addDiary = async () => {
    if (!diaryForm.content.trim() || !coupleData) return;
    await addDoc(collection(db, "couples", coupleData.coupleId, "diaries"), {
      ...diaryForm, dateKey: todayStr(), who: user.uid, whoName: user.displayName, createdAt: serverTimestamp(),
    });
    setDiaryForm({ title:"", content:"", mood:"😊", sticker:"" });
    setModal(null);
  };

  const dday = () => {
    if (!coupleData?.startDate) return 0;
    return Math.floor((new Date() - new Date(coupleData.startDate)) / 86400000) + 1;
  };

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  /* ── 7. 화면 UI ── */

  // 로딩 중 화면
  if (loading) return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:T.rosePale }}>
      <style>{GS}</style>
      <div className="spin" style={{ fontSize:50, marginBottom:15 }}>💕</div>
      <p style={{ color:T.stoneMid, fontSize:14 }}>연결 정보를 확인하고 있어요...</p>
      <p style={{ color:T.stoneLight, fontSize:11, marginTop:10 }}>오랫동안 멈춰있다면 Firestore를 생성했는지 확인하세요.</p>
    </div>
  );

  // 로그인 전 화면
  if (!user) return (
    <div style={{ maxWidth:430, margin:"0 auto", height:"100%", background:`linear-gradient(170deg,${T.roseLight},${T.cream})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:30 }}>
      <style>{GS}</style>
      <div style={{ fontSize:70, marginBottom:10 }} className="fade-up">💕</div>
      <h1 className="fade-up" style={{ fontFamily:"'DM Serif Display',serif", color:T.roseDark, marginBottom:50, fontSize:36 }}>우리만의 공간</h1>
      <button onClick={loginGoogle} disabled={authLoading} style={{ ...btnS(T.white, T.ink), border:`1.5px solid ${T.stoneLight}`, boxShadow:"0 4px 12px rgba(0,0,0,0.05)" }}>
        {authLoading ? "로그인 시도 중..." : "Google로 시작하기"}
      </button>
    </div>
  );

  // 커플 연결 전 화면
  if (!coupleData) return (
    <div style={{ maxWidth:430, margin:"0 auto", height:"100%", background:T.cream, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:25 }}>
      <style>{GS}</style>
      <div style={{ ...card, width:"100%", textAlign:"center", padding:30 }}>
        <h2 style={{ marginBottom:25, color:T.roseDark }}>커플 연결하기 🔗</h2>
        <p style={{ fontSize:13, color:T.stoneMid, marginBottom:8 }}>📱 내 고유 코드</p>
        <div style={{ background:T.roseLight, padding:18, borderRadius:15, fontSize:28, fontWeight:900, color:T.rose, letterSpacing:4, marginBottom:30 }}>
          {myCode || "불러오는 중..."}
        </div>
        
        {setupStep === "code" ? (
          <>
            <p style={{ fontSize:13, color:T.stoneMid, marginBottom:8 }}>상대방의 코드를 입력하세요</p>
            <input style={{ ...inp, textAlign:"center", fontSize:18, letterSpacing:2 }} placeholder="파트너 코드" value={partnerCodeInput} onChange={e => setPartnerCodeInput(e.target.value.toUpperCase())} />
            <button style={{ ...btnS(), marginTop:15 }} onClick={connectCouple}>다음 단계로</button>
          </>
        ) : (
          <>
            <p style={{ fontSize:13, color:T.stoneMid, marginBottom:8 }}>📅 처음 만난 날짜</p>
            <input type="date" style={inp} value={startDateInput} onChange={e => setStartDateInput(e.target.value)} />
            <button style={{ ...btnS(), marginTop:15 }} onClick={finishConnect}>연결 시작하기 💕</button>
          </>
        )}
        <button onClick={logout} style={{ marginTop:25, background:"none", border:"none", color:T.stoneMid, fontSize:13 }}>다른 계정으로 로그인 / 로그아웃</button>
      </div>
    </div>
  );

  // 메인 화면
  return (
    <div style={{ maxWidth:430, margin:"0 auto", height:"100%", background:T.rosePale, display:"flex", flexDirection:"column", position:"relative" }}>
      <style>{GS}</style>
      <div style={{ flex:1, overflowY:"auto", paddingBottom:80 }}>
        
        {tab === "home" && (
          <div className="fade-in">
            <div style={{ background:T.rose, padding:"60px 20px 40px", color:"white", textAlign:"center", borderRadius:"0 0 30px 30px" }}>
              <p style={{ opacity:0.8, fontSize:14, marginBottom:5 }}>우리가 함께한 지</p>
              <h1 style={{ fontSize:54, fontFamily:"'DM Serif Display',serif", letterSpacing:-1 }}>D+{dday()}</h1>
              <p style={{ marginTop:15, fontWeight:600 }}>{user.displayName} ❤️ {coupleData.partnerName}</p>
            </div>
            <div style={{ padding:20 }}>
              <div style={card}>
                <h3 style={{ marginBottom:12, fontSize:15, color:T.roseDark }}>오늘의 커플 미션 🌟</h3>
                {MISSIONS.map((m, i) => <div key={i} style={{ padding:"12px 0", borderBottom:i<2?`1px solid ${T.roseLight}`:"none", fontSize:14 }}>{m}</div>)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:15, marginTop:10 }}>
                <div style={{ ...card, textAlign:"center", marginBottom:0, cursor:"pointer" }} onClick={() => setTab("diary")}>
                  <div style={{ fontSize:24, marginBottom:5 }}>📖</div>
                  <p style={{ fontSize:13, fontWeight:600 }}>일기 쓰기</p>
                </div>
                <div style={{ ...card, textAlign:"center", marginBottom:0, cursor:"pointer" }} onClick={() => setTab("chat")}>
                  <div style={{ fontSize:24, marginBottom:5 }}>💬</div>
                  <p style={{ fontSize:13, fontWeight:600 }}>채팅하기</p>
                </div>
              </div>
              <button onClick={logout} style={{ width:"100%", marginTop:30, background:"none", border:"none", color:T.stoneMid, fontSize:12 }}>로그아웃</button>
            </div>
          </div>
        )}

        {tab === "chat" && (
          <div className="fade-in" style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 70px)" }}>
            <div style={{ background:"white", padding:"50px 20px 15px", textAlign:"center", borderBottom:`1px solid ${T.stoneLight}`, fontWeight:700 }}>{coupleData.partnerName}</div>
            <div style={{ flex:1, overflowY:"auto", padding:20 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ textAlign: m.from === user.uid ? "right" : "left", marginBottom:15 }}>
                  <div style={{ display:"inline-block", padding:"10px 15px", borderRadius:18, background:m.from === user.uid ? T.rose : "white", color:m.from === user.uid ? "white" : T.ink, maxWidth:"75%", fontSize:14, boxShadow:"0 2px 5px rgba(0,0,0,0.03)" }}>
                    {m.text}
                  </div>
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <div style={{ padding:15, background:"white", display:"flex", gap:10, borderTop:`1px solid ${T.stoneLight}` }}>
              <input style={inp} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter" && sendMsg()} placeholder="메시지를 입력하세요..." />
              <button onClick={sendMsg} style={{ ...btnS(), width:70, padding:"0 10px" }}>전송</button>
            </div>
          </div>
        )}

        {tab === "diary" && (
          <div className="fade-in" style={{ padding:20 }}>
            <h2 style={{ marginBottom:20, fontFamily:"'DM Serif Display',serif" }}>추억 기록 📖</h2>
            <button style={{ ...btnS(), marginBottom:25 }} onClick={() => setModal("addDiary")}>오늘의 일기 쓰기 ✍️</button>
            {diaries.length === 0 && <p style={{ textAlign:"center", color:T.stoneMid, marginTop:40 }}>아직 기록된 일기가 없어요.</p>}
            {diaries.map((d, i) => (
              <div key={i} style={{ ...card, padding:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                  <span style={{ fontWeight:700, color:T.rose }}>{d.whoName}</span>
                  <span style={{ fontSize:12, color:T.stoneMid }}>{d.dateKey}</span>
                </div>
                <p style={{ lineHeight:1.6, fontSize:14 }}>{d.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 네비바 */}
      <div style={{ position:"absolute", bottom:0, width:"100%", height:70, background:"white", display:"flex", justifyContent:"space-around", alignItems:"center", borderTop:`1px solid ${T.stoneLight}`, paddingBottom:10 }}>
        <div onClick={() => setTab("home")} style={{ textAlign:"center", cursor:"pointer", opacity:tab==="home"?1:0.4 }}>🏠<p style={{fontSize:10, fontWeight:700}}>홈</p></div>
        <div onClick={() => setTab("chat")} style={{ textAlign:"center", cursor:"pointer", opacity:tab==="chat"?1:0.4 }}>💬<p style={{fontSize:10, fontWeight:700}}>채팅</p></div>
        <div onClick={() => setTab("diary")} style={{ textAlign:"center", cursor:"pointer", opacity:tab==="diary"?1:0.4 }}>📖<p style={{fontSize:10, fontWeight:700}}>일기</p></div>
      </div>

      {/* 일기 작성 모달 */}
      {modal === "addDiary" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }} onClick={() => setModal(null)}>
          <div style={{ background:"white", padding:25, borderRadius:25, width:"100%", maxWidth:350 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom:20, textAlign:"center" }}>오늘 하루 기록하기 ✍️</h3>
            <textarea style={{ ...inp, height:180, marginBottom:15 }} placeholder="파트너와 공유하고 싶은 이야기를 적어보세요." value={diaryForm.content} onChange={e => setDiaryForm({...diaryForm, content:e.target.value})} />
            <button style={btnS()} onClick={addDiary}>소중한 추억 저장하기</button>
            <button style={{ background:"none", border:"none", width:"100%", marginTop:15, color:T.stoneMid, fontSize:13 }} onClick={() => setModal(null)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}