using Microsoft.AspNetCore.Mvc;
using Buon_Calice.Data;
using Buon_Calice.Models;

namespace Buon_Calice.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UsuariosData _usuariosData;

        public AuthController(UsuariosData usuariosData)
        {
            _usuariosData = usuariosData;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Correo) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { mensaje = "El correo y la contraseña son requeridos." });
            }

            // Mapeo al DTO que consume mi método AutenticarUsuario
            var loginDto = new LoginDTO
            {
                Correo = request.Correo,
                Password = request.Password
            };

            var usuario = await _usuariosData.AutenticarUsuario(loginDto);

            if (usuario == null)
            {
                return Unauthorized(new { mensaje = "Correo o contraseña incorrectos." });
            }

            return Ok(usuario);
        }
    }
}