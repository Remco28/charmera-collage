// Step 0 of the review loop: checks on the About page that need no reader.
// node review/loop/check.mjs   (run from the repo root; prints PASS/FAIL per check)
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync('about/index.html', 'utf8');
const transcript = readFileSync('review/loop/transcript.md', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const themes = readFileSync('src/lib/themes.ts', 'utf8');
const render = readFileSync('src/lib/render.ts', 'utf8');

const squash = (s) => s.replace(/\s+/g, ' ').trim();
const plain = (s) => squash(s.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ')).replace(/’/g, "'");
const body = html.slice(html.indexOf('<body>'));
const text = plain(body.replace(/<style[\s\S]*?<\/style>/g, ''));
const results = [];
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);

// Facts the page states, against the code.
const max = +app.match(/const MAX_PHOTOS = (\d+)/)[1];
check(`photo limit is ${max}`, text.includes(`Up to ${max} photos`));
const concepts = (themes.match(/^\s{4}id: '/gm) || []).length;
const colorways = (themes.match(/key: '/g) || []).length - 1; // minus Mix Your Own
check(`${concepts} looks, ${colorways} colorways`, text.includes(`${concepts} looks`) && text.includes(`${colorways} colorways`));
check('16.7 MP iPhone limit', render.includes('16.7 MP') && text.includes('16.7 megapixels'));
check('1440 × 1080 card size', /1440\s*×\s*1080/.test(text) && /1440/.test(readFileSync('README.md', 'utf8')));

// Frank's story: pulled-out quotes are word for word (filler aside).
const said = plain(transcript).replace(/\buh /g, '');
const quotes = [...body.matchAll(/<p class="[^"]*font-hand text-3xl[^"]*">([\s\S]*?)<\/p>/g)].map((m) => plain(m[1]));
quotes.forEach((q) => check(`quote word for word: "${q.slice(0, 40)}…"`, said.includes(q)));
check('found the pulled quotes', quotes.length === 2, `${quotes.length} found`);

// Voice rules that can be checked by looking.
const features = plain(body.slice(body.indexOf('How the minute goes'), body.indexOf('Closing the loop')));
check('no "I" in the feature and how-to text', !/\bI\b|\bI'm\b|\bmy\b/.test(features));
check('no exclamation marks in page text', !text.includes('!'));
check('Charmera explained before the story', text.indexOf('Kodak') > -1 && text.indexOf('Kodak') < text.indexOf('real camera'));

// Images exist and say what they show.
const imgs = [...body.matchAll(/<img [^>]*>/g)].map((m) => m[0]);
const missing = imgs.filter((t) => !existsSync('public' + t.match(/src="([^"]+)"/)[1]));
check('every screenshot file exists', missing.length === 0, missing.join(', '));
check('every screenshot has alt text', imgs.every((t) => /alt="[^"]{10,}"/.test(t)));

// Placeholders are allowed now, but the page must not go live with any.
const placeholders = (text.match(/PLACEHOLDER/g) || []).length;
check('no placeholders left (blocks going live, not this review)', placeholders === 0, `${placeholders} left`);

console.log(results.join('\n'));
