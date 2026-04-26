# Resource Management Frontend

A modern React application for the Resource Management System, built with Vite, Tailwind CSS, and React Router for managing educational resources.

## 🚀 Features

### User Interface

- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern UI**: Clean, intuitive interface for educational management
- **Navigation**: React Router for seamless page transitions
- **Icons**: React Icons for consistent iconography

### Functionality

- **Student Portal**: Registration, login, profile management
- **Dashboard**: Overview of academic resources and schedules
- **Profile Management**: Update personal information and profile pictures
- **Resource Browsing**: View courses, faculty, classrooms, and schedules

### Technical Features

- **Fast Development**: Vite for lightning-fast hot reload
- **Type Safety**: TypeScript support for better development experience
- **API Integration**: Axios for seamless backend communication
- **State Management**: React Hooks for local state management
- **Cookie Management**: js-cookie for session handling

## 🛠️ Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios
- **Icons**: React Icons
- **Development**: ESLint, PostCSS
- **Type Checking**: TypeScript (dev dependency)

## 📋 Prerequisites

- Node.js (v16 or higher)
- Backend API running (see BackEnd README)

## ⚡ Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:3000/api
```

For production:

```env
VITE_API_BASE_URL=https://your-backend-url.com/api
```

### 3. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### 4. Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
FrontEnd/
├── public/                    # Static assets
├── src/
│   ├── assets/               # Images, fonts, etc.
│   ├── pages/                # React components/pages
│   │   ├── home.jsx          # Home/dashboard page
│   │   └── ...               # Other pages
│   ├── api.js                # API client configuration
│   ├── App.jsx               # Main app component
│   ├── App.css               # Global styles
│   ├── index.css             # Tailwind imports
│   └── main.jsx              # App entry point
├── index.html                # HTML template
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
├── postcss.config.js         # PostCSS configuration
└── package.json
```

## 🎨 Styling

### Tailwind CSS Configuration

The project uses Tailwind CSS with custom configuration:

```javascript
// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Custom theme extensions
    },
  },
  plugins: [],
};
```

### CSS Structure

- `index.css` - Tailwind directives and global styles
- `App.css` - Component-specific styles
- Utility-first approach with Tailwind classes

## 🔌 API Integration

### API Client Setup

The application uses Axios for API communication:

```javascript
// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Request interceptor for auth headers
api.interceptors.request.use((config) => {
  const token = getCookie("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Available Endpoints

- **Authentication**: `/register`, `/login`
- **User Management**: `/user-personal/*`
- **Profile Pictures**: `/profile/*`
- **Resources**: Various endpoints for courses, faculty, etc.

## 🧭 Routing

### React Router Configuration

```jsx
// App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        {/* Other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

## 📱 Pages/Components

### Core Pages

- **Home/Dashboard**: Main landing page with resource overview
- **Login**: Student authentication
- **Register**: New student registration
- **Profile**: Student profile management
- **Schedule**: Class schedules and routines

### Component Structure

- Functional components with React Hooks
- Props for data passing
- Event handlers for user interactions
- Conditional rendering for dynamic content

## 🔧 Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🚀 Deployment

### Vercel Deployment

The frontend is configured for Vercel deployment:

1. **Build Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

2. **Environment Variables**:
   - `VITE_API_BASE_URL`: Your backend API URL

3. **Domain**: Configure custom domain if needed

### Build Optimization

Vite provides excellent build optimization:

- Code splitting
- Tree shaking
- Asset optimization
- CSS minification

## 🧪 Testing

### Linting

```bash
npm run lint
```

ESLint configuration includes:

- React recommended rules
- React Hooks rules
- Import sorting
- Code formatting

### Manual Testing

- Test all user flows: registration, login, profile updates
- Verify responsive design on different screen sizes
- Test API error handling
- Validate form submissions

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com/)
- [Axios Documentation](https://axios-http.com/docs/)

## 🤝 Contributing

1. Follow React best practices
2. Use functional components with hooks
3. Maintain consistent styling with Tailwind
4. Test components thoroughly
5. Follow the existing file structure

## 📄 License

This project is licensed under the MIT License.
