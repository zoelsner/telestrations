import type { Metadata } from "next";
import { Outfit, Paytone_One } from "next/font/google";
import { ConvexClientProvider } from "./convex-client-provider";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const paytoneOne = Paytone_One({
  subsets: ["latin"],
  variable: "--font-paytone",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Telestrations",
  description: "A modern team drawing and guessing game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`h-full antialiased ${outfit.variable} ${paytoneOne.variable}`} lang="en">
      <body className="flex min-h-full flex-col">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
