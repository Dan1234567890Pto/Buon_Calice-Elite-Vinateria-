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

        // 1. REGISTRAR USUARIO CON CONTRASEÑA CIFRADA (BCrypt)
        public async Task<bool> RegistrarUsuario(UsuarioRegistroDTO dto)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                // Hashear la contraseña con BCrypt
                string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

                // Usamos la columna 'password' en lugar de 'contrasena'
                string query = @"INSERT INTO usuarios (nombre, correo, telefono, password, rol) 
                                VALUES (@nombre, @correo, @telefono, @password, @rol)";

                using (var cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@nombre", dto.Nombre);
                    cmd.Parameters.AddWithValue("@correo", dto.Correo);
                    cmd.Parameters.AddWithValue("@telefono", (object?)dto.Telefono ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@password", passwordHash);
                    cmd.Parameters.AddWithValue("@rol", string.IsNullOrEmpty(dto.Rol) ? "CLIENTE" : dto.Rol.ToUpper());

                    int filas = await cmd.ExecuteNonQueryAsync();
                    return filas > 0;
                }
            }
        }

        // 2. VALIDAR LOGIN COMPARANDO HASH BCRYPT
        public async Task<UsuarioResponseDTO?> ValidarLogin(string correo, string passwordIngresada)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();

                // Usamos la columna 'password' en el SELECT
                string query = "SELECT id_usuario, nombre, correo, telefono, password, rol FROM usuarios WHERE correo = @correo";

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
            }
            return null;
        }
    }
}