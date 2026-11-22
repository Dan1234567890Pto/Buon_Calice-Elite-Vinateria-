using Microsoft.AspNetCore.Mvc;
using Buon_Calice.Data;
using Buon_Calice.Models;
using Microsoft.Data.SqlClient;

namespace Buon_Calice.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/auth")]
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

                var usuario = await _usuariosData.ValidarLogin(dto.Correo, dto.Password);
                if (usuario != null)
                {
                    if (!usuario.CorreoVerificado)
                    {
                        return Unauthorized(new
                        {
                            requiereVerificacion = true,
                            correo = usuario.Correo,
                            mensaje = "Tu correo aún no ha sido verificado. Revisa tu bandeja o solicita un nuevo código."
                        });
                    }

                    return Ok(new
                    {
                        idUsuario = usuario.IdUsuario,
                        nombre = usuario.Nombre,
                        correo = usuario.Correo,
                        telefono = usuario.Telefono,
                        rol = usuario.Rol.ToLower()
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

                var codigo = await _usuariosData.RegistrarUsuarioConCodigo(dto);
                if (string.IsNullOrEmpty(codigo))
                {
                    return BadRequest(new { mensaje = "No se pudo registrar el usuario." });
                }


                var envio = await _emailService.EnviarCodigoVerificacion(dto.Correo, dto.Nombre ?? "Cliente", codigo);
                if (!envio.Exito)
                {
                    return BadRequest(new { mensaje = envio.Error });
                }

                await _emailService.EnviarCodigoVerificacion(dto.Correo, dto.Nombre ?? "Cliente", codigo);


                return Ok(new
                {
                    requiereVerificacion = true,
                    mensaje = "Usuario registrado. Se envió un código de verificación a tu correo."
                });
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
                    return BadRequest(new { mensaje = "Correo y código son obligatorios." });
                }

                var usuario = await _usuariosData.VerificarCodigo(dto.Correo, dto.Codigo);
                if (usuario == null)
                {
                    return BadRequest(new { mensaje = "El código de verificación es incorrecto." });
                }

                return Ok(new
                {
                    mensaje = "Correo verificado correctamente.",
                    usuario = new
                    {
                        idUsuario = usuario.IdUsuario,
                        nombre = usuario.Nombre,
                        correo = usuario.Correo,
                        telefono = usuario.Telefono,
                        rol = usuario.Rol.ToLower()
                    }
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

                var resultado = await _usuariosData.RegenerarCodigo(dto.Correo);
                if (resultado == null)
                {
                    return BadRequest(new { mensaje = "El correo no existe o ya se encuentra verificado." });
                }


                var envio = await _emailService.EnviarCodigoVerificacion(dto.Correo, resultado.Value.Nombre, resultado.Value.Codigo);
                if (!envio.Exito)
                {
                    return BadRequest(new { mensaje = envio.Error });
                }

                await _emailService.EnviarCodigoVerificacion(dto.Correo, resultado.Value.Nombre, resultado.Value.Codigo);


                return Ok(new { mensaje = "Se ha enviado un nuevo código a tu correo." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }

    public class VerificarCorreoDTO
    {
        public string Correo { get; set; } = string.Empty;
        public string Codigo { get; set; } = string.Empty;
    }

    public class ReenviarCodigoDTO
    {
        public string Correo { get; set; } = string.Empty;
    }
}