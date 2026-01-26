using _4EPlatform_Controlpanel_Aggregator.GrpClientsConfig;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.FileProviders;
using Microsoft.Net.Http.Headers;
using Microsoft.OpenApi.Models;
using _4EPlatform.PermissionsGroupingChecker;
using _4EPlatform.PremessionRegister;
using System.Net;
using Serilog;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

try
{
    // Add services to the container.


    builder.Services.AddControllers();
    // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();
    builder.Host.UseSerilog((context, configuration) => configuration
        .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level}] {SourceContext}{NewLine}{Message:lj}{NewLine}{Exception}{NewLine}")
        .Enrich.FromLogContext().
            ReadFrom.Configuration(context.Configuration));

    builder.Services.AddDigitalMediaGrpcClients(builder.Configuration["GrpcServiceSettings:DigitalMediaUrl"]);
    builder.Services.AddCPAggregatorGrpcClients(builder.Configuration["GrpcServiceSettings:CPAggregatorUrl"]);
    builder.Services.AddorgDefinationsGrpcClients(builder.Configuration["GrpcServiceSettings:OrgDefinationUrl"]);
    builder.Services.AddUserGrpcClients(builder.Configuration["GrpcServiceSettings:UserManagmentUrl"]);

    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowCors",
            builder =>
            {
                builder
                .AllowAnyHeader()
                .AllowAnyMethod()
                .WithOrigins("http://localhost:3000")
                .SetIsOriginAllowed((host) => true)
                .AllowCredentials();
            });
    });
    #region apiversion
    builder.Services.AddApiVersioning(config =>
    {
        // Specify the default API Version as 1.0
        config.DefaultApiVersion = new ApiVersion(1, 0);
        // If the client hasn't specified the API version in the request, use the default API version number
        config.AssumeDefaultVersionWhenUnspecified = true;
        // Advertise the API versions supported for the particular endpoint
        config.ReportApiVersions = true;
    });
    #endregion
    builder.Services.AddAuthentication("Bearer")
      .AddJwtBearer("Bearer", options =>
      {
          // the name of your api resources   
          options.Audience = "UserManagementServer";
          /// identity server url                    
          options.Authority = builder.Configuration.GetValue<string>("IdentityUrl");
          options.RequireHttpsMetadata = false;
      });

    builder.Services.AddAuthorization(options =>
    {
        options.AddPolicy("ResourceOwnerPolicy", policy =>
        {
            policy.AddAuthenticationSchemes("Bearer");
            policy.RequireClaim("scope", "4EMicroServices"); // Require scope associated with Resource Owner Password token
        });

        options.AddPolicy("ClientCredentialsPolicy", policy =>
        {
            policy.AddAuthenticationSchemes("Bearer");
            policy.RequireClaim("scope", "CPAggregatorAPI"); // Require scope associated with Client Credentials token
        });
    });
    // Add grpc config to serviceCollection
    builder.Services.AddGrpc();

    builder.Services.AddServices();
    builder.Services.AddLocalizationOptions();
    builder.Services.AddScoped<PermissionsGroupingCheckerMiddleware, PermissionsGroupingCheckerMiddleware>();
    builder.Services.AddHostedService<AddPermissionsMiddleware>();
    builder.WebHost.ConfigureKestrel(options =>
    {
        options.Listen(IPAddress.Any, 7346, o => o.Protocols = HttpProtocols.Http2);

        // ADDED THIS LINE to fix the problem
        options.Listen(IPAddress.Any, 5301, o => o.Protocols = HttpProtocols.Http1);

    });
    #region Swagger
    builder.Services.AddSwaggerGen(c =>
    {
        c.SwaggerDoc("v1", new OpenApiInfo
        {
            Version = "v1",
            Title = "DigitalMedia.Aggregator APIs Reference",
        });

        c.AddSecurityDefinition(
        "token",
        new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            BearerFormat = "JWT",
            Scheme = "Bearer",
            In = ParameterLocation.Header,
            Name = HeaderNames.Authorization
        }
            );
        c.AddSecurityRequirement(
        new OpenApiSecurityRequirement
        {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "token"
                            },
                        },
                        Array.Empty<string>()
                    }
        }
            );
    });
    #endregion

    var app = builder.Build();
    //app.MapGrpcService<DigitalMediaService>();

    app.UseMiddleware<GlobalExceptionMiddleware>();
    // Configure the HTTP request pipeline.

    app.UseSwagger();
    app.UseSwaggerUI();

    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")),
        RequestPath = "/wwwroot"
    });

    app.UseCors("AllowCors");

    app.UseStaticFiles();
    //app.UseHttpsRedirection();
    app.UseRouting();
    app.UseAuthentication();
    app.UseAuthorization();
    //app.UseMiddleware<PermissionsCheckerMiddleware>();

    app.MapControllers();
    //Add support to logging request with SERILOG
    app.UseSerilogRequestLogging();

    app.UseMiddleware<PermissionsGroupingCheckerMiddleware>();
    app.Run();
}
catch (Exception)
{

    throw;
}

