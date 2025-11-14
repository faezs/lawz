import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { LoginPage } from './components/LoginPage';
import { Dashboard } from './components/Dashboard';
import { DocumentCreator } from './components/DocumentCreator';
import { DocumentViewer } from './components/DocumentViewer';
import { LawFirmSelector } from './components/LawFirmSelector';
import { Header } from './components/Header';

function App() {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        {isAuthenticated && <Header />}

        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route
              path="/login"
              element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />}
            />
            <Route
              path="/"
              element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
            />
            <Route
              path="/create"
              element={isAuthenticated ? <DocumentCreator /> : <Navigate to="/login" />}
            />
            <Route
              path="/document/:id"
              element={isAuthenticated ? <DocumentViewer /> : <Navigate to="/login" />}
            />
            <Route
              path="/lawfirms"
              element={isAuthenticated ? <LawFirmSelector /> : <Navigate to="/login" />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
