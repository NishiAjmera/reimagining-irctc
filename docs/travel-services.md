# Booking-confirmation service handoffs

The confirmation screen offers four optional services without changing the journey fare or placing additional orders. This is a provider-handoff integration, not a provider booking API. No passenger, contact, payment or sample booking-reference data is transmitted by RailEase; external links use `noreferrer`. Clipboard copies require an explicit user click and contain only the displayed location or assistance details.

## Current behavior

- **Cabs:** official Ola and Uber booking entry points. Travellers can copy the actual arrival/boarding station location; town-to-town journeys also offer the final bus stop. Pickup time and destination must be entered and confirmed with the provider. No invented coordinates, fare estimates or scheduled reservations.
- **Food:** Swiggy Food on Train. A real railway PNR must be entered on Swiggy; the generated RailEase reference is not forwarded or treated as a PNR. Coverage and menu availability are decided by Swiggy.
- **Luggage assistance:** local planning details for boarding, train changes or arrival. Defaults to the transfer station for indirect journeys. Copy details for a licensed station Sahayak or contact railway enquiries on 139. No porter is reserved or dispatched. Cross-station transfers are explicitly distinguished from platform changes.
- **Parcels:** official Indian Railways parcel portal and Porter goods-services handoffs. Packing, weight, coverage, rates and dispatch timing are confirmed with the provider. Porter goods transport is not presented as an in-station porter service. The rail portal was linked from official railway resources but did not render through the research browser; 139 is shown as a fallback for parcel enquiries.

## Primary references checked 28 August 2026

- Ola official booking link: https://www.olacabs.com/ → https://book.olacabs.com/
- Uber mobile web booking: https://m.uber.com/
- Uber ride-request deep-link documentation (not configured without client/coordinate data): https://developer.uber.com/docs/riders/ride-requests/tutorials/deep-links/introduction
- Swiggy official PNR-based Food on Train: https://www.swiggy.com/order-food-online-in-train
- Railway parcel link and railway assistance: https://railmadad.indianrailways.gov.in/madad/final/home.jsp
- Railway enquiries and parcel enquiries on 139: https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=1703201&lang=2&reg=48
- Railway Sahayak assistance: https://www.pib.gov.in/newsite/PrintRelease.aspx?lang=2&reg=48&relid=150899
- Porter goods services: https://porter.in/services

## Requirements for in-app fulfilment

Provider-approved booking APIs, credentials and commercial access; real ticket/PNR issuance; explicit passenger-data-sharing consent; live coverage and quotes; provider confirmation callbacks, cancellations and refunds. No simulated payment or booking completion should be used as proof of provider fulfilment.
