// ==============================================================================
// DESIGN TOKENS: Bold Monochrome Editorial Aesthetic
// ==============================================================================
// Centralized tokens matching the reference design:
// - Sharp monochrome palette (#000, #111, #F0EEED, #FFF)
// - Pill-radius interactive elements (62px), 20px cards, 24-40px blocks
// - Self-hosted Archivo (Display) + Inter (Body)
// - Hairline borders with deep contrast and generous whitespace
// ==============================================================================

export const TOKENS = {
  colors: {
    black: '#000000',
    ink: '#111111',
    white: '#FFFFFF',
    tile: '#F0EEED',
    tileHover: '#E8E5E4',
    border: 'rgba(0, 0, 0, 0.1)',
    borderDark: 'rgba(0, 0, 0, 0.2)',
    muted: 'rgba(0, 0, 0, 0.6)',
    mutedLight: 'rgba(0, 0, 0, 0.4)',
    verified: '#01AB31',
    verifiedBg: 'rgba(1, 171, 49, 0.1)',
    danger: '#FF3333',
    dangerBg: 'rgba(255, 51, 51, 0.1)',
    yellow: '#FFC633',
  },
  radius: {
    pill: '62px',
    card: '20px',
    blockSm: '24px',
    block: '28px',
    blockLg: '40px',
  },
  fonts: {
    display: "'Archivo Black', 'Archivo Variable', Archivo, sans-serif",
    body: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
  },
  shadows: {
    none: 'none',
    subtle: '0 2px 10px rgba(0, 0, 0, 0.04)',
    hover: '0 8px 24px rgba(0, 0, 0, 0.08)',
  },
}

export default TOKENS
