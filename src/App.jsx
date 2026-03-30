import { useState, useEffect, useRef } from "react";

const COLORS = {
  bg: "#FFF5F7",
  card: "#FFFFFF",
  primary: "#FF6B8A",
  secondary: "#FFB3C1",
  accent: "#FF4D6D",
  text: "#2D1B22",
  muted: "#9B7B84",
  gold: "#F4A261",
  premium: "#C77DFF",
};

const FONT = `'Nunito', 'Apple SD Gothic Neo', sans-serif`;

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@1,700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${FONT}; background: ${COLORS.bg}; color: ${COLORS.text}; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: ${COLORS.secondary}; border-radius: 4px; }
  .app { max-width: 430px; margin: 0 auto; min-height: 100vh; background: ${COLORS.bg}; position: relative; overflow: hidden; }
  .screen { display: none; flex-direction: column; min-height: 100vh; padding-bottom: 80px; }
  .screen.active { display: flex; }
  .nav { position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 430px; max-width: 100vw; background: white; border-top: 1px solid #FFE4EC; display: flex; justify-content: space-around; padding: 10px 0 16px; z-index: 100; box-shadow: 0 -4px 20px rgba(255,107,138,0.1); }
  .nav-btn { display: flex; flex-direction: column; align-items: center; gap: 3px; background: none; border: none; cursor: pointer; font-family: ${FONT}; font-size: 10px; font-weight: 700; color: ${COLORS.muted}; transition: all 0.2s; padding: 4px 10px; border-radius: 12px; }
  .nav-btn.active { color: ${COLORS.primary}; }
  .nav-btn .icon { font-size: 22px; transition: transform 0.2s; }
  .nav-btn.active .icon { transform: scale(1.15); }
  .header { padding: 50px 20px 16px; display: flex; align-items: center; justify-content: space-between; }
  .header h1 { font-size: 24px; font-weight: 900; color: ${COLORS.text}; }
  .card { background: white; border-radius: 20px; padding: 16px; margin: 0 16px 12px; box-shadow: 0 2px 12px rgba(255,107,138,0.08); }
  .btn { background: ${COLORS.primary}; color: white; border: none; border-radius: 14px; padding: 13px 24px; font-family: ${FONT}; font-weight: 800; font-size: 15px; cursor: pointer; width: 100%; transition: all 0.2s; }
  .btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,107,138,0.4); }
  .btn-outline { background: none; border: 2px solid ${COLORS.primary}; color: ${COLORS.primary}; }
  .btn-gold { background: linear-gradient(135deg, #F4A261, #E76F51); }
  .btn-purple { background: linear-gradient(135deg, #C77DFF, #9B5DE5); }
  .input { width: 100%; border: 2px solid #FFE4EC; border-radius: 12px; padding: 12px 16px; font-family: ${FONT}; font-size: 14px; color: ${COLORS.text}; outline: none; transition: border 0.2s; background: white; }
  .input:focus { border-color: ${COLORS.primary}; }
  .tag { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .tag-pink { background: #FFE4EC; color: ${COLORS.primary}; }
  .tag-gold { background: #FFF3E0; color: #E76F51; }
  .tag-purple { background: #F3E5FF; color: ${COLORS.premium}; }
  .badge { background: ${COLORS.accent}; color: white; border-radius: 20px; font-size: 10px; font-weight: 800; padding: 2px 6px; }
  .premium-banner { background: linear-gradient(135deg, #C77DFF, #9B5DE5); border-radius: 20px; padding: 18px; margin: 0 16px 12px; color: white; position: relative; overflow: hidden; }
  .premium-banner::before { content: '✨'; position: absolute; right: -10px; top: -10px; font-size: 80px; opacity: 0.2; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; align-items: flex-end; justify-content: center; animation: fadeIn 0.2s; }
  .modal { background: white; border-radius: 28px 28px 0 0; padding: 24px; width: 100%; max-width: 430px; max-height: 80vh; overflow-y: auto; animation: slideUp 0.3s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
  .heart-anim { animation: pulse 2s infinite; display: inline-block; }
  .chat-bubble { max-width: 75%; padding: 10px 14px; border-radius: 18px; font-size: 14px; line-height: 1.5; word-break: break-word; }
  .chat-bubble.mine { background: ${COLORS.primary}; color: white; border-bottom-right-radius: 4px; align-self: flex-end; }
  .chat-bubble.theirs { background: #F0F0F0; color: ${COLORS.text}; border-bottom-left-radius: 4px; align-self: flex-start; }
  .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .cal-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; position: relative; transition: all 0.2s; gap: 1px; }
  .cal-day:hover { background: #FFE4EC; }
  .cal-day.today { background: ${COLORS.primary}; color: white; }
  .cal-day.has-event::after { content: ''; position: absolute; bottom: 3px; width: 4px; height: 4px; border-radius: 50%; background: ${COLORS.gold}; }
  .cal-day.today::after { background: white; }
  .cal-day.has-photo .photo-dot { width: 100%; height: 100%; border-radius: 10px; object-fit: cover; position: absolute; top:0; left:0; opacity: 0.7; }
  .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .photo-item { aspect-ratio: 1; border-radius: 12px; background: #FFE4EC; display: flex; align-items: center; justify-content: center; font-size: 28px; cursor: pointer; overflow: hidden; position: relative; }
  .photo-item img { width: 100%; height: 100%; object-fit: cover; }
  .diary-entry { border-left: 3px solid ${COLORS.secondary}; padding-left: 12px; margin-bottom: 16px; }
  .dday-counter { font-size: 48px; font-weight: 900; color: ${COLORS.primary}; text-align: center; line-height: 1; }
  .scroll-x { display: flex; overflow-x: auto; gap: 10px; padding: 4px 0; scrollbar-width: none; }
  .scroll-x::-webkit-scrollbar { display: none; }
  .sticker { font-size: 32px; cursor: pointer; transition: transform 0.2s; display: inline-block; }
  .sticker:hover { transform: scale(1.3) rotate(-5deg); }
  textarea.input { resize: none; min-height: 100px; }
`;

const STICKERS = ["❤️","💕","💖","🌹","🌸","🦋","✨","🌙","⭐","🎀","💝","🌺","🍓","🎵","💫","🤍","🫶","😍","🥰","💞"];

const initialData = {
  coupled: false,
  myCode: Math.random().toString(36).substring(2,8).toUpperCase(),
  partnerCode: "",
  myName: "나",
  partnerName: "파트너",
  startDate: new Date().toISOString().split("T")[0],
  events: {},
  photos: [],
  messages: [
    { id: 1, from: "partner", text: "안녕! 우리 앱 같이 써보자~", time: "10:20", date: "오늘" },
    { id: 2, from: "me", text: "좋아! 너무 귀엽다 🥰", time: "10:22", date: "오늘" },
  ],
  diaries: [],
  isPremium: false,
};

export default function CoupleApp() {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [diaryInput, setDiaryInput] = useState({ title: "", content: "", mood: "😊", sticker: "" });
  const [eventInput, setEventInput] = useState({ title: "", color: "#FF6B8A" });
  const [photoInput, setPhotoInput] = useState(null);
  const [coupleCodeInput, setCoupleCodeInput] = useState("");
  const [onboarding, setOnboarding] = useState(!data.coupled);
  const chatEndRef = useRef(null);
  const fileRef = useRef(null);
  const photoFileRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages]);

  const getDday = () => {
    const start = new Date(data.startDate);
    const now = new Date();
    const diff = Math.floor((now - start) / 86400000);
    return diff + 1;
  };

  const calDays = () => {
    const year = calDate.getFullYear();
    const month = calDate.getMonth();
    const first = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let i = 1; i <= last; i++) days.push(i);
    return days;
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;

  const dayKey = (day) => `${calDate.getFullYear()}-${calDate.getMonth()+1}-${day}`;

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const now = new Date();
    const msg = {
      id: Date.now(),
      from: "me",
      text: chatInput,
      time: `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`,
      date: "오늘",
    };
    setData(d => ({ ...d, messages: [...d.messages, msg] }));
    setChatInput("");
    // Simulate partner reply
    setTimeout(() => {
      const replies = ["💕","ㅋㅋㅋ 귀여워","나도 사랑해 🥰","응응!","보고싶다...","오늘 뭐 먹었어?","😍😍","나중에 같이 가자~"];
      const reply = { id: Date.now()+1, from: "partner", text: replies[Math.floor(Math.random()*replies.length)], time: `${now.getHours()}:${String(now.getMinutes()+1).padStart(2,"0")}`, date: "오늘" };
      setData(d => ({ ...d, messages: [...d.messages, reply] }));
    }, 1500);
  };

  const addEvent = () => {
    if (!selectedDay || !eventInput.title.trim()) return;
    const key = dayKey(selectedDay);
    setData(d => ({
      ...d,
      events: {
        ...d.events,
        [key]: [...(d.events[key] || []), { id: Date.now(), ...eventInput }]
      }
    }));
    setEventInput({ title: "", color: "#FF6B8A" });
    setModal(null);
  };

  const addDiary = () => {
    if (!diaryInput.content.trim()) return;
    const now = new Date();
    setData(d => ({
      ...d,
      diaries: [{ id: Date.now(), date: now.toLocaleDateString("ko-KR"), ...diaryInput }, ...d.diaries]
    }));
    setDiaryInput({ title: "", content: "", mood: "😊", sticker: "" });
    setModal(null);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photo = {
        id: Date.now(),
        src: ev.target.result,
        date: new Date().toLocaleDateString("ko-KR"),
        caption: "",
        day: selectedDay,
        monthKey: `${calDate.getFullYear()}-${calDate.getMonth()+1}`,
      };
      setData(d => ({ ...d, photos: [photo, ...d.photos] }));
    };
    reader.readAsDataURL(file);
  };

  const matchCouple = () => {
    if (coupleCodeInput.length < 4) return;
    setData(d => ({ ...d, coupled: true, partnerCode: coupleCodeInput }));
    setOnboarding(false);
    setModal(null);
  };

  if (onboarding) {
    return (
      <div style={{ fontFamily: FONT, background: "linear-gradient(160deg, #FFE4EC 0%, #FFF5F7 60%)", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <style>{style}</style>
        <div style={{ fontSize: 72 }} className="heart-anim">💕</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 36, color: COLORS.primary, marginTop: 16, marginBottom: 8 }}>우리만의 공간</h1>
        <p style={{ color: COLORS.muted, fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>커플만을 위한 특별한 앱<br/>소중한 추억을 함께 쌓아가요</p>
        <div className="card" style={{ width: "100%", maxWidth: 360, marginBottom: 16, padding: 20 }}>
          <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8 }}>내 연결 코드</p>
          <div style={{ background: "#FFE4EC", borderRadius: 12, padding: "14px 20px", letterSpacing: 6, fontSize: 22, fontWeight: 900, color: COLORS.primary }}>{data.myCode}</div>
          <p style={{ fontSize: 12, color: COLORS.muted, marginTop: 8 }}>파트너에게 이 코드를 공유하세요</p>
        </div>
        <div className="card" style={{ width: "100%", maxWidth: 360, padding: 20 }}>
          <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8 }}>파트너 코드 입력</p>
          <input className="input" placeholder="파트너의 코드를 입력하세요" value={coupleCodeInput} onChange={e => setCoupleCodeInput(e.target.value.toUpperCase())} style={{ letterSpacing: 4, textAlign: "center", fontSize: 18, marginBottom: 12 }} />
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>사귄 날짜</p>
            <input type="date" className="input" value={data.startDate} onChange={e => setData(d => ({...d, startDate: e.target.value}))} />
          </div>
          <button className="btn" onClick={matchCouple} style={{ marginTop: 8 }}>💕 커플 연결하기</button>
        </div>
        <button className="btn btn-outline" style={{ marginTop: 12, width: "100%", maxWidth: 360 }} onClick={() => setOnboarding(false)}>먼저 둘러보기</button>
      </div>
    );
  }

  return (
    <div className="app">
      <style>{style}</style>

      {/* HOME */}
      <div className={`screen ${activeTab === "home" ? "active" : ""}`}>
        <div style={{ background: "linear-gradient(160deg, #FF6B8A 0%, #FF4D6D 100%)", padding: "50px 20px 30px", color: "white", borderRadius: "0 0 32px 32px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>안녕하세요 💕</p>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 16 }}>{data.myName} & {data.partnerName}</h2>
          <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 12, opacity: 0.8 }}>우리가 함께한 날</p>
              <p style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.1 }}>D+{getDday()}</p>
              <p style={{ fontSize: 12, opacity: 0.8 }}>{data.startDate} 부터</p>
            </div>
            <div style={{ fontSize: 60 }} className="heart-anim">💑</div>
          </div>
        </div>

        {!data.isPremium && (
          <div className="premium-banner" onClick={() => setModal("premium")}>
            <p style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>✨ 프리미엄으로 업그레이드</p>
            <p style={{ fontSize: 13, opacity: 0.9 }}>무제한 사진 저장 · 테마 · 기념일 알림 · 스티커 팩</p>
            <p style={{ fontSize: 12, marginTop: 8, fontWeight: 700 }}>월 3,900원 →</p>
          </div>
        )}

        <div style={{ padding: "0 16px", marginBottom: 12 }}>
          <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>💌 빠른 메뉴</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              { icon: "📅", label: "달력", tab: "calendar" },
              { icon: "💬", label: "채팅", tab: "chat" },
              { icon: "📸", label: "사진첩", tab: "photos" },
              { icon: "📖", label: "일기", tab: "diary" },
            ].map(m => (
              <button key={m.tab} onClick={() => setActiveTab(m.tab)} style={{ background: "white", border: "none", borderRadius: 16, padding: "14px 8px", cursor: "pointer", boxShadow: "0 2px 8px rgba(255,107,138,0.1)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 26 }}>{m.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.text }}>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🎂 다가오는 기념일</p>
          {[
            { label: "100일", days: 100 - getDday() + 1 > 0 ? 100 - getDday() + 1 : null },
            { label: "200일", days: 200 - getDday() + 1 > 0 ? 200 - getDday() + 1 : null },
            { label: "1주년", days: 365 - getDday() + 1 > 0 ? 365 - getDday() + 1 : null },
          ].filter(a => a.days !== null).slice(0, 2).map((a, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #FFF0F4" }}>
              <span style={{ fontWeight: 700 }}>{a.label}</span>
              <span className="tag tag-pink">D-{a.days}</span>
            </div>
          ))}
          <div style={{ padding: "8px 0" }}>
            <span style={{ fontWeight: 700, color: COLORS.muted, fontSize: 13 }}>기념일 추가 →</span>
          </div>
        </div>

        <div className="card">
          <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🌟 오늘의 커플 미션</p>
          {["서로에게 칭찬 한마디 보내기 💌", "함께 찍은 사진 올리기 📸", "오늘 하루 일기 쓰기 ✍️"].map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <input type="checkbox" style={{ accentColor: COLORS.primary, width: 16, height: 16 }} />
              <span style={{ fontSize: 13 }}>{m}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CALENDAR */}
      <div className={`screen ${activeTab === "calendar" ? "active" : ""}`}>
        <div className="header"><h1>📅 달력</h1><button className="btn" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => { setModal("addEvent"); }}>+ 일정</button></div>
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()-1, 1))}>‹</button>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{calDate.getFullYear()}년 {calDate.getMonth()+1}월</span>
            <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth()+1, 1))}>›</button>
          </div>
          <div className="calendar-grid" style={{ marginBottom: 8 }}>
            {["일","월","화","수","목","금","토"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: COLORS.muted, padding: "4px 0" }}>{d}</div>)}
          </div>
          <div className="calendar-grid">
            {calDays().map((day, i) => {
              if (!day) return <div key={i} />;
              const key = dayKey(day);
              const hasEvent = data.events[key]?.length > 0;
              const dayPhotos = data.photos.filter(p => p.day === day && p.monthKey === `${calDate.getFullYear()}-${calDate.getMonth()+1}`);
              const isToday = key === todayStr;
              return (
                <div key={i} className={`cal-day ${isToday ? "today" : ""} ${hasEvent ? "has-event" : ""} ${dayPhotos.length > 0 ? "has-photo" : ""}`}
                  onClick={() => { setSelectedDay(day); setModal("dayDetail"); }}
                  style={{ position: "relative" }}>
                  {dayPhotos[0] && <img src={dayPhotos[0].src} alt="" className="photo-dot" />}
                  <span style={{ position: "relative", zIndex: 1, fontSize: 13, fontWeight: 700 }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ padding: "0 16px" }}>
          <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>이번 달 일정</p>
          {Object.entries(data.events)
            .filter(([k]) => k.startsWith(`${calDate.getFullYear()}-${calDate.getMonth()+1}-`))
            .flatMap(([k, evs]) => evs.map(ev => ({ ...ev, dateKey: k })))
            .map((ev, i) => (
              <div key={i} className="card" style={{ margin: "0 0 8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color || COLORS.primary, flexShrink: 0 }} />
                <span style={{ fontWeight: 700, flex: 1 }}>{ev.title}</span>
                <span style={{ fontSize: 12, color: COLORS.muted }}>{ev.dateKey.split("-").slice(1).join("/")}일</span>
              </div>
            ))}
        </div>
      </div>

      {/* CHAT */}
      <div className={`screen ${activeTab === "chat" ? "active" : ""}`} style={{ display: activeTab === "chat" ? "flex" : "none" }}>
        <div style={{ background: "white", padding: "50px 16px 12px", borderBottom: "1px solid #FFE4EC", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #FFB3C1, #FF6B8A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🐰</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15 }}>{data.partnerName}</p>
            <p style={{ fontSize: 12, color: "#4CAF50" }}>● 온라인</p>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, paddingBottom: 80 }}>
          {data.messages.map(msg => (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "me" ? "flex-end" : "flex-start" }}>
              <div className={`chat-bubble ${msg.from === "me" ? "mine" : "theirs"}`}>{msg.text}</div>
              <span style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{msg.time}</span>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "white", borderTop: "1px solid #FFE4EC", padding: "10px 12px", display: "flex", gap: 8, alignItems: "center" }}>
          <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }} onClick={() => setModal("sticker")}>😊</button>
          <input className="input" style={{ flex: 1, margin: 0 }} placeholder="메시지 입력..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} />
          <button onClick={sendMessage} style={{ background: COLORS.primary, border: "none", borderRadius: 12, width: 40, height: 40, color: "white", fontSize: 18, cursor: "pointer" }}>→</button>
        </div>
      </div>

      {/* PHOTOS */}
      <div className={`screen ${activeTab === "photos" ? "active" : ""}`}>
        <div className="header"><h1>📸 사진첩</h1>
          <button className="btn" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => photoFileRef.current?.click()}>+ 사진</button>
        </div>
        <input ref={photoFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />
        {!data.isPremium && (
          <div className="card" style={{ background: "#FFF3E0", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>📦</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 800, fontSize: 13 }}>무료 저장소 {data.photos.length}/50장 사용 중</p>
              <div style={{ height: 4, background: "#FFE0B2", borderRadius: 4, marginTop: 4 }}><div style={{ height: "100%", width: `${(data.photos.length/50)*100}%`, background: "#F4A261", borderRadius: 4 }} /></div>
            </div>
            <button className="btn btn-gold" style={{ width: "auto", padding: "6px 12px", fontSize: 12 }} onClick={() => setModal("premium")}>업그레이드</button>
          </div>
        )}
        {data.photos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📷</div>
            <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>아직 사진이 없어요</p>
            <p style={{ color: COLORS.muted, fontSize: 14 }}>소중한 순간을 기록해보세요!</p>
          </div>
        ) : (
          <div style={{ padding: "0 16px" }}>
            <div className="photo-grid">
              {data.photos.map(photo => (
                <div key={photo.id} className="photo-item">
                  <img src={photo.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DIARY */}
      <div className={`screen ${activeTab === "diary" ? "active" : ""}`}>
        <div className="header"><h1>📖 우리 일기</h1><button className="btn" style={{ width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => setModal("addDiary")}>+ 쓰기</button></div>
        {data.diaries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✍️</div>
            <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>첫 일기를 써보세요</p>
            <p style={{ color: COLORS.muted, fontSize: 14 }}>오늘의 감정을 기록해요</p>
            <button className="btn" style={{ marginTop: 20, width: "auto", padding: "12px 24px" }} onClick={() => setModal("addDiary")}>일기 쓰기</button>
          </div>
        ) : (
          <div style={{ padding: "0 16px" }}>
            {data.diaries.map(diary => (
              <div key={diary.id} className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>{diary.date}</span>
                  <span style={{ fontSize: 22 }}>{diary.mood} {diary.sticker}</span>
                </div>
                {diary.title && <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{diary.title}</p>}
                <div className="diary-entry">
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "#555" }}>{diary.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MORE */}
      <div className={`screen ${activeTab === "more" ? "active" : ""}`}>
        <div className="header"><h1>⚙️ 더보기</h1></div>
        <div className="card">
          <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>👫 커플 설정</p>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>내 이름</p>
            <input className="input" value={data.myName} onChange={e => setData(d => ({...d, myName: e.target.value}))} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>파트너 이름</p>
            <input className="input" value={data.partnerName} onChange={e => setData(d => ({...d, partnerName: e.target.value}))} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>사귄 날짜</p>
            <input type="date" className="input" value={data.startDate} onChange={e => setData(d => ({...d, startDate: e.target.value}))} />
          </div>
          <div style={{ background: "#FFE4EC", borderRadius: 12, padding: 12, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>내 코드</p>
            <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, color: COLORS.primary }}>{data.myCode}</p>
          </div>
        </div>

        <div className="card">
          <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>💎 구독 & 수익화</p>
          {[
            { icon: "✨", title: "프리미엄", desc: "무제한 저장 · 테마 · 알림", price: "월 3,900원", tag: "인기", color: COLORS.premium },
            { icon: "💝", title: "커플 코인", desc: "스티커 · 배경화면 구매", price: "1,100원~", tag: "", color: COLORS.gold },
            { icon: "🎁", title: "선물 보내기", desc: "실물 선물 · 꽃다발 배달", price: "서비스 연동", tag: "NEW", color: COLORS.primary },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid #FFF0F4" : "none" }} onClick={() => setModal("premium")}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 14 }}>{item.title} {item.tag && <span className="badge">{item.tag}</span>}</p>
                <p style={{ fontSize: 12, color: COLORS.muted }}>{item.desc}</p>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.price}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🔔 알림 설정</p>
          {["기념일 알림", "채팅 알림", "미션 완료 알림"].map((n, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 2 ? "1px solid #FFF0F4" : "none" }}>
              <span style={{ fontSize: 14 }}>{n}</span>
              <div style={{ width: 44, height: 24, background: i === 1 ? COLORS.primary : "#E0E0E0", borderRadius: 12, position: "relative", cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, background: "white", borderRadius: "50%", position: "absolute", top: 3, left: i === 1 ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="nav">
        {[
          { id: "home", icon: "🏠", label: "홈" },
          { id: "calendar", icon: "📅", label: "달력" },
          { id: "chat", icon: "💬", label: "채팅" },
          { id: "photos", icon: "📸", label: "사진" },
          { id: "diary", icon: "📖", label: "일기" },
          { id: "more", icon: "⚙️", label: "더보기" },
        ].map(tab => (
          <button key={tab.id} className={`nav-btn ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
            <span className="icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* MODALS */}
      {modal === "dayDetail" && selectedDay && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontWeight: 800, fontSize: 18 }}>{calDate.getMonth()+1}월 {selectedDay}일</h3>
              <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.muted, marginBottom: 8 }}>📌 일정</p>
              {(data.events[dayKey(selectedDay)] || []).map((ev, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color }} />
                  <span style={{ fontWeight: 700 }}>{ev.title}</span>
                </div>
              ))}
              <button className="btn btn-outline" style={{ marginTop: 8, padding: "8px", fontSize: 13 }} onClick={() => setModal("addEvent")}>+ 일정 추가</button>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.muted, marginBottom: 8 }}>📸 이날 사진</p>
              <div className="photo-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {data.photos.filter(p => p.day === selectedDay && p.monthKey === `${calDate.getFullYear()}-${calDate.getMonth()+1}`).map(p => (
                  <div key={p.id} className="photo-item"><img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                ))}
                <div className="photo-item" onClick={() => { photoFileRef.current?.click(); setModal(null); }}>
                  <span style={{ fontSize: 28, color: COLORS.muted }}>+</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal === "addEvent" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>일정 추가</h3>
            {!selectedDay && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 4 }}>날짜 선택</p>
                <input type="number" className="input" placeholder="일 (숫자)" min={1} max={31} onChange={e => setSelectedDay(parseInt(e.target.value))} />
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 4 }}>일정 제목</p>
              <input className="input" placeholder="예: 영화 데이트 🎬" value={eventInput.title} onChange={e => setEventInput(p => ({...p, title: e.target.value}))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 8 }}>색상</p>
              <div style={{ display: "flex", gap: 8 }}>
                {["#FF6B8A","#F4A261","#C77DFF","#4CAF50","#2196F3"].map(c => (
                  <div key={c} onClick={() => setEventInput(p => ({...p, color: c}))} style={{ width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer", border: eventInput.color === c ? "3px solid #333" : "2px solid transparent" }} />
                ))}
              </div>
            </div>
            <button className="btn" onClick={addEvent}>일정 추가하기</button>
          </div>
        </div>
      )}

      {modal === "addDiary" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>일기 쓰기 ✍️</h3>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>오늘 기분은?</p>
              <div style={{ display: "flex", gap: 12 }}>
                {["😊","🥰","😢","😠","😌","🤩"].map(m => (
                  <span key={m} style={{ fontSize: 26, cursor: "pointer", opacity: diaryInput.mood === m ? 1 : 0.4, transform: diaryInput.mood === m ? "scale(1.3)" : "scale(1)", transition: "all 0.2s" }} onClick={() => setDiaryInput(d => ({...d, mood: m}))}>{m}</span>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <input className="input" placeholder="제목 (선택)" value={diaryInput.title} onChange={e => setDiaryInput(d => ({...d, title: e.target.value}))} style={{ marginBottom: 8 }} />
              <textarea className="input" placeholder="오늘 어떤 하루였나요? 💕" value={diaryInput.content} onChange={e => setDiaryInput(d => ({...d, content: e.target.value}))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 6 }}>스티커</p>
              <div className="scroll-x">
                {STICKERS.map(s => <span key={s} className="sticker" onClick={() => setDiaryInput(d => ({...d, sticker: s}))} style={{ opacity: diaryInput.sticker === s ? 1 : 0.6 }}>{s}</span>)}
              </div>
            </div>
            <button className="btn" onClick={addDiary}>저장하기</button>
          </div>
        </div>
      )}

      {modal === "sticker" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>스티커 보내기 💌</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
              {STICKERS.map(s => (
                <span key={s} className="sticker" style={{ textAlign: "center" }} onClick={() => {
                  const now = new Date();
                  setData(d => ({ ...d, messages: [...d.messages, { id: Date.now(), from: "me", text: s, time: `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`, date: "오늘" }] }));
                  setModal(null);
                }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {modal === "premium" && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ background: "linear-gradient(135deg, #C77DFF, #9B5DE5)", borderRadius: 20, padding: 20, textAlign: "center", color: "white", marginBottom: 16 }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>✨</p>
              <h3 style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>프리미엄</h3>
              <p style={{ opacity: 0.9, fontSize: 14 }}>커플의 모든 것을 더 특별하게</p>
            </div>
            {[
              "📸 무제한 사진 저장소",
              "🎨 20가지 커플 테마",
              "🔔 기념일 & 일정 알림",
              "💌 스티커 팩 전체 해제",
              "📖 일기 잠금 & 암호화",
              "🎁 파트너에게 선물 배달",
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 5 ? "1px solid #F0F0F0" : "" }}>
                <span style={{ fontSize: 20 }}>{f.split(" ")[0]}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{f.split(" ").slice(1).join(" ")}</span>
              </div>
            ))}
            <div style={{ marginTop: 20 }}>
              <button className="btn btn-purple" onClick={() => { setData(d => ({...d, isPremium: true})); setModal(null); }} style={{ marginBottom: 8 }}>월 3,900원 시작하기</button>
              <button className="btn btn-gold" onClick={() => { setData(d => ({...d, isPremium: true})); setModal(null); }}>연 29,900원 (38% 할인) 🎉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
