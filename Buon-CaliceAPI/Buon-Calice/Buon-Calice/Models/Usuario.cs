namespace Buon_Calice.Models
{
    public class Usuario
    {
        public int IdUsuario { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? Telefono { get; set; }
        public string Rol { get; set; } = "CLIENTE";
        public DateTime FechaRegistro { get; set; } = DateTime.Now;
    }

    // DTO específico para el inicio de sesión desde React
    public class LoginDTO
    {
        public string Correo { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}

