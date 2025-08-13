// api/og.js
export const config = { runtime: 'edge' };

export default function handler() {
  return new Response(
    `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-size="80" font-family="Arial">Mi Web v1.2</text>
    </svg>
    `,
    {
      headers: { 'Content-Type': 'image/svg+xml' },
    }
  );
}