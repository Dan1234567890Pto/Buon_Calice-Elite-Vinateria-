import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClienteView from './components/Clientes/ClienteView';
import PerfilClienteView from './components/Clientes/PerfilClienteView';
import EmpleadoView from './components/Empleado/EmpleadoView';
import LoginView from './components/Empleado/LoginView';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

export default function App() {
    return (
        <BrowserRouter>
            <div className="app-container">
                <main className="app-main-content">
                    <Routes>
                        {/* Vista principal del cliente (Catálogo público) */}
                        <Route path="/" element={<ClienteView />} />

                        {/* Login de clientes / perfil */}
                        <Route path="/perfil" element={<PerfilClienteView />} />

                        {/* Login administrativo (Empleados / Admins) */}
                        <Route path="/login" element={<LoginView />} />

                        {/* Panel protegido para Admin y Empleados */}
                        <Route element={<ProtectedRoute allowedRoles={['admin', 'empleado']} />}>
                            <Route path="/admin" element={<EmpleadoView />} />
                        </Route>

                        {/* Redirección por defecto al catálogo */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}