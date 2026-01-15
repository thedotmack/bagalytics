import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// Token data response shape from our API
interface TokenData {
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenImage: string | null;
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


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
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
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              color: '#10b981',
            }}
          >
            Bagalytics
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#9ca3af',
              marginTop: 16,
            }}
          >
            Creator Fee Analytics for Bags.fm
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
  const baseUrl = new URL(request.url).origin;
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
          padding: 60,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 40,
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: '#10b981',
            }}
          >
            Bagalytics
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#6b7280',
            }}
          >
            bags.fm fee analytics
          </div>
        </div>

        {/* Main content - centered token image and name */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
          }}
        >
          {/* Token image or fallback */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: '#1f2937',
              border: '4px solid #10b981',
              overflow: 'hidden',
            }}
          >
            {tokenImageBase64 ? (
              <img
                src={tokenImageBase64}
                width={180}
                height={180}
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
                  fontSize: 72,
                  fontWeight: 'bold',
                  color: '#10b981',
                }}
              >
                {displaySymbol.charAt(1) || 'B'}
              </div>
            )}
          </div>

          {/* Token name and symbol */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 56,
                fontWeight: 'bold',
                marginBottom: 8,
                color: '#ffffff',
              }}
            >
              {displayName}
            </div>
            {displaySymbol && (
              <div
                style={{
                  fontSize: 32,
                  color: '#9ca3af',
                }}
              >
                {displaySymbol}
              </div>
            )}
          </div>
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
              fontSize: 20,
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
