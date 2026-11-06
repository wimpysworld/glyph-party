const fs = require("fs");
const path = require("path");
const https = require("https");
const { createHash } = require("crypto");
const sources = require("./ucd-sources.json");

const CATEGORIES = new Set(
  "Lu Ll Lt Lm Lo Mn Mc Me Nd Nl No Pc Pd Ps Pe Pi Pf Po Sm Sc Sk So Zs Zl Zp Cc Cf Cs Co Cn".split(" "),
);

function parseCodepoint(value) {
  if (!/^[0-9A-F]{4,6}$/.test(value) || parseInt(value, 16) > 0x10ffff) {
    throw new Error(`Invalid UCD code point: ${value}`);
  }
  return parseInt(value, 16);
}

function parseUnicodeData(text) {
  const records = [];
  let previous = -1;
  let rangeStart;

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const fields = line.split(";");
    const [codepoint, name, category] = fields;
    if (fields.length !== 15 || !name || !CATEGORIES.has(category)) {
      throw new Error(`Invalid UnicodeData record: ${codepoint}`);
    }
    const code = parseCodepoint(codepoint);
    if (code <= previous) {
      throw new Error(`Duplicate or unordered UnicodeData code point: ${codepoint}`);
    }
    previous = code;

    const marker = name.match(/^<(.+), (First|Last)>$/);
    if (rangeStart) {
      if (
        !marker ||
        marker[2] !== "Last" ||
        marker[1] !== rangeStart.name ||
        fields.slice(2).join(";") !== rangeStart.properties
      ) {
        throw new Error(`Invalid UnicodeData range end: ${codepoint}`);
      }
      rangeStart = undefined;
    } else if (marker) {
      if (marker[2] !== "First") {
        throw new Error(`UnicodeData range has no start: ${codepoint}`);
      }
      rangeStart = {
        name: marker[1],
        properties: fields.slice(2).join(";"),
      };
    }

    records.push({ codepoint, name, category });
  }

  if (rangeStart) throw new Error("Unterminated UnicodeData range");
  if (!records.length) throw new Error("UnicodeData contains no records");
  return { UnicodeData: records };
}

function parseBlocks(text, version) {
  if (!text.split(/\r?\n/).includes(`# Blocks-${version}.txt`)) {
    throw new Error(`Blocks.txt does not match Unicode ${version}`);
  }
  const records = [];
  const names = new Set();
  let previousEnd = -1;

  for (const line of text.split(/\r?\n/)) {
    const record = line.split("#")[0].trim();
    if (!record) continue;
    const match = record.match(
      /^([0-9A-F]{4,6})\.\.([0-9A-F]{4,6});\s*([^;]+?)\s*$/,
    );
    if (!match) throw new Error(`Invalid Blocks record: ${record}`);
    const [, start, end, block] = match;
    const startCode = parseCodepoint(start);
    const endCode = parseCodepoint(end);
    if (startCode > endCode || startCode <= previousEnd || names.has(block)) {
      throw new Error(`Invalid or overlapping block: ${block}`);
    }
    previousEnd = endCode;
    names.add(block);
    records.push({ range: [start, end], block });
  }

  if (!records.length) throw new Error("Blocks.txt contains no records");
  return { Blocks: records };
}

function downloadSource(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} from ${url}`));
        return;
      }
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("error", reject);
      response.on("aborted", () =>
        reject(new Error(`Incomplete download: ${url}`)),
      );
      response.on("end", () => resolve(Buffer.concat(chunks)));
    });
    request.setTimeout(30000, () =>
      request.destroy(new Error(`Download timed out: ${url}`)),
    );
    request.on("error", reject);
  });
}

function verifySource(data, source, file) {
  const hash = createHash("sha256").update(data).digest("hex");
  if (hash !== source.sha256) {
    throw new Error(
      `SHA-256 mismatch for ${file}. Expected ${source.sha256}, received ${hash}`,
    );
  }
}

async function loadSource(file, source, cacheDir) {
  const cachePath = path.join(cacheDir, file);
  try {
    const data = await fs.promises.readFile(cachePath);
    verifySource(data, source, cachePath);
    return data.toString("utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  console.log(`Downloading ${source.url}`);
  const data = await downloadSource(source.url);
  verifySource(data, source, file);
  await fs.promises.mkdir(cacheDir, { recursive: true });
  await fs.promises.writeFile(cachePath, data);
  return data.toString("utf8");
}

async function loadUcdData() {
  const cacheDir = path.join(__dirname, ".cache", "ucd", sources.version);
  try {
    const unicodeText = await loadSource(
      "UnicodeData.txt",
      sources.files["UnicodeData.txt"],
      cacheDir,
    );
    const blocksText = await loadSource(
      "Blocks.txt",
      sources.files["Blocks.txt"],
      cacheDir,
    );
    return {
      unicodeData: parseUnicodeData(unicodeText),
      blocks: parseBlocks(blocksText, sources.version),
      ucdSource: { version: sources.version },
    };
  } catch (error) {
    throw new Error(
      `Cannot load Unicode ${sources.version}: ${error.message}. Check network access and the cache at ${cacheDir}.`,
    );
  }
}

module.exports = {
  parseUnicodeData,
  parseBlocks,
  loadSource,
  loadUcdData,
};
