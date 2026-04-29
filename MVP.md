# CRM Artisan - MVP Specification

## 1. Overview
**Target Audience:** Independent artisans (plumbers, electricians, carpenters, landscapers, etc.) who operate primarily on their own or with a very small crew.  
**Core Problem:** Artisans currently manage clients, addresses, and quotes through a messy mix of text messages, paper notebooks, and disjointed phone contacts. They lose track of who needs what done, where it needs doing, and whether a quote was sent.  
**Solution:** A lightweight, mobile-friendly mini-CRM focusing strictly on what matters on the road: who the client is, where the work site is, and how much the job costs.

---

## 2. User Persona
**"One-Truck Tommy"**
- **Tech Savvy:** Low to moderate. Prefers simple, large buttons.
- **Environment:** Mostly using a mobile phone from the front seat of a van or out on a physical job site.
- **Needs:** Speed. Needs to log a new lead's number and address in 30 seconds before driving to the next job. Needs to instantly pull up quotes when a client calls unexpectedly.

---

## 3. Main Features & Data Models

### A. Client Management
A simple rolodex of customers to keep them separated from personal phone contacts.
* **Data Needed:**
  * First Name / Last Name
  * Phone Number
  * Email (Optional)
  * Notes (e.g., "Beware of dog", "Call ahead before arriving")

### B. Job Sites (Locations)
Because a single client (like a landlord or property manager) might have multiple properties where work is done, Job Sites are treated as independent entities linked to a Client.
* **Data Needed:**
  * Client ID (Foreign Key)
  * Street Address, City, Zip
  * Access Instructions (e.g., "Gate code is 1234")

### C. Jobs & Quotes
The actual unit of work. Every time an artisan goes out for a distinct task, it gets logged here.
* **Data Needed:**
  * Job Site ID (Foreign Key)
  * Title/Description (e.g., "Fix leaking master bathroom sink")
  * Status: `Lead` → `Quoted` → `In Progress` → `Completed`
  * Quote Amount ($)
  * Start Date / Expected Completion

---

## 4. Primary User Flows

### Flow 1: Onboarding a New Lead on the Road
1. Artisan receives a phone call from a new prospective client.
2. Artisan opens the app and taps a floating **"+" (Quick Add) button**.
3. Artisan enters the Client's Name and Phone Number.
4. App prompts: *"Add a Job Site?"* Artisan enters the address.
5. App prompts: *"What's the job?"* Artisan enters "Rewire kitchen" and leaves status as `Lead`.
6. Done. (Entire flow takes < 60 seconds).

### Flow 2: Writing & Tracking a Quote
1. Artisan visits the Job Site and assesses the work.
2. Opens the specific Job record in the app.
3. Enters an estimated Quote Amount ($1,500) and hits **"Mark as Quoted"**.
4. (MVP Limitation: The app only tracks the *number*; the artisan still verbally tells or texts the client. Later versions can generate PDFs).

### Flow 3: The Dashboard / Daily Routine
1. Over morning coffee, Artisan opens the app.
2. The dashboard shows three simple lists grouped by Status:
   - **Needs Quote (Leads)**: *Reminds them to visit the site.*
   - **Pending Approval (Quoted)**: *Reminds them to follow up via text.*
   - **Active Jobs (In Progress)**: *Tells them where to drive today.*

---

## 5. Technology constraints (MVP)
- **Framework:** Next.js (App Router)
- **Database/Auth:** Supabase
- **Styling:** Tailwind CSS (Mobile-first approach is absolutely critical). 
- **Offline Mode:** Not required for V1, but the UI should be fast and snappy.