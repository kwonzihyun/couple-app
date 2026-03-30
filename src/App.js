import React, { useState, useRef, useEffect } from "react";

const T = {
  rose:"#E8637A",roseDark:"#C94F64",roseLight:"#FDEEF1",rosePale:"#FDF6F8",
  cream:"#FFFBF9",stone:"#6B5B63",stoneMid:"#9C8A92",stoneLight:"#E8E0E3",
  white:"#FFFFFF",ink:"#2A1F23",sage:"#7BAF8E",gold:"#C9A96E",sky:"#6A9ED4",
};

const GS=`
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
html,body,#root{height:100%;overflow:hidden}
body{font-family:'DM Sans',sans-serif;background:#FDF6F8;color:#2A1F23;overscroll-behavior:none}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#E8E0E3;border-radius:3px}
input,textarea,button{font-family:'DM Sans',sans-serif}
textarea{resize:none}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.fade-up{animation:fadeUp .4s ease both}
.fade-in{animation:fadeIn .25s ease both}
`;

const USERS={
  me:{id:"me",name:"지현",color:T.rose,avatar:"🌸"},
  partner:{id:"partner",name:"민준",color:T.sky,avatar:"🐋"},
};
const STICKERS=["❤️","💕","💖","🌹","🌸","🦋","✨","🌙","⭐","🎀","💝","🌺","🍓","🎵","💫","🤍","🫶","😍","🥰","💞","🐰","🐻","🐋","🌈","🎠"];
const MISSIONS=["오늘 서로에게 칭찬 한마디 보내기 💌","함께 찍은 사진 올리기 📸","오늘 하루 일기 남기기 ✍️","좋아하는 노래 공유하기 🎵","손편지 한 줄 채팅으로 보내기 💕","오늘 먹은 음식 인증샷 올리기 🍱","데이트 장소 공유하기 🗺️"];
const todayStr=()=>{const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};

const INIT={
  user:null,
  myCode:Math.random().toString(36).substring(2,8).toUpperCase(),
  startDate:"2024-03-15",
  events:{"2024-3-15":[{id:1,title:"처음 만난 날 💕",who:"me",color:T.rose}],"2025-3-15":[{id:2,title:"1주년 🎂",who:"partner",color:T.sky}]},
  photos:[],
  albums:[{id:"default",name:"우리의 추억"}],
  messages:[
    {id:1,from:"partner",text:"안녕 자기야 🥰",time:"10:20"},
    {id:2,from:"me",text:"안녕! 오늘도 사랑해 💕",time:"10:22"},
    {id:3,from:"partner",text:"나도~ 오늘 뭐 먹었어?",time:"10:25"},
  ],
  diaries:[
    {id:1,who:"me",date:"2025-3-20",title:"봄날의 데이트",content:"오늘 한강에서 민준이랑 산책했어. 벚꽃이 너무 예뻐서 사진을 많이 찍었다. 행복한 하루였다 🌸",mood:"🥰",sticker:"🌸"},
    {id:2,who:"partner",date:"2025-3-19",title:"오늘도 보고싶다",content:"지현이가 보내준 메시지 덕분에 힘들었던 하루가 견딜 만했어. 고마워 💕",mood:"😊",sticker:"💕"},
  ],
  missions:{completed:[],date:todayStr()},
  isPremium:false,
};

export default function App(){
  const[s,setS]=useState(INIT);
  const[tab,setTab]=useState("home");
  const[modal,setModal]=useState(null);
  const[calDate,setCalDate]=useState(new Date());
  const[selDay,setSelDay]=useState(null);
  const[chatInput,setChatInput]=useState("");
  const[diaryForm,setDiaryForm]=useState({title:"",content:"",mood:"😊",sticker:""});
  const[eventForm,setEventForm]=useState({title:"",who:"me"});
  const[diaryFilter,setDiaryFilter]=useState("all");
  const[albumForm,setAlbumForm]=useState({name:""});
  const[selAlbum,setSelAlbum]=useState("default");
  const chatEnd=useRef(null);
  const photoRef=useRef(null);
  const upd=(patch)=>setS(p=>({...p,...patch}));
  const me=s.user?USERS[s.user]:USERS.me;
  const partner=s.user==="me"?USERS.partner:USERS.me;

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[s.messages]);

  const dday=()=>Math.floor((new Date()-new Date(s.startDate))/86400000)+1;
  const calDays=()=>{
    const y=calDate.getFullYear(),m=calDate.getMonth();
    const first=new Date(y,m,1).getDay(),last=new Date(y,m+1,0).getDate();
    const arr=[];for(let i=0;i<first;i++)arr.push(null);for(let i=1;i<=last;i++)arr.push(i);return arr;
  };
  const dk=(d)=>`${calDate.getFullYear()}-${calDate.getMonth()+1}-${d}`;
  const todayDk=todayStr();

  const send=()=>{
    if(!chatInput.trim())return;
    const now=new Date(),t=`${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;
    const newMsg={id:Date.now(),from:s.user||"me",text:chatInput,time:t};
    upd({messages:[...s.messages,newMsg]});setChatInput("");
    setTimeout(()=>{
      const replies=["💕","ㅋㅋ 귀엽다","나도 사랑해 🥰","응응!","보고싶어...","😍","빨리 보자~"];
      const now2=new Date(),t2=`${now2.getHours()}:${String(now2.getMinutes()).padStart(2,"0")}`;
      setS(p=>({...p,messages:[...p.messages,{id:Date.now()+1,from:"partner",text:replies[Math.floor(Math.random()*replies.length)],time:t2}]}));
    },1200);
  };

  const addEvent=()=>{
    if(!selDay||!eventForm.title.trim())return;
    const key=dk(selDay);
    upd({events:{...s.events,[key]:[...(s.events[key]||[]),{id:Date.now(),title:eventForm.title,who:eventForm.who,color:USERS[eventForm.who].color}]}});
    setEventForm({title:"",who:"me"});setModal(null);
  };

  const addDiary=()=>{
    if(!diaryForm.content.trim())return;
    const now=new Date();
    const dateKey=selDay?dk(selDay):`${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
    upd({diaries:[{id:Date.now(),who:s.user||"me",date:dateKey,...diaryForm},...s.diaries]});
    setDiaryForm({title:"",content:"",mood:"😊",sticker:""});setModal(null);
  };

  const onPhotos=(e)=>{
    Array.from(e.target.files).forEach(file=>{
      const reader=new FileReader();
      reader.onload=(ev)=>setS(p=>({...p,photos:[{id:Date.now()+Math.random(),src:ev.target.result,date:selDay?dk(selDay):todayDk,albumId:selAlbum,who:p.user||"me"},...p.photos]}));
      reader.readAsDataURL(file);
    });
  };

  const todayMissions=[MISSIONS[new Date().getDay()%MISSIONS.length],MISSIONS[(new Date().getDay()+1)%MISSIONS.length],MISSIONS[(new Date().getDay()+2)%MISSIONS.length]];
  const missionDone=s.missions.date===todayStr()?s.missions.completed:[];
  const toggleMission=(i)=>{const cur=missionDone;const next=cur.includes(i)?cur.filter(x=>x!==i):[...cur,i];upd({missions:{completed:next,date:todayStr()}});};

  const card={background:T.white,borderRadius:20,padding:16,marginBottom:12,boxShadow:"0 1px 8px rgba(42,31,35,.06)"};
  const btnStyle=(bg=T.rose,col=T.white)=>({background:bg,color:col,border:"none",borderRadius:14,padding:"13px 20px",fontWeight:600,fontSize:15,cursor:"pointer",width:"100%"});
  const inp={width:"100%",border:`1.5px solid ${T.stoneLight}`,borderRadius:12,padding:"11px 14px",fontSize:14,color:T.ink,outline:"none",background:T.white};
  const pillStyle=(active,bg=T.rose)=>({background:active?bg:T.roseLight,color:active?T.white:T.rose,border:"none",borderRadius:20,padding:"6px 14px",fontWeight:600,fontSize:13,cursor:"pointer",flexShrink:0});

  /* ══ LOGIN ══ */
  if(!s.user)return(
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",background:`linear-gradient(170deg,${T.roseLight} 0%,${T.cream} 60%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,textAlign:"center",position:"relative",overflow:"hidden"}}>
      <style>{GS}</style>
      <div style={{position:"absolute",top:-80,right:-80,width:240,height:240,borderRadius:"50%",background:T.rose,opacity:.06}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:180,height:180,borderRadius:"50%",background:T.rose,opacity:.05}}/>
      <div className="fade-up" style={{fontSize:60,animation:"pulse 3s infinite",marginBottom:4}}>💕</div>
      <h1 className="fade-up" style={{fontFamily:"'DM Serif Display',serif",fontStyle:"italic",fontSize:40,color:T.roseDark,marginBottom:8,animationDelay:".05s"}}>우리만의 공간</h1>
      <p className="fade-up" style={{color:T.stoneMid,fontSize:14,marginBottom:40,lineHeight:1.7,animationDelay:".1s"}}>커플을 위한 특별한 일상 기록 앱</p>
      <div className="fade-up" style={{width:"100%",display:"flex",flexDirection:"column",gap:10,animationDelay:".15s"}}>
        {[{icon:"🟡",label:"카카오로 시작하기",bg:"#FEE500",col:"#191919"},{icon:"🍎",label:"Apple로 시작하기",bg:T.ink,col:T.white},{icon:"🔵",label:"Google로 시작하기",bg:T.white,col:T.ink,border:`1.5px solid ${T.stoneLight}`}].map((o,i)=>(
          <button key={i} onClick={()=>upd({user:"me"})} style={{...btnStyle(o.bg,o.col),border:o.border||"none",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:14}}>
            <span style={{fontSize:18}}>{o.icon}</span>{o.label}
          </button>
        ))}
      </div>
      <p className="fade-up" style={{marginTop:22,fontSize:11,color:T.stoneMid,lineHeight:1.6,animationDelay:".2s"}}>로그인 시 서비스 이용약관 및 개인정보처리방침에 동의합니다</p>
    </div>
  );

  const tabs=[{id:"home",icon:"🏠",label:"홈"},{id:"calendar",icon:"📅",label:"달력"},{id:"chat",icon:"💬",label:"채팅"},{id:"photos",icon:"📸",label:"사진"},{id:"diary",icon:"📖",label:"일기"}];

  return(
    <div style={{maxWidth:430,margin:"0 auto",height:"100%",background:T.rosePale,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      <style>{GS}</style>
      <input ref={photoRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={onPhotos}/>
      <div style={{flex:1,overflowY:"auto",paddingBottom:72}}>

      {/* ══ HOME ══ */}
      {tab==="home"&&(
        <div className="fade-in">
          <div style={{background:`linear-gradient(145deg,${T.rose},${T.roseDark})`,padding:"52px 20px 28px",color:T.white,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-30,right:-30,width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,.07)"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
              <div>
                <p style={{fontSize:13,opacity:.8,marginBottom:2}}>{me.avatar} 안녕하세요</p>
                <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:24,fontStyle:"italic",marginBottom:18}}>{me.name} & {partner.name}</h2>
              </div>
              <button onClick={()=>upd({user:null})} style={{background:"rgba(255,255,255,.2)",border:"none",borderRadius:10,padding:"6px 10px",color:"white",fontSize:12,cursor:"pointer"}}>로그아웃</button>
            </div>
            <div style={{background:"rgba(255,255,255,.18)",borderRadius:18,padding:"16px 20px",backdropFilter:"blur(8px)",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative"}}>
              <div><p style={{fontSize:11,opacity:.8,marginBottom:2}}>함께한 날</p><p style={{fontFamily:"'DM Serif Display',serif",fontSize:50,lineHeight:1,letterSpacing:"-2px"}}>D+{dday()}</p><p style={{fontSize:11,opacity:.7,marginTop:4}}>{s.startDate} 시작</p></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:44,animation:"pulse 3s infinite"}}>💑</div><p style={{fontSize:11,opacity:.8,marginTop:4}}>{new Date().toLocaleDateString("ko-KR",{month:"long",day:"numeric"})}</p></div>
            </div>
          </div>

          {/* Dday pills */}
          <div style={{padding:"14px 16px 0",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
            {[{l:"100일",t:100},{l:"200일",t:200},{l:"1주년",t:365},{l:"2주년",t:730}].map(a=>({...a,d:a.t-dday()+1})).filter(a=>a.d>0).map((a,i)=>(
              <div key={i} style={{background:T.white,borderRadius:12,padding:"8px 14px",boxShadow:"0 1px 6px rgba(42,31,35,.06)",flexShrink:0,textAlign:"center"}}>
                <p style={{fontSize:11,color:T.stoneMid}}>{a.l}</p><p style={{fontWeight:700,color:T.rose,fontSize:13}}>D-{a.d}</p>
              </div>
            ))}
          </div>

          {/* Mission */}
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
              {missionDone.length===3&&<p style={{textAlign:"center",marginTop:10,fontSize:13,color:T.rose,fontWeight:700}}>🎉 오늘 미션 완료! +10 코인</p>}
            </div>
          </div>

          {/* Quick menu */}
          <div style={{padding:"12px 16px 0"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[{icon:"📅",l:"달력",t:"calendar"},{icon:"💬",l:"채팅",t:"chat"},{icon:"📸",l:"사진첩",t:"photos"},{icon:"📖",l:"일기",t:"diary"}].map(m=>(
                <button key={m.t} onClick={()=>setTab(m.t)} style={{background:T.white,border:"none",borderRadius:16,padding:"14px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:6,boxShadow:"0 1px 6px rgba(42,31,35,.06)"}}>
                  <span style={{fontSize:22}}>{m.icon}</span><span style={{fontSize:11,fontWeight:600,color:T.stone}}>{m.l}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recent diary */}
          {s.diaries.length>0&&<div style={{margin:"12px 16px 0"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <p style={{fontWeight:700,fontSize:14}}>최근 일기</p>
              <button onClick={()=>setTab("diary")} style={{background:"none",border:"none",fontSize:12,color:T.rose,cursor:"pointer",fontWeight:600}}>전체보기 →</button>
            </div>
            {s.diaries.slice(0,1).map(d=>(
              <div key={d.id} style={{...card,marginBottom:0}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:16}}>{USERS[d.who].avatar}</span><span style={{fontSize:12,color:T.stoneMid,fontWeight:500}}>{USERS[d.who].name}</span></div>
                  <span style={{fontSize:16}}>{d.mood} {d.sticker}</span>
                </div>
                {d.title&&<p style={{fontWeight:700,fontSize:14,marginBottom:4}}>{d.title}</p>}
                <p style={{fontSize:13,color:T.stone,lineHeight:1.6,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{d.content}</p>
              </div>
            ))}
          </div>}

          {!s.isPremium&&<div onClick={()=>setModal("premium")} style={{margin:"12px 16px",background:`linear-gradient(135deg,${T.gold},#B8864E)`,borderRadius:20,padding:"16px 18px",color:T.white,cursor:"pointer",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",right:-8,top:-8,fontSize:56,opacity:.15}}>✨</div>
            <p style={{fontWeight:700,fontSize:14,marginBottom:3}}>✨ 프리미엄 1회 결제</p>
            <p style={{fontSize:12,opacity:.9}}>무제한 저장 · 테마 · 알림 · 스티커</p>
            <p style={{fontSize:13,fontWeight:700,marginTop:6}}>₩9,900 평생 이용 →</p>
          </div>}
        </div>
      )}

      {/* ══ CALENDAR ══ */}
      {tab==="calendar"&&(
        <div className="fade-in">
          <div style={{padding:"52px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,fontStyle:"italic"}}>달력</h1>
            <button onClick={()=>{setSelDay(null);setModal("addEvent");}} style={{...btnStyle(T.rose),width:"auto",padding:"8px 16px",fontSize:13}}>+ 일정</button>
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
                if(!day)return<div key={i}/>;
                const key=dk(day);
                const evs=s.events[key]||[];
                const dayPhoto=s.photos.find(p=>p.date===key);
                const isToday=key===todayDk;
                return(
                  <div key={i} onClick={()=>{setSelDay(day);setModal("dayDetail");}} style={{aspectRatio:"1",borderRadius:10,cursor:"pointer",position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:isToday?T.rose:"transparent",transition:"background .15s"}}>
                    {dayPhoto&&<img src={dayPhoto.src} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.5,borderRadius:10}}/>}
                    <span style={{fontSize:12,fontWeight:isToday?700:500,color:isToday?T.white:T.ink,position:"relative",zIndex:1}}>{day}</span>
                    {evs.length>0&&<div style={{display:"flex",gap:2,position:"absolute",bottom:3,zIndex:1}}>{evs.slice(0,2).map((ev,ei)=><div key={ei} style={{width:4,height:4,borderRadius:"50%",background:isToday?T.white:ev.color}}/>)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{padding:"0 16px"}}>
            <p style={{fontWeight:700,fontSize:13,color:T.stoneMid,marginBottom:10}}>이번 달 일정</p>
            {Object.entries(s.events).filter(([k])=>k.startsWith(`${calDate.getFullYear()}-${calDate.getMonth()+1}-`)).flatMap(([k,evs])=>evs.map(ev=>({...ev,dateKey:k}))).sort((a,b)=>parseInt(a.dateKey.split("-")[2])-parseInt(b.dateKey.split("-")[2])).map((ev,i)=>(
              <div key={i} style={{...card,padding:"10px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:3,height:32,borderRadius:4,background:ev.color,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <p style={{fontWeight:600,fontSize:14}}>{ev.title}</p>
                  <p style={{fontSize:11,color:T.stoneMid}}>{USERS[ev.who].avatar} {USERS[ev.who].name} · {ev.dateKey.split("-")[2]}일</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ CHAT ══ */}
      {tab==="chat"&&(
        <div className="fade-in" style={{display:"flex",flexDirection:"column",height:"calc(100vh - 72px)"}}>
          <div style={{background:T.white,padding:"50px 16px 12px",borderBottom:`1px solid ${T.stoneLight}`,display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${T.roseLight},${T.rose})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{partner.avatar}</div>
            <div><p style={{fontWeight:700,fontSize:15}}>{partner.name}</p><p style={{fontSize:12,color:T.sage}}>● 온라인</p></div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"16px 16px 0",display:"flex",flexDirection:"column",gap:10}}>
            {s.messages.map(msg=>{
              const isMe=msg.from===(s.user||"me");
              const sender=USERS[msg.from]||USERS.me;
              return(
                <div key={msg.id} style={{display:"flex",flexDirection:"column",alignItems:isMe?"flex-end":"flex-start"}}>
                  {!isMe&&<span style={{fontSize:11,color:T.stoneMid,marginBottom:3}}>{sender.avatar} {sender.name}</span>}
                  <div style={{maxWidth:"75%",padding:"10px 14px",borderRadius:18,fontSize:14,lineHeight:1.5,background:isMe?T.rose:T.white,color:isMe?T.white:T.ink,borderBottomRightRadius:isMe?4:18,borderBottomLeftRadius:isMe?18:4,boxShadow:"0 1px 4px rgba(42,31,35,.07)"}}>{msg.text}</div>
                  <span style={{fontSize:10,color:T.stoneMid,marginTop:2}}>{msg.time}</span>
                </div>
              );
            })}
            <div ref={chatEnd}/>
          </div>
          <div style={{padding:"10px 12px",background:T.white,borderTop:`1px solid ${T.stoneLight}`,display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
            <button onClick={()=>setModal("sticker")} style={{background:"none",border:"none",fontSize:22,cursor:"pointer"}}>😊</button>
            <input style={{...inp,flex:1}} placeholder="메시지 입력..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}/>
            <button onClick={send} style={{background:T.rose,border:"none",borderRadius:12,width:40,height:40,color:"white",fontSize:18,cursor:"pointer",flexShrink:0}}>↑</button>
          </div>
        </div>
      )}

      {/* ══ PHOTOS ══ */}
      {tab==="photos"&&(
        <div className="fade-in">
          <div style={{padding:"52px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,fontStyle:"italic"}}>사진첩</h1>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setModal("addAlbum")} style={{...btnStyle(T.roseLight,T.rose),width:"auto",padding:"8px 12px",fontSize:13}}>+ 폴더</button>
              <button onClick={()=>{setSelDay(null);photoRef.current?.click();}} style={{...btnStyle(T.rose),width:"auto",padding:"8px 14px",fontSize:13}}>+ 사진</button>
            </div>
          </div>
          <div style={{padding:"0 16px 10px",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none"}}>
            {s.albums.map(al=><button key={al.id} onClick={()=>setSelAlbum(al.id)} style={pillStyle(selAlbum===al.id)}>{al.name}</button>)}
          </div>
          {!s.isPremium&&<div style={{margin:"0 16px 10px",background:T.roseLight,borderRadius:14,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:18}}>📦</span>
            <div style={{flex:1}}><p style={{fontWeight:600,fontSize:13}}>무료 {s.photos.length}/50장</p><div style={{height:3,background:T.stoneLight,borderRadius:3,marginTop:4}}><div style={{height:"100%",width:`${Math.min((s.photos.length/50)*100,100)}%`,background:T.rose,borderRadius:3}}/></div></div>
            <button onClick={()=>setModal("premium")} style={{...btnStyle(T.rose),width:"auto",padding:"6px 12px",fontSize:12}}>업그레이드</button>
          </div>}
          {s.photos.filter(p=>p.albumId===selAlbum).length===0?(
            <div style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:52,marginBottom:12}}>📷</div>
              <p style={{fontWeight:700,fontSize:15,marginBottom:6}}>사진이 없어요</p>
              <p style={{color:T.stoneMid,fontSize:13,marginBottom:20}}>소중한 순간을 기록해보세요</p>
              <button onClick={()=>photoRef.current?.click()} style={{...btnStyle(),width:"auto",padding:"12px 24px"}}>사진 추가하기</button>
            </div>
          ):(
            <div style={{padding:"0 16px"}}>
              {[...new Set(s.photos.filter(p=>p.albumId===selAlbum).map(p=>p.date))].map(date=>(
                <div key={date} style={{marginBottom:16}}>
                  <p style={{fontWeight:600,fontSize:13,color:T.stone,marginBottom:8}}>{date.replace(/-/g,".")}</p>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                    {s.photos.filter(p=>p.albumId===selAlbum&&p.date===date).map(ph=>(
                      <div key={ph.id} style={{aspectRatio:"1",borderRadius:10,overflow:"hidden",position:"relative"}}>
                        <img src={ph.src} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                        <div style={{position:"absolute",bottom:4,right:4,fontSize:14}}>{USERS[ph.who]?.avatar}</div>
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
        <div className="fade-in">
          <div style={{padding:"52px 16px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <h1 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,fontStyle:"italic"}}>일기</h1>
            <button onClick={()=>{setSelDay(null);setModal("addDiary");}} style={{...btnStyle(T.rose),width:"auto",padding:"8px 16px",fontSize:13}}>+ 쓰기</button>
          </div>
          <div style={{padding:"0 16px 12px",display:"flex",gap:8}}>
            {[{id:"all",l:"전체"},{id:"me",l:`${me.avatar} 내 일기`},{id:"partner",l:`${partner.avatar} ${partner.name}`}].map(f=>(
              <button key={f.id} onClick={()=>setDiaryFilter(f.id)} style={pillStyle(diaryFilter===f.id)}>{f.l}</button>
            ))}
          </div>
          {s.diaries.filter(d=>diaryFilter==="all"||d.who===diaryFilter).length===0?(
            <div style={{textAlign:"center",padding:"60px 20px"}}>
              <div style={{fontSize:52,marginBottom:12}}>✍️</div>
              <p style={{fontWeight:700,fontSize:15,marginBottom:6}}>일기가 없어요</p>
              <button onClick={()=>setModal("addDiary")} style={{...btnStyle(),width:"auto",padding:"12px 24px",marginTop:8}}>첫 일기 쓰기</button>
            </div>
          ):(
            <div style={{padding:"0 16px"}}>
              {s.diaries.filter(d=>diaryFilter==="all"||d.who===diaryFilter).map(d=>(
                <div key={d.id} style={{...card}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{width:30,height:30,borderRadius:"50%",background:USERS[d.who].color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{USERS[d.who].avatar}</div>
                      <div><p style={{fontWeight:600,fontSize:13}}>{USERS[d.who].name}</p><p style={{fontSize:11,color:T.stoneMid}}>{d.date.replace(/-/g,".")}</p></div>
                    </div>
                    <span style={{fontSize:18}}>{d.mood} {d.sticker}</span>
                  </div>
                  {d.title&&<p style={{fontWeight:700,fontSize:15,marginBottom:6,borderLeft:`3px solid ${USERS[d.who].color}`,paddingLeft:10}}>{d.title}</p>}
                  <p style={{fontSize:13,color:T.stone,lineHeight:1.7,paddingLeft:d.title?13:0}}>{d.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </div>{/* end scroll */}

      {/* NAV */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:T.white,borderTop:`1px solid ${T.stoneLight}`,display:"flex",justifyContent:"space-around",padding:"10px 0 18px",zIndex:50,boxShadow:"0 -2px 12px rgba(42,31,35,.06)"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3,background:"none",border:"none",cursor:"pointer",padding:"4px 8px",borderRadius:12}}>
            <span style={{fontSize:22,transform:tab===t.id?"scale(1.15)":"scale(1)",transition:"transform .2s"}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:tab===t.id?T.rose:T.stoneMid}}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* MODALS */}
      {modal&&(
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(42,31,35,.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.white,borderRadius:"28px 28px 0 0",padding:24,width:"100%",maxWidth:430,maxHeight:"85vh",overflowY:"auto",animation:"fadeUp .3s ease"}}>

            {modal==="dayDetail"&&selDay&&(<>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
                <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,fontStyle:"italic"}}>{calDate.getMonth()+1}월 {selDay}일</h3>
                <button style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:T.stone}} onClick={()=>setModal(null)}>×</button>
              </div>
              <p style={{fontWeight:700,fontSize:13,color:T.stoneMid,marginBottom:8}}>📌 일정</p>
              {(s.events[dk(selDay)]||[]).map((ev,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${T.roseLight}`}}>
                  <div style={{width:3,height:24,borderRadius:4,background:ev.color}}/>
                  <div style={{flex:1}}><p style={{fontWeight:600,fontSize:13}}>{ev.title}</p><p style={{fontSize:11,color:T.stoneMid}}>{USERS[ev.who].avatar} {USERS[ev.who].name}</p></div>
                </div>
              ))}
              <div style={{display:"flex",gap:8,marginTop:10,marginBottom:18}}>
                <button onClick={()=>setModal("addEvent")} style={{...btnStyle(T.roseLight,T.rose),fontSize:13,padding:"9px"}}>+ 일정</button>
                <button onClick={()=>setModal("addDiary")} style={{...btnStyle(T.roseLight,T.rose),fontSize:13,padding:"9px"}}>✍️ 일기</button>
                <button onClick={()=>{photoRef.current?.click();setModal(null);}} style={{...btnStyle(T.roseLight,T.rose),fontSize:13,padding:"9px"}}>📸 사진</button>
              </div>
              <p style={{fontWeight:700,fontSize:13,color:T.stoneMid,marginBottom:8}}>📸 이날 사진</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
                {s.photos.filter(p=>p.date===dk(selDay)).map(p=>(
                  <div key={p.id} style={{aspectRatio:"1",borderRadius:10,overflow:"hidden"}}><img src={p.src} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/></div>
                ))}
                <div onClick={()=>{photoRef.current?.click();setModal(null);}} style={{aspectRatio:"1",borderRadius:10,background:T.roseLight,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:24,color:T.rose}}>+</div>
              </div>
            </>)}

            {modal==="addEvent"&&(<>
              <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,fontStyle:"italic",marginBottom:18}}>일정 추가</h3>
              <p style={{fontSize:12,color:T.stoneMid,marginBottom:6}}>누가 추가하나요?</p>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                {[{id:"me",label:`${me.avatar} ${me.name}`},{id:"partner",label:`${partner.avatar} ${partner.name}`}].map(u=>(
                  <button key={u.id} onClick={()=>setEventForm(f=>({...f,who:u.id}))} style={{...pillStyle(eventForm.who===u.id,USERS[u.id].color),flex:1}}>{u.label}</button>
                ))}
              </div>
              <p style={{fontSize:12,color:T.stoneMid,marginBottom:6}}>일정 제목</p>
              <input style={{...inp,marginBottom:16}} placeholder="예: 영화 데이트 🎬" value={eventForm.title} onChange={e=>setEventForm(f=>({...f,title:e.target.value}))}/>
              <button style={btnStyle()} onClick={addEvent}>추가하기</button>
            </>)}

            {modal==="addDiary"&&(<>
              <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,fontStyle:"italic",marginBottom:18}}>일기 쓰기</h3>
              <p style={{fontSize:12,color:T.stoneMid,marginBottom:8}}>오늘 기분은?</p>
              <div style={{display:"flex",gap:10,marginBottom:14}}>{["😊","🥰","😢","😠","😌","🤩"].map(m=><span key={m} onClick={()=>setDiaryForm(d=>({...d,mood:m}))} style={{fontSize:24,cursor:"pointer",opacity:diaryForm.mood===m?1:.35,transform:diaryForm.mood===m?"scale(1.2)":"scale(1)",transition:"all .2s"}}>{m}</span>)}</div>
              <input style={{...inp,marginBottom:8}} placeholder="제목 (선택)" value={diaryForm.title} onChange={e=>setDiaryForm(d=>({...d,title:e.target.value}))}/>
              <textarea style={{...inp,minHeight:110,marginBottom:10}} placeholder="오늘 어떤 하루였나요? 💕" value={diaryForm.content} onChange={e=>setDiaryForm(d=>({...d,content:e.target.value}))}/>
              <p style={{fontSize:12,color:T.stoneMid,marginBottom:8}}>스티커</p>
              <div style={{display:"flex",overflowX:"auto",gap:8,paddingBottom:8,marginBottom:14,scrollbarWidth:"none"}}>{STICKERS.map(st=><span key={st} onClick={()=>setDiaryForm(d=>({...d,sticker:st}))} style={{fontSize:24,cursor:"pointer",opacity:diaryForm.sticker===st?1:.4,flexShrink:0}}>{st}</span>)}</div>
              <button style={btnStyle()} onClick={addDiary}>저장하기</button>
            </>)}

            {modal==="addAlbum"&&(<>
              <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:22,fontStyle:"italic",marginBottom:18}}>새 폴더 만들기</h3>
              <input style={{...inp,marginBottom:16}} placeholder="폴더 이름 (예: 제주도 여행 ✈️)" value={albumForm.name} onChange={e=>setAlbumForm({name:e.target.value})}/>
              <button style={btnStyle()} onClick={()=>{if(!albumForm.name.trim())return;const a={id:Date.now().toString(),name:albumForm.name};upd({albums:[...s.albums,a]});setSelAlbum(a.id);setAlbumForm({name:""});setModal(null);}}>만들기</button>
            </>)}

            {modal==="sticker"&&(<>
              <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:20,fontStyle:"italic",marginBottom:14}}>스티커 보내기</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>{STICKERS.map(st=><span key={st} onClick={()=>{const now=new Date(),t=`${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;upd({messages:[...s.messages,{id:Date.now(),from:s.user||"me",text:st,time:t}]});setModal(null);}} style={{fontSize:30,cursor:"pointer",textAlign:"center"}}>{st}</span>)}</div>
            </>)}

            {modal==="premium"&&(<>
              <div style={{background:`linear-gradient(135deg,${T.gold},#B8864E)`,borderRadius:20,padding:20,textAlign:"center",color:T.white,marginBottom:18}}>
                <p style={{fontSize:32,marginBottom:6}}>✨</p>
                <h3 style={{fontFamily:"'DM Serif Display',serif",fontSize:24,fontStyle:"italic",marginBottom:4}}>프리미엄</h3>
                <p style={{opacity:.9,fontSize:13}}>한 번만 결제하고 평생 사용</p>
                <p style={{fontSize:30,fontWeight:700,marginTop:10}}>₩9,900</p>
                <p style={{fontSize:12,opacity:.8,marginTop:2}}>1회 결제 · 자동 갱신 없음</p>
              </div>
              {["📸 무제한 사진 저장","🎨 커플 테마 20종","🔔 기념일·일정 알림","💌 스티커 팩 전체","📖 일기 잠금 기능","🎁 선물 배달 서비스"].map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<5?`1px solid ${T.roseLight}`:""}}>
                  <span style={{fontSize:18}}>{f.split(" ")[0]}</span>
                  <span style={{fontSize:14,fontWeight:500}}>{f.split(" ").slice(1).join(" ")}</span>
                  <span style={{marginLeft:"auto",color:T.rose,fontWeight:700}}>✓</span>
                </div>
              ))}
              <button style={{...btnStyle(),marginTop:18,background:`linear-gradient(135deg,${T.gold},#B8864E)`}} onClick={()=>{upd({isPremium:true});setModal(null);}}>₩9,900 결제하기</button>
              <p style={{textAlign:"center",fontSize:11,color:T.stoneMid,marginTop:8}}>결제 후 즉시 모든 기능 해제</p>
            </>)}

          </div>
        </div>
      )}
    </div>
  );
}
