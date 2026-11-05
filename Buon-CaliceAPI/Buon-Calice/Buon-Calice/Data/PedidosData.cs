using Buon_Calice.Data;
using Buon_Calice.Models;
using Microsoft.Data.SqlClient;
using System.Data;
using System.Linq;

namespace Buon_Calice.Data
{
    public class PedidosData
    {
        private readonly Conexion _conexion;

        public PedidosData(Conexion conexion)
        {
            _conexion = conexion;
        }

        // 1. Crear un pedido completo con sus detalles
        public async Task<bool> CrearPedido(CrearPedidoDTO dto)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();
                using (var transaction = conn.BeginTransaction())
                {
                    try
                    {
                        decimal total = dto.Productos.Sum(p => p.Cantidad * p.PrecioUnitario);
                        string codigoPedido = "BC-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

                        int idPedidoGenerado = 0;
                        string queryPedido = @"INSERT INTO pedidos (codigo, usuario_id, total, estado, metodo_pago, fecha_pedido) 
                                               OUTPUT INSERTED.id_pedido
                                               VALUES (@codigo, @usuario_id, @total, 'PENDIENTE', @metodo_pago, GETDATE())";

                        using (var cmdPedido = new SqlCommand(queryPedido, conn, transaction))
                        {
                            cmdPedido.Parameters.AddWithValue("@codigo", codigoPedido);
                            cmdPedido.Parameters.AddWithValue("@usuario_id", (dto.UsuarioId.HasValue && dto.UsuarioId > 0) ? dto.UsuarioId.Value : DBNull.Value);
                            cmdPedido.Parameters.AddWithValue("@total", total);
                            cmdPedido.Parameters.AddWithValue("@metodo_pago", string.IsNullOrEmpty(dto.MetodoPago) ? "Efectivo" : dto.MetodoPago);

                            var result = await cmdPedido.ExecuteScalarAsync();
                            if (result != null)
                            {
                                idPedidoGenerado = Convert.ToInt32(result);
                            }
                        }

                        if (idPedidoGenerado > 0 && dto.Productos != null && dto.Productos.Any())
                        {
                            foreach (var item in dto.Productos)
                            {
                                string queryDetalle = @"INSERT INTO detalle_pedido (pedido_id, producto_id, cantidad, precio_unitario) 
                                                       VALUES (@pedido_id, @producto_id, @cantidad, @precio_unitario)";

                                using (var cmdDetalle = new SqlCommand(queryDetalle, conn, transaction))
                                {
                                    cmdDetalle.Parameters.AddWithValue("@pedido_id", idPedidoGenerado);
                                    cmdDetalle.Parameters.AddWithValue("@producto_id", item.ProductoId);
                                    cmdDetalle.Parameters.AddWithValue("@cantidad", item.Cantidad);
                                    cmdDetalle.Parameters.AddWithValue("@precio_unitario", item.PrecioUnitario);

                                    await cmdDetalle.ExecuteNonQueryAsync();
                                }
                            }
                        }

                        transaction.Commit();
                        return true;
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }

        // 2. Obtener lista de pedidos ACTIVOS (Excluye ENTREGADO y CANCELADO para el panel de trabajo)
        public async Task<List<Pedido>> ObtenerPedidos(int? usuarioId = null)
        {
            var lista = new List<Pedido>();

            // Paso A: Leer solo las cabeceras de pedidos activos
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                string query = @"SELECT id_pedido, codigo, usuario_id, total, estado, metodo_pago, fecha_pedido 
                                FROM pedidos 
                                WHERE (@usuario_id IS NULL OR usuario_id = @usuario_id)
                                  AND estado NOT IN ('ENTREGADO', 'CANCELADO')
                                ORDER BY fecha_pedido DESC";

                using (var cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@usuario_id", (object?)usuarioId ?? DBNull.Value);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            lista.Add(new Pedido
                            {
                                IdPedido = Convert.ToInt32(reader["id_pedido"]),
                                Codigo = reader["codigo"].ToString()!,
                                UsuarioId = reader["usuario_id"] != DBNull.Value ? Convert.ToInt32(reader["usuario_id"]) : 0,
                                Total = Convert.ToDecimal(reader["total"]),
                                Estado = reader["estado"].ToString()!,
                                MetodoPago = reader["metodo_pago"] != DBNull.Value ? reader["metodo_pago"].ToString()! : "Efectivo",
                                FechaPedido = Convert.ToDateTime(reader["fecha_pedido"]),
                                Productos = new List<DetallePedido>()
                            });
                        }
                    }
                }
            }

            // Paso B: Cargar los productos usando dp.id (columna real de tu tabla SQL)
            foreach (var pedido in lista)
            {
                using (var connDet = _conexion.ObtenerConexion())
                {
                    await connDet.OpenAsync();

                    string queryDetalles = @"
                        SELECT dp.id, dp.pedido_id, dp.producto_id, dp.cantidad, dp.precio_unitario, ISNULL(p.nombre, 'Producto General') AS nombre 
                        FROM detalle_pedido dp
                        LEFT JOIN productos p ON dp.producto_id = p.id_producto
                        WHERE dp.pedido_id = @idPedido";

                    using (var cmdDet = new SqlCommand(queryDetalles, connDet))
                    {
                        cmdDet.Parameters.AddWithValue("@idPedido", pedido.IdPedido);
                        using (var readerDet = await cmdDet.ExecuteReaderAsync())
                        {
                            while (await readerDet.ReadAsync())
                            {
                                pedido.Productos.Add(new DetallePedido
                                {
                                    IdDetalle = Convert.ToInt32(readerDet["id"]),
                                    PedidoId = Convert.ToInt32(readerDet["pedido_id"]),
                                    ProductoId = Convert.ToInt32(readerDet["producto_id"]),
                                    NombreProducto = readerDet["nombre"].ToString()!,
                                    Cantidad = Convert.ToInt32(readerDet["cantidad"]),
                                    PrecioUnitario = Convert.ToDecimal(readerDet["precio_unitario"])
                                });
                            }
                        }
                    }
                }
            }

            return lista;
        }

        // 3. Actualizar el estado de un pedido en la BD (Soporta paso a 'ENTREGADO')
        public async Task<bool> ActualizarEstadoPedido(int idPedido, string nuevoEstado)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();
                string query = "UPDATE pedidos SET estado = @nuevoEstado WHERE id_pedido = @idPedido";

                using (var cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@idPedido", idPedido);
                    cmd.Parameters.AddWithValue("@nuevoEstado", nuevoEstado);

                    int filas = await cmd.ExecuteNonQueryAsync();
                    return filas > 0;
                }
            }
        }

        // 4. Obtener un solo pedido por ID (con sus detalles)
        public async Task<Pedido?> ObtenerPedidoPorId(int idPedido)
        {
            Pedido? pedido = null;

            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();
                string query = "SELECT id_pedido, codigo, usuario_id, total, estado, metodo_pago, fecha_pedido FROM pedidos WHERE id_pedido = @idPedido";

                using (var cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@idPedido", idPedido);
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            pedido = new Pedido
                            {
                                IdPedido = Convert.ToInt32(reader["id_pedido"]),
                                Codigo = reader["codigo"].ToString()!,
                                UsuarioId = reader["usuario_id"] != DBNull.Value ? Convert.ToInt32(reader["usuario_id"]) : 0,
                                Total = Convert.ToDecimal(reader["total"]),
                                Estado = reader["estado"].ToString()!,
                                MetodoPago = reader["metodo_pago"] != DBNull.Value ? reader["metodo_pago"].ToString()! : "Efectivo",
                                FechaPedido = Convert.ToDateTime(reader["fecha_pedido"]),
                                Productos = new List<DetallePedido>()
                            };
                        }
                    }
                }
            }

            if (pedido != null)
            {
                using (var connDet = _conexion.ObtenerConexion())
                {
                    await connDet.OpenAsync();

                    string queryDetalles = @"
                        SELECT dp.id, dp.pedido_id, dp.producto_id, dp.cantidad, dp.precio_unitario, ISNULL(p.nombre, 'Producto General') AS nombre 
                        FROM detalle_pedido dp
                        LEFT JOIN productos p ON dp.producto_id = p.id_producto
                        WHERE dp.pedido_id = @idPedido";

                    using (var cmdDet = new SqlCommand(queryDetalles, connDet))
                    {
                        cmdDet.Parameters.AddWithValue("@idPedido", pedido.IdPedido);
                        using (var readerDet = await cmdDet.ExecuteReaderAsync())
                        {
                            while (await readerDet.ReadAsync())
                            {
                                pedido.Productos.Add(new DetallePedido
                                {
                                    IdDetalle = Convert.ToInt32(readerDet["id"]),
                                    PedidoId = Convert.ToInt32(readerDet["pedido_id"]),
                                    ProductoId = Convert.ToInt32(readerDet["producto_id"]),
                                    NombreProducto = readerDet["nombre"].ToString()!,
                                    Cantidad = Convert.ToInt32(readerDet["cantidad"]),
                                    PrecioUnitario = Convert.ToDecimal(readerDet["precio_unitario"])
                                });
                            }
                        }
                    }
                }
            }

            return pedido;
        }

        // 5. Eliminar pedido físicamente (Mantenido por compatibilidad)
        public async Task<bool> EliminarPedido(int idPedido)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();
                using (var transaction = conn.BeginTransaction())
                {
                    try
                    {
                        string queryDetalles = "DELETE FROM detalle_pedido WHERE pedido_id = @idPedido";
                        using (var cmdDetalle = new SqlCommand(queryDetalles, conn, transaction))
                        {
                            cmdDetalle.Parameters.AddWithValue("@idPedido", idPedido);
                            await cmdDetalle.ExecuteNonQueryAsync();
                        }

                        string queryPedido = "DELETE FROM pedidos WHERE id_pedido = @idPedido";
                        using (var cmdPedido = new SqlCommand(queryPedido, conn, transaction))
                        {
                            cmdPedido.Parameters.AddWithValue("@idPedido", idPedido);
                            int filasAfectadas = await cmdPedido.ExecuteNonQueryAsync();

                            transaction.Commit();
                            return filasAfectadas > 0;
                        }
                    }
                    catch
                    {
                        transaction.Rollback();
                        throw;
                    }
                }
            }
        }
        // 6. Obtener métricas y reporte general de ventas entregadas
        public async Task<object> ObtenerReporteVentas()
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                string query = @"
            SELECT 
                COUNT(id_pedido) AS TotalPedidosEntregados,
                ISNULL(SUM(total), 0) AS TotalIngresos,
                ISNULL(AVG(total), 0) AS TicketPromedio
            FROM pedidos 
            WHERE estado = 'ENTREGADO'";

                using (var cmd = new SqlCommand(query, conn))
                {
                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new
                            {
                                TotalPedidos = Convert.ToInt32(reader["TotalPedidosEntregados"]),
                                TotalVendido = Convert.ToDecimal(reader["TotalIngresos"]),
                                TicketPromedio = Convert.ToDecimal(reader["TicketPromedio"])
                            };
                        }
                    }
                }
            }

            return new { TotalPedidos = 0, TotalVendido = 0, TicketPromedio = 0 };
        }
    }
}