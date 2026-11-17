import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque/standard.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Marktiva · Perfis", template: "%s · Marktiva Perfis" },
  description: "Painel da Agência Marktiva para gerir os perfis do Google Meu Negócio dos clientes.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
