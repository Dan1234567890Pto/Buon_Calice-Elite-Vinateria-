import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ allowedRoles }) {
    const usuarioSesion = JSON.parse(localStorage.getItem('usuario_admin'));

    // Si no ha iniciado sesión, redirige al login
    if (!usuarioSesion) {
        return <Navigate to="/login" replace />;
    }

    // Normalizamos a minúsculas para evitar fallos por mayúsculas de SQL Server
    const rolUsuario = usuarioSesion?.rol?.toLowerCase();
    const rolesPermitidos = allowedRoles ? allowedRoles.map(r => r.toLowerCase()) : [];

    if (allowedRoles && !rolesPermitidos.includes(rolUsuario)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}