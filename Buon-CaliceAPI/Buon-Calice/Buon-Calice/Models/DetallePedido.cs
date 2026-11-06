namespace Buon_Calice.Models
{
    public class DetallePedido
    {
        public int IdDetalle { get; set; }
        public int PedidoId { get; set; }
        public int ProductoId { get; set; }
        public string NombreProducto { get; set; } = string.Empty;
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
    }
}

