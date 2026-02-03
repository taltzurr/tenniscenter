# Tennis Center Management System

A modern web application for managing tennis center operations, including training schedules, coach dashboards, and event management. Built with React 19, Vite, and Firebase.

## 🚀 Features

- **Dashboard**: personalized views for Coaches and Managers to track daily activities and status.
- **Schedule Management**: Interactive calendar for scheduling trainings, competitions, and holidays.
- **Training Management**: Support for recurring trainings, monthly plans, and single sessions.
- **Notifications**: Real-time updates for important events and changes.
- **User Profiles**: Manage personal settings and profile information.
- **Drag & Drop**: Intuitive interface for managing schedule items.

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite
- **Styling**: CSS Modules, Responsive Design
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Backend/Service**: Firebase (Firestore, Auth)
- **Utilities**: 
  - `date-fns` for date manipulation
  - `react-big-calendar` for scheduling views
  - `@dnd-kit` for drag-and-drop interactions
  - `lucide-react` for iconography

## 📦 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/taltzurr/tennis-center.git
   cd tennis-center
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and add your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## 📜 Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build for production
- `npm run preview`: Preview the production build
- `npm run lint`: Run ESLint

## 📄 License

This project is private and proprietary.
