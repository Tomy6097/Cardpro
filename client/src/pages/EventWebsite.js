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

  useEffect(() => {
    const url = code
      ? `${API}/public/event/${slug}/invitation?code=${code}`
      : `${API}/public/event/${slug}`;
    fetch(url)
      .then(r => r.json())
      .then(d => { if (d.success) { setEvent(d.event); setGuest(d.guest || null); } else setError(d.message); })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [slug, code]);

  useEffect(() => {
    if (!event?.date) return;
    const calc = () => {
      const diff = new Date(event.date) - new Date();
      if (diff <= 0) { setTimeLeft({ done: true }); return; }
      setTimeLeft({ days: Math.floor(diff/86400000), hours: Math.floor((diff/3600000)%24), minutes: Math.floor((diff/60000)%60), seconds: Math.floor((diff/1000)%60) });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [event?.date]);

  const confirm = async () => {
    const r = await fetch(`${API}/rsvp/confirm/${code}`, { method: 'POST' });
    const d = await r.json();
    if (d.success) setRsvpDone(true);
  };
  const decline = async () => {
    const r = await fetch(`${API}/rsvp/decline/${code}`, { method: 'POST' });
    const d = await r.json();
    if (d.success) setRsvpDeclined(true);
  };
  const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); } catch { return d; } };

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#1A0A00',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{display:'flex',gap:'8px',justifyContent:'center',marginBottom:'16px'}}>
          {[0,1,2].map(i=><div key={i} style={{width:'10px',height:'10px',borderRadius:'50%',background:'#C9A84C',animation:`dot 1.2s ${i*.2}s ease-in-out infinite`}}/>)}
        </div>
        <p style={{color:'rgba(255,255,255,0.5)',fontFamily:'sans-serif',fontSize:'14px'}}>Loading invitation...</p>
        <style>{`@keyframes dot{0%,80%,100%{opacity:.3;transform:scale(1)}40%{opacity:1;transform:scale(1.3)}}`}</style>
      </div>
    </div>
  );

  if (error||!event) return (
    <div style={{minHeight:'100vh',background:'#1A0A00',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}>
      <div style={{textAlign:'center',color:'white',fontFamily:'sans-serif'}}>
        <p style={{fontSize:'48px',marginBottom:'16px'}}>⚠️</p>
        <h2 style={{marginBottom:'8px'}}>Event Not Found</h2>
        <p style={{color:'rgba(255,255,255,0.5)',fontSize:'14px'}}>{error||'Invalid link.'}</p>
      </div>
    </div>
  );

  // Theme
  const th = event.websiteTheme || {};
  const pc = th.primaryColor || '#C9A84C';
  const bg = th.bgColor || '#1A0A00';
  const ac = th.accentColor || '#FFFFFF';
  const fontMap = { serif:'Georgia,serif', 'sans-serif':'Inter,sans-serif', elegant:"'Palatino Linotype',serif" };
  const ff = fontMap[th.fontStyle] || 'Georgia,serif';

  const dressImages = event.dressCodeImages || [];
  const eventPhotos = event.eventPhotos || [];

  return (
    <div style={{minHeight:'100vh',background:`linear-gradient(160deg,${bg},${bg}cc,${bg})`,fontFamily:ff}}>
      <div style={{maxWidth:'540px',margin:'0 auto',padding:'32px 16px 60px'}}>

        {/* Branding */}
        <p style={{textAlign:'center',fontSize:'11px',letterSpacing:'3px',color:pc+'80',textTransform:'uppercase',marginBottom:'24px'}}>Cardpro Invitation</p>

        {/* Guest Card */}
        {guest?.cardUrl && (
          <div style={{marginBottom:'20px',borderRadius:'16px',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.6)'}}>
            <img src={guest.cardUrl} alt="Your invitation card" style={{width:'100%',display:'block'}}/>
          </div>
        )}

        {/* Event Photos Gallery (above main card) */}
        {eventPhotos.length > 0 && (
          <div style={{marginBottom:'20px'}}>
            <div style={{display:'grid',gridTemplateColumns:eventPhotos.length===1?'1fr':eventPhotos.length===2?'1fr 1fr':'1fr 1fr',gap:'8px',borderRadius:'16px',overflow:'hidden'}}>
              {eventPhotos.slice(0,4).map((p,i)=>(
                <div key={p._id||i} style={{position:'relative',aspectRatio:eventPhotos.length===1?'16/9':'4/3',overflow:'hidden',borderRadius:'8px'}}>
                  <img src={p.url} alt={p.caption||'Event'} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  {p.caption&&<div style={{position:'absolute',bottom:0,left:0,right:0,padding:'6px 8px',background:'linear-gradient(transparent,rgba(0,0,0,0.7))'}}>
                    <p style={{color:'white',fontSize:'11px',margin:0,textAlign:'center'}}>{p.caption}</p>
                  </div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Invitation Card */}
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:'20px',border:`1px solid ${pc}33`,overflow:'hidden',marginBottom:'16px',backdropFilter:'blur(10px)'}}>
          <div style={{height:'3px',background:`linear-gradient(90deg,transparent,${pc},transparent)`}}/>
          <div style={{padding:'28px 22px'}}>

            {/* Guest greeting */}
            {guest&&(
              <div style={{textAlign:'center',marginBottom:'20px'}}>
                <p style={{color:`${ac}55`,fontSize:'12px',letterSpacing:'2px',textTransform:'uppercase',margin:'0 0 6px'}}>Dear</p>
                <h2 style={{fontFamily:ff,fontSize:'28px',color:pc,margin:'0 0 8px'}}>{guest.guestName}</h2>
                <span style={{display:'inline-block',padding:'3px 14px',borderRadius:'20px',background:`${pc}22`,border:`1px solid ${pc}44`,fontSize:'12px',color:pc,fontWeight:600,letterSpacing:'1px'}}>
                  {guest.ticketType?.toUpperCase()} TICKET
                </span>
              </div>
            )}

            {/* Divider */}
            <div style={{display:'flex',alignItems:'center',gap:'10px',margin:'16px 0'}}>
              <div style={{flex:1,height:'1px',background:`${pc}44`}}/>
              <span style={{color:pc,fontSize:'16px'}}>✦</span>
              <div style={{flex:1,height:'1px',background:`${pc}44`}}/>
            </div>

            <p style={{textAlign:'center',color:`${ac}55`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',margin:'0 0 8px'}}>You Are Invited To</p>
            <h1 style={{fontFamily:ff,fontSize:'26px',color:ac,textAlign:'center',margin:'0 0 4px'}}>{event.name}</h1>
            <p style={{textAlign:'center',color:`${ac}66`,fontSize:'14px',margin:'0 0 22px'}}>by {event.clientName}</p>

            {/* Details */}
            {[
              {icon:'📅', text:`${fmtDate(event.date)}${event.time?` at ${event.time}`:''}` },
              {icon:'📍', text:event.venue},
              event.dressCode&&{icon:'👔', text:`Dress Code: ${event.dressCode}`},
            ].filter(Boolean).map((item,i)=>(
              <div key={i} style={{display:'flex',gap:'12px',padding:'11px 13px',background:'rgba(255,255,255,0.04)',borderRadius:'10px',marginBottom:'8px',border:`1px solid ${ac}11`}}>
                <span style={{fontSize:'16px'}}>{item.icon}</span>
                <span style={{color:`${ac}cc`,fontSize:'14px'}}>{item.text}</span>
              </div>
            ))}

            {/* Countdown */}
            {event.date&&!timeLeft.done&&(
              <div style={{margin:'20px 0'}}>
                <p style={{textAlign:'center',color:`${ac}44`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',marginBottom:'14px'}}>Event Countdown</p>
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

            {/* RSVP */}
            {guest&&code&&!rsvpDone&&!rsvpDeclined&&guest.rsvpStatus!=='confirmed'&&(
              <div style={{marginTop:'20px',display:'flex',flexDirection:'column',gap:'10px'}}>
                <button onClick={confirm} style={{padding:'15px',background:`linear-gradient(135deg,${pc},${pc}bb)`,color:bg,border:'none',borderRadius:'12px',fontSize:'15px',fontWeight:700,cursor:'pointer',letterSpacing:'0.5px',fontFamily:ff}}>
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
                <p style={{color:'#FCA5A5',fontSize:'14px',margin:0}}>Thank you for letting us know. We will miss you!</p>
              </div>
            )}

            {/* Maps */}
            {event.googleMapsUrl&&(
              <a href={event.googleMapsUrl} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginTop:'16px',padding:'11px',borderRadius:'10px',background:'rgba(255,255,255,0.05)',border:`1px solid ${ac}11`,color:`${ac}66`,textDecoration:'none',fontSize:'13px'}}>
                📍 View on Google Maps
              </a>
            )}
          </div>
          <div style={{height:'3px',background:`linear-gradient(90deg,transparent,${pc},transparent)`}}/>
        </div>

        {/* Dress Code Section */}
        {dressImages.length > 0 && (
          <div style={{marginBottom:'16px',background:'rgba(255,255,255,0.04)',borderRadius:'16px',border:`1px solid ${ac}11`,overflow:'hidden'}}>
            <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${ac}11`}}>
              <p style={{color:`${ac}88`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',margin:0,display:'flex',alignItems:'center',gap:'6px'}}>
                👔 Dress Code
              </p>
              {event.dressCode&&<p style={{color:pc,fontSize:'14px',fontWeight:600,margin:'4px 0 0'}}>{event.dressCode}</p>}
            </div>
            <div style={{padding:'14px 18px'}}>
              <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(dressImages.length,3)},1fr)`,gap:'10px'}}>
                {dressImages.map((img,i)=>(
                  <div key={img._id||i} style={{borderRadius:'10px',overflow:'hidden',border:`1px solid ${ac}11`}}>
                    <img src={img.url} alt={img.caption||'Dress code'} style={{width:'100%',aspectRatio:'3/4',objectFit:'cover',display:'block'}}/>
                    {(img.caption||img.gender!=='general')&&(
                      <div style={{padding:'6px 8px',background:`${bg}cc`}}>
                        <p style={{color:pc,fontSize:'11px',margin:0,textAlign:'center',fontWeight:600}}>
                          {img.gender!=='general'?`${img.gender==='female'?'👗 Ladies':'👔 Gentlemen'}`:''}{img.caption?` — ${img.caption}`:''}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Video */}
        {event.invitationVideo?.url&&(
          <div style={{borderRadius:'16px',overflow:'hidden',border:`1px solid ${pc}22`,marginBottom:'16px'}}>
            <div style={{padding:'10px 16px',borderBottom:`1px solid ${ac}11`}}>
              <p style={{color:`${ac}55`,fontSize:'11px',textTransform:'uppercase',letterSpacing:'2px',margin:0}}>Event Preview</p>
            </div>
            <video controls style={{width:'100%',display:'block',background:'#000'}}>
              <source src={event.invitationVideo.url}/>
            </video>
          </div>
        )}

        {/* Description */}
        {event.description&&(
          <div style={{background:'rgba(255,255,255,0.03)',borderRadius:'14px',padding:'18px',border:`1px solid ${ac}0a`,marginBottom:'16px'}}>
            <p style={{color:`${ac}99`,fontSize:'14px',lineHeight:1.8,margin:0}}>{event.description}</p>
          </div>
        )}

        <p style={{textAlign:'center',color:`${ac}33`,fontSize:'11px',marginTop:'32px'}}>Powered by Cardpro</p>
      </div>
    </div>
  );
};

export default EventWebsite;
