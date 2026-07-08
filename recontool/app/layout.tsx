import "./globals.css";

export const metadata = {
  title: "Reelo Reconciliation Tool",
  description: "Internal support tool for POS ↔ Reelo bill reconciliation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="orb orb1"></div>
        <div className="orb orb2"></div>
        {children}
      </body>
    </html>
  );
}
