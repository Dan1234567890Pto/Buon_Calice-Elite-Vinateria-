using Microsoft.AspNetCore.Mvc;
using Buon_Calice.Data;
using Buon_Calice.Models;

namespace Buon_Calice.Controllers
{
    [ApiController]
    [Route("api/usuarios")]
    public class UsuariosController : ControllerBase
    {
        private readonly UsuariosData _usuariosData;

        public UsuariosController(UsuariosData usuariosData)
        {
            _usuariosData = usuariosData;
        }

        // POST: api/usuarios/login
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO login)
        {
            try
            {
                var usuario = await _usuariosData.AutenticarUsuario(login);
                if (usuario == null)
                    return Unauthorized(new { mensaje = "Correo o contraseña incorrectos" });

                return Ok(new
                {
                    exito = true,
                    usuario = new
                    {
                        id = usuario.IdUsuario,
                        nombre = usuario.Nombre,
                        correo = usuario.Correo,
                        rol = usuario.Rol
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }

        // POST: api/usuarios/registrar
        [HttpPost("registrar")]
        public async Task<IActionResult> Registrar([FromBody] Usuario usuario)
        {
            try
            {
                var exito = await _usuariosData.RegistrarUsuario(usuario);
                if (exito) return Ok(new { mensaje = "Usuario registrado exitosamente" });
                return BadRequest("No se pudo registrar el usuario.");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message, inner = ex.InnerException?.Message });
            }
        }
    }
}