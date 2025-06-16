import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "myexpertMD - Desafio Médico Diário",
    template: "%s | myexpertMD"
  },
  description: "Desafie seus conhecimentos médicos com nosso jogo diário! Resolva casos clínicos reais, faça perguntas sim/não e teste sua expertise médica. Perfeito para estudantes de medicina, residentes e profissionais da saúde.",
  keywords: [
    "medicina",
    "jogo médico",
    "casos clínicos",
    "educação médica",
    "residência médica",
    "estudantes medicina",
    "diagnóstico médico",
    "desafio médico",
    "myexpertMD",
    "quiz médico"
  ],
  authors: [{ name: "myexpertMD Team" }],
  creator: "myexpertMD",
  publisher: "myexpertMD",
  category: "Educação Médica",
  classification: "Educação",
  
  // Open Graph / Social Media
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "https://game-myexpertmd.vercel.app",
    siteName: "myexpertMD",
    title: "myexpertMD - Desafio Médico Diário",
    description: "Desafie seus conhecimentos médicos com nosso jogo diário! Resolva casos clínicos reais e teste sua expertise médica.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "myexpertMD - Jogo de Casos Clínicos",
      },
    ],
  },
  
  // Twitter
  twitter: {
    card: "summary_large_image",
    title: "myexpertMD - Desafio Médico Diário",
    description: "Desafie seus conhecimentos médicos com nosso jogo diário!",
    images: ["/og-image.png"],
    creator: "@myexpertMD",
  },
  
  // Technical SEO
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // App specific
  applicationName: "myexpertMD",
  referrer: "origin-when-cross-origin",
  colorScheme: "dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  
  // Verification (add your actual verification codes)
  verification: {
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // yahoo: "your-yahoo-verification-code",
  },
  
  // Additional metadata
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="canonical" href="https://game-myexpertmd.vercel.app" />
        <link rel="alternate" hrefLang="pt-BR" href="https://game-myexpertmd.vercel.app" />
      </head>
      <body className="antialiased" suppressHydrationWarning={true}>
        <div className={`${inter.variable} ${jetbrainsMono.variable}`}>
          {children}
        </div>
      </body>
    </html>
  );
}
