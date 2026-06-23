#!/usr/bin/env node

/**
 * Glyph Party - Unicode Data Builder
 * Builds terminal-friendly Unicode glyph data from the official
 * Unicode Character Database (UCD).
 */

const fs = require("fs");
const path = require("path");

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

function loadPackageJson() {
  try {
    return require("./package.json");
  } catch (error) {
    return { version: "unknown", devDependencies: {} };
  }
}

function loadDescriptions() {
  const descPath = path.join(__dirname, "descriptions.json");
  if (!fs.existsSync(descPath)) {
    return {};
  }

  const descriptions = JSON.parse(fs.readFileSync(descPath, "utf8"));
  console.log(`📝 Loaded ${Object.keys(descriptions).length} descriptions`);
  return descriptions;
}

function loadUcdData(packageJson) {
  try {
    const unicodeData = require("ucd-full/UnicodeData.json");
    const blocks = require("ucd-full/Blocks.json");
    const ucdPackageJson = require("ucd-full/package.json");

    console.log("✅ Loaded UCD data files");
    console.log(`📦 Glyph Party version: ${packageJson.version}`);
    console.log(`📊 UCD package version: ${ucdPackageJson.version}`);

    return { unicodeData, blocks, ucdPackageJson };
  } catch (error) {
    const ucdVersion = packageJson.devDependencies["ucd-full"] || "^17.0.0";
    console.error("❌ Error loading UCD data:");
    console.error("Make sure you have installed ucd-full:");
    console.error(`npm install --save-dev ucd-full@${ucdVersion}\n`);
    process.exit(1);
  }
}

function loadInputs() {
  const packageJson = loadPackageJson();
  const descriptions = loadDescriptions();
  const ucdData = loadUcdData(packageJson);

  return {
    packageJson,
    descriptions,
    ...ucdData,
  };
}

function hexToChar(hex) {
  try {
    const codepoint = parseInt(hex, 16);
    return String.fromCodePoint(codepoint);
  } catch (error) {
    return null;
  }
}

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

function getBlockName(codepointHex, blockMap) {
  const codepoint = parseInt(codepointHex, 16);

  for (const block of blockMap) {
    if (codepoint >= block.start && codepoint <= block.end) {
      return block.name;
    }
  }

  return "Unknown";
}

function isUsefulCharacter(char, name) {
  if (!char || char.length === 0) return false;

  const code = char.codePointAt(0);
  if (code < 32 || (code >= 127 && code <= 159)) return false;
  if (code >= 0xe000 && code <= 0xf8ff) return false;
  if (code >= 0xf0000) return false;

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

function selectGlyphs(unicodeData, blockMap, descriptions) {
  const glyphData = [];

  unicodeData.UnicodeData.forEach((entry, index) => {
    const codepoint = entry.codepoint;
    const category = entry.category;
    const name = entry.name;
    const char = hexToChar(codepoint);
    const blockName = getBlockName(codepoint, blockMap);
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
    }

    const processedCount = index + 1;
    if (processedCount % 10000 === 0) {
      console.log(`   Processed ${processedCount} characters...`);
    }
  });

  glyphData.sort((a, b) => a.decimal - b.decimal);

  return glyphData;
}

function groupGlyphs(glyphData) {
  const categorizedData = {};
  const blockData = {};

  glyphData.forEach((glyph) => {
    const cat = glyph.category;
    if (!categorizedData[cat]) {
      categorizedData[cat] = [];
    }
    categorizedData[cat].push(glyph);

    const block = glyph.block;
    if (!blockData[block]) {
      blockData[block] = [];
    }
    blockData[block].push(glyph);
  });

  return { categorizedData, blockData };
}

function createStats({
  glyphData,
  categorizedData,
  blockData,
  packageJson,
  ucdPackageJson,
}) {
  return {
    totalCharacters: glyphData.length,
    categories: Object.keys(categorizedData).length,
    blocks: Object.keys(blockData).length,
    generatedAt: new Date().toISOString(),
    unicodeVersion: ucdPackageJson.version,
    glyphPartyVersion: packageJson.version,
  };
}

function writeDataFiles(outputDir, stats, glyphData, categorizedData, blockData) {
  fs.mkdirSync(outputDir, { recursive: true });

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

  const compactDataFile = path.join(outputDir, "unicode-data.min.json");
  fs.writeFileSync(
    compactDataFile,
    JSON.stringify({
      stats,
      characters: glyphData,
    }),
  );

  return { mainDataFile, compactDataFile };
}

function printSummary({
  categorizedData,
  blockData,
  unicodeData,
  packageJson,
  ucdPackageJson,
  mainDataFile,
  compactDataFile,
  glyphData,
}) {
  console.log("\n✨ Glyph Party data generation complete!");
  console.log(`📊 Statistics:`);
  console.log(`   Total characters: ${glyphData.length.toLocaleString()}`);
  console.log(`   Categories: ${Object.keys(categorizedData).length}`);
  console.log(`   Blocks: ${Object.keys(blockData).length}`);
  console.log(
    `   Processed: ${unicodeData.UnicodeData.length.toLocaleString()} total characters`,
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
  console.log(`\n✨ Sample characters:`);

  const samples = glyphData.slice(0, 10);
  samples.forEach((glyph) => {
    console.log(`   ${glyph.char} (U+${glyph.code}) - ${glyph.name}`);
  });

  if (glyphData.length > 10) {
    console.log(`   ... and ${(glyphData.length - 10).toLocaleString()} more!`);
  }
}

function main() {
  console.log("🎉 Building Unicode data for Glyph Party...\n");

  const { packageJson, descriptions, unicodeData, blocks, ucdPackageJson } =
    loadInputs();

  console.log("📋 Processing Unicode blocks...");
  const blockMap = createBlockMap(blocks);

  console.log("🔍 Processing Unicode characters...");
  const glyphData = selectGlyphs(
    unicodeData,
    blockMap,
    descriptions,
  );

  const { categorizedData, blockData } = groupGlyphs(glyphData);
  const stats = createStats({
    glyphData,
    categorizedData,
    blockData,
    packageJson,
    ucdPackageJson,
  });
  const { mainDataFile, compactDataFile } = writeDataFiles(
    "src",
    stats,
    glyphData,
    categorizedData,
    blockData,
  );

  printSummary({
    categorizedData,
    blockData,
    unicodeData,
    packageJson,
    ucdPackageJson,
    mainDataFile,
    compactDataFile,
    glyphData,
  });
}

main();
