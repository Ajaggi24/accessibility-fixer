# Embedded Accessibility Issues — Summit Adventures

This document lists all intentionally embedded accessibility violations in `index.html`.
The page is designed to **look like a real website** while containing 50 distinct WCAG failures.

**Standard:** WCAG 2.1
**Target Level:** AA (some Level A and AAA issues also included)

---

## Issue Index

| # | WCAG | Criterion Name | Location |
|---|------|----------------|----------|
| 1 | 2.4.2 | Page Titled | `<head>` |
| 2 | 2.4.1 | Bypass Blocks | Top of `<body>` |
| 3 | 2.4.7 | Focus Visible | CSS — `*:focus` |
| 4 | 4.1.2 | Name, Role, Value | Header search input |
| 5 | 4.1.2 | Name, Role, Value | Header search button |
| 6 | 1.1.1 | Non-text Content | Hero section |
| 7 | 1.4.3 | Contrast (Minimum) | Hero text |
| 8 | 2.1.1 | Keyboard | Package cards |
| 9 | 1.4.1 | Use of Color | Package badges |
| 10 | 2.4.6 | Headings and Labels | Package card links |
| 11 | 1.4.1 | Use of Color | Package card pricing |
| 12 | 2.2.2 | Pause, Stop, Hide | Testimonials ticker |
| 13 | 1.4.3 | Contrast (Minimum) | Ticker text |
| 14 | 1.1.1 | Non-text Content | Review star ratings |
| 15 | 1.3.1 | Info and Relationships | Departures table |
| 16 | 1.4.1 | Use of Color | Departures table status |
| 17 | 1.4.1 | Use of Color | Booking form required fields |
| 18 | 1.3.1 | Info and Relationships | Experience level radio group |
| 19 | 1.4.10 | Reflow | Promo banner |
| 20 | 4.1.2 | Name, Role, Value | Promo dismiss button |
| 21 | 2.1.1 | Keyboard | FAQ accordion |
| 22 | 1.4.3 | Contrast (Minimum) | Newsletter subtext |
| 23 | 4.1.2 | Name, Role, Value | Newsletter email input |
| 24 | 1.4.4 | Resize Text | Legal text (newsletter) |
| 25 | 1.4.3 | Contrast (Minimum) | Footer text and links |
| 26 | 4.1.2 | Name, Role, Value | Social media icon links |
| 27 | 3.2.5 | Change on Request | External links opening new tabs |
| 28 | 1.3.3 | Sensory Characteristics | Colour/shape-based instructions |
| 29 | 2.4.6 | Headings and Labels | "Click Here" nav link |
| 30 | 1.3.1 | Info and Relationships | Stats bar `role="presentation"` |
| 31 | 1.1.1 | Non-text Content | Gallery images |
| 32 | 1.3.1 | Info and Relationships | Heading level skip |
| 33 | 1.1.1 | Non-text Content | Feature section icons |
| 34 | 1.1.1 | Non-text Content | Ticker `aria-hidden` |
| 35 | 3.1.2 | Language of Parts | French review text |
| 36 | 1.3.1 | Info and Relationships | First Name label |
| 37 | 2.4.3 | Focus Order | Positive `tabindex` values |
| 38 | 4.1.1 | Parsing | Duplicate `id="email"` |
| 39 | 4.1.2 | Name, Role, Value | Destination select |
| 40 | 4.1.2 | Name, Role, Value | Range slider inputs |
| 41 | 1.3.1 | Info and Relationships | Terms checkbox |
| 42 | 2.5.3 | Label in Name | Submit button aria-label mismatch |
| 43 | 1.4.4 | Resize Text | Fine print text (form + footer) |
| 44 | 1.3.1 | Info and Relationships | Hidden span misuse |
| 45 | 4.1.1 | Parsing | Duplicate `id="departure-info"` |
| 46 | 3.1.2 | Language of Parts | German departure note |
| 47 | 3.2.5 | Change on Request | Footer external links |
| 48 | 4.1.1 | Parsing | Duplicate `id="footer-link-acc"` |
| 49 | 3.1.2 | Language of Parts | Spanish footer text |
| 50 | 1.3.5 | Identify Input Purpose | `autocomplete="off"` on name/email |

---

## Detailed Issue Descriptions

---

### 1 — WCAG 2.4.2: Page Titled ❌

**Location:** `<head>`
**Level:** A

No `<title>` element is present. Screen reader users hear nothing identifying the page when it loads, and the browser tab shows a blank or the URL instead of a meaningful name.

**Fix:** Add `<title>Summit Adventures — Expert-Guided Expeditions</title>` inside `<head>`.

---

### 2 — WCAG 2.4.1: Bypass Blocks ❌

**Location:** Top of `<body>`, before `<header>`
**Level:** A

There is no "skip to main content" link. Keyboard and screen reader users must tab through all navigation items on every page load before reaching the main content.

**Fix:** Add `<a href="#main-content" class="skip-link">Skip to main content</a>` as the first element in `<body>`.

---

### 3 — WCAG 2.4.7: Focus Visible ❌

**Location:** CSS — `*:focus { outline: none; }`
**Level:** AA

The global `*:focus` rule removes all visible focus indicators across the entire page. Sighted keyboard users cannot see which element currently has focus, making the page effectively unusable without a mouse.

**Fix:** Remove the rule entirely, or replace with a clearly visible custom focus style (e.g. `outline: 3px solid #d97706; outline-offset: 2px;`).

---

### 4 — WCAG 4.1.2: Name, Role, Value — Search Input ❌

**Location:** Header, `.header-search input`
**Level:** A

The search input has no associated `<label>` element, no `aria-label`, and no `aria-labelledby`. Its placeholder text ("Search destinations...") is not a reliable label substitute — it disappears when the user starts typing and is not consistently announced by all screen readers.

**Fix:** Add `<label for="site-search" class="sr-only">Search destinations</label>` and `id="site-search"` on the input.

---

### 5 — WCAG 4.1.2: Name, Role, Value — Search Button ❌

**Location:** Header, `.header-search button`
**Level:** A

The search submit button contains only a magnifying glass emoji (`🔍`). It has no `aria-label`, `title`, or screen-reader-only text. Assistive technology will announce this as "button" with no indication of its purpose.

**Fix:** Add `aria-label="Search"` to the button, or add `<span class="sr-only">Search</span>` inside it.

---

### 6 — WCAG 1.1.1: Non-text Content — Hero Background Image ❌

**Location:** `.hero` section
**Level:** A

The hero uses a CSS `background-image` of a mountain scene that establishes the visual identity and theme of the company. Because it is a CSS background (not an `<img>`), there is no mechanism to provide an alt text. The image conveys meaningful information (what kind of adventures are offered) with no text alternative.

**Fix:** Either convert to an `<img alt="Mountain expedition with climbers ascending a snow-covered peak">` inside the hero, or ensure all information conveyed by the image is also stated in the adjacent text.

---

### 7 — WCAG 1.4.3: Contrast (Minimum) — Hero Text ❌

**Location:** `.hero h1`, `.hero p`, `.hero-tag`
**Level:** AA

Hero text uses semi-transparent white against a dark overlay:

- `.hero-tag`: `rgba(255,255,255,0.68)` → contrast ratio ~2.7:1
- `.hero h1`: `rgba(255,255,255,0.82)` → contrast ratio ~3.2:1
- `.hero p`: `rgba(255,255,255,0.60)` → contrast ratio ~2.4:1

All three fail the 4.5:1 minimum for normal text and 3:1 for large text.

**Fix:** Use `color: #ffffff` (full white) or increase the overlay opacity to ensure sufficient contrast.

---

### 8 — WCAG 2.1.1: Keyboard — Package Cards ❌

**Location:** `.pkg-card` divs (four instances)
**Level:** A

Each package card is a `<div>` with an `onclick` handler but no `onkeydown` or `onkeypress` event. While the cards are not explicitly focusable (no `tabindex`), the click-only interaction means keyboard users cannot trigger the same action. Interactive elements that respond to mouse clicks must also respond to keyboard activation.

**Fix:** Use `<button>` or `<a>` elements instead, or add `tabindex="0"` plus `onkeydown` handling for Enter/Space.

---

### 9 — WCAG 1.4.1: Use of Color — Package Badges ❌

**Location:** `.pkg-badge` elements (`.badge-popular`, `.badge-sale`, `.badge-new`)
**Level:** A

The category of each package (Popular, On Sale, New) is distinguished solely through the background colour of the badge chip. The text inside the badge does name the category, however the legend at the top of the section uses colour dots with no text labels, conveying the colour coding system through colour alone.

**Fix:** Ensure the colour dot legend includes text labels adjacent to each dot (e.g. "🟢 Popular", not just a green dot).

---

### 10 — WCAG 2.4.6: Headings and Labels — "Read More" Links ❌

**Location:** All four `.pkg-link` anchor elements
**Level:** AA

The link text "Read More" is used four times, each pointing to a different destination page. A screen reader user navigating by links hears four identical "Read More" links with no context about which destination each one leads to.

**Fix:** Use descriptive link text (e.g. "Read more about the Himalayan Trek") or add `aria-label="Read more about the Himalayan Trek"` to each link.

---

### 11 — WCAG 1.4.1: Use of Color — Sale Pricing ❌

**Location:** `.price-sale` spans in package cards
**Level:** A

Sale prices are rendered in red (`#dc2626`) while regular prices are in dark navy. The only indication that a price is discounted is the colour difference. There is no strikethrough, no "SALE" text label, no icon, and no other non-colour indicator.

**Fix:** Add a visible "Sale" text label or use strikethrough on the original price alongside the discounted price.

---

### 12 — WCAG 2.2.2: Pause, Stop, Hide — Testimonials Ticker ❌

**Location:** `.ticker-section` / `.ticker-track`
**Level:** A

The scrolling testimonials banner animates continuously with a CSS `animation: tickerScroll 28s linear infinite`. There is no button, control, or mechanism of any kind to pause, stop, or hide the moving content.

**Fix:** Add a pause/play toggle button adjacent to the ticker that stops and restarts the animation.

---

### 13 — WCAG 1.4.3: Contrast (Minimum) — Ticker Text ❌

**Location:** `.ticker-item` text
**Level:** AA

Ticker text uses `rgba(255,255,255,0.62)` on the green background (`#1b6b3a`), giving a contrast ratio of approximately 2.4:1. The strong text uses `rgba(255,255,255,0.72)` — still only ~2.8:1. Both fail the 4.5:1 minimum.

**Fix:** Use `color: #ffffff` for body text and increase strong text differentiation through font weight alone.

---

### 14 — WCAG 1.1.1: Non-text Content — Star Ratings ❌

**Location:** `.review-stars` in both review cards
**Level:** A

The star rating (`★★★★★`) is marked with `aria-hidden="true"`, which removes it entirely from the accessibility tree. Screen reader users receive no information about the rating. The number of stars or a text equivalent (e.g. "5 out of 5 stars") must be available to assistive technology.

**Fix:** Remove `aria-hidden="true"` and add a visually hidden span: `<span class="sr-only">5 out of 5 stars</span>`.

---

### 15 — WCAG 1.3.1: Info and Relationships — Departures Table ❌

**Location:** `.departures-table`, first `<tr>`
**Level:** A

The header row of the data table uses `<td>` elements instead of `<th>`. No `scope` attribute is present. Screen readers cannot identify the relationship between data cells and their column headers, making the table contents ambiguous when navigated non-visually.

**Fix:** Replace the header `<td>` elements with `<th scope="col">` and optionally add `<thead>` / `<tbody>` wrapper elements.

---

### 16 — WCAG 1.4.1: Use of Color — Table Status ❌

**Location:** `.td-available`, `.td-soldout`, `.td-limited` cells
**Level:** A

The availability status (Available / Limited / Sold Out) in the departures table is differentiated exclusively by text colour (green, amber, red). A user who cannot distinguish colours will see the same words in potentially identical-looking text.

**Fix:** Add an icon or symbol prefix (e.g. ✓ Available, ! Limited, ✗ Sold Out) so the status is not conveyed by colour alone.

---

### 17 — WCAG 1.4.1: Use of Color — Required Form Fields ❌

**Location:** Booking form — `.required-note` paragraph
**Level:** A

The form states "Fields marked in blue are required" and uses blue colour on a label indicator. Users who cannot perceive the colour blue have no way to identify which fields are required.

**Fix:** Use an asterisk (*) or the word "required" as a text indicator, and explain the convention at the start of the form (e.g. "* indicates a required field").

---

### 18 — WCAG 1.3.1: Info and Relationships — Radio Group ❌

**Location:** "Experience Level" radio buttons in the booking form
**Level:** A

The three radio buttons (Beginner / Intermediate / Expert) share a visible heading ("Experience Level") but are not wrapped in a `<fieldset>` with a `<legend>`. Screen readers may not associate the group label with the individual radio options, leaving users uncertain what question the buttons are answering.

**Fix:** Wrap the group in `<fieldset><legend>Experience Level</legend>...</fieldset>`.

---

### 19 — WCAG 1.4.10: Reflow — Promo Banner ❌

**Location:** `.promo-banner`
**Level:** AA

The promotional banner has a hardcoded `width: 1400px`. On any viewport narrower than 1400px the container scrolls horizontally. Users who rely on a single-column layout (e.g. at 320px width, or using 400% zoom) are forced to scroll horizontally to read the content, violating the reflow requirement.

**Fix:** Remove the fixed width and use responsive layout techniques (flexbox, max-width, percentage widths).

---

### 20 — WCAG 4.1.2: Name, Role, Value — Dismiss Button ❌

**Location:** `.promo-dismiss` button
**Level:** A

The close button for the promo banner contains only the `×` character. It has no `aria-label`, no `title`, and no screen-reader-only text. Assistive technology may announce it as "times" or "multiplication sign" rather than "Close" or "Dismiss promotion".

**Fix:** Add `aria-label="Dismiss promotion"` to the button.

---

### 21 — WCAG 2.1.1: Keyboard — FAQ Accordion ❌

**Location:** `.faq-q` divs (four instances)
**Level:** A

The FAQ accordion is built from `<div>` elements with `onclick` handlers. `<div>` elements are not in the tab order by default and cannot be activated with the keyboard. Keyboard users cannot open or close any FAQ answer.

**Fix:** Replace the `<div class="faq-q">` with `<button>` elements, which are natively keyboard focusable and activatable.

---

### 22 — WCAG 1.4.3: Contrast (Minimum) — Newsletter Subtext ❌

**Location:** `.newsletter p`
**Level:** AA

The subtitle paragraph uses `rgba(255,255,255,0.52)` on the dark navy background (`#0f172a`). The resulting contrast ratio is approximately 3.0:1, below the 4.5:1 minimum required for normal-weight body text.

**Fix:** Increase opacity to at least `rgba(255,255,255,0.75)` or use a lighter fixed colour.

---

### 23 — WCAG 4.1.2: Name, Role, Value — Newsletter Input ❌

**Location:** `.nl-form input[type="email"]`
**Level:** A

The newsletter signup email field has no associated `<label>`, no `aria-label`, and no `aria-labelledby`. Placeholder text ("Your email address") disappears when the user begins typing and is not a reliable accessible label.

**Fix:** Add a visually hidden `<label for="nl-email">Email address</label>` and add `id="nl-email"` to the input.

---

### 24 — WCAG 1.4.4: Resize Text — Newsletter Legal ❌

**Location:** `.legal` paragraph
**Level:** AA

The legal/terms text beneath the newsletter form is set at `font-size: 9px`. At 200% browser zoom (a common assistive setting), this text remains at only 18px equivalent — meaning it fails to reflow appropriately. Additionally, at any zoom level, 9px text is effectively unreadable.

**Fix:** Set a minimum of `font-size: 0.75rem` (12px at default) and ensure the text reflows at 200% zoom without requiring horizontal scrolling.

---

### 25 — WCAG 1.4.3: Contrast (Minimum) — Footer Text ❌

**Location:** `.footer-desc`, `.footer-links a`
**Level:** AA

Footer body text uses `rgba(255,255,255,0.36)` and link text uses `rgba(255,255,255,0.38)`, both on `#111827`. Contrast ratios are approximately 2.1:1 — less than half the required 4.5:1 minimum.

**Fix:** Increase text opacity to at least `rgba(255,255,255,0.7)` for body text and links.

---

### 26 — WCAG 4.1.2: Name, Role, Value — Social Links ❌

**Location:** `.social-link` anchor elements in footer
**Level:** A

The four social media links ("IG", "FB", "TW", "YT") rely on a `title` attribute to convey their purpose. The `title` attribute is not reliably announced by screen readers, and the two-letter abbreviations alone do not provide a meaningful accessible name.

**Fix:** Add `aria-label="Instagram"` (etc.) to each link, or include a visually hidden `<span class="sr-only">Instagram</span>` inside each anchor.

---

### 27 — WCAG 3.2.5: Change on Request — New Tab Links ❌

**Location:** Social links and footer external links (Careers, Visa Information)
**Level:** AAA

Multiple links use `target="_blank"` to open in a new browser tab without any warning to the user. This can disorient users — particularly those using screen readers or with cognitive disabilities — who may not realise context has shifted.

**Fix:** Add a visible warning before the link (e.g. "opens in a new tab") or use an icon with `aria-label` to indicate the behaviour. At AA, a warning is best practice even though this criterion is AAA.

---

### 28 — WCAG 1.3.3: Sensory Characteristics — Colour Instructions ❌

**Location:** Info box below packages; form note before submit button
**Level:** A

The page instructs users to look for items "marked in red" and to "click the green button", relying entirely on colour and shape as the means of identification. Users who cannot perceive colour have no other way to follow these instructions.

**Fix:** Supplement with text identifiers: "items marked **On Sale**" and "click the **Request a Booking Quote** button".

---

### 29 — WCAG 2.4.6: Headings and Labels — "Click Here" ❌

**Location:** Main navigation `<ul>`, last `<li>`
**Level:** AA

A navigation link reads "Click Here" with `href="#"`. This provides no information about where the link goes or what it does. Screen reader users navigating by link list hear "Click Here" with no context.

**Fix:** Replace with a descriptive link such as "View Special Offers" or remove if non-functional.

---

### 30 — WCAG 1.3.1: Info and Relationships — Stats Bar ❌

**Location:** `.stats-bar` div
**Level:** A

The statistics bar ("15+ Years Operating", "87 Destinations", etc.) has `role="presentation"` applied to it. This instructs assistive technology to ignore the element and its children as structural content, effectively hiding four meaningful data points from screen reader users.

**Fix:** Remove `role="presentation"`. If a landmark role is needed, use `role="region"` with `aria-label="Company statistics"`.

---

### 31 — WCAG 1.1.1: Non-text Content — Gallery Images ❌

**Location:** All five `.gallery-item img` elements
**Level:** A

None of the five gallery images have an `alt` attribute. Screen readers will typically announce the filename or "image" with no descriptive content, giving users no information about what is depicted.

**Fix:** Add descriptive `alt` text to each image (e.g. `alt="Trekkers crossing a suspension bridge over a glacial river in Nepal"`). If images are purely decorative, use `alt=""`.

---

### 32 — WCAG 1.3.1: Info and Relationships — Heading Skip ❌

**Location:** Patagonia package card — `<h4 class="pkg-title">`
**Level:** A

The document heading structure jumps from `<h2>` (section title "Featured Expeditions") directly to `<h4>` inside the Patagonia package card, skipping `<h3>`. This breaks the logical document outline and makes navigation by heading confusing for screen reader users.

**Fix:** Use `<h3>` for package card titles, consistent with their position in the heading hierarchy.

---

### 33 — WCAG 1.1.1: Non-text Content — Feature Icons ❌

**Location:** Three `<img>` elements inside `.feature-icon` divs
**Level:** A

The icon images (`icon-safety.png`, `icon-guide.png`, `icon-group.png`) have no `alt` attribute and no `aria-hidden="true"`. If decorative, they should have `alt=""`. As used here, they are adjacent to titled feature cards, making them decorative — but without `alt=""` or `aria-hidden`, screen readers announce them as unlabelled images.

**Fix:** Add `alt=""` to each icon image since the adjacent text conveys the meaning, or add `aria-hidden="true"`.

---

### 34 — WCAG 1.1.1: Non-text Content — Ticker aria-hidden ❌

**Location:** `.ticker-section` — `aria-hidden="true"` on the entire section
**Level:** A

The entire testimonials ticker section has `aria-hidden="true"` applied, removing all six testimonial quotes from the accessibility tree. Screen reader users receive no indication that customer reviews exist on the page.

**Fix:** Remove `aria-hidden="true"`. Instead, provide the testimonials in a static list below or alongside the ticker, and apply `aria-hidden="true"` only to the animated ticker itself.

---

### 35 — WCAG 3.1.2: Language of Parts — French Text ❌

**Location:** Philippe Moreau's review — `<span>Quelle expérience extraordinaire!</span>`
**Level:** AA

The French phrase is not wrapped with `lang="fr"`. Screen readers will attempt to pronounce it using the page's default language (English), resulting in incorrect pronunciation that may be unintelligible.

**Fix:** Change to `<span lang="fr">Quelle expérience extraordinaire!</span>`.

---

### 36 — WCAG 1.3.1: Info and Relationships — First Name Label ❌

**Location:** Booking form, first name field
**Level:** A

The "First Name" label element has no `for` attribute. The associated input has `id="fname"` but because `<label>` does not reference it, the two are not programmatically linked. Screen readers may not announce the label when the input receives focus.

**Fix:** Change `<label>` to `<label for="fname">`.

---

### 37 — WCAG 2.4.3: Focus Order — Positive Tabindex ❌

**Location:** Booking form — `id="lname"` (`tabindex="10"`) and `id="phone"` (`tabindex="5"`)
**Level:** A

Positive `tabindex` values pull elements out of the natural DOM tab order. `tabindex="5"` on the phone field causes it to receive focus before `tabindex="10"` on last name, but both are processed before any naturally ordered elements. The visual order (First Name → Last Name → Email → Phone) does not match the tab order experienced by keyboard users.

**Fix:** Remove all positive `tabindex` values. Use `tabindex="0"` only where needed, and rely on DOM order for tab sequence.

---

### 38 — WCAG 4.1.1: Parsing — Duplicate id="email" ❌

**Location:** Three elements across the page
**Level:** A

The attribute `id="email"` appears on:
1. The email input in the booking form
2. The newsletter subscription checkbox
3. The newsletter email input

IDs must be unique within a document. Duplicate IDs cause unpredictable behaviour in assistive technology (particularly label/input association) and invalidate the HTML.

**Fix:** Use unique IDs: `id="booking-email"`, `id="newsletter-checkbox"`, `id="newsletter-email"`.

---

### 39 — WCAG 4.1.2: Name, Role, Value — Destination Select ❌

**Location:** Booking form, destination `<select>` element
**Level:** A

The visible label reads "Choose Your Destination" but has no `for` attribute. The `<select>` has `id="dest-select"`, which does not match any `for` value on any `<label>`. The label and control are not programmatically associated.

**Fix:** Add `for="dest-select"` to the label element.

---

### 40 — WCAG 4.1.2: Name, Role, Value — Range Sliders ❌

**Location:** Booking form — `id="travelers"` and `id="budget"` range inputs
**Level:** A

Both range sliders have associated `<label>` elements for their names, but neither displays nor announces the current selected value. A screen reader user can set the slider but has no feedback about what value is currently selected without additional ARIA (`aria-valuetext`).

**Fix:** Add `aria-valuetext` or connect a live text output element via JavaScript to display and announce the current value.

---

### 41 — WCAG 1.3.1: Info and Relationships — Terms Checkbox ❌

**Location:** Booking form — terms and conditions checkbox
**Level:** A

The checkbox for agreeing to terms is not wrapped with a `<label>` element and the adjacent text is not associated via `for`/`id`. Screen readers will announce "checkbox, unchecked" with no indication of what is being agreed to.

**Fix:** Wrap the checkbox and its text in a `<label>`, or add `id="terms-check"` to the input and `for="terms-check"` to a `<label>`.

---

### 42 — WCAG 2.5.3: Label in Name — Submit Button ❌

**Location:** Booking form submit `<button>`
**Level:** A

The button's visible text reads "Request a Booking Quote" but its `aria-label` is "Send enquiry form". The `aria-label` overrides the visible label for assistive technology. These do not match, which breaks voice control software — a user speaking "click Request a Booking Quote" would fail to activate the button.

**Fix:** Either remove the `aria-label` (letting the visible text serve as the accessible name) or ensure the `aria-label` begins with the same words as the visible label.

---

### 43 — WCAG 1.4.4: Resize Text — Fine Print ❌

**Location:** Booking form `.fine-print` paragraph; footer `.footer-tiny` paragraph
**Level:** AA

Both elements use `font-size: 8px`. At 200% browser zoom, these scale to 16px — which, while legible in isolation, contains dense legal text that cannot be read at the original 8px without assistive magnification. Below 9px is considered effectively inaccessible.

**Fix:** Set a minimum of `font-size: 0.75rem` (12px) for any visible text.

---

### 44 — WCAG 1.3.1: Info and Relationships — Hidden Span ❌

**Location:** Gallery section — `<span class="visually-wrong">`
**Level:** A

A `<span>` with `display: none` is used in an attempt to provide supplementary text. `display: none` hides content from both visual users and assistive technology — it is not a valid technique for providing screen-reader-only text. The content is simply hidden from everyone.

**Fix:** Use the standard `.sr-only` / visually-hidden CSS technique: `position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap;`

---

### 45 — WCAG 4.1.1: Parsing — Duplicate id="departure-info" ❌

**Location:** Two `<p>` elements below the departures table
**Level:** A

Both paragraphs below the departures table share `id="departure-info"`. Duplicate IDs invalidate the HTML and can cause incorrect behaviour when AT or JavaScript references the ID.

**Fix:** Give each element a unique `id`, e.g. `id="departure-info-1"` and `id="departure-info-2"`.

---

### 46 — WCAG 3.1.2: Language of Parts — German Text ❌

**Location:** Second `#departure-info` paragraph
**Level:** AA

The sentence "Abreisedaten können sich aufgrund von Wetterbedingungen ändern." is written in German but has no `lang="de"` attribute. Screen readers using English TTS will mispronounce the German words.

**Fix:** Wrap in `<span lang="de">Abreisedaten können sich aufgrund von Wetterbedingungen ändern.</span>`

---

### 47 — WCAG 3.2.5: Change on Request — Footer External Links ❌

**Location:** Footer "Careers" link and "Visa Information" link
**Level:** AAA

Both links include `target="_blank"` to open in a new browser tab, with no visible warning or icon to alert users to this behaviour. This is disorienting for screen reader users, keyboard users, and users with cognitive disabilities who may not expect context to shift.

**Fix:** Append "(opens in a new tab)" text (visually or via `aria-label`) or a recognisable icon to both links.

---

### 48 — WCAG 4.1.1: Parsing — Duplicate id="footer-link-acc" ❌

**Location:** Footer support links column and footer tiny text
**Level:** A

`id="footer-link-acc"` is used on two separate anchor elements in the footer. This invalidates the HTML and causes unpredictable behaviour when AT or in-page scripts reference the ID.

**Fix:** Use unique IDs for each element.

---

### 49 — WCAG 3.1.2: Language of Parts — Spanish Text ❌

**Location:** `.footer-tiny` paragraph
**Level:** AA

The sentence "Nuestras aventuras son para todos los viajeros del mundo." is written in Spanish with no `lang="es"` attribute. Screen readers will attempt to pronounce it with English phonetics, making it unintelligible to Spanish-speaking users relying on TTS.

**Fix:** Wrap in `<span lang="es">Nuestras aventuras son para todos los viajeros del mundo.</span>`

---

### 50 — WCAG 1.3.5: Identify Input Purpose — autocomplete="off" ❌

**Location:** Booking form — first name input (`autocomplete="off"`)
**Level:** AA

The first name field has `autocomplete="off"`, which blocks browsers and assistive technologies from auto-populating the field. Users with motor impairments or cognitive disabilities rely on browser autofill to complete forms accurately and efficiently. Disabling it increases the burden on these users with no accessibility benefit.

**Fix:** Set `autocomplete="given-name"` on the first name field and `autocomplete="family-name"` on last name, `autocomplete="email"` on email, etc., following the [WCAG autocomplete token list](https://www.w3.org/TR/WCAG21/#input-purposes).

---

## Summary by WCAG Principle

| Principle | Issues |
|-----------|--------|
| **1 — Perceivable** | 6, 7, 9, 11, 13, 14, 15, 16, 17, 22, 24, 25, 28, 30, 31, 32, 33, 34, 44 |
| **2 — Operable** | 2, 3, 8, 12, 19, 21, 27, 29, 37, 47 |
| **3 — Understandable** | 35, 46, 49 |
| **4 — Robust** | 1, 4, 5, 20, 23, 26, 36, 38, 39, 40, 41, 42, 45, 48, 50 |

## Summary by WCAG Level

| Level | Issues |
|-------|--------|
| **A** | 1, 2, 4, 5, 6, 8, 9, 10, 12, 14, 15, 16, 17, 18, 20, 21, 23, 26, 28, 29, 30, 31, 32, 33, 34, 36, 37, 38, 39, 40, 41, 42, 44, 45, 48 |
| **AA** | 3, 7, 10, 13, 19, 22, 24, 25, 32, 35, 43, 46, 49, 50 |
| **AAA** | 27, 47 |
