using Buon_Calice.Data;

var builder = WebApplication.CreateBuilder(args);

// Configuración de CORS (permite peticiones desde localhost y desde cualquier dominio publicado)
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirReact", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Inyección de dependencias
builder.Services.AddTransient<Conexion>();
builder.Services.AddScoped<ProductosData>();
builder.Services.AddScoped<UsuariosData>();
builder.Services.AddScoped<PedidosData>();
builder.Services.AddScoped<EmailService>();

var app = builder.Build();

// Swagger habilitado también en Azure (Producción) para poder probar tus endpoints
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

// Habilita servir el frontend (index.html y assets) si lo colocas dentro de la carpeta wwwroot
app.UseDefaultFiles();
app.UseStaticFiles();

// Activar CORS (siempre antes de UseAuthorization y MapControllers)
app.UseCors("PermitirReact");

app.UseAuthorization();

app.MapControllers();

// Si usas React Router (rutas como /productos o /carrito), redirige cualquier ruta no-API al index.html
app.MapFallbackToFile("index.html");

app.Run();