import { copyFileSync, statSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const src = "C:\\Users\\Ankur Kushwaha\\.gemini\\antigravity-ide\\brain\\c7d67db4-29a1-44e0-a057-49d8a8726d24\\rag_diagram_1780406302951.png";
const dest = __dirname + "\\assets\\rag-architecture.png";

if (!existsSync(__dirname + "\\assets")) {
  mkdirSync(__dirname + "\\assets");
}

try {
  copyFileSync(src, dest);
  const { size } = statSync(dest);
  console.log(`✅ Image copied successfully! (${(size / 1024).toFixed(1)} KB)`);
  console.log(`📁 Saved to: ${dest}`);
  
  // Self-delete this script
  unlinkSync(__dirname + "\\copy-image.js");
  console.log("🧹 Cleanup: copy-image.js deleted.");
} catch (err) {
  console.error("❌ Error:", err.message);
}
