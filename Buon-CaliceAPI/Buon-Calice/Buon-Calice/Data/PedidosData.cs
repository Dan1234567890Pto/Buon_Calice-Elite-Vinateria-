using Microsoft.Data.SqlClient;
using System.Data;
using Buon_Calice.Models;
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
                        // Calcular el total del pedido
                        decimal total = dto.Productos.Sum(p => p.Cantidad * p.PrecioUnitario);
                        string codigoPedido = "BC-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

                        // Insertar en tabla PEDIDOS
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

                        // Insertar cada producto en DETALLE_PEDIDO
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

        // 2. Obtener lista de pedidos (con consulta SQL directa para evitar Error 500)
        public async Task<List<Pedido>> ObtenerPedidos(int? usuarioId = null)
        {
            var lista = new List<Pedido>();

            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                string query = @"SELECT id_pedido, codigo, usuario_id, total, estado, metodo_pago, fecha_pedido 
                                FROM pedidos 
                                WHERE (@usuario_id IS NULL OR usuario_id = @usuario_id)
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
                                FechaPedido = Convert.ToDateTime(reader["fecha_pedido"])
                            });
                        }
                    }
                }
            }
            return lista;
        }
    }
}

