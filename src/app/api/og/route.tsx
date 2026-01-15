import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Load fonts for ImageResponse/Satori (must be TTF/OTF, not woff2)
const interRegular = fetch(
  new URL('../../../../public/fonts/Inter-Regular.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

const interBold = fetch(
  new URL('../../../../public/fonts/Inter-Bold.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

const diplomataSC = fetch(
  new URL('../../../../public/fonts/DiplomataSC-Regular.ttf', import.meta.url)
).then((res) => res.arrayBuffer());

// Token data response shape from our API
interface TokenData {
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenImage: string | null;
  lifetimeFeesUsd?: number;
  lifetimeFeesSol?: number;
  totalFeesAccumulated?: number;
  marketCap?: number;
  price?: number;
  feeVelocity?: number; // $/hour
  hourlyFees?: Array<{ time: string; fees: number }>;
}

// Convert external image URL to base64 data URL (required for ImageResponse)
async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

// Fetch logo as base64 from public URL
async function fetchLogoAsBase64(baseUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${baseUrl}/bagalytics-icon.png`);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch {
    return null;
  }
}

// Format currency with K/M suffixes
function formatCompactUsd(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}


export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const address = searchParams.get('address');

  // Load fonts for ImageResponse
  const [interRegularData, interBoldData, diplomataSCData] = await Promise.all([
    interRegular,
    interBold,
    diplomataSC,
  ]);

  const fonts = [
    {
      name: 'Inter',
      data: interRegularData,
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: interBoldData,
      weight: 700 as const,
      style: 'normal' as const,
    },
    {
      name: 'Diplomata SC',
      data: diplomataSCData,
      weight: 400 as const,
      style: 'normal' as const,
    },
  ];

  // Fetch the logo for all renders
  const logoBase64 = await fetchLogoAsBase64(origin);

  if (!address) {
    // Default OG image - no token specified
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#0a0a0a',
            color: '#ffffff',
            fontFamily: 'Inter',
            position: 'relative',
          }}
        >
          {/* Background gradient effects */}
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              left: '150px',
              width: '600px',
              height: '600px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-100px',
              right: '200px',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />

          {/* Logo */}
          {logoBase64 && (
            <img
              src={logoBase64}
              width={180}
              height={180}
              style={{
                marginBottom: 32,
              }}
            />
          )}

          {/* Brand name */}
          <div
            style={{
              fontSize: 96,
              fontFamily: 'Diplomata SC',
              color: '#10b981',
              letterSpacing: '0.05em',
              marginBottom: 28,
            }}
          >
            Bagalytics
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 42,
              color: '#a1a1aa',
              fontWeight: 500,
            }}
          >
            Creator Fee Analytics for Bags.fm
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: 32,
              right: 48,
              fontSize: 28,
              color: '#52525b',
            }}
          >
            bagalytics.app
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts,
      }
    );
  }

  // Fetch token data from our API
  const baseUrl = origin;
  let tokenData: TokenData | null = null;

  try {
    const response = await fetch(`${baseUrl}/api/token/${address}`);
    if (response.ok) {
      tokenData = await response.json();
    }
  } catch {
    // Continue with fallback if fetch fails
  }

  // Fetch token image and convert to base64 (ImageResponse requires this)
  let tokenImageBase64: string | null = null;
  if (tokenData?.tokenImage) {
    tokenImageBase64 = await fetchImageAsBase64(tokenData.tokenImage);
  }

  const displayName = tokenData?.tokenName || tokenData?.tokenSymbol || 'Unknown Token';
  const displaySymbol = tokenData?.tokenSymbol ? `$${tokenData.tokenSymbol}` : '';

  // Format fee values - focus on income metrics
  const lifetimeFeesFormatted = tokenData?.lifetimeFeesUsd && tokenData.lifetimeFeesUsd > 0
    ? formatCompactUsd(tokenData.lifetimeFeesUsd)
    : null;
  const lifetimeFeesSolFormatted = tokenData?.lifetimeFeesSol && tokenData.lifetimeFeesSol > 0
    ? `${tokenData.lifetimeFeesSol.toFixed(2)} SOL`
    : null;
  const fees24hFormatted = tokenData?.totalFeesAccumulated && tokenData.totalFeesAccumulated > 0
    ? formatCompactUsd(tokenData.totalFeesAccumulated)
    : null;
  const feeVelocityFormatted = tokenData?.feeVelocity && tokenData?.feeVelocity > 0
    ? `$${tokenData.feeVelocity.toFixed(2)}/hr`
    : null;
  const volume24hFormatted = tokenData?.marketCap && tokenData.marketCap > 0
    ? formatCompactUsd(tokenData.marketCap)
    : null;

  // Generate SVG path for hourly fees chart background
  const hourlyFees = tokenData?.hourlyFees || [];
  let chartPath = '';
  if (hourlyFees.length > 1) {
    const maxFee = Math.max(...hourlyFees.map(h => h.fees));
    const chartWidth = 1200;
    const chartHeight = 300;
    const chartBottom = 630;
    const points = hourlyFees.map((h, i) => {
      const x = (i / (hourlyFees.length - 1)) * chartWidth;
      const y = chartBottom - (h.fees / maxFee) * chartHeight;
      return `${x},${y}`;
    });
    chartPath = `M0,${chartBottom} L${points.join(' L')} L${chartWidth},${chartBottom} Z`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          fontFamily: 'Inter',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Chart background - edge to edge */}
        {chartPath && (
          <svg
            width="1200"
            height="630"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: 0.12,
            }}
          >
            <defs>
              <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={chartPath} fill="url(#chartGradient)" />
          </svg>
        )}

        {/* Background gradient effects */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            right: '-100px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '40px 56px',
            position: 'relative',
          }}
        >
          {/* Header: Token name left, Bagalytics branding right */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            {/* Token name only - symbol is centered below logo */}
            <div
              style={{
                fontSize: 48,
                fontWeight: 'bold',
                color: '#ffffff',
                maxWidth: '500px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </div>

            {/* Bagalytics small branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {logoBase64 && (
                <img src={logoBase64} width={48} height={48} />
              )}
              <div
                style={{
                  fontSize: 24,
                  fontFamily: 'Diplomata SC',
                  color: '#10b981',
                }}
              >
                BAGALYTICS
              </div>
            </div>
          </div>

          {/* Main content: Left values - CENTER LOGO - Right values */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flex: 1,
            }}
          >
            {/* LEFT: Lifetime Fees - PRIMARY metric in AMBER */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                width: '300px',
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginBottom: 12,
                  fontWeight: 500,
                }}
              >
                LIFETIME FEES
              </div>
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 'bold',
                  color: '#f59e0b',
                  lineHeight: 1,
                }}
              >
                {lifetimeFeesFormatted || '$0'}
              </div>
              {lifetimeFeesSolFormatted && (
                <div
                  style={{
                    fontSize: 32,
                    color: '#a1a1aa',
                    marginTop: 12,
                  }}
                >
                  {lifetimeFeesSolFormatted}
                </div>
              )}
            </div>

            {/* CENTER: Big Logo with Token Image + Symbol below */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                position: 'relative',
                top: -30,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 320,
                  height: 320,
                  borderRadius: 160,
                  backgroundColor: '#18181b',
                  border: '6px solid #10b981',
                  overflow: 'hidden',
                  boxShadow: '0 0 100px rgba(16, 185, 129, 0.6)',
                }}
              >
                {tokenImageBase64 ? (
                  <img
                    src={tokenImageBase64}
                    width={320}
                    height={320}
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 128,
                      fontWeight: 'bold',
                      color: '#10b981',
                    }}
                  >
                    {displaySymbol.charAt(1) || displayName.charAt(0) || 'B'}
                  </div>
                )}
              </div>
              {/* Token symbol centered under image - bold and bright */}
              {displaySymbol && (
                <div
                  style={{
                    fontSize: 48,
                    fontWeight: 'bold',
                    color: '#ffffff',
                  }}
                >
                  {displaySymbol}
                </div>
              )}
            </div>

            {/* RIGHT: 24h Fees - secondary metric in GREEN */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                width: '300px',
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.15em',
                  marginBottom: 12,
                  fontWeight: 500,
                }}
              >
                24H FEES
              </div>
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 'bold',
                  color: '#10b981',
                  lineHeight: 1,
                }}
              >
                {fees24hFormatted || '$0'}
              </div>
            </div>
          </div>

          {/* Bottom row: Fee Velocity and Market Cap - MUCH BIGGER FONTS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 28,
              borderTop: '1px solid #27272a',
            }}
          >
            {/* Fee Velocity */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                FEE VELOCITY
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 'bold',
                  color: '#10b981',
                }}
              >
                {feeVelocityFormatted || 'N/A'}
              </div>
            </div>

            {/* Market Cap */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  color: '#71717a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                MCAP
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 'bold',
                  color: '#f59e0b',
                }}
              >
                {volume24hFormatted || 'N/A'}
              </div>
            </div>

            {/* Domain */}
            <div style={{ fontSize: 32, color: '#71717a', fontWeight: 500 }}>
              bagalytics.app
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    }
  );
}
