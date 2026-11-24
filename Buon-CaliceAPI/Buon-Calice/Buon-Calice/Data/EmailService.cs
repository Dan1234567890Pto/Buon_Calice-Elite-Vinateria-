using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace Buon_Calice.Data
{
    public class EmailService
    {
        private readonly IConfiguration _config;
        private static readonly HttpClient _httpClient = new HttpClient();

        public EmailService(IConfiguration config)
        {
            _config = config;
        }


        public async Task<(bool Exito, string Error)> EnviarCodigoVerificacion(string correoDestino, string nombreCliente, string codigo)





        {
            string apiKey = (_config["Brevo:ApiKey"] ?? "").Trim();
            string remitenteCorreo = (_config["Brevo:SenderEmail"] ?? "").Trim();
            string remitenteNombre = "Buon Calice - Élite Vinatería";

            if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(remitenteCorreo))
            {
                return (false, "Faltan las variables Brevo:ApiKey o Brevo:SenderEmail en Azure.");
            }

            string htmlContenido = $@"
            <div style='background-color:#0D0B0A; color:#F3ECE0; font-family:Georgia, serif; padding:32px; max-width:520px; margin:0 auto; border:1px solid #26201B; border-radius:16px;'>
                <div style='text-align:center; border-bottom:1px solid #26201B; padding-bottom:20px; margin-bottom:24px;'>
                    <span style='font-size:11px; letter-spacing:3px; color:#C5A059; text-transform:uppercase; font-family:sans-serif;'>Boutique & Cava Exclusiva</span>
                    <h1 style='margin:8px 0 0 0; font-size:26px; color:#F3ECE0;'>🍷 BUON CALICE</h1>
                </div>
                <p style='font-family:sans-serif; font-size:14px; color:#E2D9CC;'>Hola <strong>{nombreCliente}</strong>,</p>
                <p style='font-family:sans-serif; font-size:14px; color:#9E8E7E; line-height:1.6;'>
                    Gracias por registrarte en <strong>Élite Vinatería</strong>. Para verificar tu correo electrónico y activar tu cuenta, ingresa el siguiente código de seguridad:
                </p>
                <div style='background-color:#16120E; border:1px solid #C5A059; border-radius:12px; padding:20px; text-align:center; margin:24px 0;'>
                    <span style='font-family:monospace; font-size:32px; font-weight:bold; letter-spacing:8px; color:#D4AF37;'>{codigo}</span>
                </div>
                <p style='font-family:sans-serif; font-size:12px; color:#9E8E7E; text-align:center;'>
                    Si no solicitaste este registro, puedes ignorar este mensaje.
                </p>
            </div>";

            var payload = new
            {
                sender = new { name = remitenteNombre, email = remitenteCorreo },
                to = new[] { new { email = correoDestino, name = nombreCliente } },
                subject = $"Código de verificación: {codigo} - Buon Calice",
                htmlContent = htmlContenido
            };

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
            request.Headers.Add("api-key", apiKey);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            if (response.IsSuccessStatusCode)
            {
                return (true, string.Empty);
            }

            string detalleError = await response.Content.ReadAsStringAsync();
            return (false, $"Error Brevo ({(int)response.StatusCode}): {detalleError}");
        }
    }
}