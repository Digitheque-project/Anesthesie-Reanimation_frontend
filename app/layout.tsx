import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIH Anesthésie-Réanimation",
  description: "Plateforme médicale CHU",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
