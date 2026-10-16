# 🛡️ EXTENSION TRACKER

**Extension Tracker** is a high-performance, secure, and modern campus permission and attendance management system. It provides real-time tracking of late-night extensions, student campus status, duty roaster assignments, and role-based access for administrators, faculty, discipline officers, and club coordinators.

---

## ✨ Key Features

### 🏢 Campus Status & Extension Tracker
- **Real-time Monitoring**: Instant tracking of students' "Inside" or "Outside" campus status with hostel filters.
- **Faculty-Controlled Late Extensions**: Late-night campus extensions can strictly **only be cancelled or reinstated by Faculty Incharge** (and Admin).
- **Club & Discipline Visibility**: Clubs and Discipline officers receive real-time notifications, warnings, and cancellation reasons whenever an extension is revoked.

### 📋 Duty Roaster Management
- **Discipline Squad Deployment**: Duty assignments are strictly scoped to **members of the Discipline Club**.
- **Dual Authority**: Managed exclusively by the **Discipline Club** and **Faculty Incharge** (plus Admin).
- **Conflict Prevention**: Unique date-based assignment tracking to avoid double-booking.

### 🔐 Security & Access Control
- **Flexible Domain Login**: Login seamlessly with `@hillfair.com`, `@nimbus.com`, or username.
- **Password Visibility**: Convenient toggle to show/hide passwords on login, password change modal, and user management.
- **Impersonation Mode**: Admins can view and manage data as any faculty member.

### 💎 Premium Experience
- **Glassmorphic UI**: Beautiful dark-mode interface with frosted glass effects and smooth transitions.
- **Dynamic Dashboard**: Interactive calendar integration using **FullCalendar** for historical data visualization.
- **High Availability**: Deployed on **Vercel** with a high-performance **Neon PostgreSQL** database.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ (App Router), React, Lucide Icons
- **Backend**: Next.js API Routes (Serverless)
- **Database**: PostgreSQL (Neon Serverless)
- **Authentication**: JWT (JSON Web Tokens) with Secure Local Storage
- **Styling**: Modern Vanilla CSS with CSS Variables & Mobile Flex-Layouts

---

## 🚀 Getting Started

### 1. Prerequisite
Ensure you have **Node.js 18+** installed on your system.

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Neeemis/nimbus-attendance-link.git
cd nimbus-attendance-link
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and add your credentials:
```env
DATABASE_URL=your_postgres_url
JWT_SECRET=your_secret_key
```

### 4. Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

- `app/`: Next.js App Router (Pages & APIs)
- `components/`: Reusable UI components (Navbar, PageWrapper, etc.)
- `lib/`: Shared utilities (Database connection, Auth helpers, API client)
- `public/`: Assets and static files

---

## 🔗 Live Deployment
The project is automatically deployed on Vercel:  
[nimbus-attendance-link.vercel.app](https://nimbus-attendance-link.vercel.app)

---

**Built with ❤️ for NIMBUS.**
