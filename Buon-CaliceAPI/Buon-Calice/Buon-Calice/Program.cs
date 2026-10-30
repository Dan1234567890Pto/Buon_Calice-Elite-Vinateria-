using Buon_Calice.Data;

var builder = WebApplication.CreateBuilder(args);

// Configuración de CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("PermitirReact", policy =>
        policy.WithOrigins(
            "http://localhost:5173",
            "https://localhost:5173", // <-- AGREGADO: Necesario para el entorno HTTPS de Vite
            "http://localhost:5174",
            "https://localhost:5174",
            "https://localhost:7263",
            "https://localhost:7001",
            "http://localhost:5000"
        )
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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();

// Activar CORS (Debe ir antes de UseAuthorization)
app.UseCors("PermitirReact");

app.UseAuthorization();

app.MapControllers();

app.Run();