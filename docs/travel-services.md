# Booking-confirmation service handoffs

The confirmation screen offers four optional services without changing the journey fare or placing real additional orders. Cab, food and parcel services use provider handoffs, not booking APIs. Luggage assistance has an explicitly simulated in-app booking flow. No passenger, contact, payment or sample booking-reference data is transmitted by RailEase; external links use `noreferrer`. Location clipboard copies require an explicit user click.

## Current behavior

- **Cabs:** official Ola and Uber booking entry points. Travellers can copy the actual arrival/boarding station location; town-to-town journeys also offer the final bus stop. Pickup time and destination must be entered and confirmed with the provider. No invented coordinates, fare estimates or scheduled reservations.
- **Food:** Swiggy Food on Train. A real railway PNR must be entered on Swiggy; the generated RailEase reference is not forwarded or treated as a PNR. Coverage and menu availability are decided by Swiggy.
- **Luggage assistance:** select departure, arrival, or both, plus optional same-station train changes. Each selected stop has an independent count of 1–8 bags, priced at a sample ₹80 per bag per station. A local booking confirmation snapshots the total, assigns fictional porter names, and displays illustrative station meeting landmarks and times (30 minutes before departure, or at arrival). Cancellation returns to the editable selection. Closing and reopening the panel preserves the state; reloading the page or starting a new journey does not. No payment, reservation or porter dispatch takes place. Cross-station transport is excluded rather than sold as platform assistance.
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
