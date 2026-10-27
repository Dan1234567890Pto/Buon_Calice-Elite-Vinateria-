// Puerto asignado a tu Web API de .NET (Ajusta la URL si en producción cambia)
const API_BASE_URL = 'https://localhost:7263/api';

// Exportación secundaria para mantener compatibilidad
export const API_URL = API_BASE_URL;

// --- PRODUCTOS ---

// Obtenemos el catálogo general de productos
export const getProductos = async (soloActivos = true) => {
    const res = await fetch(`${API_BASE_URL}/productos?soloActivos=${soloActivos}`);
    if (!res.ok) throw new Error('Error al obtener productos');
    return await res.json();
};

// Obtener un único producto por su ID
export const getProductoPorId = async (id) => {
    const res = await fetch(`${API_BASE_URL}/productos/${id}`);
    if (!res.ok) throw new Error('Producto no encontrado');
    return await res.json();
};

// Crear o Actualizar un producto (POST / PUT según corresponda)
export const guardarProducto = async (producto) => {
    const metodo = producto.idProducto ? 'PUT' : 'POST';
    const url = producto.idProducto
        ? `${API_BASE_URL}/productos/${producto.idProducto}`
        : `${API_BASE_URL}/productos`;

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(producto)
    });

    if (!res.ok) throw new Error('Error al procesar el producto');
    return await res.json();
};

// Actualizar únicamente el stock de un producto (usa la ruta PUT /api/productos/{id})
export const actualizarStock = async (idProducto, nuevoStock) => {
    // 1. Obtenemos el producto actual para no perder sus demás datos (nombre, precio, etc.)
    const productoActual = await getProductoPorId(idProducto);

    // 2. Modificamos el stock
    const productoActualizado = {
        ...productoActual,
        stock: Number(nuevoStock)
    };

    const res = await fetch(`${API_BASE_URL}/productos/${idProducto}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productoActualizado)
    });


    if (!res.ok) throw new Error('Error al actualizar el stock del producto');
    return await res.json();
};
// Eliminar un producto de forma física en SQL Server (DELETE)
export const eliminarProducto = async (id) => {
    const res = await fetch(`${API_BASE_URL}/productos/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar el producto');
    return await res.json();
};

// --- USUARIOS ---

export const loginUsuario = async (correo, password) => {
    const res = await fetch(`${API_BASE_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password })
    });
    if (!res.ok) throw new Error('Credenciales incorrectas');
    return await res.json();
};

// --- PEDIDOS ---

export const crearPedido = async (datosPedido) => {
    const res = await fetch(`${API_BASE_URL}/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosPedido)
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(data.mensaje || 'Error al procesar el pedido');
    }

    return data;
};

// Obtener el listado general de pedidos desde SQL Server
export const getPedidos = async () => {
    const res = await fetch(`${API_BASE_URL}/pedidos`);
    if (!res.ok) throw new Error('Error al consultar pedidos');
    return await res.json();
};