import { Metadata } from "next";
import BagalyticsClient from "./BagalyticsClient";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

const defaultMetadata: Metadata = {
  title: "Bagalytics | Creator Fee Analytics",
  description: "Track your 1% creator fees from Bags.fm token trading volume.",
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const tokenAddress = params.token;

  if (!tokenAddress) {
    return defaultMetadata;
  }

  try {
    // Fetch token data to get name/symbol for metadata
    const response = await fetch(
      `https://bagalytics.app/api/token/${tokenAddress}`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      return defaultMetadata;
    }

    const tokenData = await response.json();
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

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://bagalytics.app/?token=${tokenAddress}`,
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
    console.error("Error generating metadata:", error);
    return defaultMetadata;
  }
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const initialTokenAddress = params.token;

  return <BagalyticsClient initialTokenAddress={initialTokenAddress} />;
}
