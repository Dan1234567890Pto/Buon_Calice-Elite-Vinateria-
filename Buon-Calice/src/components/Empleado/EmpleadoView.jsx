import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getProductos,
    getProductoPorId,
    guardarProducto,
    eliminarProducto,
    getPedidos,
    eliminarPedido,
    actualizarEstadoPedido
} from '../../services/api';

export default function EmpleadoView() {
    const [productos, setProductos] = useState([]);
    const [cargandoProductos, setCargandoProductos] = useState(true);
    const [errorProductos, setErrorProductos] = useState('');

    const [pedidos, setPedidos] = useState([]);
    const [cargandoPedidos, setCargandoPedidos] = useState(true);
    const [errorPedidos, setErrorPedidos] = useState('');
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

    const [pedidosEliminados, setPedidosEliminados] = useState([]);

    const [productoEditandoId, setProductoEditandoId] = useState(null);
    const [idBusqueda, setIdBusqueda] = useState('');
    const [productoBuscado, setProductoBuscado] = useState(null);
    const [codigoPedidoBorrar, setCodigoPedidoBorrar] = useState('');

    const usuarioSesion = JSON.parse(localStorage.getItem('usuario_admin')) || { nombre: 'Administrador Élite' };

    const [formData, setFormData] = useState({
        nombre: '',
        categoria: 'Whisky',
        precio: '',
        stock: '',
        imagen: '',
        descripcion: ''
    });

    const navigate = useNavigate();

    useEffect(() => {
        obtenerProductos();
        obtenerPedidos();

        const intervalo = setInterval(() => {
            obtenerPedidos();
        }, 5000);

        return () => clearInterval(intervalo);
    }, [pedidosEliminados]);

    const obtenerPedidos = async () => {
        try {
            const data = await getPedidos();

            const pedidosValidos = (data || []).filter(p => {
                const idPed = (p.idPedido || p.id_pedido || p.id || '').toString();
                const cod = (p.codigo || '').toUpperCase();
                return !pedidosEliminados.includes(idPed) && !pedidosEliminados.includes(cod);
            });

            setPedidos(pedidosValidos);

            if (pedidosValidos.length > 0 && !pedidoSeleccionado) {
                setPedidoSeleccionado({
                    ...pedidosValidos[0],
                    idPedido: pedidosValidos[0].idPedido || pedidosValidos[0].id_pedido || pedidosValidos[0].id
                });
            }
        } catch (err) {
            console.error(err);
            setErrorPedidos('No se pudieron obtener los pedidos en tiempo real.');
        } finally {
            setCargandoPedidos(false);
        }
    };

    const obtenerProductos = async () => {
        setCargandoProductos(true);
        try {
            const data = await getProductos(false);
            setProductos(data || []);
        } catch (err) {
            console.error(err);
            setErrorProductos('No se pudo cargar el inventario de productos.');
        } finally {
            setCargandoProductos(false);
        }
    };

    const handleSeleccionarPedido = (pedido) => {
        setPedidoSeleccionado({
            ...pedido,
            idPedido: pedido.idPedido || pedido.id_pedido || pedido.id
        });
    };

    const handleCambiarEstadoPedido = async (nuevoEstado) => {
        if (!pedidoSeleccionado) return;

        const idReal = pedidoSeleccionado.idPedido || pedidoSeleccionado.id_pedido || pedidoSeleccionado.id;

        if (!idReal || isNaN(Number(idReal))) {
            alert(`⚠️ ID numérico inválido (${idReal}). Selecciona nuevamente el pedido.`);
            return;
        }

        try {
            await actualizarEstadoPedido(idReal, nuevoEstado);
            setPedidoSeleccionado(prev => ({ ...prev, estado: nuevoEstado }));
            await obtenerPedidos();
        } catch (err) {
            console.error('Error al cambiar estado:', err);
            alert('⚠️ No se pudo guardar el estado: ' + err.message);
        }
    };

    const handleEntregarYBorrar = async (e) => {
        e.preventDefault();
        if (!codigoPedidoBorrar) return;

        const entradaLimpia = codigoPedidoBorrar.trim().toUpperCase();

        const pedidoEncontrado = pedidos.find(p => {
            const cod = (p.codigo || '').toUpperCase();
            const idPed = (p.idPedido || p.id_pedido || p.id || '').toString();
            return cod === entradaLimpia || cod === `BC-${entradaLimpia}` || `BC-${cod}` === entradaLimpia || idPed === entradaLimpia;
        });

        if (!pedidoEncontrado) {
            alert('⚠️ No se encontró ningún pedido con ese código en la lista.');
            return;
        }

        const idReal = (pedidoEncontrado.idPedido || pedidoEncontrado.id_pedido || pedidoEncontrado.id || '').toString();
        const codigoReal = (pedidoEncontrado.codigo || '').toUpperCase();

        try {
            // Eliminación física en SQL Server
            await eliminarPedido(idReal);

            setPedidosEliminados(prev => [...prev, idReal, codigoReal, entradaLimpia]);

            const nuevaLista = pedidos.filter(p => {
                const idP = (p.idPedido || p.id_pedido || p.id || '').toString();
                const codP = (p.codigo || '').toUpperCase();
                return idP !== idReal && codP !== codigoReal && codP !== entradaLimpia;
            });

            setPedidos(nuevaLista);

            if (pedidoSeleccionado && ((pedidoSeleccionado.idPedido || pedidoSeleccionado.id_pedido || pedidoSeleccionado.id || '').toString() === idReal)) {
                setPedidoSeleccionado(nuevaLista.length > 0 ? nuevaLista[0] : null);
            }

            alert(`✅ Pedido ${entradaLimpia} entregado y eliminado de SQL Server.`);
            setCodigoPedidoBorrar('');
        } catch (err) {
            alert('⚠️ Error al eliminar pedido en la base de datos: ' + err.message);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleEditarProducto = (prod) => {
        const id = prod.idProducto || prod.id_producto || prod.id;
        setProductoEditandoId(id);
        setFormData({
            nombre: prod.nombre || '',
            categoria: prod.categoria || 'Whisky',
            precio: prod.precio || '',
            stock: prod.stock || '',
            imagen: prod.imagen || prod.urlImagen || prod.icono || '',
            descripcion: prod.descripcion || ''
        });
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const handleCancelarEditar = () => {
        setProductoEditandoId(null);
        setFormData({ nombre: '', categoria: 'Whisky', precio: '', stock: '', imagen: '', descripcion: '' });
    };

    const handleGuardarProducto = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                ...(productoEditandoId && { idProducto: productoEditandoId })
            };

            await guardarProducto(payload);

            alert(productoEditandoId ? 'Producto actualizado en SQL Server' : 'Producto registrado en SQL Server');
            handleCancelarEditar();
            obtenerProductos();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleEliminarProducto = async (id) => {
        if (!window.confirm(`¿Estás seguro de eliminar el producto #${id}?`)) return;

        try {
            await eliminarProducto(id);
            alert('Producto eliminado de SQL Server');
            obtenerProductos();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleBuscarPorId = async (e) => {
        e.preventDefault();
        if (!idBusqueda) return;
        try {
            const data = await getProductoPorId(idBusqueda);
            setProductoBuscado(data);
        } catch (err) {
            alert(err.message);
            setProductoBuscado(null);
        }
    };

    const handleCerrarSesion = () => {
        localStorage.removeItem('usuario_admin');
        navigate('/login');
    };

    return (
        <div style={{ padding: '2rem', backgroundColor: '#0D0B0A', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', maxWidth: '850px', margin: '0 auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <span style={{ fontSize: '0.75rem', color: '#C5A059', letterSpacing: '0.1em', fontWeight: 'bold' }}>🟢 PANEL DE EMPLEADO</span>
                    <h1 style={{ fontFamily: 'serif', color: '#F3ECE0', margin: '0.25rem 0 0.5rem 0', fontSize: '2.2rem' }}>Gestión de Inventario y Pedidos</h1>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>Usuario activo: <span style={{ color: '#F3ECE0' }}>{usuarioSesion.nombre || 'Administrador Élite'}</span></p>
                </div>
                <button onClick={handleCerrarSesion} style={{ padding: '0.5rem 1.2rem', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #382E26', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    Cerrar Sesión
                </button>
            </div>

            <div style={{ backgroundColor: '#16120E', padding: '1.5rem', borderRadius: '16px', border: '1px solid #26201B', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#C5A059', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                        📜 DASHBOARD DE PEDIDOS ACUMULADOS ({pedidos.length})
                    </span>
                    <button onClick={obtenerPedidos} style={{ background: 'none', border: 'none', color: '#C5A059', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        🔄 Recargar Pedidos
                    </button>
                </div>

                {cargandoPedidos && pedidos.length === 0 ? (
                    <p style={{ color: '#aaa', textAlign: 'center', margin: '1rem 0' }}>Cargando pedidos de SQL Server...</p>
                ) : errorPedidos && pedidos.length === 0 ? (
                    <p style={{ color: '#fda4af', textAlign: 'center', margin: '1rem 0' }}>{errorPedidos}</p>
                ) : pedidos.length === 0 ? (
                    <p style={{ color: '#aaa', textAlign: 'center', margin: '1rem 0' }}>No hay pedidos registrados por el momento.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {pedidos.map((ped) => {
                            const idCodigo = ped.codigo || `#BC-${ped.idPedido || ped.id}`;
                            const idNum = ped.idPedido || ped.id_pedido || ped.id;
                            const esSeleccionado = pedidoSeleccionado && (
                                (pedidoSeleccionado.idPedido && pedidoSeleccionado.idPedido === idNum) ||
                                (pedidoSeleccionado.codigo && pedidoSeleccionado.codigo === ped.codigo)
                            );

                            return (
                                <div
                                    key={idNum || ped.codigo || Math.random()}
                                    onClick={() => handleSeleccionarPedido(ped)}
                                    style={{
                                        backgroundColor: '#0D0B0A',
                                        padding: '1rem',
                                        borderRadius: '12px',
                                        border: esSeleccionado ? '1px solid #C5A059' : '1px solid #26201B',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div>
                                        <strong style={{ color: '#C5A059', display: 'block', marginBottom: '0.25rem' }}>{idCodigo}</strong>
                                        <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>Cliente: {ped.cliente || ped.nombreCliente || `Usuario #${ped.usuarioId || ''}`}</span>
                                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>Total: ${ped.total}</span>
                                    </div>
                                    <span style={{
                                        backgroundColor: ['LISTO', 'ENTREGADO'].includes((ped.estado || '').toUpperCase()) ? 'rgba(34, 197, 94, 0.15)' : ['EN PREPARACION', 'EN_PREPARACION'].includes((ped.estado || '').toUpperCase()) ? 'rgba(197, 160, 89, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                                        color: ['LISTO', 'ENTREGADO'].includes((ped.estado || '').toUpperCase()) ? '#4ade80' : ['EN PREPARACION', 'EN_PREPARACION'].includes((ped.estado || '').toUpperCase()) ? '#C5A059' : '#60a5fa',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '12px',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase'
                                    }}>
                                        {ped.estado || 'PENDIENTE'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div style={{ backgroundColor: '#16120E', padding: '1.5rem', borderRadius: '16px', border: '1px solid #26201B', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#C5A059', fontWeight: 'bold', letterSpacing: '0.05em' }}>VERIFICAR / ENTREGAR PEDIDO POR CÓDIGO</span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>Búsqueda rápida</span>
                </div>
                <form onSubmit={handleEntregarYBorrar} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="CÓDIGO DEL PEDIDO (EJ: BC-X9123)"
                        value={codigoPedidoBorrar}
                        onChange={(e) => setCodigoPedidoBorrar(e.target.value)}
                        style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}
                    />
                    <button type="submit" style={{ padding: '0.8rem 1.5rem', backgroundColor: '#C5A059', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Entregar y Borrar
                    </button>
                </form>
            </div>

            {pedidoSeleccionado && (
                <div style={{ backgroundColor: '#16120E', padding: '1.5rem', borderRadius: '16px', border: '1px solid #26201B', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#888', letterSpacing: '0.05em' }}>ATENDIENDO PEDIDO</span>
                        <span style={{ backgroundColor: 'rgba(197, 160, 89, 0.2)', color: '#C5A059', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {pedidoSeleccionado.estado || 'PENDIENTE'}
                        </span>
                    </div>

                    <h2 style={{ fontFamily: 'serif', color: '#C5A059', margin: '0 0 1.5rem 0', fontSize: '2rem' }}>
                        {pedidoSeleccionado.codigo || `#BC-${pedidoSeleccionado.idPedido || pedidoSeleccionado.id}`}
                    </h2>

                    <div style={{ backgroundColor: '#0D0B0A', padding: '1rem', borderRadius: '8px', border: '1px solid #26201B', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        <p style={{ margin: '0 0 0.4rem 0' }}><strong>Cliente / Usuario:</strong> {pedidoSeleccionado.cliente || pedidoSeleccionado.nombreCliente || pedidoSeleccionado.usuarioId || 'General'}</p>
                        <p style={{ margin: '0 0 0.4rem 0' }}><strong>Método de Pago:</strong> {pedidoSeleccionado.metodoPago || 'Pagar al recoger'}</p>
                        <p style={{ margin: 0 }}><strong>Fecha:</strong> {pedidoSeleccionado.fechaPedido ? new Date(pedidoSeleccionado.fechaPedido).toLocaleString() : 'Fecha no registrada'}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0D0B0A', padding: '1rem', borderRadius: '8px', border: '1px solid #26201B', marginBottom: '1.5rem' }}>
                        <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>TOTAL</span>
                        <span style={{ color: '#C5A059', fontWeight: 'bold', fontSize: '1.2rem' }}>${pedidoSeleccionado.total}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <button onClick={() => handleCambiarEstadoPedido('EN PREPARACION')} style={{ padding: '0.75rem', backgroundColor: 'rgba(197, 160, 89, 0.15)', color: '#C5A059', border: '1px solid #C5A059', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            👨‍🍳 En Preparación
                        </button>
                        <button onClick={() => handleCambiarEstadoPedido('LISTO')} style={{ padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid #22c55e', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            ✅ Listo
                        </button>
                        <button onClick={() => handleCambiarEstadoPedido('CANCELADO')} style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            ⚠️ Cancelado
                        </button>
                    </div>
                </div>
            )}

            {/* SECCIÓN DE INVENTARIO */}
            <div style={{ backgroundColor: '#16120E', padding: '1.5rem', borderRadius: '16px', border: '1px solid #26201B', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#C5A059', letterSpacing: '0.05em', fontWeight: 'bold', display: 'block', marginBottom: '1rem' }}>
                    📦 INVENTARIO EN EXISTENCIA (SQL SERVER)
                </span>

                {cargandoProductos ? (
                    <p style={{ color: '#aaa', textAlign: 'center', margin: '1rem 0' }}>Cargando inventario...</p>
                ) : errorProductos ? (
                    <p style={{ color: '#fda4af', textAlign: 'center', margin: '1rem 0' }}>{errorProductos}</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#0D0B0A', color: '#C5A059', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem', borderRadius: '6px 0 0 6px' }}>ID</th>
                                    <th style={{ padding: '0.75rem' }}>Nombre</th>
                                    <th style={{ padding: '0.75rem' }}>Categoría</th>
                                    <th style={{ padding: '0.75rem' }}>Precio</th>
                                    <th style={{ padding: '0.75rem' }}>Stock</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'center', borderRadius: '0 6px 6px 0' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productos.map((prod) => {
                                    const id = prod.idProducto || prod.id_producto || prod.id;
                                    return (
                                        <tr key={id} style={{ borderBottom: '1px solid #26201B' }}>
                                            <td style={{ padding: '0.75rem' }}>#{id}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{prod.nombre}</td>
                                            <td style={{ padding: '0.75rem', color: '#aaa' }}>{prod.categoria}</td>
                                            <td style={{ padding: '0.75rem', color: '#C5A059' }}>${prod.precio}</td>
                                            <td style={{ padding: '0.75rem' }}>{prod.stock}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => handleEditarProducto(prod)}
                                                    style={{ marginRight: '0.5rem', padding: '0.3rem 0.6rem', backgroundColor: '#C5A059', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleEliminarProducto(id)}
                                                    style={{ padding: '0.3rem 0.6rem', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                >
                                                    Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CONSULTA POR ID */}
            <div style={{ backgroundColor: '#16120E', padding: '1.5rem', borderRadius: '16px', border: '1px solid #26201B', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#C5A059', letterSpacing: '0.05em', fontWeight: 'bold', display: 'block', marginBottom: '1rem' }}>
                    🔍 CONSULTA POR ID (SQL SERVER)
                </span>
                <form onSubmit={handleBuscarPorId} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="number"
                        placeholder="Ingresa ID del producto (Ej: 1)"
                        value={idBusqueda}
                        onChange={(e) => setIdBusqueda(e.target.value)}
                        style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}
                    />
                    <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#C5A059', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                        Buscar ID
                    </button>
                </form>

                {productoBuscado && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#0D0B0A', borderRadius: '8px', border: '1px solid #26201B' }}>
                        <p style={{ margin: 0, color: '#C5A059' }}><strong>Resultado:</strong> {productoBuscado.nombre} — ${productoBuscado.precio} (Stock: {productoBuscado.stock})</p>
                    </div>
                )}
            </div>

            {/* FORMULARIO PRODUCTOS */}
            <div style={{ backgroundColor: '#16120E', padding: '1.5rem', borderRadius: '16px', border: '1px solid #26201B' }}>
                <span style={{ fontSize: '0.8rem', color: '#C5A059', letterSpacing: '0.05em', fontWeight: 'bold', display: 'block', marginBottom: '1rem' }}>
                    {productoEditandoId ? `✏️ EDITAR PRODUCTO #${productoEditandoId}` : '✨ AGREGAR NUEVO PRODUCTO'}
                </span>

                <form onSubmit={handleGuardarProducto} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>NOMBRE</label>
                            <input type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} required placeholder="Ej. Jack Daniel's" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>CATEGORÍA</label>
                            <select name="categoria" value={formData.categoria} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}>
                                <option value="Whisky">Whisky</option>
                                <option value="Vino">Vino</option>
                                <option value="Tequila">Tequila</option>
                                <option value="Ron">Ron</option>
                                <option value="Cerveza">Cerveza</option>
                                <option value="Mezcal">Mezcal</option>
                                <option value="Espumoso">Espumoso</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>PRECIO</label>
                            <input type="number" name="precio" value={formData.precio} onChange={handleInputChange} required placeholder="0.00" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>STOCK</label>
                            <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required placeholder="0" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>URL IMAGEN O ICONO</label>
                        <input type="text" name="imagen" value={formData.imagen} onChange={handleInputChange} placeholder="https://..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>DESCRIPCIÓN</label>
                        <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows="3" placeholder="Descripción breve..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}></textarea>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '0.85rem', backgroundColor: '#C5A059', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            {productoEditandoId ? 'Guardar Cambios' : 'Agregar Producto'}
                        </button>
                        {productoEditandoId && (
                            <button type="button" onClick={handleCancelarEditar} style={{ padding: '0.85rem 1.5rem', backgroundColor: 'transparent', color: '#aaa', border: '1px solid #382E26', borderRadius: '8px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}