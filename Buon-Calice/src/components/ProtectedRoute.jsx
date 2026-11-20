import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles }) {
    const sesionRaw = localStorage.getItem('usuario_admin') || localStorage.getItem('usuario');
    const usuarioSesion = sesionRaw ? JSON.parse(sesionRaw) : null;

    if (!usuarioSesion) {
        return <Navigate to="/login" replace />;
    }

    const rolUsuario = usuarioSesion?.rol?.toLowerCase();
    const rolesPermitidos = allowedRoles ? allowedRoles.map(r => r.toLowerCase()) : [];

    if (allowedRoles && !rolesPermitidos.includes(rolUsuario)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}