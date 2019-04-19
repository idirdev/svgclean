'use strict';

/**
 * @fileoverview SVG cleaner — removes metadata, comments, editor cruft, and whitespace.
 * @module svgclean
 * @author idirdev
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {object} CleanOptions
 * @property {boolean} [removeComments=true]     Remove XML comments.
 * @property {boolean} [removeMetadata=true]     Remove \<metadata\>, \<title\>, \<desc\>.
 * @property {boolean} [removeEmptyGroups=true]  Remove empty \<g\> elements.
 * @property {boolean} [removeEditorData=true]   Remove Inkscape/Sodipodi/Adobe namespaces.
 * @property {boolean} [minify=false]            Collapse whitespace aggressively.
 * @property {number}  [precision=4]             Decimal precision for numeric attributes.
 */

/** @type {Required<CleanOptions>} */
const DEFAULT_OPTS = {
  removeComments: true,
  removeMetadata: true,
  removeEmptyGroups: true,
  removeEditorData: true,
  minify: false,
  precision: 4,
};

/**
 * Round numeric attribute values inside an SVG string to a given decimal precision.
 *
 * @param {string} svg - SVG text.
 * @param {number} precision - Number of decimal places.
 * @returns {string} SVG with rounded attribute values.
 */
function roundPrecision(svg, precision) {
  return svg.replace(/([\d]+\.\d+)/g, (_, n) => parseFloat(parseFloat(n).toFixed(precision)).toString());
}

/**
 * Clean an SVG string according to the provided options.
 *
 * @param {string} svgString - Raw SVG text.
 * @param {CleanOptions} [opts={}] - Cleaning options.
 * @returns {string} Cleaned SVG text.
 */
function cleanSvg(svgString, opts) {
  if (typeof svgString !== 'string') throw new TypeError('svgString must be a string');
  const o = Object.assign({}, DEFAULT_OPTS, opts);
  let svg = svgString;

  if (o.removeComments) {
    svg = svg.replace(/<!--[\s\S]*?-->/g, '');
  }

  if (o.removeMetadata) {
    svg = svg.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    svg = svg.replace(/<title>[^<]*<\/title>/gi, '');
    svg = svg.replace(/<desc>[^<]*<\/desc>/gi, '');
    svg = svg.replace(/<rdf:RDF[\s\S]*?<\/rdf:RDF>/gi, '');
    svg = svg.replace(/<cc:[\w]+[\s\S]*?<\/cc:[\w]+>/gi, '');
    svg = svg.replace(/<dc:[\w]+[\s\S]*?<\/dc:[\w]+>/gi, '');
  }

  if (o.removeEditorData) {
    // Remove editor namespace declarations
    svg = svg.replace(/\s+xmlns:(?:dc|cc|rdf|sodipodi|inkscape|xlink|sketch|serif)="[^"]*"/g, '');
    // Remove inkscape/sodipodi attributes
    svg = svg.replace(/\s+(?:sodipodi|inkscape):[\w:-]+="[^"]*"/gi, '');
    // Remove inkscape/sodipodi standalone elements (self-closing)
    svg = svg.replace(/<(?:sodipodi|inkscape):[^>]*\/>/gi, '');
    // Remove inkscape/sodipodi block elements
    svg = svg.replace(/<(?:sodipodi|inkscape):[\w]+[^>]*>[\s\S]*?<\/(?:sodipodi|inkscape):[\w]+>/gi, '');
    // Remove Adobe/Illustrator XML processing instructions
    svg = svg.replace(/<\?[^?]*\?>/g, '');
  }

  if (o.removeEmptyGroups) {
    // Iteratively remove empty <g> and <g ...></g> elements
    let prev;
    do {
      prev = svg;
      svg = svg.replace(/<g(?:\s[^>]*)?>\s*<\/g>/gi, '');
    } while (svg !== prev);
  }

  if (o.precision < 10) {
    svg = roundPrecision(svg, o.precision);
  }

  if (o.minify) {
    svg = svg.replace(/\s+/g, ' ');
    svg = svg.replace(/>\s+</g, '><');
    svg = svg.replace(/\s*=\s*/g, '=');
    svg = svg.trim();
  } else {
    // Normalize excessive whitespace without fully minifying
    svg = svg.replace(/[ \t]{2,}/g, ' ');
    svg = svg.replace(/\n{3,}/g, '\n\n');
    svg = svg.trim();
  }

  return svg;
}

/**
 * Format a byte count as a human-readable string.
 *
 * @param {number} bytes - Number of bytes.
 * @returns {string} Human-readable size.
 */
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

/**
 * Clean an SVG file in-place or write to a specified output path.
 *
 * @param {string} filePath - Path to the source SVG file.
 * @param {CleanOptions & { write?: boolean, outPath?: string }} [opts={}] - Options.
 * @returns {{ original: number, cleaned: number, saved: number, ratio: number }} Size statistics.
 */
function cleanFile(filePath, opts) {
  const o = Object.assign({ write: false, outPath: null }, opts);
  const content = fs.readFileSync(filePath, 'utf8');
  const cleaned = cleanSvg(content, o);
  if (o.write || o.outPath) {
    const dest = o.outPath || filePath;
    fs.writeFileSync(dest, cleaned, 'utf8');
  }
  const original = Buffer.byteLength(content, 'utf8');
  const cleanedLen = Buffer.byteLength(cleaned, 'utf8');
  return {
    original,
    cleaned: cleanedLen,
    saved: original - cleanedLen,
    ratio: original > 0 ? Math.round((1 - cleanedLen / original) * 100) : 0,
  };
}

/**
 * Analyze all SVG files in a directory and report potential savings.
 *
 * @param {string} dir - Directory to walk.
 * @param {CleanOptions} [opts={}] - Cleaning options for analysis.
 * @returns {{ file: string, original: number, cleaned: number, savings: number }[]} Per-file results.
 */
function analyzeDir(dir, opts) {
  const results = [];

  function walk(d) {
    let entries;
    try { entries = fs.readdirSync(d); } catch { return; }
    for (const entry of entries) {
      if (entry === 'node_modules' || entry === '.git') continue;
      const fp = path.join(d, entry);
      let st;
      try { st = fs.statSync(fp); } catch { continue; }
      if (st.isDirectory()) {
        walk(fp);
      } else if (entry.toLowerCase().endsWith('.svg')) {
        try {
          const content = fs.readFileSync(fp, 'utf8');
          const cleaned = cleanSvg(content, opts);
          results.push({
            file: fp,
            original: Buffer.byteLength(content, 'utf8'),
            cleaned: Buffer.byteLength(cleaned, 'utf8'),
            savings: Buffer.byteLength(content, 'utf8') - Buffer.byteLength(cleaned, 'utf8'),
          });
        } catch { /* skip */ }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Format a per-directory analysis report.
 *
 * @param {object[]} results - Array from {@link analyzeDir}.
 * @returns {string} Human-readable report.
 */
function summary(results) {
  if (!results.length) return 'No SVG files found.';
  const totalSaved = results.reduce((acc, r) => acc + r.savings, 0);
  const totalOriginal = results.reduce((acc, r) => acc + r.original, 0);
  const ratio = totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;
  const lines = results.map(r => {
    const pct = r.original > 0 ? Math.round((r.savings / r.original) * 100) : 0;
    return `  ${path.basename(r.file)}: ${formatSize(r.savings)} saved (${pct}%)`;
  });
  lines.push('');
  lines.push(`Total: ${formatSize(totalSaved)} saved across ${results.length} file(s) (${ratio}%)`);
  return lines.join('\n');
}

module.exports = {
  cleanSvg,
  cleanFile,
  analyzeDir,
  formatSize,
  summary,
};
