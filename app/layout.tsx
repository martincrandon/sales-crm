import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, pageMetadata } from "@/lib/seo";
import AuthLinkBridge from "@/components/auth/auth-link-bridge";
import ScrollToTop from "@/components/_common/scroll-to-top";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...pageMetadata({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    path: "/",
  }),
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={geist.variable}
      suppressHydrationWarning
    >
      <body className="relative z-0 font-sans antialiased">
        <ScrollToTop />
        <AuthLinkBridge />
        {children}
      </body>
    </html>
  );
}
