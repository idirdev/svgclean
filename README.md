# svgclean

> **[EN]** Strip unnecessary bloat from SVG files — remove editor metadata, Inkscape/Sodipodi attributes, comments, titles, and whitespace to shrink file sizes without altering the visual output.
> **[FR]** Supprimez les données inutiles des fichiers SVG — supprimez les métadonnées d'éditeur, les attributs Inkscape/Sodipodi, les commentaires, les titres et les espaces blancs pour réduire la taille des fichiers sans modifier le rendu visuel.

---

## Features / Fonctionnalités

**[EN]**
- Removes HTML/XML comments (`<!-- ... -->`)
- Strips `<metadata>` blocks (editor export data)
- Removes Inkscape, Sodipodi, Dublin Core (dc/cc/rdf) namespace declarations and attributes
- Removes `<title>` and `<desc>` elements (invisible to users, unnecessary in production)
- Collapses excess whitespace and strips whitespace between tags
- In-place cleaning or write to a separate output file with `-o`
- Dry-run mode (`--dry-run`) to preview savings before modifying files
- Directory mode: batch-cleans all `.svg` files recursively and reports total savings

**[FR]**
- Supprime les commentaires HTML/XML (`<!-- ... -->`)
- Supprime les blocs `<metadata>` (données d'export d'éditeur)
- Supprime les déclarations et attributs de namespace Inkscape, Sodipodi, Dublin Core (dc/cc/rdf)
- Supprime les éléments `<title>` et `<desc>` (invisibles pour les utilisateurs, inutiles en production)
- Réduit les espaces blancs excessifs et supprime les espaces entre les balises
- Nettoyage en place ou écriture dans un fichier de sortie séparé avec `-o`
- Mode dry-run (`--dry-run`) pour prévisualiser les économies avant de modifier les fichiers
- Mode répertoire : nettoie par lot tous les fichiers `.svg` récursivement et rapporte les économies totales

---

## Installation

```bash
npm install -g @idirdev/svgclean
```

---

## CLI Usage / Utilisation CLI

```bash
# Clean a single SVG file in-place (nettoyer un fichier SVG en place)
svgclean icon.svg

# Preview savings without modifying the file (prévisualiser les économies sans modifier)
svgclean icon.svg --dry-run

# Clean and write to a new file (nettoyer et écrire dans un nouveau fichier)
svgclean icon.svg -o icon.min.svg

# Batch clean all SVGs in a directory (nettoyer tous les SVG d'un répertoire par lot)
svgclean ./public/icons

# Show help (afficher l'aide)
svgclean --help
```

### Example Output / Exemple de sortie

```
$ svgclean ./public/icons
public/icons/logo.svg: 2847B saved (43%)
public/icons/arrow.svg: 612B saved (28%)
public/icons/menu.svg: 1024B saved (37%)
public/icons/close.svg: 398B saved (31%)

Total savings: 4881B

$ svgclean hero.svg --dry-run
Would save: 3241B
```

---

## API (Programmatic) / API (Programmation)

```js
const { cleanSvg, cleanFile, analyzeDir } = require('@idirdev/svgclean');

// Clean an SVG string in memory (nettoyer une chaîne SVG en mémoire)
const raw = require('fs').readFileSync('./icon.svg', 'utf8');
const cleaned = cleanSvg(raw);
console.log('Saved:', raw.length - cleaned.length, 'bytes');

// Clean a file and write back (or to a new path) (nettoyer un fichier)
const result = cleanFile('./public/logo.svg');
console.log(result.original); // original byte count
console.log(result.cleaned);  // cleaned byte count
console.log(result.saved);    // bytes saved
console.log(result.ratio);    // percentage saved e.g. 43

// Write to a different output path (écrire vers un chemin de sortie différent)
cleanFile('./src/icon.svg', './dist/icon.min.svg');

// Analyze all SVGs in a directory tree (without writing) (analyser sans écrire)
const results = analyzeDir('./public');
const total = results.reduce((s, r) => s + r.savings, 0);
console.log(`Total potential savings: ${total} bytes across ${results.length} files`);
```

---

## License

MIT © idirdev
