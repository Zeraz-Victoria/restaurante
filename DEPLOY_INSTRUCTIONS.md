# Despliegue de Producción (Self-Hosted)
Esta arquitectura empaqueta automáticamente tu base de datos (PostgreSQL) y el código de Next.js en contenedores súper ligeros, manteniéndo la aplicación prendida siempre gracias a `Docker`.

### Prerrequisitos en tu Servidor / VPS (Ubuntu/Linux)
Asegúrate de tener instalado `docker` y `docker-compose`. Puedes instalarlo corriendo:
```bash
sudo apt update
sudo apt install -y docker.io docker-compose
```

### Paso 1: Configurar Proyecto para Producción
En un servidor o VPS, SQLite sufre al lidiar con miles de requests. ¡Necesitamos PostgreSQL!
Abre el archivo `prisma/schema.prisma` y cambia el provider. Además asegúrate de que estás leyendo desde la variable de entorno:
```prisma
datasource db {
  provider = "postgresql" // <<- Cámbialo de sqlite a postgresql
  url      = env("DATABASE_URL")
}
```

### Paso 2: Clonar y configurar tu entorno (.env)
Clona el repositorio en tu servidor. Luego edita el archivo `.env` dentro de la carpeta:
```env
# Configuración segura para producción
DATABASE_URL="postgresql://admin:super_seguro123@db:5432/restaurante_db?schema=public"

POSTGRES_USER="admin"
POSTGRES_PASSWORD="super_seguro123"
POSTGRES_DB="restaurante_db"

NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="cualquier-texto-largo-aleatorio"
```

### Paso 3: ¡Arrancar!
Habiendo modificado el `.env`, desde la carpeta de tu proyecto (donde está el archivo `docker-compose.yml`), corre el siguiente comando (tardará unos minutos la primera vez mientras compila tu código):
```bash
sudo docker-compose up -d --build
```
*El parámetro `-d` hará que se corra invisiblemente en el fondo ("detached mode"), incluso si cierras tu computadora personal.*

### Paso 4: Cargar la estructura de la base de datos
Como es primera vez que la base de datos corre, no tendrá tablas. Iniciaremos las tablas inyectando este comando directamente al contenedor:
```bash
sudo docker-compose exec app npx prisma db push
```

¡Eso es todo! Tu servidor ahora tiene PostgreSQL y la aplicación Next.js sirviendo todo por el puerto **`3000`**.  Puedes usar NGINX (o Cloudflare Tunnels) para conectar un dominio a ese puerto.
