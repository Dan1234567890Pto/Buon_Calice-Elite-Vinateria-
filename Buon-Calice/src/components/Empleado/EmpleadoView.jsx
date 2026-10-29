import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmpleadoView() {
    // Estados para productos y tabla CRUD
    const [productos, setProductos] = useState([]);
    const [cargandoProductos, setCargandoProductos] = useState(true);
    const [errorProductos, setErrorProductos] = useState('');
    const [productoEditandoId, setProductoEditandoId] = useState(null);

    // Lista de pedidos acumulados
    const [pedidos, setPedidos] = useState([
        { id: '#BC-BF2EA9C4', usuarioId: 1, pago: 'Pagar al recoger', fecha: '26/10/2026, 4:34:54 p.m.', total: '$1350.00', articulos: 0, estado: 'PENDIENTE' },
        { id: '#BC-DED5B9AE', usuarioId: 2, pago: 'Tarjeta de Crédito', fecha: '26/10/2026, 4:40:10 p.m.', total: '$1700.00', articulos: 2, estado: 'PENDIENTE' },
        { id: '#BC-37450697', usuarioId: 3, pago: 'Pagar al recoger', fecha: '26/10/2026, 5:10:00 p.m.', total: '$2100.00', articulos: 1, estado: 'PENDIENTE' },
        { id: '#BC-25393BA4', usuarioId: 4, pago: 'Efectivo', fecha: '26/10/2026, 5:25:30 p.m.', total: '$2250.00', articulos: 3, estado: 'PENDIENTE' },
        { id: '#BC-A74495C9', usuarioId: 5, pago: 'Pagar al recoger', fecha: '26/10/2026, 6:00:15 p.m.', total: '$3250.00', articulos: 4, estado: 'PENDIENTE' }
    ]);

    // Estado del pedido actualmente seleccionado
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(pedidos[0]);

    // Estados de interfaz adicionales
    const [idBusqueda, setIdBusqueda] = useState('');
    const [productoBuscado, setProductoBuscado] = useState(null);
    const [codigoPedidoBorrar, setCodigoPedidoBorrar] = useState('');

    // Datos del usuario desde localStorage
    const usuarioSesion = JSON.parse(localStorage.getItem('usuario_admin')) || { nombre: 'Administrador Élite' };

    // Estado del formulario de productos
    const [formData, setFormData] = useState({
        nombre: '',
        categoria: 'Whisky',
        precio: '',
        stock: '',
        imagen: '',
        descripcion: ''
    });

    const navigate = useNavigate();
    const API_URL = 'https://localhost:7263/api/Productos';

    // Cargar productos al montar
    useEffect(() => {
        obtenerProductos();
    }, []);

    const obtenerProductos = async () => {
        setCargandoProductos(true);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Error al conectar con SQL Server');
            const data = await response.json();
            setProductos(data);
        } catch (err) {
            console.error(err);
            setErrorProductos('No se pudo cargar el inventario de productos.');
        } finally {
            setCargandoProductos(false);
        }
    };

    const handleSeleccionarPedido = (pedido) => {
        setPedidoSeleccionado(pedido);
    };

    const handleCambiarEstadoPedido = (nuevoEstado) => {
        if (!pedidoSeleccionado) return;

        const pedidosActualizados = pedidos.map(p =>
            p.id === pedidoSeleccionado.id ? { ...p, estado: nuevoEstado } : p
        );

        setPedidos(pedidosActualizados);
        setPedidoSeleccionado({ ...pedidoSeleccionado, estado: nuevoEstado });
    };

    const handleEntregarYBorrar = (e) => {
        e.preventDefault();
        if (!codigoPedidoBorrar) return;

        const codigoFormateado = codigoPedidoBorrar.trim().toUpperCase();
        const existe = pedidos.some(p => p.id.replace('#', '') === codigoFormateado || p.id === codigoFormateado);

        if (existe) {
            const nuevosPedidos = pedidos.filter(p => p.id.replace('#', '') !== codigoFormateado && p.id !== codigoFormateado);
            setPedidos(nuevosPedidos);
            if (pedidoSeleccionado && (pedidoSeleccionado.id.replace('#', '') === codigoFormateado || pedidoSeleccionado.id === codigoFormateado)) {
                setPedidoSeleccionado(nuevosPedidos[0] || null);
            }
            alert(`Pedido ${codigoPedidoBorrar} entregado y eliminado.`);
            setCodigoPedidoBorrar('');
        } else {
            alert('No se encontró ningún pedido con ese código.');
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleEditarProducto = (prod) => {
        const id = prod.idProducto || prod.id_producto;
        setProductoEditandoId(id);
        setFormData({
            nombre: prod.nombre || '',
            categoria: prod.categoria || 'Whisky',
            precio: prod.precio || '',
            stock: prod.stock || '',
            imagen: prod.imagen || prod.urlImagen || '',
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
            const method = productoEditandoId ? 'PUT' : 'POST';
            const url = productoEditandoId ? `${API_URL}/${productoEditandoId}` : API_URL;

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!response.ok) throw new Error('Error al procesar el producto');

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
            const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar producto');

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
            const response = await fetch(`${API_URL}/${idBusqueda}`);
            if (!response.ok) throw new Error('Producto no encontrado');
            const data = await response.json();
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

            {/* ENCABEZADO DE LA VISTA */}
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

            {/* DASHBOARD DE PEDIDOS ACUMULADOS */}
            <div style={{ backgroundColor: '#16120E', padding: '1.5rem', borderRadius: '16px', border: '1px solid #26201B', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#C5A059', fontWeight: 'bold', letterSpacing: '0.05em' }}>📜 DASHBOARD DE PEDIDOS ACUMULADOS ({pedidos.length})</span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>Haz clic en un pedido para atenderlo</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {pedidos.map((ped) => {
                        const esSeleccionado = pedidoSeleccionado && pedidoSeleccionado.id === ped.id;
                        return (
                            <div
                                key={ped.id}
                                onClick={() => handleSeleccionarPedido(ped)}
                                style={{
                                    backgroundColor: '#0D0B0A',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    border: esSeleccionado ? '1px solid #C5A059' : '1px solid #26201B',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.2s'
                                }}
                            >
                                <div>
                                    <strong style={{ color: '#C5A059', display: 'block', marginBottom: '0.25rem' }}>{ped.id}</strong>
                                    <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>{ped.articulos} artículo(s)</span>
                                    <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>Total: {ped.total}</span>
                                </div>
                                <span style={{
                                    backgroundColor: ped.estado === 'Listo' ? 'rgba(34, 197, 94, 0.15)' : ped.estado === 'En Preparación' ? 'rgba(197, 160, 89, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                                    color: ped.estado === 'Listo' ? '#4ade80' : ped.estado === 'En Preparación' ? '#C5A059' : '#60a5fa',
                                    padding: '0.25rem 0.6rem',
                                    borderRadius: '12px',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold'
                                }}>
                                    {ped.estado}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* VERIFICAR / ENTREGAR PEDIDO POR CÓDIGO */}
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

            {/* ATENDIENDO PEDIDO SELECCIONADO */}
            {pedidoSeleccionado && (
                <div style={{ backgroundColor: '#16120E', padding: '1.5rem', borderRadius: '16px', border: '1px solid #26201B', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#888', letterSpacing: '0.05em' }}>ATENDIENDO PEDIDO</span>
                        <span style={{ backgroundColor: 'rgba(197, 160, 89, 0.2)', color: '#C5A059', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            {pedidoSeleccionado.estado}
                        </span>
                    </div>

                    <h2 style={{ fontFamily: 'serif', color: '#C5A059', margin: '0 0 1.5rem 0', fontSize: '2rem' }}>{pedidoSeleccionado.id}</h2>

                    <div style={{ backgroundColor: '#0D0B0A', padding: '1rem', borderRadius: '8px', border: '1px solid #26201B', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        <p style={{ margin: '0 0 0.4rem 0' }}><strong>Usuario ID:</strong> {pedidoSeleccionado.usuarioId}</p>
                        <p style={{ margin: '0 0 0.4rem 0' }}><strong>Método de Pago:</strong> {pedidoSeleccionado.pago}</p>
                        <p style={{ margin: 0 }}><strong>Fecha:</strong> {pedidoSeleccionado.fecha}</p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#C5A059', letterSpacing: '0.05em', fontWeight: 'bold' }}>DETALLE DE ARTÍCULOS</span>
                        <div style={{ backgroundColor: '#0D0B0A', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem', border: '1px solid #26201B', fontSize: '0.85rem', color: '#aaa' }}>
                            {pedidoSeleccionado.articulos > 0 ? `${pedidoSeleccionado.articulos} producto(s) asignado(s) a este pedido.` : 'Sin detalles de artículos registrados.'}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0D0B0A', padding: '1rem', borderRadius: '8px', border: '1px solid #26201B', marginBottom: '1.5rem' }}>
                        <span style={{ fontWeight: 'bold', letterSpacing: '0.05em' }}>TOTAL</span>
                        <span style={{ color: '#C5A059', fontWeight: 'bold', fontSize: '1.2rem' }}>{pedidoSeleccionado.total}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <button onClick={() => handleCambiarEstadoPedido('En Preparación')} style={{ padding: '0.75rem', backgroundColor: 'rgba(197, 160, 89, 0.15)', color: '#C5A059', border: '1px solid #C5A059', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            👨‍🍳 En Preparación
                        </button>
                        <button onClick={() => handleCambiarEstadoPedido('Listo')} style={{ padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid #22c55e', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            ✅ Listo
                        </button>
                        <button onClick={() => handleCambiarEstadoPedido('No Entregado')} style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid #ef4444', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                            ⚠️ No Entregado
                        </button>
                    </div>
                </div>
            )}

            {/* SECCIÓN DE INVENTARIO Y MODIFICACIÓN DE PRODUCTOS */}
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
                                    const id = prod.idProducto || prod.id_producto;
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

            {/* SECCIÓN CONSULTA POR ID */}
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

            {/* SECCIÓN AGREGAR / EDITAR NUEVO PRODUCTO */}
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
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>PRECIO ($)</label>
                            <input type="number" step="0.01" name="precio" value={formData.precio} onChange={handleInputChange} required placeholder="0.00" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>STOCK INICIAL</label>
                            <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required placeholder="0" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>URL IMAGEN / ÍCONO</label>
                            <input type="text" name="imagen" value={formData.imagen} onChange={handleInputChange} placeholder="https://..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '0.5rem' }}>DESCRIPCIÓN</label>
                        <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows="3" placeholder="Notas de cata o detalles del producto..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #26201B', backgroundColor: '#0D0B0A', color: '#fff', outline: 'none' }}></textarea>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="submit" style={{ flex: 1, padding: '1rem', backgroundColor: '#C5A059', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {productoEditandoId ? 'Guardar Cambios en SQL Server' : 'Registrar Producto en SQL Server'}
                        </button>
                        {productoEditandoId && (
                            <button type="button" onClick={handleCancelarEditar} style={{ padding: '1rem 2rem', backgroundColor: '#4b5563', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}