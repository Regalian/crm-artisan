# CRM Artisan - Interface & Design Specification

## 1. Global Navigation & Layout
Since the primary device is a phone, the app relies on a **Bottom Navigation Bar** for immediate, thumb-friendly access to core features, and a **Top App Bar** for context and secondary actions.

**Bottom Navigation Bar (Always visible):**
- **Dashboard (🏠):** Your daily summary.
- **Clients (👥):** Rolodex of customers.
- **Jobs & Quotes (📋):** Active work and estimates.
- **Quick Add (+):** A highly prominent, floating-style action button in the center to instantly log a lead, quote, or client on the fly.

**Top App Bar (Contextual):**
- Left: Back button (when nested).
- Center: Screen Title (e.g., "Active Jobs").
- Right: Settings gear / User Profile (Log out, business details).

---

## 2. Screen-by-Screen Layouts

### A. Authentication (Login / Signup)
- **Layout:** Centered, minimalist white background with a subtle logo.
- **Content:**
  - Large, high-contrast input fields (Email, Password).
  - Prominent "Sign In" button.
  - "Continue with Google/Apple" for fast, password-less entry.

### B. The Dashboard (The "Morning Coffee" Screen)
*Designed to tell the artisan exactly what they need to do today at a glance.*
- **Top Header:** "Good morning, Tommy. You have 3 jobs today."
- **Section 1: Active Jobs Today:** Large card layout. Shows the job title, client name, and a bold address. Includes a "Map/Navigate" icon button.
- **Section 2: Pending Quotes:** A swipeable horizontal list of leads needing quotes or quotes awaiting client approval. Alerts them to follow up.
- **Section 3: Recent Activity:** A brief chronological list of what happened yesterday (e.g., "Invoice paid by Sarah", "Completed Sink Repair").

### C. Clients List
*A clean, searchable rolodex.*
- **Top Bar:** Search bar to quickly find a client by name or phone number.
- **List Items:** Alphabetical rows containing:
  - Client Name.
  - Quick Action Buttons: Call (📞) and Text (💬) directly from the list.
- **Client Detail View (Tapping a client):**
  - High-level details (Name, phone, email, notes like "Beware of dog").
  - Linked Job Sites (Properties they own).
  - History of past jobs and revenue.

### D. Job Sites (Locations)
*Nested under the Client Detail View, or selectable when creating a job.*
- **Layout:** A card showing the physical address.
- **Content:** 
  - Address text with a "Get Directions" button that deep-links to Google Maps/Apple Maps.
  - Site-specific notes (e.g., "Lockbox code is 1234").
  - A sub-list of jobs specific to that address.

### E. Jobs List
*A Kanban-style or simple tabbed list.*
- **Tabs at the Top:** `Leads` | `Quoted` | `In Progress` | `Done`
- **List Items:** Cards displaying:
  - Job Title (e.g., "Main Breaker Swap").
  - Associated Client & Address.
  - Big, bold quote amount (e.g., "$1,200").
  - Status badge (color-coded).

### F. Quote Generation & Form (The Money Maker)
*Designed to be filled out with greasy thumbs in the driver's seat, allowing dynamic and exact pricing.*
- **Creation Flow:**
  1. Taps a Job -> Taps "Create Quote" or "Edit Quote".
- **Dynamic Form Layout:**
  - **Line Items Section:** A dynamic list where the user can tap "Add Item" to spawn a new row.
    - Each row has: `Description` (e.g., Copper Pipe), `Quantity`, `Unit Price`.
    - Each row features a highly visible "Delete/Trash" icon to easily remove it.
  - **Real-Time Calculation:** As the artisan types quantities or prices, a sticky "Total: $X.XX" bar at the bottom of the screen updates instantly.
- **Action Buttons:**
  - **"Save Quote Draft"**: Saves progress to the database without finalizing.
  - **"Generate & Export PDF"**: Saves the quote, generates a stark, professional PDF with the business logo, and directly triggers the phone's native Share Sheet (to Text or Email the client).

---

## 3. UI/UX Principles for Construction Context
- **Chunky Tap Targets:** Buttons must be at least `48x48px`. Artisans might be wearing thin protective gloves or have dirty screens; precision tapping is impossible.
- **High Contrast:** Bright sunlight on a screen makes subtle grays unreadable. Use stark, high-contrast text.
- **Type less, tap more:** Use dropdowns, toggle switches, and preset lists wherever possible over requiring actual keyboard typing.