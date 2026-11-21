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

        // 1. REGISTRAR USUARIO Y GENERAR CÓDIGO DE 6 DÍGITOS
        public async Task<string?> RegistrarUsuarioConCodigo(UsuarioRegistroDTO dto)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                string codigo = Random.Shared.Next(100000, 999999).ToString();

                string query = @"INSERT INTO usuarios (nombre, correo, telefono, password, rol, correo_verificado, codigo_verificacion) 
                                 VALUES (@nombre, @correo, @telefono, @password, @rol, 0, @codigo)";

                using (var cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@nombre", dto.Nombre);
                    cmd.Parameters.AddWithValue("@correo", dto.Correo);
                    cmd.Parameters.AddWithValue("@telefono", (object?)dto.Telefono ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@password", passwordHash);
                    cmd.Parameters.AddWithValue("@rol", string.IsNullOrEmpty(dto.Rol) ? "CLIENTE" : dto.Rol.ToUpper());
                    cmd.Parameters.AddWithValue("@codigo", codigo);

                    int filas = await cmd.ExecuteNonQueryAsync();
                    return filas > 0 ? codigo : null;
                }
            }
        }

        // 2. VALIDAR LOGIN COMPARANDO HASH BCRYPT Y ESTADO DE VERIFICACIÓN
        public async Task<UsuarioResponseDTO?> ValidarLogin(string correo, string passwordIngresada)
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
                            bool esValida = BCrypt.Net.BCrypt.Verify(passwordIngresada, hashGuardado);

                            if (esValida)
                            {
                                return new UsuarioResponseDTO
                                {
                                    IdUsuario = Convert.ToInt32(reader["id_usuario"]),
                                    Nombre = reader["nombre"].ToString()!,
                                    Correo = reader["correo"].ToString()!,
                                    Telefono = reader["telefono"] != DBNull.Value ? reader["telefono"].ToString()! : "",
                                    Rol = reader["rol"] != DBNull.Value ? reader["rol"].ToString()! : "CLIENTE",
                                    CorreoVerificado = reader["correo_verificado"] != DBNull.Value && Convert.ToBoolean(reader["correo_verificado"])
                                };
                            }
                        }
                    }
                }
            }
            return null;
        }

        // 3. VERIFICAR CÓDIGO DE 6 DÍGITOS Y ACTIVAR CUENTA
        public async Task<UsuarioResponseDTO?> VerificarCodigo(string correo, string codigo)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                string querySelect = @"SELECT id_usuario, nombre, correo, telefono, rol 
                                       FROM usuarios 
                                       WHERE correo = @correo AND codigo_verificacion = @codigo";

                UsuarioResponseDTO? usuario = null;

                using (var cmd = new SqlCommand(querySelect, conn))
                {
                    cmd.Parameters.AddWithValue("@correo", correo);
                    cmd.Parameters.AddWithValue("@codigo", codigo);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            usuario = new UsuarioResponseDTO
                            {
                                IdUsuario = Convert.ToInt32(reader["id_usuario"]),
                                Nombre = reader["nombre"].ToString()!,
                                Correo = reader["correo"].ToString()!,
                                Telefono = reader["telefono"] != DBNull.Value ? reader["telefono"].ToString()! : "",
                                Rol = reader["rol"] != DBNull.Value ? reader["rol"].ToString()! : "CLIENTE",
                                CorreoVerificado = true
                            };
                        }
                    }
                }

                if (usuario != null)
                {
                    string queryUpdate = @"UPDATE usuarios 
                                           SET correo_verificado = 1, codigo_verificacion = NULL 
                                           WHERE id_usuario = @id";

                    using (var cmdUpd = new SqlCommand(queryUpdate, conn))
                    {
                        cmdUpd.Parameters.AddWithValue("@id", usuario.IdUsuario);
                        await cmdUpd.ExecuteNonQueryAsync();
                    }
                }

                return usuario;
            }
        }

        // 4. REGENERAR CÓDIGO PARA REENVÍO
        public async Task<(string Nombre, string Codigo)?> RegenerarCodigo(string correo)
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
                    cmd.Parameters.AddWithValue("@correo", correo);

                    var nombreObj = await cmd.ExecuteScalarAsync();
                    if (nombreObj != null && nombreObj != DBNull.Value)
                    {
                        return (nombreObj.ToString()!, nuevoCodigo);
                    }
                }
            }
            return null;
        }
    }
}