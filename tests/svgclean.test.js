'use strict';

/**
 * @fileoverview Tests for svgclean.
 * @author idirdev
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { cleanSvg, formatSize, summary } = require('../src/index');

// ── Comment removal ────────────────────────────────────────────────────────────

describe('cleanSvg — comments', () => {
  it('removes single-line XML comments', () => {
    const result = cleanSvg('<svg><!-- this is a comment --><rect/></svg>');
    assert.ok(!result.includes('comment'));
    assert.ok(result.includes('<rect'));
  });

  it('removes multi-line XML comments', () => {
    const svg = '<svg><!--\n  multi\n  line\n--><circle/></svg>';
    const result = cleanSvg(svg);
    assert.ok(!result.includes('multi'));
    assert.ok(result.includes('<circle'));
  });

  it('preserves comments when removeComments is false', () => {
    const result = cleanSvg('<svg><!-- keep me --><rect/></svg>', { removeComments: false });
    assert.ok(result.includes('keep me'));
  });
});

// ── Metadata removal ───────────────────────────────────────────────────────────

describe('cleanSvg — metadata', () => {
  it('removes <metadata> block', () => {
    const result = cleanSvg('<svg><metadata>some data</metadata><rect/></svg>');
    assert.ok(!result.includes('metadata'));
    assert.ok(result.includes('<rect'));
  });

  it('removes <title> element', () => {
    const result = cleanSvg('<svg><title>My Icon</title><rect/></svg>');
    assert.ok(!result.includes('<title>'));
  });

  it('removes <desc> element', () => {
    const result = cleanSvg('<svg><desc>Description</desc><circle/></svg>');
    assert.ok(!result.includes('<desc>'));
  });
});

// ── Editor namespace removal ───────────────────────────────────────────────────

describe('cleanSvg — editor data', () => {
  it('removes inkscape namespace declarations', () => {
    const result = cleanSvg('<svg xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"><rect/></svg>');
    assert.ok(!result.includes('xmlns:inkscape'));
  });

  it('removes inkscape attribute on elements', () => {
    const result = cleanSvg('<svg><rect inkscape:version="1.0"/></svg>');
    assert.ok(!result.toLowerCase().includes('inkscape:version'));
  });

  it('removes sodipodi elements', () => {
    const result = cleanSvg('<svg><sodipodi:namedview id="v"/><rect/></svg>');
    assert.ok(!result.toLowerCase().includes('sodipodi'));
  });
});

// ── Empty group removal ────────────────────────────────────────────────────────

describe('cleanSvg — empty groups', () => {
  it('removes empty <g> elements', () => {
    const result = cleanSvg('<svg><g></g><rect/></svg>');
    assert.ok(!/<g[^>]*>\s*<\/g>/i.test(result));
    assert.ok(result.includes('<rect'));
  });
});

// ── Minify ─────────────────────────────────────────────────────────────────────

describe('cleanSvg — minify', () => {
  it('collapses whitespace when minify=true', () => {
    const result = cleanSvg('<svg>  <rect/>  <circle/>  </svg>', { minify: true });
    assert.ok(!result.includes('  '));
  });

  it('preserves structure when minify=false', () => {
    const result = cleanSvg('<svg viewBox="0 0 100 100"><rect width="100" height="100"/></svg>', { minify: false });
    assert.ok(result.includes('viewBox'));
    assert.ok(result.includes('<rect'));
  });
});

// ── Precision ─────────────────────────────────────────────────────────────────

describe('cleanSvg — precision', () => {
  it('rounds decimal values to requested precision', () => {
    const result = cleanSvg('<svg><path d="M 10.123456 20.654321"/></svg>', { precision: 2 });
    assert.ok(!result.includes('10.123456'));
    assert.ok(result.includes('10.12'));
  });
});

// ── Utilities ─────────────────────────────────────────────────────────────────

describe('formatSize', () => {
  it('formats bytes correctly', () => {
    assert.equal(formatSize(512), '512 B');
  });

  it('formats kilobytes correctly', () => {
    assert.ok(formatSize(2048).includes('KB'));
  });

  it('formats megabytes correctly', () => {
    assert.ok(formatSize(2 * 1048576).includes('MB'));
  });
});

describe('summary', () => {
  it('returns message for empty results', () => {
    assert.ok(summary([]).includes('No SVG files'));
  });

  it('aggregates savings correctly', () => {
    const results = [
      { file: '/a.svg', original: 1000, cleaned: 700, savings: 300 },
      { file: '/b.svg', original: 500, cleaned: 400, savings: 100 },
    ];
    const s = summary(results);
    assert.ok(s.includes('2 file'));
  });
});
