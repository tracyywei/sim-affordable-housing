import type { Metadata } from "next";
import { Permanent_Marker, Caveat, Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";

const marker = Permanent_Marker({ variable: "--font-marker", weight: "400", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"] });
const atkinson = Atkinson_Hyperlegible({ variable: "--font-body", weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Who's Left Out",
  description: "How much affordable housing should new SF buildings include, and which women can actually get those homes?",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${marker.variable} ${caveat.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
