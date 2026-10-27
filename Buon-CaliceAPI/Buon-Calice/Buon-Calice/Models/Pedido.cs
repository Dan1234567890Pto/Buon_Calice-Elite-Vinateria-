using System;
using System.Collections.Generic;

namespace Buon_Calice.Models
{
    public class Pedido
    {
        public int IdPedido { get; set; }
        public string Codigo { get; set; } = string.Empty;
        public int UsuarioId { get; set; }
        public decimal Total { get; set; }
        public string Estado { get; set; } = "PENDIENTE";
        public string MetodoPago { get; set; } = string.Empty;
        public DateTime FechaPedido { get; set; } = DateTime.Now;
    }

    public class CrearPedidoDTO
    {
        public int? UsuarioId { get; set; }
        public string MetodoPago { get; set; } = string.Empty;
        public List<DetallePedidoDTO> Productos { get; set; } = new List<DetallePedidoDTO>();
    }

    public class DetallePedidoDTO
    {
        public int ProductoId { get; set; }
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
    }
}