using Microsoft.AspNetCore.Mvc;
using Buon_Calice.Data;
using Buon_Calice.Models;

namespace Buon_Calice.Controllers
{
    [ApiController]
    [Route("api/productos")]
    public class ProductosController : ControllerBase
    {
        private readonly ProductosData _productosData;

        public ProductosController(ProductosData productosData)
        {
            _productosData = productosData;
        }

        // GET: api/productos
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] bool soloActivos = true)
        {
            try
            {
                var respuesta = await _productosData.ObtenerProductos(soloActivos);
                return Ok(respuesta);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        // GET: api/productos/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetPorId(int id)
        {
            try
            {
                var producto = await _productosData.ObtenerProductoPorId(id);
                if (producto == null)
                    return NotFound(new { mensaje = $"No se encontró el producto con ID #{id}" });

                return Ok(producto);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        // POST: api/productos
        [HttpPost]
        public async Task<IActionResult> Post([FromBody] Producto producto)
        {
            try
            {
                var exito = await _productosData.GuardarProducto(producto);
                if (exito) return Ok(new { mensaje = "Producto guardado con éxito" });
                return BadRequest("No se pudo guardar el producto.");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        // PUT: api/productos/5
        [HttpPut("{id}")]
        public async Task<IActionResult> Put(int id, [FromBody] Producto producto)
        {
            try
            {
                var exito = await _productosData.ActualizarProducto(id, producto);
                if (exito) return Ok(new { mensaje = "Producto actualizado con éxito" });
                return BadRequest("No se pudo actualizar el producto.");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        // DELETE: api/productos/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var exito = await _productosData.EliminarProducto(id);
                if (exito) return Ok(new { mensaje = "Producto eliminado con éxito" });
                return BadRequest("No se pudo eliminar el producto.");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }
    }
}