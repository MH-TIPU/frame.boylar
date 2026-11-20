import { SITE_URL } from '../lib/site';

// Add each new frame page here.
export default function sitemap() {
  return ['/smefair'].map(path => ({ url: SITE_URL + path, changeFrequency: 'monthly' }));
}
