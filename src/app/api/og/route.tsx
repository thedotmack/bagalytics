import { ImageResponse } from 'next/og';

export const runtime = 'edge';

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
            fontFamily: 'system-ui, sans-serif',
            position: 'relative',
          }}
        >
          {/* Background gradient effects */}
          <div
            style={{
              position: 'absolute',
              top: '-100px',
              left: '200px',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-50px',
              right: '250px',
              width: '300px',
              height: '300px',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
            }}
          />

          {/* Logo */}
          {logoBase64 && (
            <img
              src={logoBase64}
              width={120}
              height={120}
              style={{
                marginBottom: 24,
              }}
            />
          )}

          {/* Brand name */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 'bold',
              color: '#10b981',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: 24,
            }}
          >
            BAGALYTICS
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 32,
              color: '#9ca3af',
            }}
          >
            Creator Fee Analytics for Bags.fm
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              right: 60,
              fontSize: 24,
              color: '#4b5563',
            }}
          >
            bagalytics.app
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
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

  // Format fee values
  const lifetimeFeesFormatted = tokenData?.lifetimeFeesUsd && tokenData.lifetimeFeesUsd > 0
    ? formatCompactUsd(tokenData.lifetimeFeesUsd)
    : null;
  const fees24hFormatted = tokenData?.totalFeesAccumulated && tokenData.totalFeesAccumulated > 0
    ? formatCompactUsd(tokenData.totalFeesAccumulated)
    : null;
  const marketCapFormatted = tokenData?.marketCap && tokenData.marketCap > 0
    ? formatCompactUsd(tokenData.marketCap)
    : null;

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
          fontFamily: 'system-ui, sans-serif',
          padding: 50,
          position: 'relative',
        }}
      >
        {/* Background gradient effects */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            left: '100px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-100px',
            right: '150px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Header with logo and brand */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}
        >
          {logoBase64 && (
            <img
              src={logoBase64}
              width={48}
              height={48}
            />
          )}
          <div
            style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: '#10b981',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            BAGALYTICS
          </div>
        </div>

        {/* Main content - token image and name */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          {/* Token image with emerald border */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: '#18181b',
              border: '4px solid #10b981',
              overflow: 'hidden',
              boxShadow: '0 0 60px rgba(16, 185, 129, 0.3)',
            }}
          >
            {tokenImageBase64 ? (
              <img
                src={tokenImageBase64}
                width={160}
                height={160}
                style={{
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 64,
                  fontWeight: 'bold',
                  color: '#10b981',
                }}
              >
                {displaySymbol.charAt(1) || displayName.charAt(0) || 'B'}
              </div>
            )}
          </div>

          {/* Token name */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 'bold',
              color: '#ffffff',
              textAlign: 'center',
              maxWidth: 800,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayName}
          </div>

          {/* Token symbol */}
          {displaySymbol && (
            <div
              style={{
                fontSize: 28,
                color: '#9ca3af',
              }}
            >
              {displaySymbol}
            </div>
          )}

          {/* Stats row */}
          {(lifetimeFeesFormatted || fees24hFormatted) && (
            <div
              style={{
                display: 'flex',
                gap: 80,
                marginTop: 24,
              }}
            >
              {/* Lifetime Fees */}
              {lifetimeFeesFormatted && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      color: '#71717a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: 8,
                    }}
                  >
                    LIFETIME FEES
                  </div>
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 'bold',
                      color: '#f59e0b',
                    }}
                  >
                    {lifetimeFeesFormatted}
                  </div>
                </div>
              )}

              {/* 24h Fees */}
              {fees24hFormatted && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      color: '#71717a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: 8,
                    }}
                  >
                    24H FEES
                  </div>
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 'bold',
                      color: '#10b981',
                    }}
                  >
                    {fees24hFormatted}
                  </div>
                </div>
              )}

              {/* Market Cap */}
              {marketCapFormatted && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      color: '#71717a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: 8,
                    }}
                  >
                    MARKET CAP
                  </div>
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 'bold',
                      color: '#ffffff',
                    }}
                  >
                    {marketCapFormatted}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: '#4b5563',
            }}
          >
            bagalytics.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
