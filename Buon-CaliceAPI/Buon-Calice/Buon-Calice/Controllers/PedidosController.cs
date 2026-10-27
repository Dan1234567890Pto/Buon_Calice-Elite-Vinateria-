using Microsoft.AspNetCore.Mvc;
using Buon_Calice.Data;
using Buon_Calice.Models;
using System.Linq;



namespace Buon_Calice.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PedidosController : ControllerBase
    {
        private readonly PedidosData _pedidosData;

        public PedidosController(PedidosData pedidosData)
        {
            _pedidosData = pedidosData;
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] CrearPedidoDTO dto)
        {
            try
            {
                if (dto == null || dto.Productos == null || !dto.Productos.Any())
                {
                    return BadRequest(new { mensaje = "El carrito está vacío o los datos enviados no son válidos." });
                }

                var exito = await _pedidosData.CrearPedido(dto);
                if (exito) return Ok(new { mensaje = "Pedido registrado con éxito" });
                return BadRequest(new { mensaje = "Error al procesar el pedido" });
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
    }
}

