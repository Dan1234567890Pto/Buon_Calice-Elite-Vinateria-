namespace Buon_Calice.Models
{
    public class Producto
    {
        public int IdProducto { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Categoria { get; set; } = string.Empty;
        public decimal Precio { get; set; }
        public int Stock { get; set; }
        public string? Descripcion { get; set; }
        public string? Icono { get; set; } // Propiedad para la URL de la imagen
        public bool Activo { get; set; } = true;
    }
}