// Run:  node --experimental-strip-types supabase/tests/vendor_click_test.mts
import { buildDestination, isBot, refererHost, SLUG, REDIRECT_LINKS, PING_LINKS, makeClickToken, readClickToken, TOKEN_TTL_SECONDS } from '../functions/vendor-click/dest.ts'
import assert from 'node:assert/strict'
const id = '123e4567-e89b-12d3-a456-426614174000'
assert.equal(buildDestination('https://example.com/book', id, true),
  'https://example.com/book?utm_source=unionvault&utm_medium=referral&utm_campaign=recommended_vendors&uvc=123e4567e89b')
assert.equal(buildDestination('https://example.com/book?x=1', id, false), 'https://example.com/book?x=1')
assert.ok(buildDestination('https://example.com/?x=1', id, true).includes('x=1'))          // existing params kept
assert.throws(() => buildDestination('http://example.com/', id, true))                        // https only
assert.throws(() => buildDestination('javascript:alert(1)', id, true))
assert.ok(isBot('Mozilla/5.0 (compatible; Googlebot/2.1)') && !isBot('Mozilla/5.0 (iPhone) Safari'))
assert.equal(refererHost('https://unionvault.app/some/page?q=1'), 'unionvault.app')
assert.equal(refererHost('not a url'), null)
assert.ok(SLUG.test('storyline') && !SLUG.test('Bad Value') && !SLUG.test('../x'))
assert.ok(REDIRECT_LINKS.includes('contact') && !REDIRECT_LINKS.includes('call') && PING_LINKS.includes('call') && PING_LINKS.includes('email'))
// click tokens
const uid = '11111111-2222-4333-8444-555555555555', key = 'test-key', now = 1_800_000_000
const tok = await makeClickToken(uid, key, now)
assert.equal(tok.exp, now + TOKEN_TTL_SECONDS)
assert.equal(await readClickToken(tok.t, key, now + 10), uid)                                     // valid
assert.equal(await readClickToken(tok.t, key, tok.exp + 1), null)                                 // expired
assert.equal(await readClickToken(tok.t, 'other-key', now), null)                                 // wrong key
assert.equal(await readClickToken(tok.t.replace(uid, '99999999-2222-4333-8444-555555555555'), key, now), null)   // user swapped
assert.equal(await readClickToken(tok.t.slice(0, -2) + '00', key, now), null)                     // signature tampered
assert.equal(await readClickToken(null, key, now), null)
assert.equal(await readClickToken('garbage', key, now), null)
assert.equal(await readClickToken('x'.repeat(500), key, now), null)
await assert.rejects(() => makeClickToken('not-a-uuid', key, now))
console.log('vendor-click helpers: all tests passed')
