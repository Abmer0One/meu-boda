# Walkthrough - Meu Boda (Wedding & Event Planner)

We have updated the codebase and database of **Meu Boda** to turn it from a wedding-only manager into a generic Event Planning platform that supports weddings, birthdays, proposals/engagements, and other events. The database is updated, all policies are rewritten to explicit operations, and all API roles are granted appropriate privileges.

---

## 🛠️ Tecs & Environment Configured
1. **Frontend:** Next.js 15, React 19, Tailwind CSS v4, Framer Motion, TanStack Query, Zod, and Lucide React icons.
2. **Local Sandbox:** Supabase Local configured in Docker Desktop with container services running on customized ports (API: `64321`, DB: `64322`, Studio: `64323`).
3. **Database Schema & RLS:** All tables (`events`, `guests`, `tables`, `checkins`, `tasks`, `budgets`, `vendors`, `documents`) are deployed with strict foreign key constraints. RLS is explicitly configured for individual operations (SELECT, INSERT, UPDATE, DELETE) rather than using a single `FOR ALL` query check, which prevents insert blocks.
4. **Multi-type Events:** Added `type` text column (validated as `'casamento' | 'aniversario' | 'pedido' | 'outro'`) to the `events` table.
5. **Database Privilege Grants:** Explicitly granted SELECT, INSERT, UPDATE, and DELETE privileges to `authenticated`, `anon`, and `service_role` database roles on all 8 tables to resolve PostgREST API permission denied errors (SQL code `42501`).

---

## 📦 Implemented Modules

### 1. Authentication (`/login`, `/register`)
- Zod schema validations for login and registrations.
- Connects directly with local Supabase Auth.

### 2. Main Layout & Event Selector (`/admin/layout.tsx`)
- Sidebar containing all planning modules (Dashboard, Seating Chart, Guests, Tasks, etc.).
- Dropdown selector that lets organizers switch between multiple events.
- **Dynamic Event Creation Modal:** Includes a "Tipo de Evento" dropdown. The labels, input placeholders, and dates adapt dynamically based on whether you are creating a Wedding, Birthday, Proposal, or Other Event.

### 3. Dashboard (`/admin/dashboard`)
- KPI cards (remaining days, total guests, RSVPs, pending tasks) animated using Framer Motion counters.
- Visual charts using `recharts` (Pie chart of RSVPs, Bar chart for budgets by category).
- Previews of upcoming tasks and recent gate check-ins.

### 4. Event Settings (`/admin/eventos`)
- Detailed configuration for event theme, title, route slug, ceremony venue, banquet Quinta, and cover image.
- Updated terminology from "Casamento" to generic "Evento" labels, allowing it to adapt to birthday parties and proposals.
- Visual card previewing how the public invitation looks.

### 5. Guest Management (`/admin/convidados`)
- Complete CRUD with custom modal dialogs.
- Search and RSVP status filtering.
- Client-side Excel import and export utilities (`xlsx`) to batch populate guests.

### 6. Seating Arrangement (Tables) (`/admin/mesas`)
- Table registry (name and capacity constraints).
- Native HTML5 Drag and Drop board: drag guests from "Unseated" and drop them onto tables, with real-time database updates and visual occupancy progress meters.

### 7. Tasks & Checklist (`/admin/tarefas`)
- Planning checklist filtered by priorities (High, Medium, Low) and deadline dates.
- Interactive checkboxes to instantly mark tasks as complete in the database.

### 8. Category Budgeting (`/admin/orcamento`)
- Category tracking (buffet, flowers, DJ, videographer, etc.).
- Auto-updated estimations, paid amounts, remaining balances, and progress bars.

### 9. Supplier Registry (`/admin/fornecedores`)
- Contact directory for contract values, active status, telephone, email, and websites.

### 10. Document Archiving (`/admin/documentos`)
- Secure file upload to private Supabase Storage buckets.
- Inline preview and document removal buttons.

### 11. Reports (`/admin/relatorios`)
- Export structured reports to A4 PDF using `jsPDF`.
- Export detailed planning sheets to Excel.

### 12. Entrance Gate / Portaria (`/admin/checkin`)
- Real-time check-in controller.
- Manual list checking and simulated QR code input parser (scans raw QR tokens, checks databases, logs entry, and fires a Confetti celebration).

### 13. Public Guest Portal (`/convite/[token]`)
- Fully public guest portal with dynamic countdown.
- Map links, event theme details, and table numbers.
- Confirmation form (RSVP status, extra companions, notes/allergies).
- Live check-in QR Code generation and PDF sheet downloading.
- **Collaborative Live Gallery:** Added a new **"Galeria Colaborativa (Meu Boda Live)"** card at the bottom of the page allowing guests to upload photos/videos with optional captions directly from their mobile camera or photo library. Approved media is listed in a responsive grid.

### 14. Event Gallery Moderation (`/admin/galeria`)
- Renamed the menu item to **"Galeria Foto"** in the sidebar navigation menu.
- Added full moderation capabilities (Approve, Reject, Delete) for planners.
- Planners can transition media states between `pending`, `approved`, and `rejected`.
- Direct link to launch the live slideshow projection.

### 15. Mobile Native Look-and-Feel & Responsiveness
- **Bottom Navigation Bar:** Fixed a native tab bar at the bottom of the viewport on mobile devices (`md:hidden`) with options: Painel (Dashboard), Convidados, Galeria, and Check-in.
- **Dashboard Overflow Fixes:**
  - Designed the KPI Stats Cards to dynamically stack the icon and text vertically on very small screens (under `380px`), shrinking icons and font sizes.
  - Made the Budget Card wrap elements cleanly in columns on mobile, preventing overlap of Kwanza currency numbers.
  - Excluded content overlapping by adding dynamic bottom padding to the main content container (`pb-24` on mobile).

### 16. WebRTC Camera-Based QR Code Scanner (`/admin/checkin`)
- Replaced the simulated check-in card with a real WebRTC-based camera scanner using `html5-qrcode`.
- The scanner features a radar scanner overlay laser animation to make it look like a native application.
- Clicking the scanner card requests camera permission, starts the back-facing camera stream, decodes the check-in token, and processes the guest validation automatically before shutting down.
- Integrated dynamic imports to prevent Next.js SSR crashes during build.

### 17. Brand Logo Integration (`/public/logo.png`)
- Saved the brand logo in the public assets folder as `logo.png`.
- Replaced the plain-text headers with the logo in the following views:
  - **Login Screen (`/login`):** Renders the full logo in the center above the form.
  - **Register Screen (`/register`):** Renders the full logo in the center above the form.
  - **Dashboard Desktop Sidebar Header (`/layout.tsx`):** Displays the small brand logo next to the site name.
  - **Dashboard Mobile Header (`/layout.tsx`):** Displays the small brand logo next to the site name.

---

## 🔍 Verification Flow & Setup

Follow these steps to run and test **Meu Boda** locally:

### 1. Start Dev Server
Ensure your Docker Desktop is running, start the Supabase TCP forwarder, and execute:
```bash
node forward-supabase.js
npm run dev -- -H 0.0.0.0
```
Open [http://localhost:3000](http://localhost:3000) or `http://192.168.18.11:3000` on your phone.

### 2. Database Administration
To inspect the PostgreSQL database or view buckets directly, access **Supabase Studio** at:
[http://127.0.0.1:64323](http://127.0.0.1:64323)

### 3. Verify Mobile and QR Scanner Features
- **Mobile Navigation:** Open the admin panel on your phone. Check that the bottom navigation bar is fixed at the foot of the screen and that dashboard card text wraps cleanly.
- **Camera Scanner:** Navigate to `/admin/checkin` on your mobile phone browser (by clicking "Check-in" on the bottom navigation). Tap the **"Iniciar Leitor de Câmara"** card, authorize camera permissions, and point your phone to scan a guest's QR code.
