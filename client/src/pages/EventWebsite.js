import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || '/api';

// ── Translations ──────────────────────────────────────────────
const T = {
  sw: {
    loading: 'Inapakia...', notFound: 'Tukio Halipatikani',
    dear: 'Mpendwa', invitedTo: 'Umealikwa Kwenye', by: 'na',
    date: 'Tarehe', venue: 'Mahali', dressCode: 'Mavazi',
    countdown: 'Muda Uliosalia', days: 'Siku', hours: 'Saa', mins: 'Dakika', secs: 'Sekunde',
    happeningNow: 'Sherehe inaendelea sasa!',
    confirmBtn: 'Thibitisha Mahudhurio Yangu', declineBtn: 'Sitaweza Kuhudhuria',
    confirmed: 'Mahudhurio Yamethibitishwa', confirmedSub: 'Tunatarajia kukuona!',
    declined: 'Asante kwa kutujulisha!',
    declineFormTitle: 'Pole kwa kutoweza kuhudhuria',
    declineFormHint: 'Tafadhali tueleza sababu ya kutokuwepo (si lazima)',
    declineReasonPlaceholder: 'Mfano: Nitakuwa safarini, nina ugonjwa, kuna harusi nyingine...',
    declineConfirmBtn: 'Tuma na thibitisha kutokuwepo',
    cancelBtn: 'Rudi Nyuma',
    mapsBtn: 'Angalia Mahali kwenye Ramani',
    dressSection: 'Mavazi', colorPalette: 'Rangi Zinazopendekezwa',
    ladies: 'Wanawake', gents: 'Wanaume',
    videoSection: 'Muhtasari wa Sherehe',
    envelopeTitle: 'Mwaliko Maalum', envelopeHint: 'Bonyeza Kuona kadi yako ya mwaliko',
    openBtn: 'Bonyeza Hapa', closeEnv: 'Funga', downloadCard: 'Pakua Mwaliko',
    poweredBy: 'Imetolewa na', ticket: 'TIKETI', scroll: 'Tazama',
  },
  en: {
    loading: 'Loading...', notFound: 'Event Not Found',
    dear: 'Dear', invitedTo: 'You Are Invited To', by: 'by',
    date: 'Date', venue: 'Venue', dressCode: 'Dress Code',
    countdown: 'Countdown', days: 'Days', hours: 'Hrs', mins: 'Min', secs: 'Sec',
    happeningNow: 'The event is happening now!',
    confirmBtn: 'Confirm My Attendance', declineBtn: 'Unable to Attend',
    confirmed: 'Attendance Confirmed', confirmedSub: 'We look forward to seeing you!',
    declined: 'Thank you for letting us know!',
    declineFormTitle: 'Sorry you cannot make it',
    declineFormHint: 'Please let us know the reason for your absence (optional)',
    declineReasonPlaceholder: 'e.g. I will be traveling, I have another commitment...',
    declineConfirmBtn: 'Submit & Confirm Absence',
    cancelBtn: 'Go Back',
    mapsBtn: 'View on Google Maps',
    dressSection: 'Dress Code', colorPalette: 'Color Palette',
    ladies: 'Ladies', gents: 'Gentlemen',
    videoSection: 'Event Preview',
    envelopeTitle: 'Special Invitation', envelopeHint: 'Click to open your invitation',
    openBtn: 'Click Here', closeEnv: 'Close', downloadCard: 'Download Card',
    poweredBy: 'Powered by', ticket: 'TICKET', scroll: 'Scroll',
  },
};

// ── CSS Keyframes ─────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Cormorant+Garamond:wght@300;400;600&family=Inter:wght@300;400;500;600&display=swap');
  @keyframes fadeUp   { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes bounce   { 0%,100%{transform:translateX(-50%) translateY(0);opacity:.6} 50%{transform:translateX(-50%) translateY(10px);opacity:1} }
  @keyframes dot      { 0%,80%,100%{opacity:.3;transform:scale(1)} 40%{opacity:1;transform:scale(1.4)} }
  @keyframes pulse    { 0%,100%{transform:scale(1);opacity:.8} 50%{transform:scale(1.06);opacity:1} }
  @keyframes glow     { 0%,100%{box-shadow:0 0 20px rgba(201,168,76,0.3)} 50%{box-shadow:0 0 40px rgba(201,168,76,0.7)} }
  @keyframes flapOpen {
    0%   { transform: perspective(800px) rotateX(0deg);   }
    100% { transform: perspective(800px) rotateX(-180deg); }
  }
  @keyframes cardReveal {
    0%   { opacity:0; transform:translateY(-40px) scale(0.92); }
    100% { opacity:1; transform:translateY(0)     scale(1);    }
  }
  @keyframes shine {
    0%   { left:-120%; }
    60%  { left:120%;  }
    100% { left:120%;  }
  }
  .env-hover:hover { transform:translateY(-6px) scale(1.01) !important; }
  .btn-gold:hover  { filter:brightness(1.12); transform:translateY(-2px); }
  .lang-btn        { background:transparent; border:none; cursor:pointer; font-size:12px; font-weight:600; letter-spacing:1px; padding:5px 10px; border-radius:20px; transition:all .2s; }
  .lang-btn.active { background:rgba(201,168,76,0.25); color:#C9A84C; }
`;

// ── Envelope Component ────────────────────────────────────────
const Envelope = ({ guest, pc, bg, ff, t, onDownload }) => {
  const [phase, setPhase] = useState('closed'); // closed | opening | open
  const firstInitial = (guest?.guestName || 'G')[0].toUpperCase();

  const open = () => {
    if (phase !== 'closed') return;
    setPhase('opening');
    setTimeout(() => setPhase('open'), 900);
  };
  const close = () => setPhase('closed');

  const goldGrad = `linear-gradient(135deg, #b8860b 0%, #d4a017 25%, #C9A84C 50%, #e8c84e 65%, #C9A84C 80%, #a07810 100%)`;
  const darkGold  = '#8B6914';
  const lightGold = '#e8d08a';

  if (phase === 'open') return (
    <div style={{animation:'cardReveal .7s ease both'}}>
      {/* Card — full width, no black bars */}
      <div style={{borderRadius:'16px',overflow:'hidden',boxShadow:'0 24px 64px rgba(0,0,0,0.7)',marginBottom:'20px',border:`1px solid ${pc}44`,maxWidth:'100%'}}>
        <img src={guest.cardUrl} alt="Card" style={{width:'100%',height:'auto',display:'block'}}/>
      </div>
      {/* Actions */}
      <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
        <button onClick={onDownload} className="btn-gold" style={{
          display:'inline-flex',alignItems:'center',gap:'10px',
          padding:'13px 28px',background:goldGrad,color:'#3a1f00',
          border:'none',borderRadius:'12px',fontSize:'14px',fontWeight:700,
          cursor:'pointer',fontFamily:ff,transition:'all .25s',
          boxShadow:'0 6px 24px rgba(0,0,0,0.35)',
        }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          {t.downloadCard}
        </button>
        <button onClick={close} style={{
          display:'inline-flex',alignItems:'center',gap:'8px',
          padding:'13px 20px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.55)',
          border:'1px solid rgba(255,255,255,0.15)',borderRadius:'12px',fontSize:'13px',
          cursor:'pointer',fontFamily:ff,transition:'all .25s',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
          {t.closeEnv}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{perspective:'1000px',marginBottom:'24px'}}>
      {/* Wrapper for hover lift */}
      <div
        className={phase==='closed'?'env-hover':''}
        onClick={phase==='closed'?open:undefined}
        style={{
          position:'relative',maxWidth:'400px',margin:'0 auto',
          cursor:phase==='closed'?'pointer':'default',
          transition:'transform .3s ease',
        }}
      >
        {/* ── ENVELOPE BODY ── */}
        <div style={{
          position:'relative',
          borderRadius:'8px',
          overflow:'hidden',
          background:goldGrad,
          boxShadow:'0 16px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2)',
          border:`1px solid ${lightGold}`,
          minHeight:'260px',
        }}>

          {/* Bottom-left / bottom-right triangle folds */}
          <div style={{position:'absolute',bottom:0,left:0,width:0,height:0,
            borderLeft:'200px solid transparent',borderBottom:`120px solid ${darkGold}99`,pointerEvents:'none'}}/>
          <div style={{position:'absolute',bottom:0,right:0,width:0,height:0,
            borderRight:'200px solid transparent',borderBottom:`120px solid ${darkGold}99`,pointerEvents:'none'}}/>

          {/* Center bottom V-fold */}
          <div style={{position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:0,height:0,
            borderLeft:'200px solid transparent',borderRight:'200px solid transparent',
            borderBottom:`120px solid ${darkGold}bb`,pointerEvents:'none'}}/>

          {/* ── TOP FLAP ── */}
          <div style={{
            position:'absolute',top:0,left:0,right:0,
            height:'160px',
            transformOrigin:'top center',
            transformStyle:'preserve-3d',
            animation: phase==='opening' ? 'flapOpen .85s cubic-bezier(.4,0,.2,1) forwards' : 'none',
            zIndex: phase==='opening' ? 10 : 2,
          }}>
            {/* Flap triangle */}
            <div style={{
              position:'absolute',top:0,left:0,right:0,
              width:'100%',height:'160px',
              clipPath:'polygon(0 0, 100% 0, 50% 100%)',
              background:`linear-gradient(180deg, #c9a84c 0%, #a07030 100%)`,
              boxShadow:'0 4px 12px rgba(0,0,0,0.3)',
            }}/>
          </div>

          {/* ── CONTENT (visible on top of body) ── */}
          <div style={{position:'relative',zIndex:3,padding:'90px 28px 36px',textAlign:'center'}}>

            {/* Guest name */}
            <p style={{color:lightGold,fontSize:'11px',letterSpacing:'3px',textTransform:'uppercase',margin:'0 0 6px',fontFamily:ff,opacity:.8}}>{t.dear}</p>
            <h3 style={{fontFamily:ff,fontSize:'22px',fontWeight:700,color:'#fff',margin:'0 0 18px',letterSpacing:'1px',textShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>
              {guest.guestName}
            </h3>

            {/* Wax seal */}
            <div style={{
              width:'72px',height:'72px',borderRadius:'50%',
              background:`radial-gradient(circle at 35% 35%, #e8c84e, #a07030 60%, #7a5010)`,
              border:`3px solid ${lightGold}`,
              margin:'0 auto 18px',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:`0 4px 16px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.2)`,
              animation:'glow 3s ease-in-out infinite',
              position:'relative',
            }}>
              {/* Decorative ring */}
              <div style={{position:'absolute',inset:'6px',borderRadius:'50%',border:`1px solid ${lightGold}66`}}/>
              <span style={{fontFamily:'serif',fontSize:'26px',fontWeight:900,color:'#fff',textShadow:'0 2px 6px rgba(0,0,0,0.5)',lineHeight:1}}>
                {firstInitial}
              </span>
            </div>

            {/* Hint text */}
            <p style={{color:`rgba(255,255,255,0.6)`,fontSize:'13px',margin:'0 0 16px',fontFamily:ff}}>
              {t.envelopeHint}
            </p>

            {/* Open button */}
            {phase==='closed' && (
              <div style={{
                display:'inline-flex',alignItems:'center',gap:'8px',
                padding:'10px 24px',
                background:'rgba(255,255,255,0.15)',
                border:`1px solid rgba(255,255,255,0.3)`,
                borderRadius:'30px',color:'#fff',fontSize:'13px',fontWeight:600,
                letterSpacing:'1px',textTransform:'uppercase',
                animation:'pulse 2.5s ease-in-out infinite',
                backdropFilter:'blur(4px)',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="8" width="18" height="14" rx="2"/>
                  <path d="M3 10l9 6 9-6"/>
                </svg>
                {t.openBtn}
              </div>
            )}

            {phase==='opening' && (
              <p style={{color:'rgba(255,255,255,0.5)',fontSize:'12px',letterSpacing:'2px',textTransform:'uppercase',fontFamily:ff}}>
                Opening...
              </p>
            )}

            {/* Shine sweep */}
            <div style={{position:'absolute',top:0,bottom:0,width:'60px',
              background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent)',
              animation:'shine 4s 1s infinite',pointerEvents:'none',left:0}}/>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────
const EventWebsite = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  const [event,   setEvent]   = useState(null);
  const [guest,   setGuest]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [rsvpDone,     setRsvpDone]     = useState(false);
  const [rsvpDeclined, setRsvpDeclined] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [timeLeft, setTimeLeft] = useState({});
  const [settings, setSettings] = useState(null);
  const [lang,    setLang]    = useState('sw'); // 'sw' | 'en'
  const heroRef = useRef(null);

  const t = T[lang];

  useEffect(() => {
    // Use public settings endpoint — no auth required
    fetch(`${API}/public/settings`).then(r=>r.ok?r.json():null)
      .then(d=>{ if(d?.settings) setSettings(d.settings); }).catch(()=>{});
  }, []);

  useEffect(() => {
    const url = code
      ? `${API}/public/event/${slug}/invitation?code=${code}`
      : `${API}/public/event/${slug}`;
    fetch(url).then(r=>r.json())
      .then(d=>{ if(d.success){setEvent(d.event);setGuest(d.guest||null);}else setError(d.message||'Not found'); })
      .catch(()=>setError('Failed to load')).finally(()=>setLoading(false));
  }, [slug, code]);

  useEffect(() => {
    if (!event?.date) return;
    const calc = () => {
      const diff = new Date(event.date) - new Date();
      if (diff <= 0) { setTimeLeft({done:true}); return; }
      setTimeLeft({
        days:    Math.floor(diff/86400000),
        hours:   Math.floor((diff/3600000)%24),
        minutes: Math.floor((diff/60000)%60),
        seconds: Math.floor((diff/1000)%60),
      });
    };
    calc();
    const ti = setInterval(calc, 1000);
    return () => clearInterval(ti);
  }, [event?.date]);

  const confirmRSVP = async () => {
    try {
      const r = await fetch(`${API}/rsvp/confirm/${code}`,{method:'POST'});
      const d = await r.json();
      if(d.success) setRsvpDone(true);
    } catch {}
  };
  const declineRSVP = async () => {
    try {
      const r = await fetch(`${API}/rsvp/decline/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      });
      const d = await r.json();
      if (d.success) { setRsvpDeclined(true); setShowDeclineForm(false); }
    } catch {}
  };

  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString(lang==='sw'?'sw-TZ':'en-US',
        {weekday:'long',year:'numeric',month:'long',day:'numeric'});
    } catch { return d; }
  };

  const handleDownload = async () => {
    if (!guest?.cardUrl) return;
    try {
      const r = await fetch(guest.cardUrl);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(guest.guestName||'card').replace(/\s+/g,'_')}_invitation.jpg`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { window.open(guest.cardUrl,'_blank'); }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{minHeight:'100vh',background:'#0d0500',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{display:'flex',gap:'8px',justifyContent:'center',marginBottom:'16px'}}>
          {[0,1,2].map(i=><div key={i} style={{width:'10px',height:'10px',borderRadius:'50%',background:'#C9A84C',animation:`dot 1.2s ${i*.2}s ease-in-out infinite`}}/>)}
        </div>
        <p style={{color:'rgba(255,255,255,0.4)',fontFamily:'Inter,sans-serif',fontSize:'14px',letterSpacing:'2px',textTransform:'uppercase'}}>
          {t.loading}
        </p>
        <style>{STYLES}</style>
      </div>
    </div>
  );

  if (error||!event) return (
    <div style={{minHeight:'100vh',background:'#0d0500',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <style>{STYLES}</style>
      <div style={{textAlign:'center',color:'white',fontFamily:'sans-serif'}}>
        <h2 style={{color:'#C9A84C'}}>{t.notFound}</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:'14px'}}>{error}</p>
      </div>
    </div>
  );

  // ── Theme ────────────────────────────────────────────────────
  const th  = event.websiteTheme || {};
  const pc  = th.primaryColor || '#C9A84C';
  const bg  = th.bgColor      || '#0d0500';
  const ac  = th.accentColor  || '#FFFFFF';
  const fontMap = { serif:'Georgia,serif','sans-serif':'Inter,sans-serif',elegant:"'Cormorant Garamond',Georgia,serif",playfair:"'Playfair Display',Georgia,serif" };
  const ff  = fontMap[th.fontStyle] || "'Cormorant Garamond',Georgia,serif";
  const photos      = event.eventPhotos      || [];
  const dressImages = event.dressCodeImages  || [];

  return (
    <div style={{minHeight:'100vh',background:bg,fontFamily:ff,overflowX:'hidden'}}>
      <style>{STYLES}</style>

      {/* ── LANGUAGE SWITCHER ── fixed top-right */}
      <div style={{
        position:'fixed',top:'14px',right:'16px',zIndex:1000,
        background:'rgba(0,0,0,0.55)',backdropFilter:'blur(12px)',
        borderRadius:'30px',border:`1px solid ${pc}44`,
        padding:'3px 4px',display:'flex',gap:'2px',
      }}>
        {['sw','en'].map(l=>(
          <button key={l} onClick={()=>setLang(l)}
            className={`lang-btn${lang===l?' active':''}`}
            style={{
              color: lang===l ? pc : 'rgba(255,255,255,0.45)',
              background: lang===l ? `${pc}22` : 'transparent',
            }}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── HERO PHOTOS — full screen, one by one, vertical ── */}
      {photos.length > 0 && (
        <div ref={heroRef} style={{position:'relative',width:'100%',background:bg}}>
          {photos.map((p,i)=>(
            <div key={p._id||i} style={{position:'relative',width:'100%',background:'#000'}}>
              <img
                src={p.url}
                alt={p.caption||event.name}
                style={{
                  width:'100%',
                  display:'block',
                  objectFit:'contain',
                  objectPosition:'center center',
                  background:'#000',
                }}
              />
              {/* Gradient fade bottom */}
              <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom,rgba(0,0,0,0) 55%,${bg} 100%)`,pointerEvents:'none'}}/>
              {/* Caption */}
              {p.caption && (
                <div style={{position:'absolute',bottom:'60px',left:0,right:0,textAlign:'center',padding:'0 20px'}}>
                  <span style={{
                    display:'inline-block',
                    background:'rgba(0,0,0,0.55)',
                    backdropFilter:'blur(8px)',
                    color:'white',
                    fontSize:'13px',letterSpacing:'3px',textTransform:'uppercase',
                    padding:'8px 20px',borderRadius:'30px',
                    border:'1px solid rgba(255,255,255,0.2)',
                    textShadow:'0 2px 8px rgba(0,0,0,0.8)',
                  }}>{p.caption}</span>
                </div>
              )}
            </div>
          ))}
          {/* Scroll arrow - only on last photo */}
          <div style={{position:'absolute',bottom:'18px',left:'50%',animation:'bounce 2s ease-in-out infinite',zIndex:10}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
              <p style={{color:'rgba(255,255,255,0.6)',fontSize:'10px',letterSpacing:'3px',textTransform:'uppercase',margin:'0 0 4px'}}>
                {t.scroll}
              </p>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.9))'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT AREA ── */}
      <div style={{maxWidth:'780px',margin:'0 auto',padding:`${photos.length?'0':'60px'} 20px 80px`}}>

        {/* Logo / branding */}
        <div style={{textAlign:'center',padding:'36px 0 28px',animation:'fadeUp .8s .2s both'}}>
          {settings?.logo?.url ? (
            <img src={settings.logo.url} alt={settings.companyName||'Cardpro'}
              style={{height:'38px',width:'auto',objectFit:'contain',filter:'brightness(0) invert(1)',opacity:.65}}/>
          ) : (
            <p style={{fontSize:'10px',letterSpacing:'4px',color:`${pc}66`,textTransform:'uppercase',margin:0,fontFamily:'Inter,sans-serif'}}>
              {settings?.companyName||'Cardpro'}
            </p>
          )}
        </div>

        {/* ── ENVELOPE / CARD ── */}
        {guest?.cardUrl && (
          <div style={{animation:'fadeUp .8s .3s both'}}>
            <Envelope guest={guest} pc={pc} bg={bg} ff={ff} t={t} onDownload={handleDownload}/>
          </div>
        )}

        {/* ── INVITATION CARD ── */}
        <div style={{background:'rgba(255,255,255,0.04)',borderRadius:'24px',border:`1px solid ${pc}28`,overflow:'hidden',marginBottom:'20px',animation:'fadeUp .8s .4s both'}}>
          <div style={{height:'2px',background:`linear-gradient(90deg,transparent,${pc},transparent)`}}/>

          <div style={{padding:'32px 24px'}}>
            {/* Guest greeting */}
            {guest && (
              <div style={{textAlign:'center',marginBottom:'28px'}}>
                <p style={{color:`${ac}44`,fontSize:'11px',letterSpacing:'3px',textTransform:'uppercase',margin:'0 0 8px',fontFamily:'Inter,sans-serif'}}>
                  {t.dear}
                </p>
                <h2 style={{fontFamily:ff,fontSize:'30px',fontWeight:700,color:pc,margin:'0 0 10px',letterSpacing:'1px'}}>
                  {guest.guestName}
                </h2>
                <span style={{
                  display:'inline-block',padding:'4px 18px',borderRadius:'30px',
                  background:`${pc}18`,border:`1px solid ${pc}44`,
                  fontSize:'11px',color:pc,fontWeight:600,letterSpacing:'2px',
                  fontFamily:'Inter,sans-serif',
                }}>
                  {guest.ticketType?.toUpperCase()} {t.ticket}
                </span>
              </div>
            )}

            {/* Divider */}
            <div style={{display:'flex',alignItems:'center',gap:'12px',margin:'0 0 24px'}}>
              <div style={{flex:1,height:'1px',background:`linear-gradient(to right,transparent,${pc}55)`}}/>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={pc} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <div style={{flex:1,height:'1px',background:`linear-gradient(to left,transparent,${pc}55)`}}/>
            </div>

            {/* Invited to */}
            <p style={{textAlign:'center',color:`${ac}44`,fontSize:'10px',textTransform:'uppercase',letterSpacing:'3px',margin:'0 0 10px',fontFamily:'Inter,sans-serif'}}>
              {t.invitedTo}
            </p>
            <h1 style={{fontFamily:ff,fontSize:'28px',fontWeight:700,color:ac,textAlign:'center',margin:'0 0 6px',lineHeight:1.2}}>
              {event.name}
            </h1>
            <p style={{textAlign:'center',color:`${ac}55`,fontSize:'14px',margin:'0 0 28px',fontFamily:'Inter,sans-serif'}}>
              {t.by} {event.clientName}
            </p>

            {/* Event details */}
            {[
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
                label: t.date, text: `${fmtDate(event.date)}${event.time ? ` · ${event.time}` : ''}` },
              { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                label: t.venue, text: event.venue },
              event.dressCode && { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>,
                label: t.dressCode, text: event.dressCode },
            ].filter(Boolean).map((item,i)=>(
              <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'14px',padding:'13px 16px',background:'rgba(255,255,255,0.03)',borderRadius:'12px',marginBottom:'10px',border:`1px solid ${ac}0d`}}>
                <div style={{marginTop:'1px',flexShrink:0}}>{item.icon}</div>
                <div>
                  <p style={{color:`${ac}44`,fontSize:'10px',letterSpacing:'2px',textTransform:'uppercase',margin:'0 0 2px',fontFamily:'Inter,sans-serif'}}>{item.label}</p>
                  <p style={{color:`${ac}cc`,fontSize:'14px',margin:0,lineHeight:1.4}}>{item.text}</p>
                </div>
              </div>
            ))}

            {/* Countdown */}
            {event.date && !timeLeft.done && (
              <div style={{margin:'28px 0'}}>
                <p style={{textAlign:'center',color:`${ac}33`,fontSize:'10px',textTransform:'uppercase',letterSpacing:'3px',marginBottom:'16px',fontFamily:'Inter,sans-serif'}}>
                  {t.countdown}
                </p>
                <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
                  {[
                    [timeLeft.days,    t.days],
                    [timeLeft.hours,   t.hours],
                    [timeLeft.minutes, t.mins],
                    [timeLeft.seconds, t.secs],
                  ].map(([v,l],i)=>(
                    <div key={i} style={{textAlign:'center',flex:1,maxWidth:'72px'}}>
                      <div style={{
                        background:`${pc}14`,border:`1px solid ${pc}44`,borderRadius:'12px',
                        padding:'12px 6px 10px',
                        fontFamily:ff,fontSize:'26px',fontWeight:700,color:pc,lineHeight:1,
                      }}>
                        {String(v??0).padStart(2,'0')}
                      </div>
                      <div style={{fontSize:'9px',color:`${ac}44`,marginTop:'5px',textTransform:'uppercase',letterSpacing:'1px',fontFamily:'Inter,sans-serif'}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {timeLeft.done && (
              <p style={{textAlign:'center',color:pc,fontWeight:700,fontSize:'16px',margin:'28px 0',fontFamily:ff}}>
                {t.happeningNow}
              </p>
            )}

            {/* RSVP buttons */}
            {guest && code && !rsvpDone && !rsvpDeclined && guest.rsvpStatus !== 'confirmed' && (
              <div style={{marginTop:'24px'}}>
                {event.rsvpDeadline && new Date() > new Date(event.rsvpDeadline) ? (
                  /* Deadline passed */
                  <div style={{padding:'16px',background:'rgba(127,29,29,0.15)',borderRadius:'12px',textAlign:'center',border:'1px solid rgba(239,68,68,0.3)'}}>
                    <p style={{color:'#fca5a5',fontWeight:600,fontSize:'14px',margin:'0 0 4px',fontFamily:ff}}>Muda wa Kuthibitisha Umepita</p>
                    <p style={{color:`${ac}44`,fontSize:'12px',margin:0,fontFamily:'Inter,sans-serif'}}>
                      Tarehe ya mwisho ilikuwa: {new Date(event.rsvpDeadline).toLocaleDateString(lang==='sw'?'sw-TZ':'en-US', {day:'numeric',month:'long',year:'numeric'})}
                    </p>
                  </div>
                ) : !showDeclineForm ? (
                  /* Normal RSVP buttons */
                  <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
                    <button onClick={confirmRSVP} className="btn-gold" style={{
                      padding:'16px',
                      background:`linear-gradient(135deg, ${pc}cc, ${pc}, ${pc}dd)`,
                      color: bg, border:'none',borderRadius:'14px',
                      fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:ff,
                      transition:'all .25s',boxShadow:`0 6px 24px ${pc}44`,
                    }}>
                      {t.confirmBtn}
                    </button>
                    <button onClick={() => setShowDeclineForm(true)} style={{
                      padding:'12px',background:'transparent',color:`${ac}44`,
                      border:`1px solid ${ac}18`,borderRadius:'12px',
                      fontSize:'13px',cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'all .25s',
                    }}>
                      {t.declineBtn}
                    </button>
                  </div>
                ) : (
                  /* Decline form with reason */
                  <div style={{background:'rgba(127,29,29,0.12)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'16px',padding:'20px',animation:'fadeIn .3s ease'}}>
                    <p style={{color:'#fca5a5',fontSize:'15px',fontWeight:600,margin:'0 0 6px',fontFamily:ff}}>{t.declineFormTitle}</p>
                    <p style={{color:`${ac}44`,fontSize:'12px',margin:'0 0 14px',fontFamily:'Inter,sans-serif'}}>{t.declineFormHint}</p>
                    <textarea
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)}
                      placeholder={t.declineReasonPlaceholder}
                      rows={3}
                      style={{width:'100%',padding:'12px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:'10px',color:'white',fontSize:'14px',fontFamily:'Inter,sans-serif',outline:'none',resize:'vertical',boxSizing:'border-box',marginBottom:'14px',lineHeight:1.6}}
                      onFocus={e=>e.target.style.borderColor='rgba(239,68,68,0.6)'}
                      onBlur={e=>e.target.style.borderColor='rgba(239,68,68,0.3)'}
                    />
                    <div style={{display:'flex',gap:'10px'}}>
                      <button onClick={declineRSVP} style={{flex:1,padding:'13px',background:'rgba(220,38,38,0.75)',color:'white',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:600,cursor:'pointer',fontFamily:ff,transition:'all .25s'}}>
                        {t.declineConfirmBtn}
                      </button>
                      <button onClick={() => { setShowDeclineForm(false); setDeclineReason(''); }} style={{padding:'13px 18px',background:'transparent',color:`${ac}44`,border:`1px solid ${ac}15`,borderRadius:'10px',fontSize:'13px',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                        {t.cancelBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Confirmed */}
            {(rsvpDone || guest?.rsvpStatus === 'confirmed') && (
              <div style={{marginTop:'24px',padding:'20px',background:'rgba(22,101,52,0.2)',borderRadius:'16px',textAlign:'center',border:'1px solid rgba(22,101,52,0.4)',animation:'fadeIn .5s'}}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" style={{margin:'0 0 8px'}}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <p style={{color:'#4ade80',fontWeight:700,fontSize:'16px',margin:'0 0 4px',fontFamily:ff}}>{t.confirmed}</p>
                <p style={{color:`${ac}55`,fontSize:'13px',margin:0,fontFamily:'Inter,sans-serif'}}>{t.confirmedSub}</p>
              </div>
            )}

            {/* Declined */}
            {rsvpDeclined && (
              <div style={{marginTop:'20px',padding:'20px',background:'rgba(127,29,29,0.2)',borderRadius:'14px',textAlign:'center',border:'1px solid rgba(127,29,29,0.4)',animation:'fadeIn .5s'}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2" style={{margin:'0 0 8px'}}>
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <p style={{color:'#fca5a5',fontWeight:700,fontSize:'15px',margin:'0 0 4px',fontFamily:ff}}>{t.declined}</p>
                {declineReason && (
                  <p style={{color:`${ac}44`,fontSize:'12px',margin:'8px 0 0',fontFamily:'Inter,sans-serif',fontStyle:'italic',lineHeight:1.5}}>
                    "{declineReason}"
                  </p>
                )}
              </div>
            )}

            {/* Google Maps */}
            {event.googleMapsUrl && (
              <a href={event.googleMapsUrl} target="_blank" rel="noreferrer" style={{
                display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',
                marginTop:'20px',padding:'13px',borderRadius:'12px',
                background:'rgba(255,255,255,0.04)',border:`1px solid ${ac}0f`,
                color:`${ac}55`,textDecoration:'none',fontSize:'13px',
                fontFamily:'Inter,sans-serif',transition:'all .25s',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                {t.mapsBtn}
              </a>
            )}
          </div>
          <div style={{height:'2px',background:`linear-gradient(90deg,transparent,${pc},transparent)`}}/>
        </div>

        {/* ── DRESS CODE ── */}
        {(dressImages.length > 0 || (event.dressCodeColors||[]).length > 0) && (
          <div style={{marginBottom:'20px',background:'rgba(255,255,255,0.03)',borderRadius:'20px',border:`1px solid ${ac}0d`,overflow:'hidden',animation:'fadeUp .8s .5s both'}}>
            <div style={{padding:'16px 20px',borderBottom:`1px solid ${ac}0d`,display:'flex',alignItems:'center',gap:'10px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2">
                <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
              </svg>
              <div>
                <p style={{color:`${ac}44`,fontSize:'10px',textTransform:'uppercase',letterSpacing:'3px',margin:0,fontFamily:'Inter,sans-serif'}}>{t.dressSection}</p>
                {event.dressCode && <p style={{color:pc,fontSize:'15px',fontWeight:600,margin:'2px 0 0',fontFamily:ff}}>{event.dressCode}</p>}
              </div>
            </div>

            {(event.dressCodeColors||[]).length > 0 && (
              <div style={{padding:'16px 20px',borderBottom:dressImages.length>0?`1px solid ${ac}0d`:'none'}}>
                <p style={{color:`${ac}33`,fontSize:'10px',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 12px',fontFamily:'Inter,sans-serif'}}>{t.colorPalette}</p>
                <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                  {event.dressCodeColors.map((c,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 14px 6px 8px',background:'rgba(255,255,255,0.05)',borderRadius:'30px',border:`1px solid ${ac}10`}}>
                      <div style={{width:'22px',height:'22px',borderRadius:'50%',background:c.hex,border:'2px solid rgba(255,255,255,0.2)',boxShadow:`0 2px 10px ${c.hex}55`}}/>
                      <span style={{color:`${ac}bb`,fontSize:'13px',fontFamily:ff}}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {dressImages.length > 0 && (
              <div style={{padding:'16px 20px'}}>
                <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                  {dressImages.map((img,i)=>(
                    <div key={img._id||i} style={{borderRadius:'14px',overflow:'hidden',border:`1px solid ${ac}0f`,boxShadow:'0 8px 24px rgba(0,0,0,0.35)'}}>
                      <img src={img.url} alt={img.caption||'Dress'} style={{width:'100%',display:'block',objectFit:'contain',background:'#000'}}/>
                      {(img.caption || img.gender !== 'general') && (
                        <div style={{padding:'10px 14px',background:`${bg}ee`,borderTop:`1px solid ${ac}0f`}}>
                          <p style={{color:pc,fontSize:'13px',margin:0,textAlign:'center',fontWeight:600,letterSpacing:'1px',fontFamily:ff}}>
                            {img.gender==='female'?t.ladies:img.gender==='male'?t.gents:''}
                            {img.caption ? ` — ${img.caption}` : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VIDEO ── */}
        {event.invitationVideo?.url && (
          <div style={{borderRadius:'20px',overflow:'hidden',border:`1px solid ${pc}22`,marginBottom:'20px',animation:'fadeUp .8s .6s both'}}>
            <div style={{padding:'12px 18px',borderBottom:`1px solid ${ac}0d`,display:'flex',alignItems:'center',gap:'10px'}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
              </svg>
              <div>
                <p style={{color:`${ac}44`,fontSize:'10px',textTransform:'uppercase',letterSpacing:'3px',margin:0,fontFamily:'Inter,sans-serif'}}>{t.videoSection}</p>
                {event.invitationVideo.caption && (
                  <p style={{color:`${ac}88`,fontSize:'13px',margin:'2px 0 0',fontFamily:ff}}>{event.invitationVideo.caption}</p>
                )}
              </div>
            </div>
            <video controls playsInline style={{width:'100%',display:'block',background:'#000',aspectRatio:'16/9',objectFit:'contain'}}>
              <source src={event.invitationVideo.url}/>
            </video>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div style={{background:'rgba(255,255,255,0.02)',borderRadius:'16px',padding:'20px',border:`1px solid ${ac}08`,marginBottom:'20px',animation:'fadeUp .8s .7s both'}}>
            <p style={{color:`${ac}88`,fontSize:'15px',lineHeight:1.9,margin:0,fontFamily:ff}}>{event.description}</p>
          </div>
        )}

        {/* Footer */}
        <p style={{textAlign:'center',color:`${ac}22`,fontSize:'11px',marginTop:'40px',letterSpacing:'3px',textTransform:'uppercase',fontFamily:'Inter,sans-serif'}}>
          {t.poweredBy} {settings?.companyName||'Cardpro'}
        </p>

        {/* Contact footer */}
        {(settings?.contactPhone || settings?.contactEmail) && (
          <div style={{marginTop:'16px',padding:'16px 20px',background:'rgba(255,255,255,0.04)',borderRadius:'12px',border:`1px solid ${ac}0d`,textAlign:'center'}}>
            <p style={{color:`${ac}33`,fontSize:'10px',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 10px',fontFamily:'Inter,sans-serif'}}>
              {lang==='sw' ? 'Wasiliana Nasi' : 'Contact Us'}
            </p>
            <div style={{display:'flex',justifyContent:'center',gap:'20px',flexWrap:'wrap'}}>
              {settings?.contactPhone && (
                <a href={`tel:${settings.contactPhone}`} style={{display:'inline-flex',alignItems:'center',gap:'7px',color:`${ac}66`,textDecoration:'none',fontSize:'13px',fontFamily:'Inter,sans-serif'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .91h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                  {settings.contactPhone}
                </a>
              )}
              {settings?.contactEmail && (
                <a href={`mailto:${settings.contactEmail}`} style={{display:'inline-flex',alignItems:'center',gap:'7px',color:`${ac}66`,textDecoration:'none',fontSize:'13px',fontFamily:'Inter,sans-serif'}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  {settings.contactEmail}
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventWebsite;
