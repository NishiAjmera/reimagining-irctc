'use client';

import { useId, useState } from 'react';
import { CarFront, Check, ChevronRight, Copy, ExternalLink, Luggage, Package, Phone, Utensils, X } from 'lucide-react';
import type { JourneyOption } from '@/types/journey';
import { journeyClock, journeyDate } from '@/lib/journey/itinerary';
import { assistanceSummary, travelServiceContext, travelServiceLinks } from '@/lib/journey/travelServices';

const services = [
  { id: 'cab', label: 'Book a cab', detail: 'Ola · Uber', Icon: CarFront },
  { id: 'food', label: 'Food on your train', detail: 'Swiggy', Icon: Utensils },
  { id: 'luggage', label: 'Luggage assistance', detail: 'Station porters', Icon: Luggage },
  { id: 'parcel', label: 'Send a parcel', detail: 'Goods across cities', Icon: Package },
] as const;
type ServiceId = typeof services[number]['id'];

export function TravelServices({ journey }: { journey: JourneyOption }) {
  const context = travelServiceContext(journey);
  const [active, setActive] = useState<ServiceId | null>(null);
  const [cabId, setCabId] = useState(context.cabStops[0].id);
  const [stopId, setStopId] = useState(context.defaultAssistanceId);
  const [bags, setBags] = useState(2);
  const id = useId();
  const cab = context.cabStops.find((stop) => stop.id === cabId) ?? context.cabStops[0];
  const stop = context.stops.find((item) => item.id === stopId) ?? context.stops[0];
  return <section className="travel-services" aria-labelledby={`${id}-heading`}>
    <div className="travel-services-heading"><h2 id={`${id}-heading`}>Travel extras</h2><span>Optional · arranged separately</span></div>
    <div className="travel-service-options">{services.map(({ id: serviceId, label, detail, Icon }) => <button key={serviceId} id={`${id}-${serviceId}`} type="button" aria-expanded={active === serviceId} aria-controls={`${id}-panel-${serviceId}`} onClick={() => setActive(active === serviceId ? null : serviceId)}><Icon size={21} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={15} aria-hidden="true" /></button>)}</div>
    {services.map(({ id: serviceId, label }) => <div key={serviceId} id={`${id}-panel-${serviceId}`} className="travel-service-panel" role="region" aria-labelledby={`${id}-${serviceId}`} hidden={active !== serviceId}>
      <div className="service-panel-heading"><h3>{label}</h3><button className="service-close" type="button" aria-label={`Close ${label.toLowerCase()}`} onClick={() => { setActive(null); document.getElementById(`${id}-${serviceId}`)?.focus(); }}><X size={17} /></button></div>
      {serviceId === 'cab' ? <>
        <div className="service-context-row"><label>Cab connection<select value={cabId} onChange={(event) => setCabId(event.target.value)}>{context.cabStops.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><div className="service-location"><small>{cab.field}</small><strong>{cab.location}</strong><span>{journeyDate(cab.time)} · {journeyClock(cab.time)} {cab.field === 'Pickup' ? 'arrival' : 'train departure'}</span></div><CopyDetails key={cab.location} text={cab.location} label="Copy location" /></div>
        <p>Set this location and your pickup time in the provider’s app. Confirm fares and availability there.</p>
        <div className="service-links"><ProviderLink href={travelServiceLinks.ola}>Continue with Ola</ProviderLink><ProviderLink href={travelServiceLinks.uber}>Continue with Uber</ProviderLink></div>
      </> : null}
      {serviceId === 'food' ? <>
        <div className="service-train-tags">{context.trains.map((train) => <span key={train.id}>{train.trainName} <small>#{train.trainNumber}</small></span>)}</div>
        <p>Enter your railway PNR on Swiggy to see delivery stations and restaurants. The RailEase sample reference is not a railway PNR.</p>
        <div className="service-links"><ProviderLink href={travelServiceLinks.swiggy}>Open Swiggy Food on Train</ProviderLink></div>
      </> : null}
      {serviceId === 'luggage' ? <>
        <div className="service-context-row"><label>Assistance at<select value={stopId} onChange={(event) => setStopId(event.target.value)}>{context.stops.map((item) => <option key={item.id} value={item.id}>{item.label} · {item.station.name}</option>)}</select></label><label className="service-bags">Bags<select value={bags} onChange={(event) => setBags(Number(event.target.value))}>{[1, 2, 3, 4, 5, 6, 7, 8].map((count) => <option key={count} value={count}>{count}</option>)}</select></label><div className="service-location"><strong>{stop.nextTrainNumber ? `Train ${stop.trainNumber} → ${stop.nextTrainNumber}` : `Train ${stop.trainNumber}`}</strong><span>{journeyDate(stop.time)} · {journeyClock(stop.time)}</span></div></div>
        <p>{stop.nextTrainNumber ? stop.nextStation?.code === stop.station.code ? 'Platform-to-platform luggage help. ' : `This change involves ${stop.station.name} and ${stop.nextStation?.name}; transport between stations must be arranged separately. ` : 'Luggage help between the station entrance, platform and exit. '}Ask station staff for a licensed Sahayak and confirm platforms and charges.</p>
        <div className="service-links"><CopyDetails key={`${stop.id}-${bags}`} text={assistanceSummary(stop, bags)} label="Copy assistance details" /><a href={travelServiceLinks.railwayEnquiries}><Phone size={14} aria-hidden="true" /> Railway enquiries · 139</a></div><small className="service-footnote">Enquiry only—no porter has been reserved.</small>
      </> : null}
      {serviceId === 'parcel' ? <>
        <div className="service-location"><small>Rail route</small><strong>{context.trains[0].departureStation.city} → {context.trains[context.trains.length - 1].arrivalStation.city}</strong></div>
        <p>Check goods restrictions, packing, weight and service coverage with the provider. Rail parcels may need to be handed in at the parcel office and can travel separately from you.</p>
        <div className="service-links"><ProviderLink href={travelServiceLinks.railwayParcel}>Indian Railways parcels</ProviderLink><ProviderLink href={travelServiceLinks.porterGoods}>Explore Porter goods services</ProviderLink></div><small className="service-footnote">Porter handles goods transport, not luggage assistance between platforms. For parcel enquiries, call 139.</small>
      </> : null}
    </div>)}
    <p className="travel-services-note">Bookings and payments are completed with the provider. Passenger and payment details are not shared by RailEase.</p>
  </section>;
}

function ProviderLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{children}<ExternalLink size={13} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>;
}

function CopyDetails({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setStatus('copied'); }
    catch { setStatus('error'); }
  };
  return <span className="service-copy"><button type="button" onClick={copy}>{status === 'copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}{status === 'copied' ? 'Copied' : label}</button><span role="status" className={status === 'error' ? 'service-copy-error' : 'sr-only'}>{status === 'error' ? 'Copy unavailable. Select and copy the details below.' : status === 'copied' ? `${label} copied.` : ''}</span>{status === 'error' ? <textarea aria-label={`${label} manually`} value={text} readOnly onFocus={(event) => event.target.select()} /> : null}</span>;
}
