import { SITE_URL } from '../lib/site';

// Add each new frame page here.
export default function sitemap() {
  return ['/', '/smefair', '/fbcover', '/fbcover-mobile'].map(path => ({ url: SITE_URL + path, changeFrequency: 'monthly' }));
}
