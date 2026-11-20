import type {MetadataRoute} from 'next'

/** Admin console must stay out of search indexes (SEO A-01). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  }
}
