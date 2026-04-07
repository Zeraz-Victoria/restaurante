# RestoFlow 360

RestoFlow 360 is a modern, responsive web application for managing restaurant operations, built with Next.js, Prisma, and Supabase.

## Architecture

The application uses a modern Serverless edge-ready architecture:
- **Frontend Framework**: Next.js 16 with React 19 and Tailwind CSS v4.
- **Backend/API**: Next.js API Routes (App Router edge/node runtimes) with middleware security.
- **Database**: PostgreSQL hosted on [Supabase](https://supabase.com), accessed via Prisma ORM.
- **Rate Limiting**: Serverless edge rate-limiting powered by Upstash Redis.
- **Testing**: End-to-End coverage with Playwright and Unit testing with Vitest.

## Quick Start (Local Development)

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd restaurante
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Copy `.env.example` to `.env.local` and populate the fields:
   ```bash
   cp .env.example .env.local
   ```
   *Note: Ensure you get the correct database urls and Supabase keys from your dashboard.*

4. **Initialize the Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```

## Production Deployment (Vercel)

1. Push your code to a GitHub repository (`main` branch).
2. Go to [Vercel](https://vercel.com) and import your repository.
3. Configure **Environment Variables** in the Vercel dashboard matching your `.env.local`.
4. Deploy.

> [!TIP]
> The application image optimization (`unoptimized: false`) and security headers are fine-tuned to fully utilize Vercel's Edge Next.js deployment natively.

## Security: Supabase Row Level Security (RLS)

To secure the user's data when connecting directly via Supabase anonymous keys (or preventing unauthorized enumeration), you MUST enable Row Level Security on your Supabase tables. 

Run the following SQL snippets in your Supabase SQL Editor to lock down your tables (example for `orders` and `users` tables, adapt according to your schema):

```sql
-- Habilitar RLS en tus tablas principales
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Política: Permitir la lectura de ítems de menú a cualquier usuario
CREATE POLICY "Menú es público" ON public.menu_items FOR SELECT USING (true);

-- Política: Los usuarios autenticados solo pueden ver sus propios pedidos
CREATE POLICY "Ver propios pedidos" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Política: Insertar pedidos (Cualquier cliente)
CREATE POLICY "Crear pedidos" ON public.orders FOR INSERT WITH CHECK (true);
```
*(Refine the policies above based on your specific application roles).*
