#!/usr/bin/env node
'use strict';

/**
 * @fileoverview CLI for svgclean — clean and optimize SVG files.
 * @author idirdev
 * @usage svgclean <file|dir> [--write] [--minify] [--precision 2] [--json]
 */

const fs = require('fs');
const m = require('../src/index');

const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log([
    'Usage: svgclean <file|dir> [options]',
    '',
    'Options:',
    '  --write          Write cleaned SVG back to disk',
    '  --minify         Collapse all whitespace',
    '  --precision <n>  Round numeric attributes to n decimals (default: 4)',
    '  --json           Output results as JSON',
    '  --help           Show this help message',
  ].join('\n'));
  process.exit(0);
}

const target = args.find(a => !a.startsWith('-')) || '.';
const doWrite = args.includes('--write');
const doMinify = args.includes('--minify');
const showJson = args.includes('--json');

const precIdx = args.indexOf('--precision');
const precision = precIdx >= 0 ? parseInt(args[precIdx + 1], 10) : 4;

const opts = { write: doWrite, minify: doMinify, precision };

let stat;
try { stat = fs.statSync(target); } catch {
  console.error('Error: cannot access ' + target);
  process.exit(1);
}

if (stat.isDirectory()) {
  const results = m.analyzeDir(target, opts);
  if (showJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(m.summary(results));
  }
} else {
  if (doWrite) {
    const r = m.cleanFile(target, opts);
    if (showJson) {
      console.log(JSON.stringify(r, null, 2));
    } else {
      console.log(`Saved ${m.formatSize(r.saved)} (${r.ratio}%) — ${m.formatSize(r.original)} → ${m.formatSize(r.cleaned)}`);
    }
  } else {
    const content = fs.readFileSync(target, 'utf8');
    const cleaned = m.cleanSvg(content, opts);
    if (showJson) {
      const original = Buffer.byteLength(content, 'utf8');
      const cleanedLen = Buffer.byteLength(cleaned, 'utf8');
      console.log(JSON.stringify({ original, cleaned: cleanedLen, saved: original - cleanedLen }, null, 2));
    } else {
      process.stdout.write(cleaned);
    }
  }
}
