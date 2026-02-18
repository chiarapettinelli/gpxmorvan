import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "Trace velo route",
  description: "Trace GPX, points d'eau, ravitaillement et profil altimetrique"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
