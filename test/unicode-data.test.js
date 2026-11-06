const assert = require("assert").strict;
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { EventEmitter } = require("events");
const { createHash } = require("crypto");
const { parseUnicodeData, parseBlocks, loadSource } = require("../ucd-data");
const { selectGlyphs, groupGlyphs } = require("../build-unicode-data");
const sources = require("../ucd-sources.json");

function record(code, name, category) {
  return [code, name, category, "0", "L", "", "", "", "", "N", "", "", "", "", ""].join(";");
}

function testUnicodeParser() {
  const symbol = record("1DB00", "LEIBNIZIAN EQUALS SIGN", "Sm");
  const start = record("3400", "<CJK Ideograph Extension A, First>", "Lo");
  const end = record("4DBF", "<CJK Ideograph Extension A, Last>", "Lo");
  const parsed = parseUnicodeData(`${start}\r\n${end}\r\n${symbol}\r\n`);
  assert.equal(parsed.UnicodeData.length, 3);
  assert.deepEqual(parsed.UnicodeData[2], { codepoint: "1DB00", name: "LEIBNIZIAN EQUALS SIGN", category: "Sm" });

  for (const text of [
    "", "0041;MISSING FIELDS;Lu", `${symbol};extra`,
    record("110000", "OUT OF RANGE", "So"), record("004Z", "INVALID HEX", "So"),
    record("0041", "BAD CATEGORY", "XX"), record("0041", "", "Lu"),
    `${symbol}\n${symbol}`, `${symbol}\n${start}`, start, end,
    `${start}\n${symbol}`, `${start}\n${end.replace("Lo", "So")}`,
    `${start}\n${end.replace("Extension A", "Extension B")}`,
  ]) {
    assert.throws(() => parseUnicodeData(text));
  }

  const placeholders = parseUnicodeData([
    record("2190", "<Example, First>", "So"),
    record("2191", "<Example, Last>", "So"),
  ].join("\n"));
  assert.deepEqual(selectGlyphs(placeholders, [{ start: 0x2190, end: 0x2191, name: "Arrows" }], {}), []);
}

function testBlockParser() {
  const header = "# Blocks-18.0.0.txt\n";
  const blocks = parseBlocks(`${header}\n# Comment\n0000..007F; Basic Latin # Note\r\n1DB00..1DBFF; Miscellaneous Symbols and Arrows Extended\n`, "18.0.0");
  assert.deepEqual(blocks.Blocks[1], { range: ["1DB00", "1DBFF"], block: "Miscellaneous Symbols and Arrows Extended" });
  assert.throws(() => parseBlocks(header, "17.0.0"), /does not match/);
  for (const text of [
    "", "0000; Missing range", "007F..0000; Reversed", "0000..110000; Invalid",
    "0000..007F; Basic Latin\n007F..008F; Overlap",
    "0000..007F; Duplicate\n0080..00FF; Duplicate", "0000..007F; Name; Extra",
  ]) {
    assert.throws(() => parseBlocks(header + text, "18.0.0"));
  }
}

async function testSourceCache() {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "glyph-party-ucd-"));
  const body = Buffer.from("verified source\n");
  const source = { url: "https://example.invalid/UnicodeData.txt", sha256: createHash("sha256").update(body).digest("hex") };
  const originalGet = https.get;
  const originalWriteFile = fs.promises.writeFile;
  const originalRename = fs.promises.rename;
  let calls = 0;
  let status = 200;
  let error;
  let aborted = false;
  let timedOut = false;
  let downloaded = body;
  https.get = (url, callback) => {
    calls++;
    assert.equal(url, source.url);
    const request = new EventEmitter();
    request.setTimeout = (timeout, callback) => {
      assert.equal(timeout, 30000);
      if (timedOut) process.nextTick(callback);
      return request;
    };
    request.destroy = (failure) => request.emit("error", failure);
    process.nextTick(() => {
      if (timedOut) return;
      if (error) return request.emit("error", error);
      const response = new EventEmitter();
      response.statusCode = status;
      response.resume = () => {};
      callback(response);
      if (aborted) return response.emit("aborted");
      response.emit("data", downloaded);
      response.emit("end");
    });
    return request;
  };

  try {
    assert.equal(await loadSource("UnicodeData.txt", source, cacheDir), body.toString());
    assert.equal(await loadSource("UnicodeData.txt", source, cacheDir), body.toString());
    assert.equal(calls, 1, "A verified cache must work without a download");
    fs.writeFileSync(path.join(cacheDir, "UnicodeData.txt"), "corrupt");
    await assert.rejects(loadSource("UnicodeData.txt", source, cacheDir), /SHA-256 mismatch/);
    assert.equal(calls, 1, "A corrupt cache must fail without a silent replacement");

    fs.promises.writeFile = async (file, data, options) => {
      assert.equal(path.dirname(file), cacheDir);
      assert.notEqual(file, path.join(cacheDir, "interrupted.txt"));
      await originalWriteFile(file, data.subarray(0, 3), options);
      throw new Error("Cache write interrupted");
    };
    await assert.rejects(loadSource("interrupted.txt", source, cacheDir), /Cache write interrupted/);
    assert.deepEqual(fs.readdirSync(cacheDir), ["UnicodeData.txt"]);
    fs.promises.writeFile = originalWriteFile;
    assert.equal(await loadSource("interrupted.txt", source, cacheDir), body.toString());
    assert.deepEqual(fs.readFileSync(path.join(cacheDir, "interrupted.txt")), body);

    fs.promises.rename = async (temporaryPath, cachePath) => {
      assert.equal(path.dirname(temporaryPath), path.dirname(cachePath));
      assert.deepEqual(fs.readFileSync(temporaryPath), body);
      assert.equal(fs.existsSync(cachePath), false);
      throw new Error("Cache rename failed");
    };
    await assert.rejects(loadSource("rename.txt", source, cacheDir), /Cache rename failed/);
    assert.deepEqual(fs.readdirSync(cacheDir).sort(), ["UnicodeData.txt", "interrupted.txt"]);
    fs.promises.rename = originalRename;
    assert.equal(await loadSource("rename.txt", source, cacheDir), body.toString());
    assert.deepEqual(fs.readFileSync(path.join(cacheDir, "rename.txt")), body);

    downloaded = Buffer.from("wrong download");
    await assert.rejects(loadSource("mismatch.txt", source, cacheDir), /SHA-256 mismatch/);
    assert.equal(fs.existsSync(path.join(cacheDir, "mismatch.txt")), false);
    status = 404;
    await assert.rejects(loadSource("missing.txt", source, cacheDir), /HTTP 404/);
    error = new Error("Network unavailable");
    await assert.rejects(loadSource("missing.txt", source, cacheDir), /Network unavailable/);
    error = undefined;
    status = 200;
    aborted = true;
    await assert.rejects(loadSource("partial.txt", source, cacheDir), /Incomplete download/);
    timedOut = true;
    await assert.rejects(loadSource("timeout.txt", source, cacheDir), /Download timed out/);
  } finally {
    https.get = originalGet;
    fs.promises.writeFile = originalWriteFile;
    fs.promises.rename = originalRename;
    fs.rmSync(cacheDir, { recursive: true, force: true });
  }
}

function testGeneratedData() {
  const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
  const full = read("src/unicode-data.json");
  const compact = read("src/unicode-data.min.json");
  const descriptions = read("descriptions.json");
  assert.deepEqual(compact, { stats: full.stats, characters: full.characters });
  assert.equal(full.stats.unicodeVersion, sources.version);
  assert.equal(full.stats.glyphPartyVersion, read("package.json").version);
  assert.equal(full.stats.totalCharacters, 10868);
  assert.equal(full.characters.length, full.stats.totalCharacters);
  assert.equal(full.stats.categories, 22);
  assert.equal(full.stats.blocks, 203);

  let previous = -1;
  for (const glyph of full.characters) {
    assert.ok(glyph.decimal > previous, `Duplicate or unordered glyph: ${glyph.code}`);
    previous = glyph.decimal;
    assert.ok(glyph.decimal <= 0x10ffff && !(glyph.decimal >= 0xd800 && glyph.decimal <= 0xdfff));
    assert.equal(glyph.decimal, parseInt(glyph.code, 16));
    assert.equal(glyph.char, String.fromCodePoint(glyph.decimal));
    assert.notEqual(glyph.block, "Unknown");
    assert.ok(!glyph.name.startsWith("<"));
    assert.equal(typeof glyph.description, "string");
    assert.ok(glyph.description.trim(), `Missing description: ${glyph.code}`);
    assert.equal(glyph.description, descriptions[glyph.code]);
  }

  const { categorizedData, blockData } = groupGlyphs(full.characters);
  assert.deepEqual(full.byCategory, categorizedData);
  assert.deepEqual(full.byBlock, blockData);
  assert.equal(Object.keys(categorizedData).length, full.stats.categories);
  assert.equal(Object.keys(blockData).length, full.stats.blocks);
  const glyphs = new Map(full.characters.map((glyph) => [glyph.code, glyph]));
  for (const [code, name] of Object.entries({ "20C2": "RUFIYAA SIGN", "20C3": "UAE DIRHAM SIGN", "20C4": "OMANI RIAL SIGN", "1DB00": "LEIBNIZIAN EQUALS SIGN" })) {
    assert.equal(glyphs.get(code)?.name, name);
  }
  assert.equal(full.byBlock["Musical Symbols Supplement"].length, 42);
  assert.equal(full.byBlock["Miscellaneous Symbols and Arrows Extended"].length, 29);
  assert.deepEqual(Object.keys(descriptions).sort(), [...glyphs.keys()].sort());
}

async function main() {
  for (const test of [testUnicodeParser, testBlockParser, testSourceCache, testGeneratedData]) {
    await test();
    console.log(`PASS ${test.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
