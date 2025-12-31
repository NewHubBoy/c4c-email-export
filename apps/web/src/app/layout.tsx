import "./globals.css";

export const metadata = {
  title: "C4C Text Explorer",
  description: "Lookup and export C4C service request texts."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
