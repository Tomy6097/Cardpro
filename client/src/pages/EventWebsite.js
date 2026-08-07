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
  const [envelopeOpen, setEnvelopeOpen] = useState(false);

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
        @keyframes slideDown { from {transform:translateY(-100%)} to {transform:translateY(0)} }
        @keyframes fadeIn { from {opacity:0} to {opacity:1} }
      `}</style>

      {/* ── HERO PHOTOS — vertical stack, one by one ── */}
      {photos.length > 0 && (
        <div style={{position:'relative',width:'100%'}}>
          {photos.map((p,i)=>(
            <div key={p._id||i} style={{position:'relative',width:'100%',overflow:'hidden',background:bg,marginBottom:i<photos.length-1?'0':'0'}}>
              <img
                src={p.url}
                alt={p.caption||'Event'}
                style={{
                  width:'100%',
                  maxHeight:'95vh',
                  objectFit:'contain',
                  objectPosition:'center top',
                  display:'block',
                }}
              />
              <div style={{position:'absolute',inset:0,background:`linear-gradient(to bottom, transparent 70%, ${bg} 100%)`,pointerEvents:'none'}}/>
              {p.caption&&(
                <div style={{position:'absolute',bottom:'80px',left:0,right:0,textAlign:'center'}}>
                  <p style={{color:'white',fontSize:'13px',margin:0,letterSpacing:'3px',textTransform:'uppercase',textShadow:'0 2px 8px rgba(0,0,0,0.8)'}}>{p.caption}</p>
                </div>
              )}
            </div>
          ))}
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

        {/* Guest Card with Envelope Animation */}
        {guest?.cardUrl&&(
          <div style={{marginBottom:'20px',perspective:'1200px'}}>
            {!envelopeOpen ? (
              // Envelope (closed)
              <div 
                onClick={()=>setEnvelopeOpen(true)}
                style={{
                  position:'relative',
                  maxWidth:'420px',
                  margin:'0 auto',
                  cursor:'pointer',
                  transformStyle:'preserve-3d',
                  transition:'transform 0.3s ease',
                }}
                onMouseEnter={e=>e.currentTarget.style.transform='translateY(-8px)'}
                onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
              >
                {/* Envelope body */}
                <div style={{
                  background:`linear-gradient(135deg, ${pc}dd, ${pc}bb)`,
                  borderRadius:'12px',
                  padding:'28px 24px',
                  boxShadow:'0 12px 40px rgba(0,0,0,0.5)',
                  border:`2px solid ${pc}`,
                  textAlign:'center',
                  position:'relative',
                  overflow:'hidden',
                }}>
                  {/* Decorative stamp */}
                  <div style={{position:'absolute',top:'12px',right:'12px',width:'48px',height:'48px',borderRadius:'4px',border:`2px dashed ${bg}88`,display:'flex',alignItems:'center',justifyContent:'center',background:`${bg}22`}}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={bg} strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  
                  {/* Seal/Badge */}
                  <div style={{
                    width:'80px',
                    height:'80px',
                    borderRadius:'50%',
                    background:`linear-gradient(135deg, ${bg}, ${bg}cc)`,
                    border:`3px solid ${ac}`,
                    margin:'0 auto 16px',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    boxShadow:'0 4px 16px rgba(0,0,0,0.4)',
                  }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
                    </svg>
                  </div>

                  <h3 style={{fontFamily:ff,fontSize:'20px',fontWeight:700,color:bg,margin:'0 0 8px',letterSpacing:'1px'}}>
                    Mwaliko Maalum
                  </h3>
                  <p style={{color:`${bg}cc`,fontSize:'14px',margin:'0 0 20px',lineHeight:1.6}}>
                    Karibu {guest.guestName},<br/>
                    Bofya kubuka na kuona mwaliko wako
                  </p>

                  {/* Animated shine effect */}
                  <div style={{position:'absolute',top:0,left:'-100%',width:'100%',height:'100%',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)',animation:'shine 3s infinite',pointerEvents:'none'}}/>
                  <style>{`@keyframes shine{0%{left:-100%}50%{left:100%}100%{left:100%}}`}</style>

                  {/* Click indicator */}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',color:bg,fontSize:'13px',fontWeight:600,animation:'pulse 2s ease-in-out infinite'}}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={bg} stroke={bg} strokeWidth="2">
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                    </svg>
                    Bonyeza Hapa
                  </div>
                  <style>{`@keyframes pulse{0%,100%{opacity:.7;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}`}</style>
                </div>

                {/* Envelope flap shadow */}
                <div style={{
                  position:'absolute',
                  top:'-2px',
                  left:'50%',
                  transform:'translateX(-50%)',
                  width:'0',
                  height:'0',
                  borderLeft:'210px solid transparent',
                  borderRight:'210px solid transparent',
                  borderTop:`60px solid ${pc}aa`,
                  filter:'blur(2px)',
                  opacity:0.6,
                }}/>
              </div>
            ) : (
              // Card revealed with animation
              <div style={{animation:'fadeIn 0.8s ease'}}>
                <div style={{borderRadius:'16px',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.6)',marginBottom:'16px',animation:'slideDown 0.6s ease-out'}}>
                  <img src={guest.cardUrl} alt="Mwaliko wako" style={{width:'100%',display:'block'}}/>
                </div>
                
                {/* Download button */}
                <div style={{textAlign:'center'}}>
                  <button
                    onClick={async()=>{
                      try{
                        const r=await fetch(guest.cardUrl);
                        const blob=await r.blob();
                        const url=URL.createObjectURL(blob);
                        const a=document.createElement('a');
                        a.href=url;a.download=`${guest.guestName.replace(/\s+/g,'_')}_mwaliko.jpg`;
                        document.body.appendChild(a);a.click();document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }catch{window.open(guest.cardUrl,'_blank');}
                    }}
                    style={{
                      display:'inline-flex',
                      alignItems:'center',
                      gap:'10px',
                      padding:'14px 28px',
                      background:`linear-gradient(135deg, ${pc}, ${pc}cc)`,
                      color:bg,
                      border:'none',
                      borderRadius:'12px',
                      fontSize:'15px',
                      fontWeight:700,
                      cursor:'pointer',
                      fontFamily:ff,
                      boxShadow:'0 6px 20px rgba(0,0,0,0.3)',
                      transition:'all 0.3s ease',
                    }}
                    onMouseEnter={e=>{e.target.style.transform='translateY(-2px)';e.target.style.boxShadow='0 8px 30px rgba(0,0,0,0.4)';}}
                    onMouseLeave={e=>{e.target.style.transform='translateY(0)';e.target.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)';}}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    Pakua Mwaliko
                  </button>
                </div>
              </div>
            )}
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
            <p style={{textAlign:'center',color:`${ac}55`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 8px'}}>Umealikwa Kwenye</p>
            <h1 style={{fontFamily:ff,fontSize:'26px',color:ac,textAlign:'center',margin:'0 0 4px'}}>{event.name}</h1>
            <p style={{textAlign:'center',color:`${ac}66`,fontSize:'14px',margin:'0 0 22px'}}>na {event.clientName}</p>
            {[
              {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>, text:`${fmtDate(event.date)}${event.time?` at ${event.time}`:''}`},
              {icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>, text:event.venue},
              event.dressCode&&{icon:<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={pc} strokeWidth="2"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>, text:`Mavazi: ${event.dressCode}`},
            ].filter(Boolean).map((item,i)=>(
              <div key={i} style={{display:'flex',gap:'12px',padding:'11px 13px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',marginBottom:'8px',border:`1px solid ${ac}11`}}>
                <span style={{fontSize:'16px'}}>{item.icon}</span>
                <span style={{color:`${ac}cc`,fontSize:'14px'}}>{item.text}</span>
              </div>
            ))}
            {event.date&&!timeLeft.done&&(
              <div style={{margin:'20px 0'}}>
                <p style={{textAlign:'center',color:`${ac}44`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'14px'}}>Muda Uliosalia</p>
                <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
                  {[['days','Siku'],['hours','Saa'],['minutes','Dakika'],['seconds','Sekunde']].map(([k,l])=>(
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
            {timeLeft.done&&<p style={{textAlign:'center',color:pc,fontWeight:700,fontSize:'16px',margin:'20px 0'}}>Sherehe inaendelea sasa!</p>}
            {guest&&code&&!rsvpDone&&!rsvpDeclined&&guest.rsvpStatus!=='confirmed'&&(
              <div style={{marginTop:'20px',display:'flex',flexDirection:'column',gap:'10px'}}>
                <button onClick={confirm} style={{padding:'15px',background:`linear-gradient(135deg,${pc},${pc}bb)`,color:bg,border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:700,cursor:'pointer',fontFamily:ff}}>
                  Thibitisha Mahudhurio Yangu
                </button>
                <button onClick={decline} style={{padding:'11px',background:'transparent',color:`${ac}55`,border:`1px solid ${ac}22`,borderRadius:'10px',fontSize:'13px',cursor:'pointer'}}>
                  Sitaweza Kuhudhuria
                </button>
              </div>
            )}
            {(rsvpDone||guest?.rsvpStatus==='confirmed')&&(
              <div style={{marginTop:'20px',padding:'18px',background:'rgba(45,106,79,0.2)',borderRadius:'12px',textAlign:'center',border:'1px solid rgba(45,106,79,0.4)'}}>
                <p style={{fontSize:'28px',margin:'0 0 6px'}}>✓</p>
                <p style={{color:'#86EFAC',fontWeight:700,fontSize:'16px',margin:'0 0 4px'}}>Mahudhurio Yamethibitishwa</p>
                <p style={{color:`${ac}66`,fontSize:'13px',margin:0}}>Tunatarajia kukuona!</p>
              </div>
            )}
            {rsvpDeclined&&(
              <div style={{marginTop:'16px',padding:'16px',background:'rgba(196,75,75,0.15)',borderRadius:'12px',textAlign:'center',border:'1px solid rgba(196,75,75,0.3)'}}>
                <p style={{color:'#FCA5A5',fontSize:'14px',margin:0}}>Asante kwa kutujulisha!</p>
              </div>
            )}
            {event.googleMapsUrl&&(
              <a href={event.googleMapsUrl} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginTop:'16px',padding:'11px',borderRadius:'10px',background:'rgba(255,255,255,0.05)',border:`1px solid ${ac}11`,color:`${ac}66`,textDecoration:'none',fontSize:'13px'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Angalia Mahali kwenye Ramani
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
                <p style={{color:`${ac}88`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',margin:0}}>Mavazi</p>
                {event.dressCode&&<p style={{color:pc,fontSize:'14px',fontWeight:600,margin:'2px 0 0'}}>{event.dressCode}</p>}
              </div>
            </div>

            {/* Color palette */}
            {(event.dressCodeColors||[]).length>0&&(
              <div style={{padding:'14px 18px',borderBottom:dressImages.length>0?`1px solid ${ac}11`:'none'}}>
                <p style={{color:`${ac}55`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'1px',margin:'0 0 10px'}}>Rangi Zinazopendekezwa</p>
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
                            {img.gender==='female'?'Wanawake':img.gender==='male'?'Wanaume':''}{img.caption?` — ${img.caption}`:''}
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
              <p style={{color:`${ac}55`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',margin:0}}>Muhtasari wa Sherehe</p>
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
          Imetolewa na {settings?.companyName || 'Cardpro'}
        </p>
      </div>
    </div>
  );
};

export default EventWebsite;
