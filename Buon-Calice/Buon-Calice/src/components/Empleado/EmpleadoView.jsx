import { useState, useEffect, useCallback } from 'react';
import {
    getProductos,
    guardarProducto,
    actualizarStock,
    loginUsuario,
    getProductoPorId,
    eliminarProducto,
    getPedidos
} from '../../services/api';
import './Empleado.css';

// --- COMPONENTE AUXILIAR (FUERA DEL COMPONENTE PRINCIPAL) ---
const RenderImagenBotella = ({ url, alt, className = "w-10 h-10 object-contain rounded-lg bg-[#0D0B0A] border border-[#26201B]" }) => {
    const esUrlValida = typeof url === 'string' && (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:image')
    );

    if (esUrlValida) {
        return (
            <img
                src={url}
                alt={alt || 'Botella'}
                className={className}
                onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/150?text=Botella';
                }}
            />
        );
    }

    return (
        <span className="text-2xl flex items-center justify-center">
            {url || '🍷'}
        </span>
    );
};

export default function EmpleadoView() {
    const [autenticado, setAutenticado] = useState(false);
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState(false);
    const [cargandoLogin, setCargandoLogin] = useState(false);

    const [toasts, setToasts] = useState([]);
    const [productos, setProductos] = useState([]);
    const [cargandoProds, setCargandoProds] = useState(false);
    const [codigoBuscar, setCodigoBuscar] = useState('');
    const [filtroEmpleado, setFiltroEmpleado] = useState('');

    const [searchId, setSearchId] = useState('');
    const [prodPorIdResult, setProdPorIdResult] = useState(null);
    const [buscandoIdLoading, setBuscandoIdLoading] = useState(false);

    const [pedidos, setPedidos] = useState([]);
    const [pedidoSeleccionadoId, setPedidoSeleccionadoId] = useState(null);

    const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
    const [idEditando, setIdEditando] = useState(null);
    const [nuevoNombre, setNuevoNombre] = useState('');
    const [nuevaCategoria, setNuevaCategoria] = useState('Whisky');
    const [nuevoIcono, setNuevoIcono] = useState('');
    const [nuevoPrecio, setNuevoPrecio] = useState('');
    const [nuevoStock, setNuevoStock] = useState('');
    const [nuevaDesc, setNuevaDesc] = useState('');

    const showToast = useCallback((mensaje, tipo = 'exito') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, mensaje, tipo }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    }, []);

    const cargarCatalogoDesdeApi = useCallback(async () => {
        setCargandoProds(true);
        try {
            const data = await getProductos(false);
            const adaptados = (data || []).map((p) => ({
                id: p.idProducto || p.id,
                nombre: p.nombre,
                categoria: p.categoria || 'Vino Tinto',
                precio: p.precio,
                stock: p.stock,
                icono: p.icono || p.imagenUrl || '',
                desc: p.descripcion || 'Sin descripción disponible.'
            }));
            setProductos(adaptados);
        } catch (err) {
            console.error('Error al cargar productos:', err);
            showToast('Error al conectar con la API de .NET', 'error');
        } finally {
            setCargandoProds(false);
        }
    }, [showToast]);

    const cargarPedidosDesdeApi = useCallback(async () => {
        try {
            const data = await getPedidos();
            if (Array.isArray(data)) {
                const activos = data.filter(p => p.estado !== 'ENTREGADO' && p.estado !== 'CANCELADO');
                setPedidos(activos);

                setPedidoSeleccionadoId(prevId => {
                    if (!prevId && activos.length > 0) return activos[0].id || activos[0].codigo;
                    if (prevId && !activos.some(p => (p.id || p.codigo) === prevId) && activos.length > 0) {
                        return activos[0].id || activos[0].codigo;
                    }
                    return prevId;
                });
            }
        } catch (err) {
            console.error('Error al consultar pedidos en SQL Server:', err);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;
        let intervalId = null;

        if (autenticado) {
            const timer = setTimeout(() => {
                if (isMounted) {
                    cargarCatalogoDesdeApi();
                    cargarPedidosDesdeApi();
                }
            }, 0);

            intervalId = setInterval(() => {
                if (isMounted) cargarPedidosDesdeApi();
            }, 3000);

            return () => {
                isMounted = false;
                clearTimeout(timer);
                if (intervalId) clearInterval(intervalId);
            };
        }
    }, [autenticado, cargarCatalogoDesdeApi, cargarPedidosDesdeApi]);

    const iniciarSesion = async (e) => {
        e.preventDefault();
        setCargandoLogin(true);
        setLoginError(false);

        try {
            await loginUsuario(usuario, password);
            setAutenticado(true);
            showToast('¡Sesión iniciada con éxito!');
        } catch {
            if (usuario.trim().toLowerCase() === 'admin' && password.trim() === '1234') {
                setAutenticado(true);
                showToast('¡Sesión iniciada en Modo Pruebas!');
            } else {
                setLoginError(true);
                showToast('Credenciales incorrectas', 'error');
            }
        } finally {
            setCargandoLogin(false);
        }
    };

    const cerrarSesion = () => {
        setAutenticado(false);
        setUsuario('');
        setPassword('');
        showToast('Sesión cerrada correctamente.', 'info');
    };

    const pedidoActivo = pedidos.find(p => (p.id || p.codigo) === pedidoSeleccionadoId);

    const cambiarEstadoPedido = (nuevoEstado) => {
        if (!pedidoActivo) return;
        const actualizados = pedidos.map(p =>
            (p.id || p.codigo) === pedidoSeleccionadoId ? { ...p, estado: nuevoEstado } : p
        );
        setPedidos(actualizados);
        showToast(`Estado cambiado a: ${nuevoEstado.replace('_', ' ').toUpperCase()}`);
    };

    const completarYBorrar = () => {
        const input = codigoBuscar.trim().toUpperCase().replace('#', '');
        if (!input) return showToast('Ingresa un código de pedido', 'warn');

        const pedidoEncontrado = pedidos.find(p => p.codigo.trim().toUpperCase() === input);

        if (pedidoEncontrado) {
            setPedidos(prev => prev.filter(p => p.codigo.trim().toUpperCase() !== input));
            setCodigoBuscar('');
            showToast(`¡Pedido #${input} entregado con éxito!`);
            cargarPedidosDesdeApi();
        } else {
            showToast('Código no coincide con ningún pedido activo', 'error');
        }
    };

    const cancelarPorNoEntregado = async () => {
        if (!pedidoActivo) return;

        if (window.confirm(`¿Marcar pedido #${pedidoActivo.codigo} como NO ENTREGADO?`)) {
            try {
                if (pedidoActivo.productos || pedidoActivo.items) {
                    const items = pedidoActivo.productos || pedidoActivo.items;
                    for (const item of items) {
                        const targetId = item.productoId || item.id;
                        const prodActual = productos.find((p) => p.id === targetId);
                        if (prodActual) {
                            await actualizarStock(targetId, prodActual.stock + item.cantidad);
                        }
                    }
                }
                setPedidos(prev => prev.filter(p => (p.id || p.codigo) !== pedidoSeleccionadoId));
                await cargarCatalogoDesdeApi();
                await cargarPedidosDesdeApi();
                showToast('Pedido cancelado. Stock devuelto en el servidor.', 'warn');
            } catch (err) {
                showToast('Error al restaurar stock: ' + err.message, 'error');
            }
        }
    };

    const buscarProductoPorId = async (e) => {
        e.preventDefault();
        if (!searchId.trim()) return showToast('Ingresa un ID válido', 'warn');
        setBuscandoIdLoading(true);
        try {
            const p = await getProductoPorId(searchId.trim());
            setProdPorIdResult({
                id: p.idProducto || p.id,
                nombre: p.nombre,
                categoria: p.categoria || 'Licor',
                precio: p.precio,
                stock: p.stock,
                icono: p.icono || p.imagenUrl || '',
                desc: p.descripcion || 'Sin descripción disponible.'
            });
            showToast(`Producto ID #${searchId} encontrado`);
        } catch {
            setProdPorIdResult(null);
            showToast('No existe producto registrado con ese ID', 'error');
        } finally {
            setBuscandoIdLoading(false);
        }
    };

    const cargarParaEditar = (p) => {
        setIdEditando(p.id);
        setNuevoNombre(p.nombre);
        setNuevaCategoria(p.categoria);
        setNuevoIcono(p.icono);
        setNuevoPrecio(p.precio);
        setNuevoStock(p.stock);
        setNuevaDesc(p.desc);
        setMostrarFormNuevo(true);
    };

    const cancelarEdicion = () => {
        setIdEditando(null);
        setNuevoNombre('');
        setNuevoPrecio('');
        setNuevoStock('');
        setNuevoIcono('');
        setNuevaDesc('');
        setMostrarFormNuevo(false);
    };

    const guardarOActualizarProducto = async (e) => {
        e.preventDefault();

        const objetoParaApi = {
            ...(idEditando ? { idProducto: idEditando } : {}),
            nombre: nuevoNombre.trim(),
            categoria: nuevaCategoria,
            precio: parseFloat(nuevoPrecio),
            stock: parseInt(nuevoStock),
            icono: nuevoIcono.trim() || 'https://via.placeholder.com/150?text=Botella',
            descripcion: nuevaDesc.trim() || 'Sin descripción disponible.'
        };

        try {
            await guardarProducto(objetoParaApi);
            showToast(idEditando ? `¡${objetoParaApi.nombre} actualizado!` : `¡${objetoParaApi.nombre} guardado en el servidor!`);
            cancelarEdicion();
            await cargarCatalogoDesdeApi();
        } catch (err) {
            showToast('Error al procesar producto: ' + err.message, 'error');
        }
    };

    const ejecutarEliminacionFisica = async (id, nombre) => {
        if (window.confirm(`¿Seguro que deseas ELIMINAR FÍSICAMENTE de SQL Server el producto "${nombre}" (#${id})?`)) {
            try {
                await eliminarProducto(id);
                showToast(`Producto #${id} eliminado permanentemente.`, 'warn');
                if (prodPorIdResult?.id === id) setProdPorIdResult(null);
                await cargarCatalogoDesdeApi();
            } catch (err) {
                showToast('Error al eliminar registro: ' + err.message, 'error');
            }
        }
    };

    const handleCampoInventarioChange = (id, campo, valor) => {
        setProductos((prev) =>
            prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p))
        );
    };

    const guardarCambiosInventario = async () => {
        try {
            for (const p of productos) {
                const objetoParaApi = {
                    idProducto: p.id,
                    nombre: p.nombre,
                    categoria: p.categoria,
                    precio: parseFloat(p.precio),
                    stock: parseInt(p.stock),
                    icono: p.icono,
                    descripcion: p.desc || 'Sin descripción disponible.'
                };
                await guardarProducto(objetoParaApi);
            }
            showToast('¡Inventario y precios sincronizados con la base de datos!');
            await cargarCatalogoDesdeApi();
        } catch (err) {
            showToast('Error al actualizar inventario: ' + err.message, 'error');
        }
    };

    const productosFiltrados = productos.filter((p) =>
        p.nombre.toLowerCase().includes(filtroEmpleado.toLowerCase()) ||
        p.categoria.toLowerCase().includes(filtroEmpleado.toLowerCase())
    );

    return (
        <div className="bg-[#050404] text-[#E2D9CC] min-h-screen p-4 sm:p-8 relative font-sans selection:bg-[#C5A059] selection:text-black">
            <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`border backdrop-blur-md p-4 rounded-2xl text-xs font-medium shadow-2xl flex items-center justify-between gap-3 pointer-events-auto ${t.tipo === 'exito'
                            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                            : t.tipo === 'error'
                                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                                : 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                            }`}
                    >
                        <span>{t.mensaje}</span>
                        <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="text-[#9E8E7E] hover:text-white font-bold ml-2">
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            {!autenticado ? (
                <section className="max-w-md mx-auto my-12 space-y-6">
                    <div className="text-center space-y-3">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#16120E] border border-[#26201B] shadow-2xl text-3xl mb-1">
                            🍷
                        </div>
                        <div>
                            <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059] font-semibold block">Acceso Restringido</span>
                            <h1 className="text-3xl font-serif text-[#F3ECE0] tracking-wide mt-1">ÉLITE VINATERÍA</h1>
                            <p className="text-xs text-[#9E8E7E] mt-1.5">Ingresa tus credenciales para acceder a la terminal de gestión.</p>
                        </div>
                    </div>

                    <form onSubmit={iniciarSesion} className="bg-[#16120E] border border-[#26201B] p-6 sm:p-8 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent opacity-50"></div>

                        {loginError && (
                            <div className="text-rose-400 bg-rose-500/10 border border-rose-500/20 text-xs p-3.5 rounded-2xl text-center font-medium">
                                ⚠️ Credenciales no válidas. Prueba con "admin" y "1234".
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-[#C5A059] font-medium block">Usuario / Correo</label>
                            <input
                                type="text"
                                required
                                placeholder="admin@buoncalice.com"
                                value={usuario}
                                onChange={(e) => setUsuario(e.target.value)}
                                className="w-full bg-[#0D0B0A] border border-[#382E26] text-white text-xs px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-[#4A3E35]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase tracking-wider text-[#C5A059] font-medium block">Contraseña</label>
                            <input
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0D0B0A] border border-[#382E26] text-white text-xs px-4 py-3.5 rounded-xl focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-[#4A3E35]"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={cargandoLogin}
                            className="w-full bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:brightness-110 text-black font-bold text-xs py-3.5 rounded-xl transition-all shadow-lg shadow-[#C5A059]/10 mt-2 tracking-wider disabled:opacity-50"
                        >
                            {cargandoLogin ? 'VERIFICANDO...' : 'INGRESAR AL SISTEMA'}
                        </button>
                    </form>
                </section>
            ) : (
                <main className="max-w-4xl mx-auto space-y-6">
                    <header className="flex justify-between items-center border-b border-[#26201B] pb-5">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] uppercase tracking-widest text-[#C5A059] font-semibold">Panel de Empleado</span>
                            </div>
                            <h1 className="text-2xl sm:text-3xl font-serif text-[#F3ECE0] mt-0.5">Gestión de Inventario y Pedidos</h1>
                        </div>
                        <button onClick={cerrarSesion} className="text-xs text-[#9E8E7E] hover:text-rose-400 border border-[#382E26] hover:border-rose-500/40 px-4 py-2 rounded-xl transition-all bg-[#0D0B0A]">
                            Cerrar Sesión
                        </button>
                    </header>

                    <div className="bg-[#16120E] border border-[#26201B] p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-[#26201B] pb-3">
                            <h3 className="text-xs uppercase tracking-wider text-[#C5A059] font-semibold flex items-center gap-2">
                                📋 Dashboard de Pedidos Acumulados ({pedidos.length})
                            </h3>
                            <span className="text-[10px] text-[#9E8E7E]">Haz clic en un pedido para atenderlo</span>
                        </div>

                        {pedidos.length === 0 ? (
                            <div className="bg-[#0D0B0A] border border-[#26201B] rounded-2xl p-6 text-center space-y-1">
                                <div className="text-2xl opacity-40">📥</div>
                                <p className="text-xs text-[#9E8E7E] font-medium">Sin pedidos pendientes acumulados.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {pedidos.map((p) => {
                                    const idKey = p.id || p.codigo;
                                    const esSeleccionado = idKey === pedidoSeleccionadoId;
                                    return (
                                        <div
                                            key={idKey}
                                            onClick={() => setPedidoSeleccionadoId(idKey)}
                                            className={`cursor-pointer p-3.5 rounded-2xl border transition-all ${esSeleccionado
                                                    ? 'bg-[#1C1713] border-[#C5A059] shadow-lg shadow-[#C5A059]/10 scale-[1.02]'
                                                    : 'bg-[#0D0B0A] border-[#26201B] hover:border-[#382E26]'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-sm text-[#D4AF37] font-bold">#{p.codigo}</span>
                                                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${p.estado === 'EN PROCESO'
                                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                        : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                                    }`}>
                                                    {(p.estado || 'PENDIENTE').replace('_', ' ').toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-[#E2D9CC]">
                                                {(p.productos || p.items || []).length} artículo(s)
                                            </p>
                                            <p className="text-xs font-mono text-[#C5A059] mt-1 font-bold">
                                                Total: ${Number(p.total || 0).toFixed(2)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="bg-[#16120E] border border-[#26201B] p-5 sm:p-6 rounded-3xl space-y-3.5 shadow-xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs uppercase tracking-wider text-[#C5A059] font-semibold">Verificar / Entregar Pedido por Código</h3>
                            <span className="text-[10px] text-[#9E8E7E]">Búsqueda rápida</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2.5">
                            <input
                                type="text"
                                placeholder="Código del pedido (Ej: BC-X9123)"
                                value={codigoBuscar}
                                onChange={(e) => setCodigoBuscar(e.target.value)}
                                className="bg-[#0D0B0A] border border-[#382E26] text-white uppercase tracking-widest font-mono text-xs px-4 py-3.5 rounded-xl flex-1 focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-[#4A3E35] placeholder:font-sans"
                            />
                            <button onClick={completarYBorrar} className="bg-[#C5A059] hover:bg-[#B38E47] text-black font-bold text-xs px-6 py-3.5 rounded-xl transition-all shadow-md shrink-0">
                                Entregar y Borrar
                            </button>
                        </div>
                    </div>

                    {pedidoActivo && (
                        <div className="bg-[#16120E] border border-[#C5A059]/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C5A059]/5 rounded-full blur-2xl pointer-events-none"></div>

                            <div className="flex justify-between items-start border-b border-[#26201B] pb-4">
                                <div>
                                    <span className="text-[10px] uppercase tracking-wider text-[#9E8E7E] font-medium">Atendiendo Pedido</span>
                                    <div className="text-3xl font-mono text-[#D4AF37] font-bold tracking-wider mt-0.5">#{pedidoActivo.codigo}</div>
                                </div>
                                <span className="text-[11px] font-semibold px-3.5 py-1.5 rounded-full border border-amber-500/30 text-amber-400 bg-amber-500/10">
                                    {(pedidoActivo.estado || 'PENDIENTE').replace('_', ' ').toUpperCase()}
                                </span>
                            </div>

                            <div className="text-xs text-[#9E8E7E] space-y-1.5 bg-[#0D0B0A] p-3.5 rounded-2xl border border-[#26201B]">
                                <p><strong className="text-[#F3ECE0]">Usuario ID:</strong> {pedidoActivo.usuarioId || 'Anónimo'}</p>
                                <p><strong className="text-[#F3ECE0]">Método de Pago:</strong> {pedidoActivo.metodoPago || 'Efectivo'}</p>
                                <p><strong className="text-[#F3ECE0]">Fecha:</strong> {pedidoActivo.fechaPedido ? new Date(pedidoActivo.fechaPedido).toLocaleString() : 'N/A'}</p>
                            </div>

                            <div className="space-y-2">
                                <span className="text-[10px] uppercase tracking-wider text-[#C5A059] font-medium block">Detalle de Artículos</span>
                                <div className="space-y-2 text-xs bg-[#0D0B0A] p-3.5 rounded-2xl border border-[#26201B]">
                                    {(pedidoActivo.productos || pedidoActivo.items || []).map((i, idx) => (
                                        <div key={idx} className="flex justify-between items-center border-b border-[#26201B] pb-2 last:border-0">
                                            <div className="flex items-center gap-2">
                                                <RenderImagenBotella url={i.icono || i.imagenUrl} alt={i.nombre} className="w-8 h-8 object-contain rounded bg-[#16120E] p-0.5" />
                                                <span>{i.nombre || `Producto #${i.productoId || i.id}`}</span>
                                            </div>
                                            <span className="font-mono text-[#C5A059]">{i.cantidad} x ${Number(i.precioUnitario || i.precio || 0).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-center bg-[#0D0B0A] p-3.5 rounded-2xl border border-[#26201B] text-xs font-bold text-[#F3ECE0]">
                                    <span>TOTAL</span>
                                    <span className="text-[#D4AF37] font-mono text-sm">${Number(pedidoActivo.total || 0).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                <button onClick={() => cambiarEstadoPedido('EN PROCESO')} className="bg-amber-600/15 border border-amber-500/30 text-amber-300 py-3 rounded-xl text-xs font-semibold hover:bg-amber-600/25 transition-all">
                                    👨‍🍳 En Preparación
                                </button>
                                <button onClick={() => cambiarEstadoPedido('COMPLETADO')} className="bg-emerald-600/15 border border-emerald-500/30 text-emerald-300 py-3 rounded-xl text-xs font-semibold hover:bg-emerald-600/25 transition-all">
                                    ✅ Listo
                                </button>
                                <button onClick={cancelarPorNoEntregado} className="bg-rose-600/15 border border-rose-500/30 text-rose-300 py-3 rounded-xl text-xs font-semibold hover:bg-rose-600/25 transition-all">
                                    ⚠️ No Entregado
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="bg-[#16120E] border border-[#26201B] p-5 rounded-3xl space-y-3.5 shadow-xl">
                        <h3 className="text-xs uppercase tracking-wider text-[#C5A059] font-semibold">🔍 Consulta por ID (SQL Server)</h3>
                        <form onSubmit={buscarProductoPorId} className="flex gap-2">
                            <input
                                type="number"
                                placeholder="Ingresa ID del producto (Ej: 1)"
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                className="bg-[#0D0B0A] border border-[#382E26] text-white text-xs px-4 py-2.5 rounded-xl flex-1 focus:outline-none focus:border-[#C5A059]"
                            />
                            <button type="submit" disabled={buscandoIdLoading} className="bg-[#C5A059] text-black font-bold text-xs px-5 py-2.5 rounded-xl hover:bg-[#B38E47] transition-all">
                                {buscandoIdLoading ? 'Buscando...' : 'Buscar ID'}
                            </button>
                        </form>

                        {prodPorIdResult && (
                            <div className="mt-3 bg-[#0D0B0A] border border-[#C5A059]/40 p-4 rounded-2xl space-y-2 relative">
                                <button onClick={() => setProdPorIdResult(null)} className="absolute top-2 right-3 text-xs text-[#9E8E7E] hover:text-white">✕ Cerrar</button>
                                <div className="flex items-center gap-3">
                                    <RenderImagenBotella url={prodPorIdResult.icono} alt={prodPorIdResult.nombre} />
                                    <div>
                                        <h4 className="text-sm font-bold text-[#F3ECE0]">{prodPorIdResult.nombre} <span className="text-xs font-mono text-[#C5A059]">(ID: #{prodPorIdResult.id})</span></h4>
                                        <p className="text-xs text-[#9E8E7E]">{prodPorIdResult.categoria} • ${prodPorIdResult.precio} • Stock: {prodPorIdResult.stock}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button onClick={() => cargarParaEditar(prodPorIdResult)} className="text-xs bg-[#C5A059]/20 text-[#C5A059] px-3 py-1 rounded-lg border border-[#C5A059]/30">✏️ Editar</button>
                                    <button onClick={() => ejecutarEliminacionFisica(prodPorIdResult.id, prodPorIdResult.nombre)} className="text-xs bg-rose-500/20 text-rose-300 px-3 py-1 rounded-lg border border-rose-500/30">🗑️ Eliminar</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#16120E] border border-[#26201B] p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b border-[#26201B] pb-3.5">
                            <h3 className="text-xs uppercase tracking-wider text-[#C5A059] font-semibold">
                                {idEditando ? `✏️ Editando Producto #${idEditando}` : '✨ Agregar Nuevo Producto'}
                            </h3>
                            <div className="flex gap-2">
                                {idEditando && (
                                    <button onClick={cancelarEdicion} className="text-xs text-rose-400 hover:underline font-medium">
                                        Cancelar Edición
                                    </button>
                                )}
                                <button onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)} className="text-xs text-[#C5A059] hover:underline font-medium">
                                    {mostrarFormNuevo ? '✕ Ocultar Formulario' : '+ Abrir Formulario'}
                                </button>
                            </div>
                        </div>

                        {mostrarFormNuevo && (
                            <form onSubmit={guardarOActualizarProducto} className="space-y-3.5 pt-1">
                                <div>
                                    <label className="text-[10px] text-[#9E8E7E] uppercase tracking-wider block mb-1">Nombre del Producto</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ej: Mezcal Artesanal Tobalá 750ml"
                                        value={nuevoNombre}
                                        onChange={(e) => setNuevoNombre(e.target.value)}
                                        className="w-full bg-[#0D0B0A] border border-[#382E26] text-white text-xs p-3.5 rounded-xl focus:outline-none focus:border-[#C5A059]"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-[#9E8E7E] uppercase tracking-wider block mb-1">Sección / Categoría</label>
                                        <select
                                            value={nuevaCategoria}
                                            onChange={(e) => setNuevaCategoria(e.target.value)}
                                            className="w-full bg-[#0D0B0A] border border-[#382E26] text-white text-xs p-3.5 rounded-xl focus:outline-none focus:border-[#C5A059]"
                                        >
                                            <option value="Whisky">Whisky</option>
                                            <option value="Bourbon">Bourbon</option>
                                            <option value="Vino Tinto">Vino Tinto</option>
                                            <option value="Vino Blanco">Vino Blanco</option>
                                            <option value="Espumoso">Espumoso</option>
                                            <option value="Tequila">Tequila</option>
                                            <option value="Mezcal">Mezcal</option>
                                            <option value="Bacardí">Bacardí</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[#9E8E7E] uppercase tracking-wider block mb-1">URL Foto de la Botella</label>
                                        <input
                                            type="text"
                                            placeholder="https://ejemplo.com/botella.jpg"
                                            value={nuevoIcono}
                                            onChange={(e) => setNuevoIcono(e.target.value)}
                                            className="w-full bg-[#0D0B0A] border border-[#382E26] text-white text-xs p-3.5 rounded-xl focus:outline-none focus:border-[#C5A059]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] text-[#9E8E7E] uppercase tracking-wider block mb-1">Precio Venta ($ MXN)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="1"
                                            required
                                            placeholder="750.00"
                                            value={nuevoPrecio}
                                            onChange={(e) => setNuevoPrecio(e.target.value)}
                                            className="w-full bg-[#0D0B0A] border border-[#382E26] text-white text-xs p-3.5 rounded-xl focus:outline-none focus:border-[#C5A059]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-[#9E8E7E] uppercase tracking-wider block mb-1">Stock Disponible</label>
                                        <input
                                            type="number"
                                            min="0"
                                            required
                                            placeholder="12"
                                            value={nuevoStock}
                                            onChange={(e) => setNuevoStock(e.target.value)}
                                            className="w-full bg-[#0D0B0A] border border-[#382E26] text-white text-xs p-3.5 rounded-xl focus:outline-none focus:border-[#C5A059]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] text-[#9E8E7E] uppercase tracking-wider block mb-1">Descripción</label>
                                    <textarea
                                        rows="2"
                                        placeholder="Detalles sobre el producto..."
                                        value={nuevaDesc}
                                        onChange={(e) => setNuevaDesc(e.target.value)}
                                        className="w-full bg-[#0D0B0A] border border-[#382E26] text-white text-xs p-3.5 rounded-xl focus:outline-none focus:border-[#C5A059]"
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-[#C5A059] hover:bg-[#B38E47] text-black font-bold text-xs py-3.5 rounded-xl transition-all shadow-md mt-2"
                                >
                                    {idEditando ? 'GUARDAR CAMBIOS EN SQL SERVER' : 'REGISTRAR PRODUCTO EN BASE DE DATOS'}
                                </button>
                            </form>
                        )}
                    </div>

                    <div className="bg-[#16120E] border border-[#26201B] p-5 sm:p-6 rounded-3xl space-y-4 shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#26201B] pb-4">
                            <div>
                                <h3 className="text-xs uppercase tracking-wider text-[#C5A059] font-semibold">Inventario General</h3>
                                <p className="text-[11px] text-[#9E8E7E]">Edita stock o precios directamente y presiona guardar.</p>
                            </div>
                            <button
                                onClick={guardarCambiosInventario}
                                className="bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-600/30 transition-all shrink-0"
                            >
                                💾 Guardar Cambios Inventario
                            </button>
                        </div>

                        <input
                            type="text"
                            placeholder="Filtrar por nombre o categoría..."
                            value={filtroEmpleado}
                            onChange={(e) => setFiltroEmpleado(e.target.value)}
                            className="w-full bg-[#0D0B0A] border border-[#382E26] text-white text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#C5A059]"
                        />

                        {cargandoProds ? (
                            <p className="text-xs text-[#9E8E7E] text-center py-4">Cargando inventario...</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-[#E2D9CC]">
                                    <thead className="text-[10px] uppercase text-[#9E8E7E] border-b border-[#26201B]">
                                        <tr>
                                            <th className="py-2.5 px-2">Producto</th>
                                            <th className="py-2.5 px-2">Categoría</th>
                                            <th className="py-2.5 px-2">Precio ($)</th>
                                            <th className="py-2.5 px-2">Stock</th>
                                            <th className="py-2.5 px-2 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#26201B]">
                                        {productosFiltrados.map((p) => (
                                            <tr key={p.id} className="hover:bg-[#0D0B0A]/50">
                                                <td className="py-3 px-2 flex items-center gap-2">
                                                    <RenderImagenBotella url={p.icono} alt={p.nombre} className="w-8 h-8 object-contain rounded bg-[#0D0B0A] p-0.5" />
                                                    <span className="font-medium">{p.nombre}</span>
                                                </td>
                                                <td className="py-3 px-2 text-[#9E8E7E]">{p.categoria}</td>
                                                <td className="py-3 px-2">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={p.precio}
                                                        onChange={(e) => handleCampoInventarioChange(p.id, 'precio', e.target.value)}
                                                        className="w-20 bg-[#0D0B0A] border border-[#382E26] text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-[#C5A059]"
                                                    />
                                                </td>
                                                <td className="py-3 px-2">
                                                    <input
                                                        type="number"
                                                        value={p.stock}
                                                        onChange={(e) => handleCampoInventarioChange(p.id, 'stock', e.target.value)}
                                                        className="w-16 bg-[#0D0B0A] border border-[#382E26] text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-[#C5A059]"
                                                    />
                                                </td>
                                                <td className="py-3 px-2 text-right space-x-1">
                                                    <button onClick={() => cargarParaEditar(p)} className="text-[#C5A059] hover:underline px-2 py-1">✏️</button>
                                                    <button onClick={() => ejecutarEliminacionFisica(p.id, p.nombre)} className="text-rose-400 hover:underline px-2 py-1">🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            )}
        </div>
    );
}