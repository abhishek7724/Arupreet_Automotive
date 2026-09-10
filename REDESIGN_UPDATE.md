# ACS website redesign — deployment and design notes

This is the cumulative website redesign and mobile update for ACS v0.4.1 (original local commit e9f7a61). This guide takes precedence over older release guides for this update.

## Deploy
1. Back up your deployed frontend.
2. Extract ACS-v0.4.1-redesign-frontend-update.zip over the frontend root, preserving the assets/images directory. This includes the earlier Operations mobile changes; you do not need to install the previous mobile ZIP first.
3. Publish through your existing hosting/GitHub deployment process and refresh the site. Clear the browser cache if the previous design remains.
4. Check booking availability and a booking on your deployed site, then sign into Operations and verify your usual workflow.

No Apps Script redeployment, Sheets setup, schema change, configuration replacement or new account is required. The update ZIP does not include config.js. The complete ZIP includes the original local configuration; existing deployments should use the update ZIP.

## Design references reviewed
Reviewed official pages on 10 September 2026. These informed structure and usability; no competitor code, images, logos, testimonials, guarantees or prices were copied.

- US — Firestone Complete Auto Care: https://www.firestonecompleteautocare.com/maintain/
  Useful pattern: clear maintenance categories, repeated scheduling actions and a simple explanation of the visit. Applied as actionable ACS service cards and a prominent booking flow.
- Europe / UK — Kwik Fit: https://www.kwik-fit.com/servicing
  Useful pattern: service explanations and a clear route to book. Applied as practical descriptions, distinct service choices and straightforward appointment labels.
- India — Bosch Car Service: https://ap.boschcarservice.com/in/en/
  Useful pattern: multi-brand service categories, booking and workshop discovery. Applied as a compact brand strip, clear service grouping and prominent phone/directions access.

## What changed visually
- New charcoal, white and lime identity; bold typography and an original automotive hero image.
- Clear service cards with booking links; choosing a service fills an empty concern field without replacing a customer's own notes.
- Redesigned workshop approach, process, booking, contact and footer sections.
- Sticky navigation, expandable mobile menu, and a phone-only bottom Call/Book bar. The bottom bar hides while a booking field is focused.
- Services, forms and sections stack on phones. The hero image is 177,434 bytes in WebP format. There are no external font or UI dependencies.
- Public CSS is isolated in public.css; Operations keeps the mobile improvements delivered previously.
- Existing unverified rating/review counters were replaced by factual descriptions of the ACS workflow. No new testimonials, prices, warranties or certifications were invented.

## Exactly which files changed
Relative to the preceding mobile package:
Modified: index.html
Added: public.css, public.js, assets/images/acs-care-hero.webp, tests/public.test.cjs, REDESIGN_UPDATE.md
All Operations files remain unchanged relative to that package.

Cumulative changes relative to original v0.4.1:
Modified: index.html, app.html, styles.css, tests/browser.test.cjs
Added: mobile.js, public.css, public.js, assets/images/acs-care-hero.webp, tests/public.test.cjs, MOBILE_UPDATE.md, REDESIGN_UPDATE.md
No files deleted. All Apps Script files, app.js, site.js, configuration and data libraries are byte-for-byte unchanged from the original local v0.4.1 source.

Frontend update ZIP contents:
index.html
app.html
styles.css
mobile.js
public.css
public.js
assets/images/acs-care-hero.webp
REDESIGN_UPDATE.md

## Verification
- 28 static/backend and slot regression checks passed, including syntax parsing of all shipped JS and Apps Script.
- Chrome booking-to-invoice workflow passed at phone width with an in-memory backend: booking, occupied-slot handling, cancellation, inspection, billing, inventory creation and job closure.
- Website and all nine Operations views checked at 360, 390, 430, 768, 1024 and 1440px; no horizontal page overflow. Existing mobile dialog checks also passed.
- New public checks passed for image loading, service selection, preserving typed notes, bottom-bar visibility during form focus, Escape menu control and 200% text reflow.
- Desktop and phone hero, service and booking layouts visually reviewed.
- No production Google data writes or messages were made. Physical iOS/Android devices and production Google authorization were not tested.

Reproducible checks (Node.js; browser tests also require Playwright and Chrome):
node --test tests/backend.test.cjs tests/slots.test.cjs
node tests/browser.test.cjs
node tests/public.test.cjs
Set ACS_PLAYWRIGHT to an existing Playwright package path if it is not installed locally.

## Image provenance
assets/images/acs-care-hero.webp is original illustrative artwork generated with the built-in imagegen tool, then encoded as WebP for delivery. It is not a photograph of ACS employees or premises. Its alternative text identifies it as illustrative.

Exact generation prompt:
Use case: ads-marketing
Asset type: Website hero image for an independent Indian multi-brand car workshop, generic illustrative artwork rather than a depiction of actual ACS premises.
Primary request: Exactly one original landscape 3:2 photo-style editorial image. Close view of a graphite modern unbranded hatchback with its bonnet open and a technician's gloved hands inspecting the engine.
Scene/backdrop: Credible industrial car workshop, softly blurred background.
Style/medium: Polished commercial automotive editorial photography, photorealistic materials and mechanically plausible details.
Composition/framing: Beautiful vehicle headlight prominent in the foreground right; engine and working hands in the center; keep the important content crop-friendly for both desktop landscape and a phone 4:3 crop.
Lighting/mood: Dramatic but credible natural workshop light, confident and meticulous.
Color palette and textures: Brushed metal and charcoal, graphite paint, subtle lime accents on gloves or workwear.
Constraints: No logos, words, numbers, signage, watermarks, fake facility branding, or identifiable car badges. No text of any kind. Produce one image only.
