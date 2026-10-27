using Microsoft.Data.SqlClient;
using System.Data;
using Buon_Calice.Models;

namespace Buon_Calice.Data
{
    public class ProductosData
    {
        private readonly string _conexion;

        public ProductosData(IConfiguration configuration)
        {
            _conexion = configuration.GetConnectionString("CadenaSQL")
                ?? configuration.GetSection("ConnectionStrings:CadenaSQL").Value!;
        }

        // 1. Obtener todos los productos (AHORA SÍ INCLUYE ICONO)
        public async Task<List<Producto>> ObtenerProductos(bool soloActivos = true)
        {
            var lista = new List<Producto>();

            using (var conn = new SqlConnection(_conexion))
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand("sp_ObtenerProductos", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@soloActivos", soloActivos);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            lista.Add(new Producto
                            {
                                IdProducto = Convert.ToInt32(reader["idProducto"]),
                                Nombre = reader["nombre"].ToString()!,
                                Categoria = reader["categoria"].ToString()!,
                                Precio = Convert.ToDecimal(reader["precio"]),
                                Stock = Convert.ToInt32(reader["stock"]),
                                Descripcion = reader["descripcion"] != DBNull.Value ? reader["descripcion"].ToString() : "",
                                Icono = reader["icono"] != DBNull.Value ? reader["icono"].ToString() : null // <--- AQUÍ SE LEYERA LA FOTO
                            });
                        }
                    }
                }
            }
            return lista;
        }

        // 2. Obtener producto por ID
        public async Task<Producto?> ObtenerProductoPorId(int id)
        {
            Producto? producto = null;

            using (var conn = new SqlConnection(_conexion))
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand("sp_ObtenerProductoPorId", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@id_producto", id);

                    using (var reader = await cmd.ExecuteReaderAsync())
                    {
                        if (await reader.ReadAsync())
                        {
                            producto = new Producto
                            {
                                IdProducto = Convert.ToInt32(reader["idProducto"]),
                                Nombre = reader["nombre"].ToString()!,
                                Categoria = reader["categoria"].ToString()!,
                                Precio = Convert.ToDecimal(reader["precio"]),
                                Stock = Convert.ToInt32(reader["stock"]),
                                Descripcion = reader["descripcion"] != DBNull.Value ? reader["descripcion"].ToString() : "",
                                Icono = reader["icono"] != DBNull.Value ? reader["icono"].ToString() : null
                            };
                        }
                    }
                }
            }
            return producto;
        }

        // 3. Guardar un producto nuevo (AHORA SÍ ENVÍA @icono A SQL SERVER)
        public async Task<bool> GuardarProducto(Producto producto)
        {
            using (var conn = new SqlConnection(_conexion))
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand("sp_GuardarProducto", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@nombre", producto.Nombre ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@categoria", producto.Categoria ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@precio", producto.Precio);
                    cmd.Parameters.AddWithValue("@stock", producto.Stock);
                    cmd.Parameters.AddWithValue("@descripcion", (object?)producto.Descripcion ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@icono", (object?)producto.Icono ?? DBNull.Value); // <--- AQUÍ SE MANDA LA FOTO

                    await cmd.ExecuteNonQueryAsync();
                    return true;
                }
            }
        }

        // 4. Actualizar producto existente
        public async Task<bool> ActualizarProducto(int id, Producto producto)
        {
            using (var conn = new SqlConnection(_conexion))
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand("sp_GuardarProducto", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@id_producto", id);
                    cmd.Parameters.AddWithValue("@nombre", producto.Nombre ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@categoria", producto.Categoria ?? (object)DBNull.Value);
                    cmd.Parameters.AddWithValue("@precio", producto.Precio);
                    cmd.Parameters.AddWithValue("@stock", producto.Stock);
                    cmd.Parameters.AddWithValue("@descripcion", (object?)producto.Descripcion ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("@icono", (object?)producto.Icono ?? DBNull.Value);

                    await cmd.ExecuteNonQueryAsync();
                    return true;
                }
            }
        }

        // 5. Eliminar producto físicamente
        public async Task<bool> EliminarProducto(int id)
        {
            using (var conn = new SqlConnection(_conexion))
            {
                await conn.OpenAsync();
                using (var cmd = new SqlCommand("sp_EliminarProducto", conn))
                {
                    cmd.CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("@id_producto", id);

                    await cmd.ExecuteNonQueryAsync();
                    return true;
                }
            }
        }
    }
}