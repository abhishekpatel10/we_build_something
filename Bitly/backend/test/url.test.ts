import test from 'node:test';
import assert from 'node:assert/strict';
import { urlService } from '../src/services/url.service.js';
import { counterService } from '../src/services/counter.js';

test('UrlService - create standard short URL', async () => {
  const result = await urlService.createShortUrl({
    originalUrl: 'https://hellointerview.com/blog/system-design-url-shortener',
  });

  assert.ok(result.shortCode, 'Short code should be generated');
  assert.equal(result.isCustom, false);
  assert.ok(result.shortUrl.includes(result.shortCode));
  assert.equal(result.originalUrl, 'https://hellointerview.com/blog/system-design-url-shortener');
});

test('UrlService - create and resolve custom alias', async () => {
  const customAlias = `evan-${Date.now().toString(36)}`;
  const result = await urlService.createShortUrl({
    originalUrl: 'https://meta.com',
    alias: customAlias,
  });

  assert.equal(result.shortCode, customAlias);
  assert.equal(result.isCustom, true);

  // Resolve custom alias
  const resolved = await urlService.resolveShortUrl(customAlias, {
    referrer: 'https://google.com',
    userAgent: 'Mozilla/5.0 TestBrowser',
  });

  assert.equal(resolved.status, 'FOUND');
  assert.equal(resolved.originalUrl, 'https://meta.com');
});

test('UrlService - duplicate custom alias rejected with 409', async () => {
  const customAlias = `dup-${Date.now().toString(36)}`;
  await urlService.createShortUrl({
    originalUrl: 'https://example.com/first',
    alias: customAlias,
  });

  await assert.rejects(
    async () => {
      await urlService.createShortUrl({
        originalUrl: 'https://example.com/second',
        alias: customAlias,
      });
    },
    (err: any) => {
      assert.equal(err.statusCode, 409);
      return true;
    }
  );
});

test('UrlService - expired URL returns EXPIRED status', async () => {
  const pastTime = Date.now() + 50; // expires in 50ms
  const created = await urlService.createShortUrl({
    originalUrl: 'https://temporary-event.com',
    expirationTime: pastTime,
  });

  // Wait 100ms for expiration
  await new Promise((resolve) => setTimeout(resolve, 100));

  const resolved = await urlService.resolveShortUrl(created.shortCode, {});
  assert.equal(resolved.status, 'EXPIRED');
});

test('DistributedCounter - batch info inspection', async () => {
  const info = counterService.getBatchInfo();
  assert.ok(info.instanceId);
  assert.ok(info.batchSize > 0);
  assert.ok(typeof info.remainingInBatch === 'number');
});
