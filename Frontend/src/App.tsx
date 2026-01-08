// Aplicación Principal
// Configuración de rutas y proveedores

import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';

// Componentes
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehiculos from './pages/Vehiculos';
import Choferes from './pages/Choferes';
import Clientes from './pages/Clientes';
import Materiales from './pages/Materiales';
import Auditoria from './pages/Auditoria';
import Viajes from './pages/Viajes';
import Mantenimientos from './pages/Mantenimientos';
import PagosChoferes from './pages/PagosChoferes';
import Reportes from './pages/Reportes';
import ChoferDetail from './pages/ChoferDetail';
import Alertas from './pages/Alertas';

import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Ruta pública */}
            <Route path="/login" element={<Login />} />

            {/* Rutas protegidas */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/vehiculos" element={<Vehiculos />} />
                <Route path="/choferes" element={<Choferes />} />
                <Route path="/choferes/:id" element={<ChoferDetail />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/materiales" element={<Materiales />} />
                <Route path="/viajes" element={<Viajes />} />
                <Route path="/mantenimientos" element={<Mantenimientos />} />
                <Route path="/pagos-choferes" element={<PagosChoferes />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="/alertas" element={<Alertas />} />
                <Route path="/auditoria" element={<Auditoria />} />
              </Route>
            </Route>

            {/* Redirigir rutas no encontradas */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>

        {/* Notificaciones Toast - Light Mode Moderno */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'bg-white text-slate-800 shadow-xl border border-slate-100 rounded-2xl p-4 font-medium',
            style: {
              background: '#ffffff',
              color: '#1e293b',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              borderRadius: '16px',
              border: '1px solid #f1f5f9',
              padding: '16px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ecfdf5',
              },
              style: {
                borderLeft: '4px solid #10b981',
              }
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fef2f2',
              },
              style: {
                borderLeft: '4px solid #ef4444',
              }
            },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
