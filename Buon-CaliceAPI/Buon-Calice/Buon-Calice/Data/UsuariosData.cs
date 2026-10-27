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

        // Registrar nuevo usuario (Cliente o Empleado)
        public async Task<bool> RegistrarUsuario(Usuario usuario)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand("sp_UsuarioRegistrar", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@nombre", usuario.Nombre);
                    cmd.Parameters.AddWithValue("@correo", usuario.Correo);
                    cmd.Parameters.AddWithValue("@password", usuario.Password);
                    cmd.Parameters.AddWithValue("@telefono", (object?)usuario.Telefono ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@rol", string.IsNullOrEmpty(usuario.Rol) ? "CLIENTE" : usuario.Rol);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            // Lee el id_usuario que devuelve el Stored Procedure
                            return Convert.ToInt32(reader["id_usuario"]) > 0;
                        }
                    }
                }
            }
            return false;
        }

        // Autenticación / Login
        public async Task<Usuario?> AutenticarUsuario(LoginDTO login)
        {
            using (var conn = _conexion.ObtenerConexion())
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand("sp_AutenticacionUsuario", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@correo", login.Correo);
                    cmd.Parameters.AddWithValue("@password", login.Password);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            return new Usuario
                            {
                                IdUsuario = Convert.ToInt32(reader["id_usuario"]),
                                Nombre = reader["nombre"].ToString()!,
                                Correo = reader["correo"].ToString()!,
                                Telefono = reader["telefono"] != DBNull.Value ? reader["telefono"].ToString() : null,
                                Rol = reader["rol"].ToString()!
                            };
                        }
                    }
                }
            }
            return null; // Credenciales incorrectas
        }
    }
}