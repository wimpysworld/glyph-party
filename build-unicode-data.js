#!/usr/bin/env node

/**
 * Glyph Party - Unicode Data Builder
 * Builds terminal-friendly Unicode glyph data from the official
 * Unicode Character Database (UCD).
 */

const fs = require("fs");
const path = require("path");

console.log("🎉 Building Unicode data for Glyph Party...\n");

// Merge optional generated descriptions into character records.
let descriptions = {};
const descPath = path.join(__dirname, "descriptions.json");
if (fs.existsSync(descPath)) {
  descriptions = JSON.parse(fs.readFileSync(descPath, "utf8"));
  console.log(`📝 Loaded ${Object.keys(descriptions).length} descriptions`);
}

function loadPackageJson() {
  try {
    return require("./package.json");
  } catch (error) {
    return { version: "unknown", devDependencies: {} };
  }
}

// Load UCD source tables and package versions.
let unicodeData, blocks, ucdPackageJson;
const packageJson = loadPackageJson();

try {
  unicodeData = require("ucd-full/UnicodeData.json");
  blocks = require("ucd-full/Blocks.json");
  ucdPackageJson = require("ucd-full/package.json");

  console.log("✅ Loaded UCD data files");
  console.log(`📦 Glyph Party version: ${packageJson.version}`);
  console.log(`📊 UCD package version: ${ucdPackageJson.version}`);
} catch (error) {
  const ucdVersion = packageJson.devDependencies["ucd-full"] || "^17.0.0";
  console.error("❌ Error loading UCD data:");
  console.error("Make sure you have installed ucd-full:");
  console.error(`npm install --save-dev ucd-full@${ucdVersion}\n`);
  process.exit(1);
}

const CATEGORY_NAMES = {
  Lu: "Uppercase Letter",
  Ll: "Lowercase Letter",
  Lt: "Titlecase Letter",
  Lm: "Modifier Letter",
  Lo: "Other Letter",
  Mn: "Nonspacing Marks",
  Mc: "Spacing Marks",
  Me: "Enclosing Marks",
  Nd: "Decimal Numbers",
  Nl: "Letter Numbers",
  No: "Other Numbers",
  Pc: "Connector Punctuation",
  Pd: "Dash Punctuation",
  Ps: "Open Punctuation",
  Pe: "Close Punctuation",
  Pi: "Initial Quote Punctuation",
  Pf: "Final Quote Punctuation",
  Po: "Other Punctuation",
  Sm: "Mathematical Symbols",
  Sc: "Currency Symbols",
  Sk: "Modifier Symbols",
  So: "Other Symbols",
  Zs: "Space Separators",
  Zl: "Line Separators",
  Zp: "Paragraph Separators",
  Cc: "Control Characters",
  Cf: "Format Characters",
  Cs: "Surrogate Characters",
  Co: "Private Use",
  Cn: "Unassigned",
};

// Categories that are visually interesting for terminal use
const INTERESTING_CATEGORIES = new Set([
  "Sm",
  "So",
  "Ps",
  "Pe",
  "Pd",
  "Po",
  "Sc",
  "Sk",
]);

// Specific Unicode blocks that are great for terminal flair
const PRIORITY_BLOCKS = [
  "Mathematical Operators",
  "Miscellaneous Mathematical Symbols-A",
  "Miscellaneous Mathematical Symbols-B",
  "Mathematical Alphanumeric Symbols",
  "Arrows",
  "Supplemental Arrows-A",
  "Supplemental Arrows-B",
  "Miscellaneous Symbols",
  "Miscellaneous Symbols and Arrows",
  "Dingbats",
  "Miscellaneous Technical",
  "Control Pictures",
  "Box Drawing",
  "Block Elements",
  "Geometric Shapes",
  "Miscellaneous Symbols and Pictographs",
  "Emoticons",
  "Transport and Map Symbols",
  "Alchemical Symbols",
  "Currency Symbols",
  "Letterlike Symbols",
  "Number Forms",
  "Enclosed Alphanumerics",
  "Enclosed Alphanumeric Supplement",
  "General Punctuation",
  "Supplemental Punctuation",
];

// Convert hex codepoint to Unicode character
function hexToChar(hex) {
  try {
    const codepoint = parseInt(hex, 16);
    return String.fromCodePoint(codepoint);
  } catch (error) {
    return null;
  }
}

// Create parsed codepoint ranges for block lookup
function createBlockMap(blocks) {
  return blocks.Blocks.map((entry) => {
    const [start, end] = entry.range;
    return {
      start: parseInt(start, 16),
      end: parseInt(end, 16),
      name: entry.block,
    };
  });
}

// Find which block a codepoint belongs to
function getBlockName(codepointHex, blockMap) {
  const codepoint = parseInt(codepointHex, 16);

  for (const block of blockMap) {
    if (codepoint >= block.start && codepoint <= block.end) {
      return block.name;
    }
  }

  return "Unknown";
}

// Check if character is printable and useful
function isUsefulCharacter(char, name) {
  if (!char || char.length === 0) return false;

  // Exclude code points that do not render as useful glyphs.
  const code = char.codePointAt(0);
  if (code < 32 || (code >= 127 && code <= 159)) return false;
  if (code >= 0xe000 && code <= 0xf8ff) return false; // Private use
  if (code >= 0xf0000) return false; // Private use planes

  // Skip if name indicates it's not a visible character
  if (
    name &&
    (name.includes("<control>") ||
      name.includes("PRIVATE USE") ||
      name.includes("SURROGATE") ||
      name.includes("NONCHARACTER"))
  ) {
    return false;
  }

  return true;
}

// Build the block map
console.log("📋 Processing Unicode blocks...");
const blockMap = createBlockMap(blocks);

// Process Unicode data
console.log("🔍 Processing Unicode characters...");
const glyphData = [];
let processedCount = 0;
let filteredCount = 0;

unicodeData.UnicodeData.forEach((entry) => {
  processedCount++;

  const codepoint = entry.codepoint;
  const category = entry.category;
  const name = entry.name;
  const char = hexToChar(codepoint);
  const blockName = getBlockName(codepoint, blockMap);

  // Filter for interesting categories or priority blocks
  const isInterestingCategory = INTERESTING_CATEGORIES.has(category);
  const isPriorityBlock = PRIORITY_BLOCKS.includes(blockName);

  if (
    (isInterestingCategory || isPriorityBlock) &&
    isUsefulCharacter(char, name)
  ) {
    glyphData.push({
      code: codepoint.toUpperCase(),
      char: char,
      name: name,
      description: descriptions[codepoint.toUpperCase()] || "",
      category: category,
      categoryName: CATEGORY_NAMES[category] || category,
      block: blockName,
      decimal: parseInt(codepoint, 16),
    });
    filteredCount++;
  }

  if (processedCount % 10000 === 0) {
    console.log(`   Processed ${processedCount} characters...`);
  }
});

// Sort by Unicode code point for consistent ordering
glyphData.sort((a, b) => a.decimal - b.decimal);

// Group by category for easier filtering
const categorizedData = {};
glyphData.forEach((glyph) => {
  const cat = glyph.category;
  if (!categorizedData[cat]) {
    categorizedData[cat] = [];
  }
  categorizedData[cat].push(glyph);
});

// Group by block for easier browsing
const blockData = {};
glyphData.forEach((glyph) => {
  const block = glyph.block;
  if (!blockData[block]) {
    blockData[block] = [];
  }
  blockData[block].push(glyph);
});

// Create output directory
const outputDir = "src";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate summary stats
const stats = {
  totalCharacters: filteredCount,
  categories: Object.keys(categorizedData).length,
  blocks: Object.keys(blockData).length,
  generatedAt: new Date().toISOString(),
  unicodeVersion: ucdPackageJson.version,
  glyphPartyVersion: packageJson.version,
};

// Write main data file
const mainDataFile = path.join(outputDir, "unicode-data.json");
fs.writeFileSync(
  mainDataFile,
  JSON.stringify(
    {
      stats,
      characters: glyphData,
      byCategory: categorizedData,
      byBlock: blockData,
    },
    null,
    2,
  ),
);

// Write compact version for production
const compactDataFile = path.join(outputDir, "unicode-data.min.json");
fs.writeFileSync(
  compactDataFile,
  JSON.stringify({
    stats,
    characters: glyphData,
  }),
);

console.log("\n✨ Glyph Party data generation complete!");
console.log(`📊 Statistics:`);
console.log(`   Total characters: ${filteredCount.toLocaleString()}`);
console.log(`   Categories: ${Object.keys(categorizedData).length}`);
console.log(`   Blocks: ${Object.keys(blockData).length}`);
console.log(
  `   Processed: ${processedCount.toLocaleString()} total characters`,
);
console.log(`   Glyph Party: v${packageJson.version}`);
console.log(`   Unicode: ${ucdPackageJson.version}`);

console.log(`\n📁 Generated files:`);
console.log(
  `   ${mainDataFile} (${Math.round(fs.statSync(mainDataFile).size / 1024)}KB)`,
);
console.log(
  `   ${compactDataFile} (${Math.round(fs.statSync(compactDataFile).size / 1024)}KB)`,
);

console.log(`\n🎉 Ready to build your gorgeous Glyph Party interface!`);

// Show some sample characters
console.log(`\n✨ Sample characters:`);
const samples = glyphData.slice(0, 10);
samples.forEach((glyph) => {
  console.log(`   ${glyph.char} (U+${glyph.code}) - ${glyph.name}`);
});

if (glyphData.length > 10) {
  console.log(`   ... and ${(glyphData.length - 10).toLocaleString()} more!`);
}
