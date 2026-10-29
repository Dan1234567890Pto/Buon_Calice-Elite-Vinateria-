import { useState, useEffect } from 'react';
import { getProductos, crearPedido } from '../../services/api';
import './Cliente.css';

// --- COMPONENTE AUXILIAR (FUERA DEL COMPONENTE PRINCIPAL) ---
const RenderImagenBotella = ({ url, alt, className = "w-full h-full object-contain p-2" }) => {
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
        <div className="text-4xl flex items-center justify-center h-full">
            {url || '🍷'}
        </div>
    );
};

export default function ClienteView() {
    const [seccion, setSeccion] = useState('sec-catalogo');
    const [productos, setProductos] = useState([]);
    const [cargandoApi, setCargandoApi] = useState(true);
    const [carrito, setCarrito] = useState([]);
    const [prodSeleccionado, setProdSeleccionado] = useState(null);
    const [cantSeleccionada, setCantSeleccionada] = useState(1);
    const [filtroCat, setFiltroCat] = useState('Todos');
    const [busqueda, setBusqueda] = useState('');
    const [mostrarBuscador, setMostrarBuscador] = useState(false);
    const [splashVisible, setSplashVisible] = useState(true);

    const [ultimoPedido, setUltimoPedido] = useState(() => {
        try {
            const data = localStorage.getItem('ultimoPedido');
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    });

    const [cliNombre, setCliNombre] = useState('');
    const [cliCorreo, setCliCorreo] = useState('');
    const [cliTelefono, setCliTelefono] = useState('');
    const [metodoPago, setMetodoPago] = useState('Pagar en línea');

    const [perfil, setPerfil] = useState({
        nombre: 'No registrado',
        correo: 'No registrado',
        telefono: 'No registrado'
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setSplashVisible(false);
        }, 1500);

        (async () => {
            try {
                setCargandoApi(true);
                const data = await getProductos(true);
                const adaptados = (data || []).map(p => ({
                    id: p.idProducto || p.id,
                    nombre: p.nombre,
                    categoria: p.categoria || 'Vino Tinto',
                    precio: p.precio,
                    stock: p.stock,
                    icono: p.icono || p.imagenUrl || '',
                    desc: p.descripcion || 'Selección exclusiva de la casa.'
                }));
                setProductos(adaptados);
            } catch (error) {
                console.error("Error conectando con la API de Buon Calice:", error);
            } finally {
                setCargandoApi(false);
            }
        })();

        return () => clearTimeout(timer);
    }, []);

    const verDetalle = (prod) => {
        setProdSeleccionado(prod);
        setCantSeleccionada(1);
        setSeccion('sec-detalle');
    };

    const cambiarCant = (delta) => {
        if (prodSeleccionado) {
            const nueva = cantSeleccionada + delta;
            if (nueva >= 1 && nueva <= prodSeleccionado.stock) {
                setCantSeleccionada(nueva);
            }
        }
    };

    const agregarCarrito = () => {
        if (!prodSeleccionado || prodSeleccionado.stock <= 0) {
            alert('Producto agotado');
            return;
        }
        setCarrito((prev) => {
            const idx = prev.findIndex((item) => item.id === prodSeleccionado.id);
            if (idx > -1) {
                const copia = [...prev];
                copia[idx].cantidad += cantSeleccionada;
                return copia;
            }
            return [...prev, { ...prodSeleccionado, cantidad: cantSeleccionada }];
        });
        alert('Producto añadido al carrito.');
        setSeccion('sec-[#carrito]');
    };

    const confirmarYEnviarPedido = async (e) => {
        e.preventDefault();
        setPerfil({ nombre: cliNombre, correo: cliCorreo, telefono: cliTelefono });

        const total = carrito.reduce((acc, curr) => acc + curr.precio * curr.cantidad, 0);
        const codigo = 'X' + Math.floor(1000 + Math.random() * 9000);

        try {
            const datosPedidoDTO = {
                usuarioId: 1,
                metodoPago: metodoPago,
                productos: carrito.map(item => ({
                    productoId: item.id,
                    cantidad: item.cantidad,
                    precioUnitario: item.precio
                }))
            };

            await crearPedido(datosPedidoDTO);

            const nuevoPedido = {
                codigo,
                cliente: { nombre: cliNombre, correo: cliCorreo, telefono: cliTelefono },
                items: carrito,
                total,
                metodoPago,
                estado: 'recibido'
            };

            localStorage.setItem('ultimoPedido', JSON.stringify(nuevoPedido));
            setUltimoPedido(nuevoPedido);

            const data = await getProductos(true);
            setProductos((data || []).map(p => ({
                id: p.idProducto || p.id,
                nombre: p.nombre,
                categoria: p.categoria || 'Vino Tinto',
                precio: p.precio,
                stock: p.stock,
                icono: p.icono || p.imagenUrl || '',
                desc: p.descripcion || 'Selección exclusiva de la casa.'
            })));

            setCarrito([]);
            setSeccion('sec-exito');
        } catch (err) {
            alert('Error al registrar el pedido en el servidor: ' + err.message);
        }
    };

    const categoriasUnicas = ['Todos', 'Whisky', 'Bourbon', 'Vino Tinto', 'Vino Blanco', 'Espumoso', 'Tequila', 'Bacardi'];

    const productosFiltrados = productos.filter((p) => {
        const coincideCat = filtroCat === 'Todos' || p.categoria === filtroCat || (filtroCat === 'Bacardi' && p.categoria === 'Bacardí');
        const coincideBusqueda =
            busqueda.trim() === '' ||
            p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.categoria.toLowerCase().includes(busqueda.toLowerCase());
        return coincideCat && coincideBusqueda;
    });

    const categoriasAgrupadas = productosFiltrados.reduce((acc, p) => {
        if (!acc[p.categoria]) acc[p.categoria] = [];
        acc[p.categoria].push(p);
        return acc;
    }, {});

    const totalCarrito = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

    return (
        <div className="bg-[#050404] text-[#E2D9CC] min-h-screen pb-24 font-sans selection:bg-[#C5A059] selection:text-black">
            {splashVisible && (
                <div className="fixed inset-0 bg-[#050404] z-[100] flex flex-col items-center justify-center space-y-6 transition-opacity duration-500">
                    <div className="relative flex items-center justify-center">
                        <div className="absolute w-24 h-24 bg-[#C5A059]/10 rounded-full blur-xl animate-pulse"></div>
                        <div className="text-6xl animate-bounce">🍷</div>
                    </div>
                    <div className="text-center space-y-2">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A059] block">Exclusividad & Calidad</span>
                        <h1 className="text-3xl font-serif text-[#F3ECE0] tracking-wide">ÉLITE VINATERÍA</h1>
                    </div>
                    <div className="w-6 h-6 border-2 border-[#26201B] border-t-[#C5A059] rounded-full animate-spin"></div>
                </div>
            )}

            <header className="bg-[#16120E] border-b border-[#26201B] p-4 sticky top-0 z-50 space-y-3">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <div>
                        <span className="text-[10px] uppercase tracking-widest text-[#C5A059]">Boutique</span>
                        <h1 className="text-xl font-serif text-[#F3ECE0]">🍷 ÉLITE VINATERÍA</h1>
                    </div>
                    <div className="flex gap-4 text-lg text-[#9E8E7E]">
                        <button onClick={() => setMostrarBuscador(!mostrarBuscador)} className="hover:text-[#C5A059] transition">🔍</button>
                        <button onClick={() => setSeccion('sec-perfil')} className="hover:text-[#C5A059] transition">👤</button>
                    </div>
                </div>

                {mostrarBuscador && (
                    <div className="max-w-md mx-auto pt-1">
                        <div className="relative">
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar vino, tequila, whisky..."
                                className="w-full bg-[#0D0B0A] border border-[#C5A059]/60 text-white text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#C5A059]"
                            />
                            <button onClick={() => { setBusqueda(''); setMostrarBuscador(false); }} className="absolute right-3 top-3 text-xs text-[#9E8E7E]">✕</button>
                        </div>
                    </div>
                )}
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">
                {seccion === 'sec-catalogo' && (
                    <section className="space-y-6">
                        <div>
                            <span className="text-xs text-[#9E8E7E]">Selección Exclusiva</span>
                            <h2 className="text-lg font-serif text-[#F3ECE0]">Nuestra Cava y Licores</h2>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                            {categoriasUnicas.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setFiltroCat(cat)}
                                    className={`px-4 py-2 rounded-xl whitespace-nowrap transition ${filtroCat === cat || (cat === 'Bacardi' && filtroCat === 'Bacardí')
                                        ? 'bg-[#C5A059] text-black font-semibold'
                                        : 'bg-[#16120E] border border-[#26201B] text-[#9E8E7E]'
                                        }`}
                                >
                                    {cat === 'Bacardi' ? 'Bacardí' : cat}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-6">
                            {cargandoApi ? (
                                <div className="text-center text-[#9E8E7E] py-12 text-xs">Cargando catálogo desde SQL Server...</div>
                            ) : Object.keys(categoriasAgrupadas).length === 0 ? (
                                <div className="text-center text-[#9E8E7E] py-12 text-xs">No se encontraron productos disponibles.</div>
                            ) : (
                                Object.keys(categoriasAgrupadas).map((catNombre) => (
                                    <div key={catNombre} className="space-y-3">
                                        <div className="flex items-center justify-between border-b border-[#26201B] pb-2">
                                            <h3 className="text-xs uppercase tracking-widest text-[#C5A059] font-bold">{catNombre}</h3>
                                            <span className="text-[10px] text-[#9E8E7E]">{categoriasAgrupadas[catNombre].length} opción(es)</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {categoriasAgrupadas[catNombre].map((p) => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => verDetalle(p)}
                                                    className="bg-[#16120E] border border-[#26201B] p-3 rounded-2xl space-y-2 cursor-pointer hover:border-[#C5A059]/50 transition flex flex-col justify-between"
                                                >
                                                    <div className="bg-[#0D0B0A] h-28 rounded-xl flex items-center justify-center overflow-hidden">
                                                        <RenderImagenBotella url={p.icono} alt={p.nombre} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-[#F3ECE0] line-clamp-1">{p.nombre}</h4>
                                                        <p className="text-sm font-bold text-[#D4AF37]">${p.precio}.00</p>
                                                    </div>
                                                    <span
                                                        className={`text-[10px] ${p.stock > 0
                                                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                                            : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                                            } border px-2 py-0.5 rounded-full inline-block self-start`}
                                                    >
                                                        {p.stock > 0 ? `Disp: ${p.stock}` : 'Agotado'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {seccion === 'sec-detalle' && prodSeleccionado && (
                    <section className="space-y-5">
                        <button onClick={() => setSeccion('sec-catalogo')} className="text-xs text-[#C5A059] flex items-center gap-1">
                            ← Regresar al catálogo
                        </button>

                        <div className="bg-[#16120E] border border-[#26201B] p-6 rounded-2xl text-center space-y-4">
                            <div className="bg-[#0D0B0A] h-48 rounded-2xl flex items-center justify-center overflow-hidden">
                                <RenderImagenBotella url={prodSeleccionado.icono} alt={prodSeleccionado.nombre} className="w-full h-full object-contain p-4" />
                            </div>
                            <div>
                                <h2 className="text-xl font-serif text-[#F3ECE0]">{prodSeleccionado.nombre}</h2>
                                <p className="text-2xl font-bold text-[#D4AF37] mt-1">${prodSeleccionado.precio}.00</p>
                            </div>
                            <p className="text-xs text-emerald-400">Disponible: {prodSeleccionado.stock} unidades</p>
                            <p className="text-xs text-[#9E8E7E]">{prodSeleccionado.desc}</p>

                            <div className="flex justify-center items-center gap-4 py-2">
                                <button onClick={() => cambiarCant(-1)} className="w-8 h-8 rounded-lg bg-[#0D0B0A] border border-[#382E26] text-white font-bold">-</button>
                                <span className="text-sm font-bold text-[#F3ECE0]">{cantSeleccionada}</span>
                                <button onClick={() => cambiarCant(1)} className="w-8 h-8 rounded-lg bg-[#0D0B0A] border border-[#382E26] text-white font-bold">+</button>
                            </div>

                            <button onClick={agregarCarrito} className="w-full bg-[#C5A059] hover:bg-[#B38E47] text-black font-bold text-xs py-3 rounded-xl transition">
                                AGREGAR AL CARRITO
                            </button>
                        </div>
                    </section>
                )}

                {seccion === 'sec-carrito' && (
                    <section className="space-y-4">
                        <h3 className="text-xs uppercase tracking-wider text-[#C5A059] font-medium">Tu Carrito de Compras</h3>
                        <div className="bg-[#16120E] border border-[#26201B] p-4 rounded-2xl space-y-3 text-xs">
                            {carrito.length === 0 ? (
                                <p className="text-center text-[#9E8E7E]">El carrito está vacío</p>
                            ) : (
                                <>
                                    {carrito.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center border-b border-[#26201B] pb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-[#0D0B0A] rounded overflow-hidden">
                                                    <RenderImagenBotella url={item.icono} alt={item.nombre} className="w-full h-full object-contain p-0.5" />
                                                </div>
                                                <span>{item.nombre} x {item.cantidad}</span>
                                            </div>
                                            <span className="text-[#D4AF37] font-bold">${item.precio * item.cantidad}.00</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between font-bold text-sm text-[#F3ECE0] pt-1">
                                        <span>Subtotal</span>
                                        <span className="text-[#D4AF37]">${totalCarrito}.00</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {carrito.length > 0 && (
                            <button onClick={() => setSeccion('sec-confirmacion')} className="w-full bg-[#C5A059] hover:bg-[#B38E47] text-black font-bold text-xs py-3 rounded-xl transition">
                                CONTINUAR PEDIDO
                            </button>
                        )}
                    </section>
                )}

                {seccion === 'sec-confirmacion' && (
                    <section className="space-y-4">
                        <h3 className="text-xs uppercase tracking-wider text-[#C5A059] font-medium">Datos de Contacto y Pago</h3>

                        <form onSubmit={confirmarYEnviarPedido} className="bg-[#16120E] border border-[#26201B] p-5 rounded-2xl space-y-4 text-xs">
                            <div className="space-y-3 border-b border-[#26201B] pb-4">
                                <h4 className="text-[#F3ECE0] font-semibold">1. Datos del Cliente</h4>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nombre completo"
                                    value={cliNombre}
                                    onChange={(e) => setCliNombre(e.target.value)}
                                    className="w-full bg-[#0D0B0A] border border-[#382E26] text-white p-3 rounded-xl focus:outline-none focus:border-[#C5A059]"
                                />
                                <input
                                    type="email"
                                    required
                                    placeholder="Correo electrónico"
                                    value={cliCorreo}
                                    onChange={(e) => setCliCorreo(e.target.value)}
                                    className="w-full bg-[#0D0B0A] border border-[#382E26] text-white p-3 rounded-xl focus:outline-none focus:border-[#C5A059]"
                                />
                                <input
                                    type="tel"
                                    required
                                    placeholder="Teléfono"
                                    value={cliTelefono}
                                    onChange={(e) => setCliTelefono(e.target.value)}
                                    className="w-full bg-[#0D0B0A] border border-[#382E26] text-white p-3 rounded-xl focus:outline-none focus:border-[#C5A059]"
                                />
                            </div>

                            <div className="border-b border-[#26201B] pb-3 space-y-2">
                                <h4 className="text-[#F3ECE0] font-semibold">2. Método de Pago</h4>
                                <label className="flex items-center gap-2 text-[#F3ECE0]">
                                    <input type="radio" name="pago" value="Pagar en línea" checked={metodoPago === 'Pagar en línea'} onChange={(e) => setMetodoPago(e.target.value)} className="accent-[#C5A059]" />
                                    Pagar en línea
                                </label>
                                <label className="flex items-center gap-2 text-[#F3ECE0]">
                                    <input type="radio" name="pago" value="Pagar al recoger" checked={metodoPago === 'Pagar al recoger'} onChange={(e) => setMetodoPago(e.target.value)} className="accent-[#C5A059]" />
                                    Pagar al recoger
                                </label>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                                <span className="text-[#9E8E7E]">Total a Pagar:</span>
                                <span className="text-base font-bold text-[#D4AF37]">${totalCarrito}.00</span>
                            </div>

                            <button type="submit" className="w-full bg-[#C5A059] hover:bg-[#B38E47] text-black font-bold py-3.5 rounded-xl transition">
                                CONFIRMAR Y FINALIZAR PEDIDO
                            </button>
                        </form>
                    </section>
                )}

                {seccion === 'sec-exito' && (
                    <section className="text-center py-8 space-y-4">
                        <div className="bg-[#16120E] border border-[#C5A059]/40 p-6 rounded-2xl space-y-3">
                            <div className="text-4xl text-[#C5A059]">✓</div>
                            <h2 className="text-xl font-serif text-[#F3ECE0]">¡Pedido Registrado!</h2>
                            <span className="text-[10px] uppercase tracking-widest text-[#9E8E7E] block">Tu Código de Recolección</span>
                            <p className="text-3xl font-mono font-bold text-[#D4AF37]">#{ultimoPedido?.codigo || '------'}</p>
                            <p className="text-xs text-[#9E8E7E]">Tu pedido ha sido enviado al panel de la sucursal.</p>
                            <button onClick={() => setSeccion('sec-estado')} className="w-full bg-[#C5A059] text-black font-bold text-xs py-3 rounded-xl transition mt-2">
                                VER ESTADO EN TIEMPO REAL
                            </button>
                        </div>
                    </section>
                )}

                {seccion === 'sec-estado' && (
                    <section className="space-y-4">
                        <h3 className="text-xs uppercase tracking-wider text-[#C5A059] font-medium">Estado de tu Pedido</h3>
                        <div className="bg-[#16120E] border border-[#26201B] p-5 rounded-2xl space-y-3 text-xs">
                            {!ultimoPedido ? (
                                <p className="text-center text-[#9E8E7E]">No tienes ningún pedido activo en este momento.</p>
                            ) : (
                                <>
                                    <div className="border-b border-[#26201B] pb-2 mb-2">
                                        <span className="text-[10px] text-[#9E8E7E] block">Código: #{ultimoPedido.codigo}</span>
                                        <span className="font-bold text-[#D4AF37]">Total: ${ultimoPedido.total}.00</span>
                                    </div>
                                    <div className={`flex items-center gap-3 ${['recibido', 'en_preparacion', 'listo', 'entregado'].includes(ultimoPedido.estado) ? 'text-amber-400 font-medium' : 'text-[#9E8E7E]'}`}>
                                        ✓ Pedido recibido
                                    </div>
                                    <div className={`flex items-center gap-3 ${['en_preparacion', 'listo', 'entregado'].includes(ultimoPedido.estado) ? 'text-[#D4AF37] font-bold' : 'text-[#9E8E7E]'}`}>
                                        ● En Preparación
                                    </div>
                                    <div className={`flex items-center gap-3 ${['listo', 'entregado'].includes(ultimoPedido.estado) ? 'text-emerald-400 font-bold' : 'text-[#9E8E7E]'}`}>
                                        ○ Listo para recoger
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                )}

                {seccion === 'sec-perfil' && (
                    <section className="space-y-4">
                        <h3 className="text-xs uppercase tracking-wider text-[#C5A059] font-medium">Mi Cuenta</h3>
                        <div className="bg-[#16120E] border border-[#26201B] p-5 rounded-2xl space-y-3 text-xs">
                            <p className="text-[#9E8E7E]">Nombre: <span className="text-[#F3ECE0] font-medium">{perfil.nombre}</span></p>
                            <p className="text-[#9E8E7E]">Correo: <span className="text-[#F3ECE0] font-medium">{perfil.correo}</span></p>
                            <p className="text-[#9E8E7E]">Teléfono: <span className="text-[#F3ECE0] font-medium">{perfil.telefono}</span></p>
                        </div>
                    </section>
                )}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-[#16120E] border-t border-[#26201B] py-3 px-6 z-50">
                <div className="max-w-md mx-auto flex justify-between items-center text-[10px] text-[#9E8E7E]">
                    <button onClick={() => setSeccion('sec-catalogo')} className="flex flex-col items-center gap-1 hover:text-[#C5A059]"><span>🏠</span>Inicio</button>
                    <button onClick={() => setSeccion('sec-estado')} className="flex flex-col items-center gap-1 hover:text-[#C5A059]"><span>📦</span>Pedidos</button>
                    <button onClick={() => setSeccion('sec-carrito')} className="flex flex-col items-center gap-1 hover:text-[#C5A059]"><span>🛒</span>Carrito</button>
                    <button onClick={() => setSeccion('sec-perfil')} className="flex flex-col items-center gap-1 hover:text-[#C5A059]"><span>👤</span>Perfil</button>
                </div>
            </nav>
        </div>
    );
}