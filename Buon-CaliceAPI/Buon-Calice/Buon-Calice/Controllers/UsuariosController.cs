using Microsoft.AspNetCore.Mvc;
using Buon_Calice.Data;
using Buon_Calice.Models;
using Microsoft.Data.SqlClient;

namespace Buon_Calice.Controllers
{
    public class VerificarCorreoDTO
    {
        public string Correo { get; set; } = string.Empty;
        public string Codigo { get; set; } = string.Empty;
    }

    public class ReenviarCodigoDTO
    {
        public string Correo { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/[controller]")]
    [Route("api/auth")] // Habilita la ruta /api/auth/login para React
    public class UsuariosController : ControllerBase
    {
        private readonly UsuariosData _usuariosData;
        private readonly EmailService _emailService;

        public UsuariosController(UsuariosData usuariosData, EmailService emailService)
        {
            _usuariosData = usuariosData;
            _emailService = emailService;
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

                var (usuario, noVerificado) = await _usuariosData.ValidarLogin(dto.Correo, dto.Password);

                if (noVerificado)
                {
                    return Unauthorized(new
                    {
                        requiereVerificacion = true,
                        correo = dto.Correo,
                        mensaje = "Debes verificar tu correo electrónico antes de iniciar sesión."
                    });
                }

                if (usuario != null)
                {
                    return Ok(new
                    {
                        idUsuario = usuario.IdUsuario,
                        nombre = usuario.Nombre,
                        correo = usuario.Correo,
                        telefono = usuario.Telefono,
                        rol = usuario.Rol.ToLower() // Se envía en minúsculas ('admin', 'cliente')
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

                string? codigoOtp = await _usuariosData.RegistrarUsuario(dto);

                if (!string.IsNullOrEmpty(codigoOtp))
                {
                    bool correoEnviado = await _emailService.EnviarCodigoVerificacion(dto.Correo, dto.Nombre, codigoOtp);
                    return Ok(new
                    {
                        requiereVerificacion = true,
                        correo = dto.Correo,
                        correoEnviado = correoEnviado,
                        mensaje = correoEnviado
                            ? "Te enviamos un código de verificación a tu correo electrónico."
                            : "Usuario registrado, pero hubo un problema al enviar el correo. Intenta reenviar el código."
                    });
                }

                return Ok(new { mensaje = "Usuario registrado exitosamente con cifrado seguro." });
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

        [HttpPost("verificar-correo")]
        public async Task<IActionResult> VerificarCorreo([FromBody] VerificarCorreoDTO dto)
        {
            try
            {
                if (dto == null || string.IsNullOrEmpty(dto.Correo) || string.IsNullOrEmpty(dto.Codigo))
                {
                    return BadRequest(new { mensaje = "Ingresa el correo y el código de 6 dígitos." });
                }

                var usuario = await _usuariosData.VerificarCodigoCorreo(dto.Correo, dto.Codigo);
                if (usuario == null)
                {
                    return BadRequest(new { mensaje = "El código es incorrecto o ya expiró." });
                }

                return Ok(new
                {
                    idUsuario = usuario.IdUsuario,
                    nombre = usuario.Nombre,
                    correo = usuario.Correo,
                    telefono = usuario.Telefono,
                    rol = usuario.Rol.ToLower(),
                    mensaje = "Correo verificado correctamente."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("reenviar-codigo")]
        public async Task<IActionResult> ReenviarCodigo([FromBody] ReenviarCodigoDTO dto)
        {
            try
            {
                if (dto == null || string.IsNullOrEmpty(dto.Correo))
                {
                    return BadRequest(new { mensaje = "El correo es obligatorio." });
                }

                var (nombre, nuevoCodigo) = await _usuariosData.GenerarNuevoCodigo(dto.Correo);
                if (nuevoCodigo == null)
                {
                    return BadRequest(new { mensaje = "No se encontró una cuenta pendiente de verificación con ese correo." });
                }

                bool enviado = await _emailService.EnviarCodigoVerificacion(dto.Correo, nombre ?? "Cliente", nuevoCodigo);
                if (!enviado)
                {
                    return StatusCode(502, new { mensaje = "No se pudo enviar el correo en este momento. Revisa la configuración de Brevo." });
                }

                return Ok(new { mensaje = "Nuevo código enviado a tu bandeja de entrada." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}