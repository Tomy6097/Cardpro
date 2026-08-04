import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || '/api';

const EventWebsite = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const [event, setEvent] = useState(null);
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rsvpDone, setRsvpDone] = useState(false);
  const [rsvpDeclined, setRsvpDeclined] = useState(false);
  const [timeLeft, setTimeLeft] = useState({});
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    // Fetch settings for company logo/name
    fetch(`${API}/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.settings) setSettings(d.settings); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const url = code ? `${API}/public/event/${slug}/invitation?code=${code}` : `${API}/public/event/${slug}`;
    fetch(url).then(r=>r.json()).then(d=>{ if(d.success){setEvent(d.event);setGuest(d.guest||null);}else setError(d.message||'Not found'); }).catch(()=>setError('Failed to load')).finally(()=>setLoading(false));
  }, [slug, code]);

  useEffect(() => {
    if (!event?.date) return;
    const calc = () => {
      const diff = new Date(event.date) - new Date();
      if (diff <= 0) { setTimeLeft({ done: true }); return; }
      setTimeLeft({ days: Math.floor(diff/86400000), hours: Math.floor((diff/3600000)%24), minutes: Math.floor((diff/60000)%60), seconds: Math.floor((diff/1000)%60) });
    };
    calc(); const t = setInterval(calc, 1000); return () => clearInterval(t);
  }, [event?.date]);

  const confirm = async () => { try { const r = await fetch(`${API}/rsvp/confirm/${code}`,{method:'POST'}); const d = await r.json(); if(d.success) setRsvpDone(true); } catch {} };
  const decline = async () => { try { const r = await fetch(`${API}/rsvp/decline/${code}`,{method:'POST'}); const d = await r.json(); if(d.success) setRsvpDeclined(true); } catch {} };
  const fmtDate = d => { try { return new Date(d).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); } catch { return d; } };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#1A0A00',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{display:'flex',gap:'8px',justifyContent:'center',marginBottom:'16px'}}>
          {[0,1,2].map(i=><div key={i} style={{width:'10px',height:'10px',borderRadius:'50%',background:'#C9A84C',animation:`dot 1.2s ${i*.2}s ease-in-out infinite`}}/>)}
        </div>
        <p style={{color:'rgba(255,255,255,0.5)',fontFamily:'sans-serif',fontSize:'14px'}}>Loading...</p>
        <style>{`@keyframes dot{0%,80%,100%{opacity:.3;transform:scale(1)}40%{opacity:1;transform:scale(1.3)}}`}</style>
      </div>
    </div>
  );

  if (error||!event) return (
    <div style={{minHeight:'100vh',background:'#1A0A00',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{textAlign:'center',color:'white',fontFamily:'sans-serif'}}>
        <p style={{fontSize:'48px',marginBottom:'16px'}}>⚠️</p>
        <h2>Event Not Found</h2>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:'14px'}}>{error}</p>
      </div>
    </div>
  );

  const th = event.websiteTheme || {};
  const pc = th.primaryColor || '#C9A84C';
  const bg = th.bgColor || '#1A0A00';
  const ac = th.accentColor || '#FFFFFF';
  const fontMap = { serif:'Georgia,serif', 'sans-serif':'Inter,sans-serif', elegant:"'Palatino Linotype',serif" };
  const ff = fontMap[th.fontStyle] || 'Georgia,serif';
  const photos = event.eventPhotos || [];
  const dressImages = event.dressCodeImages || [];

  return (
    <div style={{minHeight:'100vh',background:bg,fontFamily:ff}}>
      <style>{`
        @keyframes scrollBounce { 0%,100%{transform:translateX(-50%) translateY(0);opacity:.7} 50%{transform:translateX(-50%) translateY(8px);opacity:1} }
        @keyframes dot{0%,80%,100%{opacity:.3;transform:scale(1)}40%{opacity:1;transform:scale(1.3)}}
      `}</style>

      {/* ── HERO PHOTOS — full screen width ── */}
      {photos.length > 0 && (
        <div style={{position:'relative',width:'100%'}}>
          {photos.length === 1 ? (
            <div style={{position:'relative',width:'100%',overflow:'hidden',background:bg}}>
              <img
                src={photos[0].url}
                alt={photos[0].caption||'Event'}
                style={{
                  width:'100%',
                  maxHeight:'95vh',
                  objectFit:'contain',
                  objectPosition:'center top',
                  display:'block',
                }}
              />
              <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom, transparent 70%, ${bg} 100%)`,pointerEvents:'none'}}/>
              {photos[0].caption&&(
                <div style={{position:'absolute',bottom:'80px',left:0,right:0,textAlign:'center'}}>
                  <p style={{color:'white',fontSize:'13px',margin:0,letterSpacing:'3px',textTransform:'uppercase',textShadow:'0 2px 8px rgba(0,0,0,0.8)'}}>{photos[0].caption}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',background:bg}}>
              {photos.slice(0,2).map((p,i)=>(
                <div key={p._id||i} style={{position:'relative',overflow:'hidden'}}>
                  <img src={p.url} alt={p.caption||'Event'} style={{width:'100%',maxHeight:'95vh',objectFit:'contain',objectPosition:'center top',display:'block'}}/>
                  <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom,transparent 70%,${bg})`}}/>
                  {p.caption&&<div style={{position:'absolute',bottom:'70px',left:0,right:0,textAlign:'center'}}>
                    <p style={{color:'white',fontSize:'12px',margin:0,letterSpacing:'2px',textTransform:'uppercase',textShadow:'0 2px 6px rgba(0,0,0,0.8)'}}>{p.caption}</p>
                  </div>}
                </div>
              ))}
            </div>
          )}
          {/* Scroll Down Arrow */}
          <div style={{position:'absolute',bottom:'20px',left:'50%',transform:'translateX(-50%)',textAlign:'center',animation:'scrollBounce 2s ease-in-out infinite',zIndex:10}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}}>
              <p style={{color:'white',fontSize:'11px',letterSpacing:'2px',textTransform:'uppercase',margin:'0 0 4px',textShadow:'0 2px 4px rgba(0,0,0,0.8)'}}>Scroll</p>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" style={{filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.8))'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{filter:'drop-shadow(0 2px 6px rgba(0,0,0,0.8))',marginTop:'-8px',opacity:.6}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{maxWidth:'680px',margin:'0 auto',padding:`${photos.length>0?'0':'32px'} 20px 60px`}}>
        {/* Branding */}
        <div style={{textAlign:'center',margin:'28px 0 24px'}}>
          {settings?.logo?.url ? (
            <img
              src={settings.logo.url}
              alt={settings.companyName || 'Cardpro'}
              style={{height:'40px',width:'auto',objectFit:'contain',display:'inline-block',filter:'brightness(0) invert(1)',opacity:0.7}}
            />
          ) : (
            <p style={{fontSize:'11px',letterSpacing:'3px',color:pc+'80',textTransform:'uppercase',margin:0,fontFamily:ff}}>
              {settings?.companyName || 'Cardpro'} Invitation
            </p>
          )}
        </div>

        {/* Guest Card */}
        {guest?.cardUrl&&(
          <div style={{marginBottom:'20px',borderRadius:'16px',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.6)'}}>
            <img src={guest.cardUrl} alt="Your invitation card" style={{width:'100%',display:'block'}}/>
          </div>
        )}

        {/* Main Card */}
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:'20px',border:`1px solid ${pc}33`,overflow:'hidden',marginBottom:'16px'}}>
          <div style={{height:'3px',background:`linear-gradient(90deg,transparent,${pc},transparent)`}}/>
          <div style={{padding:'28px 22px'}}>
            {guest&&(
              <div style={{textAlign:'center',marginBottom:'20px'}}>
                <p style={{color:`${ac}55`,fontSize:'12px',letterSpacing:'2px',textTransform:'uppercase',margin:'0 0 6px'}}>Dear</p>
                <h2 style={{fontFamily:ff,fontSize:'28px',color:pc,margin:'0 0 8px'}}>{guest.guestName}</h2>
                <span style={{display:'inline-block',padding:'3px 14px',borderRadius:'20px',background:`${pc}22`,border:`1px solid ${pc}44`,fontSize:'12px',color:pc,fontWeight:600,letterSpacing:'1px'}}>
                  {guest.ticketType?.toUpperCase()} TICKET
                </span>
              </div>
            )}
            <div style={{display:'flex',alignItems:'center',gap:'10px',margin:'16px 0'}}>
              <div style={{flex:1,height:'1px',background:`${pc}44`}}/><span style={{color:pc,fontSize:'16px'}}>✦</span><div style={{flex:1,height:'1px',background:`${pc}44`}}/>
            </div>
            <p style={{textAlign:'center',color:`${ac}55`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 8px'}}>You Are Invited To</p>
            <h1 style={{fontFamily:ff,fontSize:'26px',color:ac,textAlign:'center',margin:'0 0 4px'}}>{event.name}</h1>
            <p style={{textAlign:'center',color:`${ac}66`,fontSize:'14px',margin:'0 0 22px'}}>by {event.clientName}</p>
            {[
              {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, text:`${fmtDate(event.date)}${event.time?` at ${event.time}`:''}`},
              {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>, text:event.venue},
              event.dressCode&&{icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>, text:`Dress Code: ${event.dressCode}`},
            ].filter(Boolean).map((item,i)=>(
              <div key={i} style={{display:'flex',gap:'12px',padding:'11px 13px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',marginBottom:'8px',border:`1px solid ${ac}11`}}>
                <span style={{fontSize:'16px'}}>{item.icon}</span>
                <span style={{color:`${ac}cc`,fontSize:'14px'}}>{item.text}</span>
              </div>
            ))}
            {event.date&&!timeLeft.done&&(
              <div style={{margin:'20px 0'}}>
                <p style={{textAlign:'center',color:`${ac}44`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'14px'}}>Countdown</p>
                <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
                  {[['days','Days'],['hours','Hrs'],['minutes','Min'],['seconds','Sec']].map(([k,l])=>(
                    <div key={k} style={{textAlign:'center'}}>
                      <div style={{background:`${pc}18`,border:`1px solid ${pc}44`,borderRadius:'10px',padding:'10px 10px 8px',fontFamily:ff,fontSize:'28px',fontWeight:700,color:pc,lineHeight:1,minWidth:'52px'}}>
                        {String(timeLeft[k]??0).padStart(2,'0')}
                      </div>
                      <div style={{fontSize:'10px',color:`${ac}55`,marginTop:'4px',textTransform:'uppercase'}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {timeLeft.done&&<p style={{textAlign:'center',color:pc,fontWeight:700,fontSize:'16px',margin:'20px 0'}}>The event is happening now!</p>}
            {guest&&code&&!rsvpDone&&!rsvpDeclined&&guest.rsvpStatus!=='confirmed'&&(
              <div style={{marginTop:'20px',display:'flex',flexDirection:'column',gap:'10px'}}>
                <button onClick={confirm} style={{padding:'15px',background:`linear-gradient(135deg,${pc},${pc}bb)`,color:bg,border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:ff}}>
                  Confirm My Attendance
                </button>
                <button onClick={decline} style={{padding:'11px',background:'transparent',color:`${ac}55`,border:`1px solid ${ac}22`,borderRadius:'10px',fontSize:'13px',cursor:'pointer'}}>
                  Unable to Attend
                </button>
              </div>
            )}
            {(rsvpDone||guest?.rsvpStatus==='confirmed')&&(
              <div style={{marginTop:'20px',padding:'18px',background:'rgba(45,106,79,0.2)',borderRadius:'12px',textAlign:'center',border:'1px solid rgba(45,106,79,0.4)'}}>
                <p style={{fontSize:'28px',margin:'0 0 6px'}}>✓</p>
                <p style={{color:'#86EFAC',fontWeight:700,fontSize:'16px',margin:'0 0 4px'}}>Attendance Confirmed</p>
                <p style={{color:`${ac}66`,fontSize:'13px',margin:0}}>We look forward to seeing you!</p>
              </div>
            )}
            {rsvpDeclined&&(
              <div style={{marginTop:'16px',padding:'16px',background:'rgba(196,75,75,0.15)',borderRadius:'12px',textAlign:'center',border:'1px solid rgba(196,75,75,0.3)'}}>
                <p style={{color:'#FCA5A5',fontSize:'14px',margin:0}}>Thank you for letting us know!</p>
              </div>
            )}
            {event.googleMapsUrl&&(
              <a href={event.googleMapsUrl} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginTop:'16px',padding:'11px',borderRadius:'10px',background:'rgba(255,255,255,0.05)',border:`1px solid ${ac}11`,color:`${ac}66`,textDecoration:'none',fontSize:'13px'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                View on Google Maps
              </a>
            )}
          </div>
          <div style={{height:'3px',background:`linear-gradient(90deg,transparent,${pc},transparent)`}}/>
        </div>

        {/* Dress Code */}
        {(dressImages.length>0 || (event.dressCodeColors||[]).length>0) &&(
          <div style={{marginBottom:'16px',background:'rgba(255,255,255,0.04)',borderRadius:'16px',border:`1px solid ${ac}11`,overflow:'hidden'}}>
            <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${ac}11`,display:'flex',alignItems:'center',gap:'8px'}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2">
                <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
              </svg>
              <div>
                <p style={{color:`${ac}88`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',margin:0}}>Dress Code</p>
                {event.dressCode&&<p style={{color:pc,fontSize:'14px',fontWeight:600,margin:'2px 0 0'}}>{event.dressCode}</p>}
              </div>
            </div>

            {/* Color palette */}
            {(event.dressCodeColors||[]).length>0&&(
              <div style={{padding:'14px 18px',borderBottom:dressImages.length>0?`1px solid ${ac}11`:'none'}}>
                <p style={{color:`${ac}55`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'1px',margin:'0 0 10px'}}>Color Palette</p>
                <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                  {event.dressCodeColors.map((c,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'8px',padding:'6px 14px 6px 8px',background:'rgba(255,255,255,0.06)',borderRadius:'24px',border:`1px solid ${ac}15`}}>
                      <div style={{width:'24px',height:'24px',borderRadius:'50%',background:c.hex,border:'2px solid rgba(255,255,255,0.2)',flexShrink:0,boxShadow:`0 2px 8px ${c.hex}66`}}/>
                      <span style={{color:`${ac}cc`,fontSize:'13px',fontWeight:500,fontFamily:ff}}>{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dress code images */}
            {dressImages.length>0&&(
              <div style={{padding:'14px 18px'}}>
                <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(dressImages.length,3)},1fr)`,gap:'10px'}}>
                  {dressImages.map((img,i)=>(
                    <div key={img._id||i} style={{borderRadius:'10px',overflow:'hidden',border:`1px solid ${ac}11`}}>
                      <img src={img.url} alt={img.caption||'Dress'} style={{width:'100%',aspectRatio:'3/4',objectFit:'cover',display:'block'}}/>
                      {(img.caption||img.gender!=='general')&&(
                        <div style={{padding:'6px 8px',background:`${bg}cc`}}>
                          <p style={{color:pc,fontSize:'11px',margin:0,textAlign:'center',fontWeight:600}}>
                            {img.gender==='female'?'Ladies':img.gender==='male'?'Gentlemen':''}{img.caption?` — ${img.caption}`:''}
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

        {/* Video */}
        {event.invitationVideo?.url&&(
          <div style={{borderRadius:'16px',overflow:'hidden',border:`1px solid ${pc}22`,marginBottom:'16px'}}>
            <div style={{padding:'10px 16px',borderBottom:`1px solid ${ac}11`}}>
              <p style={{color:`${ac}55`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',margin:0}}>Event Preview</p>
            </div>
            <video
              controls
              style={{width:'100%',display:'block',background:'#000',maxHeight:'70vh',objectFit:'contain'}}
              playsInline
            >
              <source src={event.invitationVideo.url}/>
            </video>
          </div>
        )}

        {event.description&&(
          <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'14px',padding:'18px',border:`1px solid ${ac}0a`,marginBottom:'16px'}}>
            <p style={{color:`${ac}99`,fontSize:'14px',lineHeight:1.8,margin:0}}>{event.description}</p>
          </div>
        )}

        <p style={{textAlign:'center',color:`${ac}33`,fontSize:'11px',marginTop:'32px'}}>
          Powered by {settings?.companyName || 'Cardpro'}
        </p>
      </div>
    </div>
  );
};

export default EventWebsite;
