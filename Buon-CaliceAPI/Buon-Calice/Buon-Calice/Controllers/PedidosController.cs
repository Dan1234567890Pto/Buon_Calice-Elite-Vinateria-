using Microsoft.AspNetCore.Mvc;
using Buon_Calice.Data;
using Buon_Calice.Models;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Buon_Calice.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PedidosController : ControllerBase
    {
        private readonly PedidosData _pedidosData;
        private readonly IConfiguration _configuration;

        public PedidosController(PedidosData pedidosData, IConfiguration configuration)
        {
            _pedidosData = pedidosData;
            _configuration = configuration;
        }

        // GET: api/Pedidos/reporte-ventas
        [HttpGet("reporte-ventas")]
        public async Task<IActionResult> GetReporteVentas()
        {
            try
            {
                var reporte = await _pedidosData.ObtenerReporteVentas();
                return Ok(reporte);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al obtener el reporte de ventas", error = ex.Message });
            }
        }

        // DELETE: api/Pedidos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> EliminarPedido(int id)
        {
            try
            {
                var eliminado = await _pedidosData.EliminarPedido(id);
                if (!eliminado)
                {
                    return NotFound(new { mensaje = "El pedido no existe o no se pudo eliminar." });
                }

                return Ok(new { mensaje = "Pedido eliminado correctamente de SQL Server." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // POST: api/Pedidos
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] CrearPedidoDTO dto)
        {
            try
            {
                if (dto == null || dto.Productos == null || !dto.Productos.Any())
                {
                    return BadRequest(new { mensaje = "El carrito está vacío o los datos enviados no son válidos." });
                }

                string connectionString = _configuration.GetConnectionString("CadenaSQL");

                // --- 1. VALIDACIÓN DE TELÉFONO EN LA TABLA USUARIOS ---
                if (dto.UsuarioId.HasValue && dto.UsuarioId > 0 && !string.IsNullOrWhiteSpace(dto.TelefonoCliente))
                {
                    if (!string.IsNullOrEmpty(connectionString))
                    {
                        using (var conn = new SqlConnection(connectionString))
                        {
                            await conn.OpenAsync();
                            // Consulta exacta basada en tu tabla usuarios (id_usuario, telefono)
                            string queryValidarTel = "SELECT TOP 1 telefono FROM usuarios WHERE id_usuario = @UsuarioId";

                            using (var cmd = new SqlCommand(queryValidarTel, conn))
                            {
                                cmd.Parameters.AddWithValue("@UsuarioId", dto.UsuarioId.Value);
                                var resultadoObj = await cmd.ExecuteScalarAsync();

                                string telefonoBD = (resultadoObj != null && resultadoObj != DBNull.Value)
                                    ? resultadoObj.ToString()?.Trim()
                                    : string.Empty;

                                // Si existe el teléfono en la BD y no coincide con el ingresado en el checkout
                                if (!string.IsNullOrEmpty(telefonoBD) &&
                                    string.Compare(telefonoBD, dto.TelefonoCliente.Trim(), StringComparison.OrdinalIgnoreCase) != 0)
                                {
                                    return BadRequest(new { mensaje = "Este no me pertenece" });
                                }
                            }
                        }
                    }
                }

                // --- 2. CREACIÓN DEL PEDIDO VÍA PEDIDOSDATA / SP ---
                var exito = await _pedidosData.CrearPedido(dto);

                if (exito)
                {
                    var listaPedidos = await _pedidosData.ObtenerPedidos(dto.UsuarioId);
                    var ultimoPedidoCreado = listaPedidos.FirstOrDefault();

                    return Ok(new
                    {
                        mensaje = "Pedido registrado con éxito",
                        idPedido = ultimoPedidoCreado?.IdPedido ?? 0,
                        codigo = ultimoPedidoCreado?.Codigo ?? "BC-PENDIENTE",
                        total = ultimoPedidoCreado?.Total ?? 0,
                        estado = ultimoPedidoCreado?.Estado ?? "PENDIENTE"
                    });
                }

                return BadRequest(new { mensaje = "Error al procesar el pedido en la base de datos." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    mensaje = "Error interno en el servidor",
                    error = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }
        // GET: api/Pedidos
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int? usuarioId = null)
        {
            try
            {
                var pedidos = await _pedidosData.ObtenerPedidos(usuarioId);
                return Ok(pedidos);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // GET: api/Pedidos/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPorId(int id)
        {
            try
            {
                var pedido = await _pedidosData.ObtenerPedidoPorId(id);
                if (pedido == null) return NotFound(new { mensaje = "Pedido no encontrado" });
                return Ok(pedido);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // PUT: api/Pedidos/5/estado
        [HttpPut("{id}/estado")]
        public async Task<IActionResult> ActualizarEstado(int id, [FromBody] EstadoPedidoDTO dto)
        {
            try
            {
                if (dto == null || string.IsNullOrEmpty(dto.Estado))
                {
                    return BadRequest(new { mensaje = "El estado no puede estar vacío" });
                }

                var exito = await _pedidosData.ActualizarEstadoPedido(id, dto.Estado);
                if (exito)
                {
                    return Ok(new { mensaje = "Estado actualizado correctamente en la base de datos" });
                }
                return NotFound(new { mensaje = "No se encontró el pedido a actualizar" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class EstadoPedidoDTO
    {
        public string Estado { get; set; } = string.Empty;
    }
}