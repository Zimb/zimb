import { describe, it, expect } from 'vitest';
import astroConfig from '../astro.config.mjs';

describe('Landing Page Configuration', () => {
  it('has correct site URL configured', () => {
    expect(astroConfig.site).toBe('https://zimb.app');
  });

  it('uses static output for Cloudflare Pages deployment', () => {
    expect(astroConfig.output).toBe('static');
  });
});
