import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClienteView from './components/Clientes/ClienteView';
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
                        {/* 1. VISTA CLIENTES (Pública): Cualquier usuario accede sin contraseña */}
                        <Route path="/" element={<ClienteView />} />

                        {/* 2. ACCESO ADMINISTRATIVO: Formulario de inicio de sesión */}
                        <Route path="/login" element={<LoginView />} />

                        {/* 3. VISTA EMPLEADOS / ADMIN (Protegida): Solo accesible con sesión activa */}
                        <Route element={<ProtectedRoute allowedRoles={['admin', 'empleado']} />}>
                            <Route path="/admin" element={<EmpleadoView />} />
                        </Route>

                        {/* Redirección por defecto ante URLs inexistentes */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}