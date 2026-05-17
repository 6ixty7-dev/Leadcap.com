import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LeadCap Intelligence OS',
    short_name: 'LeadCap',
    description: 'AI-powered lead intelligence platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#facc15',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
