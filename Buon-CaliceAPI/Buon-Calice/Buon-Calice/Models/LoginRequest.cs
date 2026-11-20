using System.Text.Json.Serialization;

namespace Buon_Calice.Models
{
    public class LoginRequest
    {
        [JsonPropertyName("correo")]
        public string Correo { get; set; } = string.Empty;

        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;
    }
}