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

        // 1. Obtener todos los productos
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
                            lista.Add(MapearProducto(reader));
                        }
                    }
                }
            }
            return lista;
        }

        // 2. Obtener producto por ID (Corregido)
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
                            producto = MapearProducto(reader);
                        }
                    }
                }
            }
            return producto;
        }

        // 3. Guardar producto nuevo
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
                    cmd.Parameters.AddWithValue("@icono", (object?)producto.Icono ?? DBNull.Value);

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

        // 5. Eliminar producto
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

        // Función auxiliar para tolerar variaciones de nombre de columna ('id_producto' o 'idProducto')
        private static Producto MapearProducto(SqlDataReader reader)
        {
            int colId = TieneColumna(reader, "id_producto") ? reader.GetOrdinal("id_producto") : reader.GetOrdinal("idProducto");
            int colNombre = reader.GetOrdinal("nombre");
            int colCategoria = reader.GetOrdinal("categoria");
            int colPrecio = reader.GetOrdinal("precio");
            int colStock = reader.GetOrdinal("stock");

            return new Producto
            {
                IdProducto = Convert.ToInt32(reader[colId]),
                Nombre = reader[colNombre].ToString()!,
                Categoria = reader[colCategoria].ToString()!,
                Precio = Convert.ToDecimal(reader[colPrecio]),
                Stock = Convert.ToInt32(reader[colStock]),
                Descripcion = TieneColumna(reader, "descripcion") && reader["descripcion"] != DBNull.Value ? reader["descripcion"].ToString() : "",
                Icono = TieneColumna(reader, "icono") && reader["icono"] != DBNull.Value ? reader["icono"].ToString() : null
            };
        }

        private static bool TieneColumna(SqlDataReader reader, string nombreColumna)
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                if (reader.GetName(i).Equals(nombreColumna, StringComparison.OrdinalIgnoreCase))
                    return true;
            }
            return false;
        }
    }
}