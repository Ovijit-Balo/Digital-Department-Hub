# Digital Department Hub

A departmental platform with a dynamic website and CMS to manage news, blogs, scholarships, events, and multilingual content. The system also includes scholarship application management and auditorium/lab booking workflows.

---

## Local Development (Windows)

### Prerequisites

- Node.js 20+ (Node 22 is OK)
- MongoDB running on `mongodb://127.0.0.1:27017` (or set `MONGODB_URI` to MongoDB Atlas)
- (Optional) Redis for background queues. If you do not have Redis, set `ENABLE_QUEUE=false` in `backend/.env`.

### Environment files

- Copy `backend/.env.example` to `backend/.env` for local development.
- The backend also supports the repo root `.env` when you run commands from the workspace root.
- For container runs, `docker-compose.yml` reads `backend/.env`.

### 1) Install & start MongoDB (recommended)

Using `winget`:

```powershell
winget install -e --id MongoDB.Server
```

Then open **Services** (`services.msc`) and start **MongoDB Server**.

### 2) Run the backend API

Run these from the **`backend`** folder (so `npm` and `.env` line up). The app also loads `backend/.env` when the shell’s current directory is the repo root, but keeping `cd backend` avoids surprises.

```powershell
cd backend
copy .env.example .env
npm install
npm run dev
```

If MongoDB still fails to connect, check the log line **“Connecting to MongoDB at …”** — it shows which host the app is using. Update `MONGODB_URI` in `backend/.env` (for example Atlas: `mongodb+srv://user:pass@cluster/...` or local: `mongodb://127.0.0.1:27017/digital_department_hub`).

Optional demo data:

```powershell
npm run seed:demo
```

### 3a) Run backend tests

The backend test suite uses Jest and an in-memory MongoDB server for model and integration checks.

```powershell
cd backend
npm test
```

### 4) Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`, or `5174` if `5173` is already in use).

### 5) Run with Docker

If you prefer containers, use the compose stack from the repo root:

```powershell
docker compose up --build
```

This starts MongoDB, Redis, the backend API, the backend worker, and the frontend container.

---

## Project Overview

**Project A:** Core Department Website + CMS + Scholarship + Events/Auditorium/Lab Booking

**Modules:**

- Content Management System (CMS)
- Blog Management
- News & Announcements
- Public Engagement Tools
- Event Management
- Venue Reservation System
- Scholarship Management

---

## Scope

### 1. Public Website

- Dynamic departmental website
- News, announcements, and blog publishing
- Public event listings and calendar
- SEO metadata and sitemap generation
- Social sharing metadata

### 2. Content Management System (CMS)

- WYSIWYG editor for non-technical staff
- Page creation and editing
- Blog and news management
- Media gallery management (images and videos)
- Content scheduling and publishing

### 3. Multilingual Support

- Bangla and English language support
- Language switcher for users
- Translation workflow for administrators

### 4. Gallery Management

- Image and video uploads
- Organized gallery sections
- Public gallery display on the website

### 5. Contact & Inquiry System

- Contact forms for users
- Inquiry tracking system
- Admin response management

---

## Scholarship Management

The platform provides a complete scholarship management workflow.

Features include:

- Publishing scholarship notices
- Opening and closing application windows
- Supporting both **one-time** and **monthly scholarships**
- Managing **multiple scholarship categories with different amounts**
- Accepting and storing student applications
- Reviewing applications through an admin panel
- Exporting applications for evaluation
- Publishing recipient lists
- Posting regular scholarship updates

---

## Event Management

The system supports departmental event organization and participation.

Features include:

- Event creation and publishing
- Public event calendar
- Online event registration
- QR-based event check-in
- Post-event feedback collection

---

## Venue Booking System

Supports booking of departmental facilities such as auditoriums and laboratories.

Features include:

- Auditorium booking requests
- Lab reservation system
- Booking calendar
- Admin approval workflow
- Conflict detection for time slots
- Booking status notifications

---

## Key Deliverables

The project will deliver the following components:

### 1. Public Website Frontend

- Responsive design
- Dynamic content rendering
- Event listings and scholarship information

### 2. CMS Admin Panel

- Content creation and editing
- Media and gallery management
- Language management

### 3. Scholarship Management Panel

- Scholarship publishing
- Application review system
- Recipient announcement tools

### 4. Content Features

- News and blog publishing
- Image/video gallery
- Contact form management
- Language switching support

### 5. Event & Venue Management

- Event listing and registration system
- QR-based attendance tracking
- Auditorium and lab booking system
- Admin approval workflows

---

## Useful Commands

### Backend

```powershell
cd backend
npm run dev
npm test
npm run lint
npm run format
```

### Frontend

```powershell
cd frontend
npm run dev
npm run build
npm run lint
npm run format
```

### Docker

```powershell
docker compose up --build
```
