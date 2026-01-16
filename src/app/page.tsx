import { Metadata } from "next";
import BagalyticsClient from "./BagalyticsClient";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

const defaultMetadata: Metadata = {
  title: "Bagalytics | Creator Fee Analytics",
  description: "Track your 1% creator fees from Bags.fm token trading volume.",
};

// Get base URL for internal API calls - works in dev and production
function getBaseUrl(): string {
  console.log('[PAGE] getBaseUrl called:', {
    VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV
  });
  if (process.env.VERCEL_URL) {
    const url = `https://${process.env.VERCEL_URL}`;
    console.log('[PAGE] Using VERCEL_URL:', url);
    return url;
  }
  const url = process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "https://bagalytics.dev";
  console.log('[PAGE] Using fallback URL:', url);
  return url;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const tokenAddress = params.token;

  console.log('[PAGE-METADATA] ========== GENERATING METADATA ==========');
  console.log('[PAGE-METADATA] Token address:', tokenAddress || 'NONE');

  if (!tokenAddress) {
    console.log('[PAGE-METADATA] No token address, returning default metadata');
    return defaultMetadata;
  }

  try {
    const baseUrl = getBaseUrl();
    const apiUrl = `${baseUrl}/api/token/${tokenAddress}`;
    console.log('[PAGE-METADATA] Fetching token data from:', apiUrl);

    // Fetch token data to get name/symbol for metadata
    const fetchStart = Date.now();
    const response = await fetch(apiUrl, { next: { revalidate: 60 } });

    console.log('[PAGE-METADATA] Token API response:', {
      status: response.status,
      ok: response.ok,
      duration: Date.now() - fetchStart
    });

    if (!response.ok) {
      console.log('[PAGE-METADATA] API not OK, returning default metadata');
      return defaultMetadata;
    }

    const tokenData = await response.json();
    console.log('[PAGE-METADATA] Token data received:', {
      tokenName: tokenData.tokenName,
      tokenSymbol: tokenData.tokenSymbol,
      lifetimeFeesUsd: tokenData.lifetimeFeesUsd,
      totalFeesAccumulated: tokenData.totalFeesAccumulated
    });

    const tokenName = tokenData.tokenName || tokenData.tokenSymbol || "Token";
    const lifetimeFees = tokenData.lifetimeFeesUsd
      ? `$${tokenData.lifetimeFeesUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : null;
    const fees24h = tokenData.totalFeesAccumulated
      ? `$${tokenData.totalFeesAccumulated.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : null;

    const title = `${tokenName} Fee Analytics | Bagalytics`;
    const description = lifetimeFees && fees24h
      ? `${tokenName} has earned ${lifetimeFees} lifetime fees (${fees24h} in 24h). Track creator fees on Bagalytics.`
      : `Track creator fees for ${tokenName} on Bagalytics.`;

    console.log('[PAGE-METADATA] Generated metadata:', { title, description });
    console.log('[PAGE-METADATA] OG image URL:', `/api/og?address=${tokenAddress}`);

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://bagalytics.dev/?token=${tokenAddress}`,
        siteName: "Bagalytics",
        images: [
          {
            url: `/api/og?address=${tokenAddress}`,
            width: 1200,
            height: 630,
            alt: `${tokenName} Creator Fee Analytics`,
          },
        ],
        locale: "en_US",
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [`/api/og?address=${tokenAddress}`],
      },
    };
  } catch (error) {
    console.error("[PAGE-METADATA] Error generating metadata:", error instanceof Error ? error.message : error);
    console.error("[PAGE-METADATA] Stack:", error instanceof Error ? error.stack : 'no stack');
    return defaultMetadata;
  }
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialTokenAddress = params.token;

  return <BagalyticsClient initialTokenAddress={initialTokenAddress} />;
}
