using Microsoft.AspNetCore.Mvc;
using Buon_Calice.Data;
using Stripe;
using Stripe.Checkout;
using Microsoft.Data.SqlClient;

namespace Buon_Calice.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PagosController : ControllerBase
    {
        private readonly PedidosData _pedidosData;
        private readonly IConfiguration _configuration;

        public PagosController(PedidosData pedidosData, IConfiguration configuration)
        {
            _pedidosData = pedidosData;
            _configuration = configuration;
            // Configura aquí tu llave de prueba de Stripe (o en appsettings.json)
            StripeConfiguration.ApiKey = _configuration["Stripe:SecretKey"] ?? "sk_test_TU_LLAVE_SECRETA_AQUI";
        }

        // PASO 1: El navegador envía el ID del pedido -> La API consulta el total en SQL Server -> Stripe crea el Checkout
        [HttpPost("crear-checkout/{idPedido}")]
        public async Task<IActionResult> CrearCheckout(int idPedido, [FromBody] CheckoutUrlDto urls)
        {
            try
            {
                var pedido = await _pedidosData.ObtenerPedidoPorId(idPedido);
                if (pedido == null)
                    return NotFound(new { mensaje = "Pedido no encontrado en SQL Server." });

                var lineItems = new List<SessionLineItemOptions>();

                if (pedido.Productos != null && pedido.Productos.Any())
                {
                    foreach (var item in pedido.Productos)
                    {
                        lineItems.Add(new SessionLineItemOptions
                        {
                            PriceData = new SessionLineItemPriceDataOptions
                            {
                                Currency = "mxn",
                                UnitAmount = (long)(item.PrecioUnitario * 100), // Stripe usa centavos
                                ProductData = new SessionLineItemPriceDataProductDataOptions
                                {
                                    Name = item.NombreProducto
                                }
                            },
                            Quantity = item.Cantidad
                        });
                    }
                }
                else
                {
                    lineItems.Add(new SessionLineItemOptions
                    {
                        PriceData = new SessionLineItemPriceDataOptions
                        {
                            Currency = "mxn",
                            UnitAmount = (long)(pedido.Total * 100),
                            ProductData = new SessionLineItemPriceDataProductDataOptions
                            {
                                Name = $"Pedido Buon Calice #{pedido.Codigo}"
                            }
                        },
                        Quantity = 1
                    });
                }

                var options = new SessionCreateOptions
                {
                   
                    LineItems = lineItems,
                    Mode = "payment",
                    ClientReferenceId = pedido.IdPedido.ToString(),
                    SuccessUrl = $"{urls.UrlBase}/cliente?pago=exito&session_id={{CHECKOUT_SESSION_ID}}&pedidoId={pedido.IdPedido}",
                    CancelUrl = $"{urls.UrlBase}/cliente?pago=cancelado&pedidoId={pedido.IdPedido}"
                };

                var service = new SessionService();
                Session session = await service.CreateAsync(options);

                // Devolvemos la URL oficial del Checkout de Stripe al navegador
                return Ok(new { url = session.Url, sessionId = session.Id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error al crear sesión de Stripe", error = ex.Message });
            }
        }

        // PASO 2: Confirmar el resultado con Stripe y actualizar SQL Server UNA SOLA VEZ (Diapositiva 7)
        [HttpPost("confirmar-pago")]
        public async Task<IActionResult> ConfirmarPago([FromBody] ConfirmarPagoDto dto)
        {
            try
            {
                var service = new SessionService();
                Session session = await service.GetAsync(dto.SessionId);

                // Verificar que Stripe realmente confirme el estado "paid"
                if (session.PaymentStatus == "paid")
                {
                    var pedido = await _pedidosData.ObtenerPedidoPorId(dto.PedidoId);
                    if (pedido == null) return NotFound();

                    string transaccionId = session.PaymentIntentId ?? session.Id;

                    // Evitar procesar dos veces si ya está marcado como PAGADO
                    if (!pedido.MetodoPago.Contains("PAGADO", StringComparison.OrdinalIgnoreCase))
                    {
                        string connStr = _configuration.GetConnectionString("CadenaSQL")!;
                        using (var conn = new SqlConnection(connStr))
                        {
                            await conn.OpenAsync();
                            string sql = @"UPDATE pedidos 
                                           SET metodo_pago = @MetodoPago 
                                           WHERE id_pedido = @IdPedido";
                            using (var cmd = new SqlCommand(sql, conn))
                            {
                                cmd.Parameters.AddWithValue("@MetodoPago", $"Stripe PAGADO ({transaccionId})");
                                cmd.Parameters.AddWithValue("@IdPedido", dto.PedidoId);
                                await cmd.ExecuteNonQueryAsync();
                            }
                        }
                    }

                    return Ok(new { pagado = true, estado = "PAGADO", transaccionId });
                }

                return Ok(new { pagado = false, estado = "PENDIENTE" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { mensaje = "Error verificando pago", error = ex.Message });
            }
        }
    }

    public class CheckoutUrlDto
    {
        public string UrlBase { get; set; } = string.Empty;
    }

    public class ConfirmarPagoDto
    {
        public string SessionId { get; set; } = string.Empty;
        public int PedidoId { get; set; }
    }
}