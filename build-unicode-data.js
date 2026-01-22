#!/usr/bin/env node

/**
 * Glyph Party - Unicode Data Builder
 * Extracts relevant Unicode characters for terminal/CLI visual flair
 * from the official Unicode Character Database (UCD)
 */

const fs = require("fs");
const path = require("path");

console.log("🎉 Building Unicode data for Glyph Party...\n");

// Load optional descriptions file
let descriptions = {};
const descPath = path.join(__dirname, "descriptions.json");
if (fs.existsSync(descPath)) {
  descriptions = JSON.parse(fs.readFileSync(descPath, "utf8"));
  console.log(`📝 Loaded ${Object.keys(descriptions).length} descriptions`);
}

// Import UCD data files and package info
let unicodeData, blocks, categories, packageJson, ucdPackageJson;

try {
  unicodeData = require("ucd-full/UnicodeData.json");
  blocks = require("ucd-full/Blocks.json");
  categories = require("ucd-full/extracted/DerivedGeneralCategory.json");
  packageJson = require("./package.json");
  ucdPackageJson = require("ucd-full/package.json");

  console.log("✅ Loaded UCD data files");
  console.log(`📦 Glyph Party version: ${packageJson.version}`);
  console.log(`📊 UCD package version: ${ucdPackageJson.version}`);
} catch (error) {
  console.error("❌ Error loading UCD data:");
  console.error("Make sure you have installed ucd-full:");
  console.error("npm install --save-dev ucd-full@^16.0.1\n");
  process.exit(1);
}

// Categories that are visually interesting for terminal use
const INTERESTING_CATEGORIES = {
  Sm: "Mathematical Symbols",
  So: "Other Symbols",
  Ps: "Open Punctuation",
  Pe: "Close Punctuation",
  Pd: "Dash Punctuation",
  Po: "Other Punctuation",
  Sc: "Currency Symbols",
  Sk: "Modifier Symbols",
};

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

// Create a map of codepoint ranges to block names
function createBlockMap(blocks) {
  const blockMap = new Map();

  blocks.Blocks.forEach((entry) => {
    const [start, end] = entry.range;
    const startCode = parseInt(start, 16);
    const endCode = parseInt(end, 16);
    const blockName = entry.block; // Fixed: was entry.name

    // Store range and name
    blockMap.set(`${startCode}-${endCode}`, blockName);
  });

  return blockMap;
}

// Find which block a codepoint belongs to
function getBlockName(codepointHex, blockMap) {
  const codepoint = parseInt(codepointHex, 16);

  for (const [range, blockName] of blockMap) {
    const [start, end] = range.split("-").map(Number);
    if (codepoint >= start && codepoint <= end) {
      return blockName;
    }
  }

  return "Unknown";
}

// Check if character is printable and useful
function isUsefulCharacter(char, name) {
  if (!char || char.length === 0) return false;

  // Skip control characters, private use, etc.
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
  const category = entry.category; // Fixed: was entry.generalCategory
  const name = entry.name;
  const char = hexToChar(codepoint);
  const blockName = getBlockName(codepoint, blockMap);

  // Filter for interesting categories or priority blocks
  const isInterestingCategory = INTERESTING_CATEGORIES.hasOwnProperty(category);
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
      categoryName: INTERESTING_CATEGORIES[category] || "Other",
      block: blockName,
      decimal: parseInt(codepoint, 16),
    });
    filteredCount++;
  }

  // Progress indicator
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

// Write category reference
const categoryFile = path.join(outputDir, "categories.json");
fs.writeFileSync(
  categoryFile,
  JSON.stringify(
    {
      categories: INTERESTING_CATEGORIES,
      priorityBlocks: PRIORITY_BLOCKS,
      versions: {
        glyphParty: packageJson.version,
        unicode: ucdPackageJson.version,
        generatedAt: new Date().toISOString(),
      },
    },
    null,
    2,
  ),
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
console.log(`   ${categoryFile}`);

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
