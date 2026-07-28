import React from 'react';

/**
 * CanonVaultWordmark
 * Renders the full horizontal logo from /logo-wordmark.png
 *
 * Props:
 *   height — rendered height in px. Width scales automatically. Default 32.
 *   light  — if true, inverts the image for display on dark/navy backgrounds.
 */
export function CanonVaultWordmark({ height = 40, light = false }) {
  return (
    <img
      src="/logo-wordmark.png.png"
      alt="CanonVault"
      height={height}
      style={{
        display: 'block',
        width: 'auto',
        // Invert the dark logo to white when sitting on the navy header
        filter: light ? 'brightness(0) invert(1)' : 'none',
      }}
    />
  );
}

/**
 * CanonVaultMonogram
 * Renders the square CV icon from /logo-icon.png
 *
 * Props:
 *   size  — width & height in px. Default 32.
 *   light — if true, inverts to white for dark backgrounds.
 */
export function CanonVaultMonogram({ size = 32, light = false }) {
  return (
    <img
      src="/logo-icon.png.png"
      alt="CV"
      width={size}
      height={size}
      style={{
        display: 'block',
        filter: light ? 'brightness(0) invert(1)' : 'none',
      }}
    />
  );
}
