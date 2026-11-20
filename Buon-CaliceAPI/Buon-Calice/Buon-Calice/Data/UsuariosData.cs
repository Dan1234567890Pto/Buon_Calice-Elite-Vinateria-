using Microsoft.Data.SqlClient;
using System.Data;
using Buon_Calice.Models;

namespace Buon_Calice.Data
{
    public class UsuariosData
    {
        private readonly Conexion _conexion;

        public UsuariosData(Conexion conexion)
        {
            _conexion = conexion;
        }

        // 1. REGISTRAR USUARIO CON CONTRASEÑA CIFRADA (BCrypt) Y CÓDIGO OTP
        public async Task<string?> RegistrarUsuario(UsuarioRegistroDTO dto)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                // Hashear la contraseña con BCrypt
                string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                string rolFinal = string.IsNullOrEmpty(dto.Rol) ? "CLIENTE" : dto.Rol.ToUpper();
                bool esCliente = rolFinal == "CLIENTE";
                string? codigoOtp = esCliente ? Random.Shared.Next(100000, 999999).ToString() : null;

                string query = @"INSERT INTO usuarios (nombre, correo, telefono, password, rol, correo_verificado, codigo_verificacion) 
                                 VALUES (@nombre, @correo, @telefono, @password, @rol, @correo_verificado, @codigo_verificacion)";

                using (var cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@nombre", dto.Nombre);
                    cmd.Parameters.AddWithValue("@correo", dto.Correo);
                    cmd.Parameters.AddWithValue("@telefono", (object?)dto.Telefono ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@password", passwordHash);
                    cmd.Parameters.AddWithValue("@rol", rolFinal);
                    cmd.Parameters.AddWithValue("@correo_verificado", esCliente ? 0 : 1);
                    cmd.Parameters.AddWithValue("@codigo_verificacion", (object?)codigoOtp ?? DBNull.Value);

                    int filas = await cmd.ExecuteNonQueryAsync();
                    return filas > 0 ? codigoOtp : null;
                }
            }
        }

        // 2. VALIDAR LOGIN COMPARANDO HASH BCRYPT Y VERIFICACIÓN DE CORREO
        public async Task<(UsuarioResponseDTO? Usuario, bool NoVerificado)> ValidarLogin(string correo, string passwordIngresada)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                string query = "SELECT id_usuario, nombre, correo, telefono, password, rol, correo_verificado FROM usuarios WHERE correo = @correo";

                using (var cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@correo", correo);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            string hashGuardado = reader["password"].ToString()!;

                            // Verificar password contra el Hash seguro
                            bool esValida = BCrypt.Net.BCrypt.Verify(passwordIngresada, hashGuardado);

                            if (esValida)
                            {
                                bool verificado = reader["correo_verificado"] != DBNull.Value && Convert.ToBoolean(reader["correo_verificado"]);
                                if (!verificado)
                                {
                                    return (null, true);
                                }

                                return (new UsuarioResponseDTO
                                {
                                    IdUsuario = Convert.ToInt32(reader["id_usuario"]),
                                    Nombre = reader["nombre"].ToString()!,
                                    Correo = reader["correo"].ToString()!,
                                    Telefono = reader["telefono"] != DBNull.Value ? reader["telefono"].ToString()! : "",
                                    Rol = reader["rol"] != DBNull.Value ? reader["rol"].ToString()! : "CLIENTE"
                                }, false);
                            }
                        }
                    }
                }
            }
            return (null, false);
        }

        // 3. VERIFICAR CÓDIGO OTP ENVIADO AL CORREO
        public async Task<UsuarioResponseDTO?> VerificarCodigoCorreo(string correo, string codigo)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                string query = @"UPDATE usuarios 
                                 SET correo_verificado = 1, codigo_verificacion = NULL
                                 OUTPUT INSERTED.id_usuario, INSERTED.nombre, INSERTED.correo, INSERTED.telefono, INSERTED.rol
                                 WHERE correo = @correo AND codigo_verificacion = @codigo";

                using (var cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@correo", correo.Trim());
                    cmd.Parameters.AddWithValue("@codigo", codigo.Trim());

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new UsuarioResponseDTO
                            {
                                IdUsuario = Convert.ToInt32(reader["id_usuario"]),
                                Nombre = reader["nombre"].ToString()!,
                                Correo = reader["correo"].ToString()!,
                                Telefono = reader["telefono"] != DBNull.Value ? reader["telefono"].ToString()! : "",
                                Rol = reader["rol"] != DBNull.Value ? reader["rol"].ToString()! : "CLIENTE"
                            };
                        }
                    }
                }
            }
            return null;
        }

        // 4. GENERAR NUEVO CÓDIGO PARA REENVÍO
        public async Task<(string? Nombre, string? Codigo)> GenerarNuevoCodigo(string correo)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();
                string nuevoCodigo = Random.Shared.Next(100000, 999999).ToString();

                string query = @"UPDATE usuarios 
                                 SET codigo_verificacion = @codigo
                                 OUTPUT INSERTED.nombre
                                 WHERE correo = @correo AND correo_verificado = 0";

                using (var cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@codigo", nuevoCodigo);
                    cmd.Parameters.AddWithValue("@correo", correo.Trim());

                    var nombreObj = await cmd.ExecuteScalarAsync();
                    if (nombreObj != null)
                    {
                        return (nombreObj.ToString(), nuevoCodigo);
                    }
                }
            }
            return (null, null);
        }
    }
}