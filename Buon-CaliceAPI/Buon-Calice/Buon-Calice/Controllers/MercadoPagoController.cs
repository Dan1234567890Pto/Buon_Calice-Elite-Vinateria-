using Buon_Calice.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace Buon_Calice.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MercadoPagoController : ControllerBase
    {
        private readonly PedidosData _pedidosData;
        private readonly IConfiguration _configuration;
        private static readonly HttpClient _httpClient = new HttpClient();

        public MercadoPagoController(PedidosData pedidosData, IConfiguration configuration)
        {
            _pedidosData = pedidosData;
            _configuration = configuration;
        }

        // POST: api/MercadoPago/crear-preferencia/5
        [HttpPost("crear-preferencia/{pedidoId}")]
        public async Task<IActionResult> CrearPreferencia(int pedidoId, [FromBody] CrearPreferenciaMPDTO? dto)
        {
            try
            {
                string accessToken = _configuration["MercadoPago:AccessToken"]
                                     ?? Environment.GetEnvironmentVariable("MercadoPago__AccessToken")
                                     ?? string.Empty;

                if (string.IsNullOrWhiteSpace(accessToken))
                {
                    return StatusCode(500, new
                    {
                        mensaje = "Falta configurar MercadoPago:AccessToken en el servidor."
                    });
                }

                // 1. Obtener el pedido y sus productos desde SQL Server
                var pedido = await _pedidosData.ObtenerPedidoPorId(pedidoId);
                if (pedido == null)
                {
                    return NotFound(new { mensaje = $"No se encontró el pedido #{pedidoId}" });
                }

                if (pedido.Productos == null || !pedido.Productos.Any())
                {
                    return BadRequest(new { mensaje = "El pedido no contiene productos para cobrar." });
                }

                string urlBase = !string.IsNullOrWhiteSpace(dto?.UrlBase)
                    ? dto.UrlBase.TrimEnd('/')
                    : "https://witty-flower-0cf0ba61e.6.azurestaticapps.net";

                // 2. Armar los artículos para Checkout Pro (MXN)
                var items = pedido.Productos.Select(p => new
                {
                    id = p.ProductoId.ToString(),
                    title = string.IsNullOrWhiteSpace(p.NombreProducto) ? $"Producto #{p.ProductoId}" : p.NombreProducto,
                    quantity = p.Cantidad,
                    currency_id = "MXN",
                    unit_price = p.PrecioUnitario
                }).ToList();

                // 3. Configurar URLs de retorno hacia tu React PWA
                var payload = new
                {
                    items = items,
                    external_reference = pedido.IdPedido.ToString(),
                    statement_descriptor = "ELITE VINATERIA",
                    back_urls = new
                    {
                        success = $"{urlBase}/?pago=exito&pedidoId={pedido.IdPedido}",
                        failure = $"{urlBase}/?pago=cancelado&pedidoId={pedido.IdPedido}",
                        pending = $"{urlBase}/?pago=pendiente&pedidoId={pedido.IdPedido}"
                    },
                    auto_return = "approved"
                };

                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.mercadopago.com/checkout/preferences");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
                request.Content = new StringContent(
                    JsonSerializer.Serialize(payload),
                    Encoding.UTF8,
                    "application/json"
                );

                var response = await _httpClient.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, new
                    {
                        mensaje = "Error al generar la preferencia en Mercado Pago",
                        detalle = responseBody
                    });
                }

                using var jsonDoc = JsonDocument.Parse(responseBody);
                var root = jsonDoc.RootElement;

                string preferenceId = root.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
                string initPoint = root.TryGetProperty("init_point", out var initProp) ? initProp.GetString() ?? "" : "";
                string sandboxInitPoint = root.TryGetProperty("sandbox_init_point", out var sandProp) ? sandProp.GetString() ?? "" : "";

                return Ok(new
                {
                    preferenceId = preferenceId,
                    // Si el AccessToken empieza con TEST-, init_point ya abre el entorno de pruebas en México
                    url = !string.IsNullOrEmpty(initPoint) ? initPoint : sandboxInitPoint,
                    initPoint = initPoint,
                    sandboxInitPoint = sandboxInitPoint
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    mensaje = "Error interno al conectar con Mercado Pago",
                    error = ex.Message
                });
            }
        }

        // POST: api/MercadoPago/confirmar-pago
        [HttpPost("confirmar-pago")]
        public async Task<IActionResult> ConfirmarPago([FromBody] ConfirmarPagoMPDTO dto)
        {
            try
            {
                if (dto == null || dto.PedidoId <= 0 || string.IsNullOrWhiteSpace(dto.PaymentId))
                {
                    return BadRequest(new { mensaje = "Faltan datos de verificación (pedidoId o paymentId)." });
                }

                string accessToken = _configuration["MercadoPago:AccessToken"]
                                     ?? Environment.GetEnvironmentVariable("MercadoPago__AccessToken")
                                     ?? string.Empty;

                if (string.IsNullOrWhiteSpace(accessToken))
                {
                    return StatusCode(500, new { mensaje = "Falta configurar MercadoPago:AccessToken en el servidor." });
                }

                // 1. Consultar el estado real del pago directo a la API de Mercado Pago
                var request = new HttpRequestMessage(HttpMethod.Get, $"https://api.mercadopago.com/v1/payments/{dto.PaymentId.Trim()}");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

                var response = await _httpClient.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return StatusCode((int)response.StatusCode, new
                    {
                        pagado = false,
                        mensaje = "No se pudo consultar el pago en Mercado Pago",
                        detalle = responseBody
                    });
                }

                using var jsonDoc = JsonDocument.Parse(responseBody);
                var root = jsonDoc.RootElement;

                string status = root.TryGetProperty("status", out var statusProp) ? statusProp.GetString() ?? "pending" : "pending";
                string statusDetail = root.TryGetProperty("status_detail", out var detProp) ? detProp.GetString() ?? "" : "";

                if (status.Equals("approved", StringComparison.OrdinalIgnoreCase))
                {
                    // 2. Actualizar metodo_pago en SQL Server para marcarlo como PAGADO
                    string connectionString = _configuration.GetConnectionString("CadenaSQL") ?? string.Empty;
                    if (!string.IsNullOrEmpty(connectionString))
                    {
                        using var conn = new SqlConnection(connectionString);
                        await conn.OpenAsync();
                        string query = "UPDATE pedidos SET metodo_pago = @MetodoPago WHERE id_pedido = @IdPedido";

                        using var cmd = new SqlCommand(query, conn);
                        cmd.Parameters.AddWithValue("@MetodoPago", $"Mercado Pago PAGADO (#{dto.PaymentId})");
                        cmd.Parameters.AddWithValue("@IdPedido", dto.PedidoId);
                        await cmd.ExecuteNonQueryAsync();
                    }

                    return Ok(new
                    {
                        pagado = true,
                        estado = status,
                        detalle = statusDetail,
                        transaccionId = dto.PaymentId
                    });
                }

                return Ok(new
                {
                    pagado = false,
                    estado = status,
                    detalle = statusDetail,
                    transaccionId = dto.PaymentId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    pagado = false,
                    mensaje = "Error al confirmar el pago de Mercado Pago",
                    error = ex.Message
                });
            }
        }
    }

    public class CrearPreferenciaMPDTO
    {
        public string? UrlBase { get; set; }
    }

    public class ConfirmarPagoMPDTO
    {
        public int PedidoId { get; set; }
        public string PaymentId { get; set; } = string.Empty;
    }
}