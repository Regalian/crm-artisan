# CRM Artisan - UI Consistency Guide

## 1. Core Layout Structure
- **Sidebar Navigation:** Fixed on the left side. Width: `64` (w-64 or 256px) on desktop. Hidden or reduced to a bottom or hamburger menu on mobile.
- **Main Content Area:** Takes up the remaining space on the right (`flex-1`).
- **Primary Actions:** Placed at the top right of the main content area (e.g., "Add Client", "Create Quote").

## 2. Typography
- **Primary Font:** `Inter` or standard sans-serif (`font-sans`).
- **Headings:**
  - Page Titles: `text-2xl` or `text-3xl`, `font-bold`, `text-zinc-900` (dark: `text-white`).
  - Section Titles: `text-lg` or `text-xl`, `font-semibold`.
- **Body Text:** `text-sm` or `text-base`, `text-zinc-600` (dark: `text-zinc-400`).

## 3. Colors & Branding
- **Primary Brand Color:** Blue (`bg-blue-600` for default state, `hover:bg-blue-700`).
- **Destructive/Danger Color:** Red (`bg-red-600`, `hover:bg-red-700`).
- **Backgrounds:** 
  - Main App Background: `bg-zinc-50` (dark: `bg-zinc-900`).
  - Sidebar / Cards / Modals: `bg-white` (dark: `bg-black`).
- **Borders:** Subtle borders around cards/tables (`border-zinc-200`, dark: `border-zinc-800`).

## 4. Components & Interactive Elements
- **Buttons:**
  - **Primary:** `bg-blue-600 text-white rounded-md px-4 py-2 font-medium transition-colors`.
  - **Secondary:** `bg-white text-zinc-700 border border-zinc-300 rounded-md px-4 py-2 hover:bg-zinc-50`.
  - **Destructive:** `bg-red-600 text-white rounded-md px-4 py-2 hover:bg-red-700`. (Must present confirmation modal before executing).
- **Modals:** All forms (Add Client, Edit Job) open in a centered modal over the page with a blurred or semi-transparent backdrop (`bg-black/50`).
- **Lists behavior:**
  - **Desktop:** Render as structured Tables (with clear headers).
  - **Mobile:** Render as stacked Cards (flex column).
- **Feedback:** Use Toast messages at the bottom right or top right to confirm actions (e.g., "Client automatically saved").

## 5. Spacing System
- **Page Padding:** `p-4` on mobile, `p-8` on desktop.
- **Gap between elements:** Use Tailwind's spacing scale consistently (`gap-4` between form fields, `gap-6` between major sections).
- **Border Radius:** `rounded-lg` for large cards/modals, `rounded-md` for buttons and inputs.
