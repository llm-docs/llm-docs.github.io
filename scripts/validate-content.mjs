import fs from "fs";
import path from "path";
import matter from "gray-matter";

const root = process.cwd();
const collections = [
  { name: "docs", required: ["title", "description"] },
  { name: "news", required: ["title", "description", "date"] },
  { name: "models", required: ["name", "description", "provider"] },
  { name: "agents", required: ["description", "category"], anyOf: [["name", "title"]] },
];

let hasError = false;

for (const collection of collections) {
  const directory = path.join(root, "content", collection.name);
  const files = getMarkdownFiles(directory);

  for (const file of files) {
    const { data } = matter(fs.readFileSync(file, "utf8"));
    const rel = path.relative(root, file);
    const slug = path.relative(directory, file).replace(/\.md$/, "");

    if (slug !== slug.toLowerCase()) {
      console.error(`[content] ${rel}: slug must be lowercase`);
      hasError = true;
    }

    if (!/^[a-z0-9/-]+$/.test(slug.replace(/-/g, "a"))) {
      console.error(`[content] ${rel}: slug should use lowercase letters, numbers, slashes, and hyphens only`);
      hasError = true;
    }

    for (const field of collection.required) {
      if (typeof data[field] !== "string" || !data[field].trim()) {
        console.error(`[content] ${rel}: missing required frontmatter field "${field}"`);
        hasError = true;
      }
    }

    for (const group of collection.anyOf || []) {
      const hasOne = group.some((field) => typeof data[field] === "string" && data[field].trim());
      if (!hasOne) {
        console.error(`[content] ${rel}: missing one of required frontmatter fields ${group.join(" / ")}`);
        hasError = true;
      }
    }
  }
}

if (hasError) {
  process.exitCode = 1;
} else {
  console.log("Content validation passed.");
}

function getMarkdownFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return getMarkdownFiles(fullPath);
    }

    return entry.name.endsWith(".md") ? [fullPath] : [];
  });
}
