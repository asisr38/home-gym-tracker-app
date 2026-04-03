import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "IronStride",
  description: "Mobile-first workout tracker for home and hybrid training.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
