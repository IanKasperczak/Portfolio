import type { Metadata } from "next";
import { Parkinsans, Tilt_Warp } from "next/font/google";
import "./globals.css";

/** Títulos: redonda y con peso, como letras de juguete. */
const display = Tilt_Warp({
  variable: "--font-tilt",
  subsets: ["latin"],
});

/**
 * Texto: sans geométrica de formas redondeadas, cálida como el diorama.
 * Sólo latina a propósito: las fuentes con CJK (Zen Maru, M PLUS) llegan en
 * cientos de fragmentos que next/font no puede filtrar por subset.
 */
const body = Parkinsans({
  variable: "--font-parkinsans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ian Kasperczak — Portfolio",
  description:
    "Portfolio de Ian Kasperczak: un cuarto en miniatura donde cada objeto es un proyecto.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overflow-x-hidden">{children}</body>
    </html>
  );
}
