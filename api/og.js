import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default function handler(req) {
  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        background: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 80,
      }}>
        Mi Web v1.2
      </div>
    ),
    { width: 1200, height: 630 }
  );
}