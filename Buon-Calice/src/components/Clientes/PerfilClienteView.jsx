import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PerfilClienteView() {
    const navigate = useNavigate();
    const API_AUTH = 'https://localhost:7263/api/auth';

    const [esRegistro, setEsRegistro] = useState(false);
    const [cargando, setCargando] = useState(false);

    // Obtener sesión previa si existe
    const [cliente, setCliente] = useState(() => {
        const guardado = localStorage.getItem('cliente_buoncalice') || localStorage.getItem('usuario_cliente');
        return guardado ? JSON.parse(guardado) : null;
    });

    const [formData, setFormData] = useState({
        nombre: '',
        correo: '',
        password: '',
        telefono: ''
    });

    // Control del campo Nombre: Elimina números en tiempo real
    const handleNombreChange = (e) => {
        const valorLimpio = e.target.value.replace(/[0-9]/g, '');
        setFormData(prev => ({ ...prev, nombre: valorLimpio }));
    };

    // Control del campo Teléfono: Acepta solo números y limita a 10 dígitos
    const handleTelefonoChange = (e) => {
        const soloNumeros = e.target.value.replace(/\D/g, '');
        if (soloNumeros.length <= 10) {
            setFormData(prev => ({ ...prev, telefono: soloNumeros }));
        }
    };

    const handleInputChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Envío de Login
    const handleLogin = async (e) => {
        e.preventDefault();
        if (!formData.correo.trim() || !formData.password.trim()) {
            alert('⚠️ Ingrese su correo y contraseña.');
            return;
        }

        setCargando(true);
        try {
            const res = await fetch(`${API_AUTH}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    correo: formData.correo.trim(),
                    password: formData.password
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.mensaje || 'Credenciales incorrectas');

            const rawUsuario = data.usuario || data;
            const usuarioObj = {
                ...rawUsuario,
                rol: (rawUsuario.rol || 'cliente').toLowerCase()
            };

            localStorage.setItem('cliente_buoncalice', JSON.stringify(usuarioObj));
            localStorage.setItem('usuario_cliente', JSON.stringify(usuarioObj));
            setCliente(usuarioObj);
            navigate('/');
        } catch (err) {
            alert(`⚠️ ${err.message}`);
        } finally {
            setCargando(false);
        }
    };

    // Envío de Registro con Validaciones Estrictas
    const handleRegistro = async (e) => {
        e.preventDefault();

        // 1. Validar campos obligatorios
        if (!formData.nombre.trim() || !formData.correo.trim() || !formData.password.trim() || !formData.telefono.trim()) {
            alert('⚠️ Todos los campos son obligatorios.');
            return;
        }

        // 2. Validar que el teléfono sea de exactamente 10 dígitos
        if (formData.telefono.length !== 10) {
            alert('⚠️ El número de teléfono debe tener exactamente 10 dígitos.');
            return;
        }

        // 3. Validar formato de correo
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!regexEmail.test(formData.correo)) {
            alert('⚠️ Ingrese un correo electrónico válido.');
            return;
        }

        setCargando(true);
        try {
            const res = await fetch(`${API_AUTH}/registrar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: formData.nombre.trim(),
                    correo: formData.correo.trim(),
                    password: formData.password,
                    telefono: formData.telefono.trim(),
                    rol: 'cliente'
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.mensaje || data.error || 'Error al registrar usuario.');

            alert('🎉 Cuenta creada con éxito. Iniciando sesión...');

            // Auto-login tras el registro
            const loginRes = await fetch(`${API_AUTH}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    correo: formData.correo.trim(),
                    password: formData.password
                })
            });

            if (loginRes.ok) {
                const loginData = await loginRes.json();
                const rawUsuario = loginData.usuario || loginData;
                const usuarioObj = {
                    ...rawUsuario,
                    rol: (rawUsuario.rol || 'cliente').toLowerCase()
                };

                localStorage.setItem('cliente_buoncalice', JSON.stringify(usuarioObj));
                localStorage.setItem('usuario_cliente', JSON.stringify(usuarioObj));
                setCliente(usuarioObj);
                navigate('/');
            }
        } catch (err) {
            alert(`⚠️ ${err.message}`);
        } finally {
            setCargando(false);
        }
    };

    const handleCerrarSesion = () => {
        localStorage.removeItem('cliente_buoncalice');
        localStorage.removeItem('usuario_cliente');
        setCliente(null);
    };

    if (cliente) {
        return (
            <div style={{ padding: '2rem', backgroundColor: '#0D0B0A', minHeight: '100vh', color: '#fff', maxWidth: '500px', margin: '0 auto' }}>
                <div style={{ backgroundColor: '#16120E', padding: '2rem', borderRadius: '16px', border: '1px solid #26201B', textAlign: 'center' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>👤</span>
                    <h2 style={{ color: '#C5A059', fontFamily: 'serif', margin: '0 0 0.5rem 0' }}>{cliente.nombre || 'Cliente Buon Calice'}</h2>
                    <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>{cliente.correo}</p>
                    {cliente.telefono && <p style={{ color: '#aaa', fontSize: '0.85rem', margin: '0 0 1.5rem 0' }}>📞 {cliente.telefono}</p>}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button onClick={() => navigate('/')} style={{ padding: '0.8rem', backgroundColor: '#C5A059', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Ver Catálogo
                        </button>
                        <button onClick={handleCerrarSesion} style={{ padding: '0.8rem', backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '8px', cursor: 'pointer' }}>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '2rem', backgroundColor: '#0D0B0A', minHeight: '100vh', color: '#fff', maxWidth: '450px', margin: '0 auto' }}>
            <div style={{ backgroundColor: '#16120E', padding: '2rem', borderRadius: '16px', border: '1px solid #26201B' }}>
                <h2 style={{ color: '#C5A059', fontFamily: 'serif', textAlign: 'center', marginTop: 0 }}>
                    {esRegistro ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </h2>

                <form onSubmit={esRegistro ? handleRegistro : handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {esRegistro && (
                        <>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.4rem' }}>NOMBRE COMPLETO</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleNombreChange}
                                    required
                                    placeholder="Solo letras"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.4rem' }}>TELÉFONO (10 DÍGITOS)</label>
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleTelefonoChange}
                                    required
                                    maxLength={10}
                                    placeholder="10 dígitos numéricos"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.4rem' }}>CORREO ELECTRÓNICO</label>
                        <input
                            type="email"
                            name="correo"
                            value={formData.correo}
                            onChange={handleInputChange}
                            required
                            placeholder="ejemplo@correo.com"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.4rem' }}>CONTRASEÑA</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={cargando}
                        style={{ padding: '0.85rem', backgroundColor: '#C5A059', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}
                    >
                        {cargando ? 'Procesando...' : (esRegistro ? 'Registrarse' : 'Ingresar')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                        onClick={() => {
                            setEsRegistro(!esRegistro);
                            setFormData({ nombre: '', correo: '', password: '', telefono: '' });
                        }}
                        style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {esRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
                    </button>
                </div>
            </div>
        </div>
    );
}