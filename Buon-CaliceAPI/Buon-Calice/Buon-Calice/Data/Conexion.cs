using Microsoft.Data.SqlClient;

namespace Buon_Calice.Data
{
    public class Conexion
    {
        private readonly string _cadenaSQL;

        public Conexion(IConfiguration configuration)
        {
            _cadenaSQL = configuration.GetConnectionString("CadenaSQL")!;
        }

        public SqlConnection ObtenerConexion()
        {
            return new SqlConnection(_cadenaSQL);
        }
    }
}