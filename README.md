# 🎴 Loop

Loop is a community-driven post discussion platform where users can share questions
or ideas on any topic and engage in meaningful, threaded conversations.
The platform emphasizes simplicity, discoverability, and community interaction
through upvotes and bookmarks.

## Tech Stack

- **Frontend**: React.js, React Router, Vite
- **Backend**: Express.js, better-sqlite3, JWT authentication
- **Styling**: Custom CSS with dark theme

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1. **Install backend dependencies:**
```bash
cd backend
npm install
```

2. **Install frontend dependencies:**
```bash
cd frontend
npm install
```

### Running the Application

1. **Start the backend server:**
```bash
cd backend
npm run dev
```
The API will be available at `http://localhost:3001`

2. **Start the frontend development server:**
```bash
cd frontend
npm run dev
```
The app will be available at `http://localhost:5173`

OR

2. **Start concurrently in the top-level folder: (recommended in a docker environment)**
```bash
npm install
npm run dev
```
The app will be available at `http://localhost:5173`
