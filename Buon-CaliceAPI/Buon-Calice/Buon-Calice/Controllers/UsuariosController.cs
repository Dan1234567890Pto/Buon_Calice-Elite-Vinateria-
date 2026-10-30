using Microsoft.AspNetCore.Mvc;
using Buon_Calice.Data;
using Buon_Calice.Models;
using Microsoft.Data.SqlClient;

namespace Buon_Calice.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/auth")] // Habilita la ruta /api/auth/login para React
    public class UsuariosController : ControllerBase
    {
        private readonly UsuariosData _usuariosData;

        public UsuariosController(UsuariosData usuariosData)
        {
            _usuariosData = usuariosData;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO dto)
        {
            try
            {
                if (dto == null || string.IsNullOrEmpty(dto.Correo) || string.IsNullOrEmpty(dto.Password))
                {
                    return BadRequest(new { mensaje = "Credenciales incompletas." });
                }

                var usuario = await _usuariosData.ValidarLogin(dto.Correo, dto.Password);
                if (usuario != null)
                {
                    return Ok(new
                    {
                        idUsuario = usuario.IdUsuario,
                        nombre = usuario.Nombre,
                        correo = usuario.Correo,
                        rol = usuario.Rol.ToLower() // Se envía en minúsculas ('admin')
                    });
                }

                return Unauthorized(new { mensaje = "Correo o contraseña incorrectos." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("registro")]
        [HttpPost("registrar")]
        public async Task<IActionResult> Registro([FromBody] UsuarioRegistroDTO dto)
        {
            try
            {
                if (dto == null || string.IsNullOrEmpty(dto.Correo) || string.IsNullOrEmpty(dto.Password))
                {
                    return BadRequest(new { mensaje = "El correo y la contraseña son obligatorios." });
                }

                var exito = await _usuariosData.RegistrarUsuario(dto);
                if (exito) return Ok(new { mensaje = "Usuario registrado exitosamente con cifrado seguro." });

                return BadRequest(new { mensaje = "No se pudo registrar el usuario." });
            }
            catch (SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)
            {
                return BadRequest(new { mensaje = "Este correo electrónico ya se encuentra registrado." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}