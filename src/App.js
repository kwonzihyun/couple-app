import React, { useState, useEffect, useRef } from "react";

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

const globalStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Nunito', 'Apple SD Gothic Neo', sans-serif; background: #FFF5F7; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: #FFB3C1; border-radius: 4px; }
`;

const css = {
  app: { maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: COLORS.bg, position: "relative", fontFamily: "'Nunito', 'Apple SD Gothic Neo', sans-serif" },
  nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "white", borderTop: "1px solid #FFE4EC", display: "flex", justifyContent: "space-around", padding: "10px 0 16px", zIndex: 100, boxShadow: "0 -4px 20px rgba(255,107,138,0.1)" },
  card: { background: "white", borderRadius: 20, padding: 16, margin: "0 16px 12px", boxShadow: "0 2px 12px rgba(255,107,138,0.08)" },
  btn: { background: COLORS.primary, color: "white", border: "none", borderRadius: 14, padding: "13px 24px", fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 15, cursor: "pointer", width: "100%" },
  input: { width: "100%", border: "2px solid #FFE4EC", borderRadius: 12, padding: "12px 16px", fontFamily: "'Nunito', sans-serif", fontSize: 14, color: COLORS.text, outline: "none", background: "white" },
};

const STICKERS = ["❤️","💕","💖","🌹","🌸","🦋","✨","🌙","⭐","🎀","💝","🌺","🍓","🎵","💫","🤍","🫶","😍","🥰","💞"];

const initialData = {
  coupled: false,
  myCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
  myName: "나",
  partnerName: "파트너",
  startDate: new Date().toISOString().split("T")[0],
  events: {},
  photos: [],
  messages: [
    { id: 1, from: "partner", text: "안녕! 우리 앱 같이 써보자~", time: "10:20" },
    { id: 2, from: "me", text: "좋아! 너무 귀엽다 🥰", time: "10:22" },
  ],
  diaries: [],
  isPremium: false,
};

export default function App() {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [diaryInput, setDiaryInput] = useState({ title: "", content: "", mood: "😊", sticker: "" });
  const [eventInput, setEventInput] = useState({ title: "", color: "#FF6B8A" });
  const [coupleCodeInput, setCoupleCodeInput] = useState("");
  const [onboarding, setOnboarding] = useState(true);
  const chatEndRef = useRef(null);
  const photoFileRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [data.messages]);

  const getDday = () => {
    const start = new Date(data.startDate);
    const now = new Date();
    return Math.floor((now - start) / 86400000) + 1;
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
  const todayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const dayKey = (day) => `${calDate.getFullYear()}-${calDate.getMonth() + 1}-${day}`;

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    setData(d => ({ ...d, messages: [...d.messages, { id: Date.now(), from: "me", text: chatInput, time: timeStr }] }));
    setChatInput("");
    setTimeout(() => {
      const replies = ["💕", "ㅋㅋ 귀여워", "나도 사랑해 🥰", "응응!", "보고싶다...", "😍"];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      const now2 = new Date();
      setData(d => ({ ...d, messages: [...d.messages, { id: Date.now() + 1, from: "partner", text: reply, time: `${now2.getHours()}:${String(now2.getMinutes()).padStart(2, "0")}` }] }));
    }, 1200);
  };

  const addEvent = () => {
    if (!selectedDay || !eventInput.title.trim()) return;
    const key = dayKey(selectedDay);
    setData(d => ({ ...d, events: { ...d.events, [key]: [...(d.events[key] || []), { id: Date.now(), ...eventInput }] } }));
    setEventInput({ title: "", color: "#FF6B8A" });
    setModal(null);
  };

  const addDiary = () => {
    if (!diaryInput.content.trim()) return;
    const now = new Date();
    setData(d => ({ ...d, diaries: [{ id: Date.now(), date: now.toLocaleDateString("ko-KR"), ...diaryInput }, ...d.diaries] }));
    setDiaryInput({ title: "", content: "", mood: "😊", sticker: "" });
    setModal(null);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setData(d => ({ ...d, photos: [{ id: Date.now(), src: ev.target.result, date: new Date().toLocaleDateString("ko-KR"), day: selectedDay, monthKey: `${calDate.getFullYear()}-${calDate.getMonth() + 1}` }, ...d.photos] }));
    };
    reader.readAsDataURL(file);
  };

  // ── ONBOARDING ──
  if (onboarding) {
    return (
      <div style={{ ...css.app, background: "linear-gradient(160deg, #FFE4EC 0%, #FFF5F7 60%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", minHeight: "100vh" }}>
        <style>{globalStyle}</style>
        <div style={{ fontSize: 72, animation: "none" }}>💕</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: COLORS.primary, marginTop: 16, marginBottom: 8 }}>우리만의 공간</h1>
        <p style={{ color: COLORS.muted, fontSize: 14, marginBottom: 32, lineHeight: 1.7 }}>커플만을 위한 특별한 앱<br />소중한 추억을 함께 쌓아가요</p>
        <div style={{ ...css.card, width: "100%", maxWidth: 360, marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>내 연결 코드</p>
          <div style={{ background: "#FFE4EC", borderRadius: 12, padding: "14px 20px", letterSpacing: 6, fontSize: 22, fontWeight: 900, color: COLORS.primary }}>{data.myCode}</div>
          <p style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>파트너에게 이 코드를 공유하세요</p>
        </div>
        <div style={{ ...css.card, width: "100%", maxWidth: 360 }}>
          <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>파트너 코드 입력</p>
          <input style={{ ...css.input, letterSpacing: 4, textAlign: "center", fontSize: 18, marginBottom: 10 }} placeholder="파트너 코드" value={coupleCodeInput} onChange={e => setCoupleCodeInput(e.target.value.toUpperCase())} />
          <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 6 }}>사귄 날짜</p>
          <input type="date" style={{ ...css.input, marginBottom: 12 }} value={data.startDate} onChange={e => setData(d => ({ ...d, startDate: e.target.value }))} />
          <button style={css.btn} onClick={() => { setData(d => ({ ...d, coupled: true })); setOnboarding(false); }}>💕 시작하기</button>
        </div>
        <button style={{ ...css.btn, background: "none", border: "2px solid " + COLORS.primary, color: COLORS.primary, maxWidth: 360, marginTop: 10 }} onClick={() => setOnboarding(false)}>먼저 둘러보기</button>
      </div>
    );
  }

  const tabs = [
    { id: "home", icon: "🏠", label: "홈" },
    { id: "calendar", icon: "📅", label: "달력" },
    { id: "chat", icon: "💬", label: "채팅" },
    { id: "photos", icon: "📸", label: "사진" },
    { id: "diary", icon: "📖", label: "일기" },
    { id: "more", icon: "⚙️", label: "더보기" },
  ];

  return (
    <div style={css.app}>
      <style>{globalStyle}</style>
      <input ref={photoFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />

      {/* ── HOME ── */}
      {activeTab === "home" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={{ background: "linear-gradient(160deg, #FF6B8A, #FF4D6D)", padding: "50px 20px 28px", color: "white", borderRadius: "0 0 32px 32px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>안녕하세요 💕</p>
            <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 16 }}>{data.myName} & {data.partnerName}</h2>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 11, opacity: 0.85 }}>우리가 함께한 날</p>
                <p style={{ fontSize: 44, fontWeight: 900, lineHeight: 1.1 }}>D+{getDday()}</p>
                <p style={{ fontSize: 11, opacity: 0.85 }}>{data.startDate} 부터</p>
              </div>
              <div style={{ fontSize: 56 }}>💑</div>
            </div>
          </div>

          {!data.isPremium && (
            <div onClick={() => setModal("premium")} style={{ background: "linear-gradient(135deg, #C77DFF, #9B5DE5)", borderRadius: 20, padding: 18, margin: "0 16px 12px", color: "white", cursor: "pointer", position: "relative", overflow: "hidden" }}>
              <p style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>✨ 프리미엄으로 업그레이드</p>
              <p style={{ fontSize: 13, opacity: 0.9 }}>무제한 사진 · 테마 · 기념일 알림</p>
              <p style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>월 3,900원 →</p>
            </div>
          )}

          <div style={{ padding: "0 16px", marginBottom: 12 }}>
            <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>💌 빠른 메뉴</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {[{ icon: "📅", label: "달력", tab: "calendar" }, { icon: "💬", label: "채팅", tab: "chat" }, { icon: "📸", label: "사진첩", tab: "photos" }, { icon: "📖", label: "일기", tab: "diary" }].map(m => (
                <button key={m.tab} onClick={() => setActiveTab(m.tab)} style={{ background: "white", border: "none", borderRadius: 16, padding: "14px 8px", cursor: "pointer", boxShadow: "0 2px 8px rgba(255,107,138,0.1)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 24 }}>{m.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: COLORS.text }}>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={css.card}>
            <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🎂 다가오는 기념일</p>
            {[{ label: "100일", target: 100 }, { label: "200일", target: 200 }, { label: "1주년", target: 365 }]
              .map(a => ({ ...a, days: a.target - getDday() + 1 }))
              .filter(a => a.days > 0)
              .slice(0, 2)
              .map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #FFF0F4" }}>
                  <span style={{ fontWeight: 700 }}>{a.label}</span>
                  <span style={{ background: "#FFE4EC", color: COLORS.primary, borderRadius: 20, fontSize: 12, fontWeight: 700, padding: "3px 10px" }}>D-{a.days}</span>
                </div>
              ))}
          </div>

          <div style={css.card}>
            <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>🌟 오늘의 커플 미션</p>
            {["서로에게 칭찬 한마디 보내기 💌", "함께 찍은 사진 올리기 📸", "오늘 하루 일기 쓰기 ✍️"].map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                <input type="checkbox" style={{ accentColor: COLORS.primary, width: 16, height: 16 }} />
                <span style={{ fontSize: 13 }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CALENDAR ── */}
      {activeTab === "calendar" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={{ padding: "50px 16px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900 }}>📅 달력</h1>
            <button style={{ ...css.btn, width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => setModal("addEvent")}>+ 일정</button>
          </div>
          <div style={css.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }} onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}>‹</button>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{calDate.getFullYear()}년 {calDate.getMonth() + 1}월</span>
              <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }} onClick={() => setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}>›</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
              {["일","월","화","수","목","금","토"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: COLORS.muted, padding: "4px 0" }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {calDays().map((day, i) => {
                if (!day) return <div key={i} />;
                const key = dayKey(day);
                const hasEvent = (data.events[key] || []).length > 0;
                const dayPhoto = data.photos.find(p => p.day === day && p.monthKey === `${calDate.getFullYear()}-${calDate.getMonth() + 1}`);
                const isToday = key === todayKey;
                return (
                  <div key={i} onClick={() => { setSelectedDay(day); setModal("dayDetail"); }}
                    style={{ aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", position: "relative", background: isToday ? COLORS.primary : dayPhoto ? "transparent" : "transparent", color: isToday ? "white" : COLORS.text, overflow: "hidden" }}>
                    {dayPhoto && <img src={dayPhoto.src} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", borderRadius: 10, opacity: 0.6 }} />}
                    <span style={{ position: "relative", zIndex: 1 }}>{day}</span>
                    {hasEvent && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isToday ? "white" : COLORS.gold, position: "absolute", bottom: 3 }} />}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ padding: "0 16px" }}>
            {Object.entries(data.events)
              .filter(([k]) => k.startsWith(`${calDate.getFullYear()}-${calDate.getMonth() + 1}-`))
              .flatMap(([k, evs]) => evs.map(ev => ({ ...ev, dateKey: k })))
              .map((ev, i) => (
                <div key={i} style={{ ...css.card, margin: "0 0 8px", padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, flex: 1 }}>{ev.title}</span>
                  <span style={{ fontSize: 12, color: COLORS.muted }}>{ev.dateKey.split("-")[2]}일</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── CHAT ── */}
      {activeTab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <div style={{ background: "white", padding: "50px 16px 12px", borderBottom: "1px solid #FFE4EC", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #FFB3C1, #FF6B8A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🐰</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15 }}>{data.partnerName}</p>
              <p style={{ fontSize: 12, color: "#4CAF50" }}>● 온라인</p>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8, paddingBottom: 130 }}>
            {data.messages.map(msg => (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.from === "me" ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: 18, fontSize: 14, lineHeight: 1.5, background: msg.from === "me" ? COLORS.primary : "#F0F0F0", color: msg.from === "me" ? "white" : COLORS.text, borderBottomRightRadius: msg.from === "me" ? 4 : 18, borderBottomLeftRadius: msg.from === "me" ? 18 : 4 }}>{msg.text}</div>
                <span style={{ fontSize: 10, color: COLORS.muted, marginTop: 2 }}>{msg.time}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "white", borderTop: "1px solid #FFE4EC", padding: "10px 12px", display: "flex", gap: 8, alignItems: "center" }}>
            <button style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }} onClick={() => setModal("sticker")}>😊</button>
            <input style={{ ...css.input, flex: 1 }} placeholder="메시지 입력..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} />
            <button onClick={sendMessage} style={{ background: COLORS.primary, border: "none", borderRadius: 12, width: 40, height: 40, color: "white", fontSize: 18, cursor: "pointer" }}>→</button>
          </div>
        </div>
      )}

      {/* ── PHOTOS ── */}
      {activeTab === "photos" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={{ padding: "50px 16px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900 }}>📸 사진첩</h1>
            <button style={{ ...css.btn, width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => photoFileRef.current && photoFileRef.current.click()}>+ 사진</button>
          </div>
          {!data.isPremium && (
            <div style={{ ...css.card, background: "#FFF3E0", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 22 }}>📦</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 800, fontSize: 13 }}>무료 저장소 {data.photos.length}/50장</p>
                <div style={{ height: 4, background: "#FFE0B2", borderRadius: 4, marginTop: 4 }}>
                  <div style={{ height: "100%", width: `${Math.min((data.photos.length / 50) * 100, 100)}%`, background: "#F4A261", borderRadius: 4 }} />
                </div>
              </div>
              <button style={{ ...css.btn, width: "auto", padding: "6px 12px", fontSize: 12, background: "linear-gradient(135deg, #F4A261, #E76F51)" }} onClick={() => setModal("premium")}>업그레이드</button>
            </div>
          )}
          {data.photos.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>📷</div>
              <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>아직 사진이 없어요</p>
              <p style={{ color: COLORS.muted, fontSize: 14 }}>소중한 순간을 기록해보세요!</p>
            </div>
          ) : (
            <div style={{ padding: "0 16px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              {data.photos.map(photo => (
                <div key={photo.id} style={{ aspectRatio: "1", borderRadius: 12, overflow: "hidden" }}>
                  <img src={photo.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DIARY ── */}
      {activeTab === "diary" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={{ padding: "50px 16px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h1 style={{ fontSize: 22, fontWeight: 900 }}>📖 우리 일기</h1>
            <button style={{ ...css.btn, width: "auto", padding: "8px 16px", fontSize: 13 }} onClick={() => setModal("addDiary")}>+ 쓰기</button>
          </div>
          {data.diaries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>✍️</div>
              <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>첫 일기를 써보세요</p>
              <button style={{ ...css.btn, width: "auto", padding: "12px 24px", marginTop: 12 }} onClick={() => setModal("addDiary")}>일기 쓰기</button>
            </div>
          ) : (
            <div style={{ padding: "0 16px" }}>
              {data.diaries.map(diary => (
                <div key={diary.id} style={css.card}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: COLORS.muted }}>{diary.date}</span>
                    <span style={{ fontSize: 20 }}>{diary.mood} {diary.sticker}</span>
                  </div>
                  {diary.title && <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{diary.title}</p>}
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "#555", borderLeft: "3px solid #FFB3C1", paddingLeft: 10 }}>{diary.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MORE ── */}
      {activeTab === "more" && (
        <div style={{ paddingBottom: 80 }}>
          <div style={{ padding: "50px 16px 16px" }}><h1 style={{ fontSize: 22, fontWeight: 900 }}>⚙️ 더보기</h1></div>
          <div style={css.card}>
            <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>👫 커플 설정</p>
            {[{ label: "내 이름", key: "myName" }, { label: "파트너 이름", key: "partnerName" }].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>{f.label}</p>
                <input style={css.input} value={data[f.key]} onChange={e => setData(d => ({ ...d, [f.key]: e.target.value }))} />
              </div>
            ))}
            <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>사귄 날짜</p>
            <input type="date" style={{ ...css.input, marginBottom: 12 }} value={data.startDate} onChange={e => setData(d => ({ ...d, startDate: e.target.value }))} />
            <div style={{ background: "#FFE4EC", borderRadius: 12, padding: 12, textAlign: "center" }}>
              <p style={{ fontSize: 11, color: COLORS.muted, marginBottom: 4 }}>내 코드</p>
              <p style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, color: COLORS.primary }}>{data.myCode}</p>
            </div>
          </div>
          <div style={css.card}>
            <p style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>💎 구독 & 수익화</p>
            {[
              { icon: "✨", title: "프리미엄", desc: "무제한 저장 · 테마 · 알림", price: "월 3,900원", tag: "인기" },
              { icon: "💝", title: "커플 코인", desc: "스티커 · 배경화면 구매", price: "1,100원~", tag: "" },
              { icon: "🎁", title: "선물 보내기", desc: "실물 선물 · 꽃다발 배달", price: "서비스 연동", tag: "NEW" },
            ].map((item, i) => (
              <div key={i} onClick={() => setModal("premium")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 2 ? "1px solid #FFF0F4" : "none", cursor: "pointer" }}>
                <span style={{ fontSize: 26 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 800, fontSize: 14 }}>{item.title} {item.tag && <span style={{ background: COLORS.accent, color: "white", borderRadius: 20, fontSize: 10, fontWeight: 800, padding: "2px 6px", marginLeft: 4 }}>{item.tag}</span>}</p>
                  <p style={{ fontSize: 12, color: COLORS.muted }}>{item.desc}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary }}>{item.price}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── NAV ── */}
      <nav style={css.nav}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 700, color: activeTab === tab.id ? COLORS.primary : COLORS.muted, padding: "4px 8px", borderRadius: 12 }}>
            <span style={{ fontSize: 22, transform: activeTab === tab.id ? "scale(1.15)" : "scale(1)", transition: "transform 0.2s" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── MODALS ── */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "white", borderRadius: "28px 28px 0 0", padding: 24, width: "100%", maxWidth: 430, maxHeight: "80vh", overflowY: "auto" }}>

            {modal === "dayDetail" && selectedDay && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 18 }}>{calDate.getMonth() + 1}월 {selectedDay}일</h3>
                  <button style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }} onClick={() => setModal(null)}>✕</button>
                </div>
                <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.muted, marginBottom: 8 }}>📌 일정</p>
                {(data.events[dayKey(selectedDay)] || []).map((ev, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: ev.color }} />
                    <span style={{ fontWeight: 700 }}>{ev.title}</span>
                  </div>
                ))}
                <button style={{ ...css.btn, background: "none", border: "2px solid " + COLORS.primary, color: COLORS.primary, marginTop: 8, padding: 8, fontSize: 13 }} onClick={() => setModal("addEvent")}>+ 일정 추가</button>
                <p style={{ fontWeight: 700, fontSize: 13, color: COLORS.muted, margin: "16px 0 8px" }}>📸 이날 사진</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {data.photos.filter(p => p.day === selectedDay && p.monthKey === `${calDate.getFullYear()}-${calDate.getMonth() + 1}`).map(p => (
                    <div key={p.id} style={{ aspectRatio: "1", borderRadius: 12, overflow: "hidden" }}><img src={p.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
                  ))}
                  <div onClick={() => { photoFileRef.current && photoFileRef.current.click(); setModal(null); }} style={{ aspectRatio: "1", borderRadius: 12, background: "#FFE4EC", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 28 }}>+</div>
                </div>
              </>
            )}

            {modal === "addEvent" && (
              <>
                <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>일정 추가</h3>
                <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>일정 제목</p>
                <input style={{ ...css.input, marginBottom: 12 }} placeholder="예: 영화 데이트 🎬" value={eventInput.title} onChange={e => setEventInput(p => ({ ...p, title: e.target.value }))} />
                <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>색상</p>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {["#FF6B8A", "#F4A261", "#C77DFF", "#4CAF50", "#2196F3"].map(c => (
                    <div key={c} onClick={() => setEventInput(p => ({ ...p, color: c }))} style={{ width: 32, height: 32, borderRadius: "50%", background: c, cursor: "pointer", border: eventInput.color === c ? "3px solid #333" : "2px solid transparent" }} />
                  ))}
                </div>
                <button style={css.btn} onClick={addEvent}>일정 추가하기</button>
              </>
            )}

            {modal === "addDiary" && (
              <>
                <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>일기 쓰기 ✍️</h3>
                <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>오늘 기분은?</p>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  {["😊","🥰","😢","😠","😌","🤩"].map(m => (
                    <span key={m} onClick={() => setDiaryInput(d => ({ ...d, mood: m }))} style={{ fontSize: 26, cursor: "pointer", opacity: diaryInput.mood === m ? 1 : 0.4 }}>{m}</span>
                  ))}
                </div>
                <input style={{ ...css.input, marginBottom: 8 }} placeholder="제목 (선택)" value={diaryInput.title} onChange={e => setDiaryInput(d => ({ ...d, title: e.target.value }))} />
                <textarea style={{ ...css.input, resize: "none", minHeight: 100, marginBottom: 12 }} placeholder="오늘 어떤 하루였나요? 💕" value={diaryInput.content} onChange={e => setDiaryInput(d => ({ ...d, content: e.target.value }))} />
                <p style={{ fontSize: 12, color: COLORS.muted, marginBottom: 8 }}>스티커</p>
                <div style={{ display: "flex", overflowX: "auto", gap: 10, paddingBottom: 8, marginBottom: 16 }}>
                  {STICKERS.map(s => <span key={s} onClick={() => setDiaryInput(d => ({ ...d, sticker: s }))} style={{ fontSize: 28, cursor: "pointer", opacity: diaryInput.sticker === s ? 1 : 0.5, flexShrink: 0 }}>{s}</span>)}
                </div>
                <button style={css.btn} onClick={addDiary}>저장하기</button>
              </>
            )}

            {modal === "sticker" && (
              <>
                <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>스티커 보내기 💌</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                  {STICKERS.map(s => (
                    <span key={s} onClick={() => {
                      const now = new Date();
                      setData(d => ({ ...d, messages: [...d.messages, { id: Date.now(), from: "me", text: s, time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}` }] }));
                      setModal(null);
                    }} style={{ fontSize: 32, cursor: "pointer", textAlign: "center" }}>{s}</span>
                  ))}
                </div>
              </>
            )}

            {modal === "premium" && (
              <>
                <div style={{ background: "linear-gradient(135deg, #C77DFF, #9B5DE5)", borderRadius: 20, padding: 20, textAlign: "center", color: "white", marginBottom: 16 }}>
                  <p style={{ fontSize: 36, marginBottom: 8 }}>✨</p>
                  <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 4 }}>프리미엄</h3>
                  <p style={{ opacity: 0.9, fontSize: 13 }}>커플의 모든 것을 더 특별하게</p>
                </div>
                {["📸 무제한 사진 저장소", "🎨 20가지 커플 테마", "🔔 기념일 & 일정 알림", "💌 스티커 팩 전체 해제", "📖 일기 잠금 & 암호화", "🎁 파트너에게 선물 배달"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 5 ? "1px solid #F0F0F0" : "" }}>
                    <span style={{ fontSize: 18 }}>{f.split(" ")[0]}</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{f.split(" ").slice(1).join(" ")}</span>
                  </div>
                ))}
                <button style={{ ...css.btn, background: "linear-gradient(135deg, #C77DFF, #9B5DE5)", marginTop: 16, marginBottom: 8 }} onClick={() => { setData(d => ({ ...d, isPremium: true })); setModal(null); }}>월 3,900원 시작하기</button>
                <button style={{ ...css.btn, background: "linear-gradient(135deg, #F4A261, #E76F51)" }} onClick={() => { setData(d => ({ ...d, isPremium: true })); setModal(null); }}>연 29,900원 (38% 할인) 🎉</button>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
