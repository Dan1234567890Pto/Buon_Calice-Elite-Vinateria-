import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LoginView() {
    const [correo, setCorreo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setCargando(true);

        try {
            const response = await fetch('https://localhost:7263/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo, password })
            });

            if (!response.ok) {
                const dataError = await response.json().catch(() => null);
                throw new Error(dataError?.mensaje || 'Credenciales incorrectas');
            }

            const usuario = await response.json();

            // Normalización de claves enviadas desde C# (mayúsculas/minúsculas)
            const usuarioNormalizado = {
                ...usuario,
                rol: usuario.rol || usuario.Rol,
                nombre: usuario.nombre || usuario.Nombre,
                correo: usuario.correo || usuario.Correo,
                idUsuario: usuario.idUsuario || usuario.IdUsuario
            };

            // Guardar usuario autenticado
            localStorage.setItem('usuario_admin', JSON.stringify(usuarioNormalizado));

            // Redirigir al panel de administración
            navigate('/admin');

        } catch (err) {
            console.error("Error al autenticar:", err);
            setError(err.message === 'Failed to fetch'
                ? 'No se pudo conectar con el servidor API. Revisa que esté corriendo en Visual Studio.'
                : err.message
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="login-container" style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', backgroundColor: '#16120E', borderRadius: '16px', border: '1px solid #26201B', color: '#fff' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'serif', color: '#F3ECE0' }}>Acceso Administrativo</h2>

            {error && (
                <div style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.75rem', borderRadius: '8px', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#C5A059', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correo Electrónico:</label>
                    <input
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        required
                        placeholder="admin@buoncalice.com"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #382E26', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#C5A059', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contraseña:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #382E26', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}
                    />
                </div>

                <button
                    type="submit"
                    disabled={cargando}
                    style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#C5A059', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                    {cargando ? 'Verificando...' : 'Iniciar Sesión'}
                </button>
            </form>
        </div>
    );
}