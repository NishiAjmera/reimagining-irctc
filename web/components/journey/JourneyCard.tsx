'use client';

import {ArrowRight,ChevronDown,TriangleAlert} from 'lucide-react';
import {useId,useState} from 'react';
import {track} from '@/lib/analytics';
import type {JourneyOption} from '@/types/journey';
import {applyClassChoice,JourneyClassPicker} from './JourneyClassPicker';
import {JourneyTimeline} from './JourneyTimeline';

const badgeCopy={BEST_OVERALL:'Recommended',CHEAPEST:'Budget choice',BEST_AVAILABILITY:'Strong availability',FASTEST:'Fastest',ALTERNATIVE_DATE:'Nearby date'} as const;

export function JourneyCard({journey,index,onChoose,isOtherOption=false}:{journey:JourneyOption;index:number;onChoose:(journey:JourneyOption)=>void;isOtherOption?:boolean}) {
  const [expanded,setExpanded]=useState(false);
  const [selectedClassId,setSelectedClassId]=useState(journey.id);
  const detailsId=useId();
  const choice=journey.classChoices?.find(item=>item.id===selectedClassId);
  const active=choice?applyClassChoice(journey,choice):journey;
  const status=active.classOption.status;
  const badge=status==='WAITLIST'?'Waitlisted option':status==='RAC'?'RAC option':isOtherOption?'Additional option':badgeCopy[journey.recommendationType];
  const hasBus=Boolean(active.roadLegs?.length);
  const warnings=active.tradeoffs.filter(text=>/after .*deadline|earlier|nearby date/i.test(text));
  if(status!=='CONFIRMED') warnings.unshift(status==='WAITLIST'?`WL ${active.classOption.position??''} · Train not confirmed`:`RAC ${active.classOption.position??''} · Full berth not confirmed`);
  return <article className={`journey-card compact-journey-card ${index===0&&!isOtherOption&&status==='CONFIRMED'?'featured':''}`}>
    <div className="compact-card-header"><div><h3>{journey.legs?.length?`Via ${journey.transfer?.station.city}`:journey.trainName}</h3><span>{journey.legs?.length?`${journey.legs.length} trains`:`#${journey.trainNumber}`}{hasBus?` · ${active.roadLegs?.length} bus ${active.roadLegs?.length===1?'connection':'connections'}`:''}</span></div><span className={`compact-badge ${status.toLowerCase()}`}>{badge}</span></div>
    <JourneyTimeline journey={active} expanded={expanded}/>
    <JourneyClassPicker journey={journey} selectedId={active.id} onSelect={item=>setSelectedClassId(item.id)}/>
    {warnings.length?<p className="compact-warning" role="status"><TriangleAlert size={14}/><span>{warnings.join(' · ')}</span></p>:null}
    {hasBus?<p className="compact-connection-note">Bus times and seats are illustrative. Reconfirm {active.roadLegs?.length===2?'both connections':'the connection'} before travel.</p>:null}
    <div className="compact-card-footer"><button type="button" className="compact-details-toggle" aria-expanded={expanded} aria-controls={detailsId} onClick={()=>{setExpanded(value=>!value);track('recommendation_explanation_opened',{journeyId:journey.id});}}>Journey details <ChevronDown size={15}/></button><div className="compact-total"><strong>₹{active.totalFare.toLocaleString('en-IN')}</strong><small>{hasBus?'Bus + train total':'Total fare'} · all travellers</small></div><button type="button" className="choose-button" onClick={()=>onChoose(active)}>{status==='WAITLIST'?'Choose waitlist':'Choose journey'}<ArrowRight size={16}/></button></div>
    <div id={detailsId} hidden={!expanded} className="compact-expanded-details"><h4>Why this option</h4><ul>{[...active.reasons,...active.tradeoffs].map((reason,i)=><li key={`${reason}-${i}`}>{reason}</li>)}</ul></div>
  </article>;
}
