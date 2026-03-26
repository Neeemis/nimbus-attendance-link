# 🛡️ NAP: NIMBUS ATTENDANCE PORTAL

**NAP** is a high-performance, secure, and modern attendance management system designed for **NIMBUS**. It provides streamlined tracking of student campus status, duty assignments, and role-based access for administrators, faculty, and discipline officers.

---

## ✨ Key Features

### 🏢 Campus Status Tracker
- **Real-time Monitoring**: Instant tracking of students' "Inside" or "Outside" status.
- **Girls' Hostel Focus**: Specialized management for **Ambika**, **Satpura**, and **Parvati** hostels.
- **Mobile Optimized**: Enlarged touch targets and reactive focus animations for quick field marking.

### 📋 Duty Roaster Management
- **Individual Assignment**: Assign duty statuses to specific student groups.
- **Conflict Prevention**: Unique date-based assignment tracking to avoid double-booking.
- **Scoped Visibility**: Users only see students relevant to their assigned scope.

### 📊 Admin Control Center
- **Impersonation Mode**: Admins can view and manage data as any faculty member.
- **Global Reporting**: Comprehensive attendance views and data management tools.
- **Secure Authentication**: JWT-based security with managed user roles.

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
