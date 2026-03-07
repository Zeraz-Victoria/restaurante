// Vaciaremos temporalmente layout.tsx para que renderice page sin layouts complejos por default en Nextjs App Router
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RestoFlow 360",
  description: "Sistema de gestión SaaS para restaurantes",
};

function OfflineDetector() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.addEventListener('offline', function() {
            var banner = document.createElement('div');
            banner.id = 'offline-banner';
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#dc2626;color:white;text-align:center;padding:12px;font-weight:bold;font-size:14px;font-family:system-ui;';
            banner.textContent = '⚠️ Sin conexión a internet — Los cambios no se sincronizarán hasta que vuelvas a conectarte.';
            document.body.prepend(banner);
          });
          window.addEventListener('online', function() {
            var banner = document.getElementById('offline-banner');
            if (banner) banner.remove();
          });
        `,
      }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased font-sans">
        <OfflineDetector />
        {children}
      </body>
    </html>
  );
}
