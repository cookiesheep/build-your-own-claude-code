/**
 * Convert Python markdown `!!! type "title"` admonition syntax
 * to remark-directive `:::type[title]` container syntax.
 *
 * !!! tip "Hello"
 *     Body text
 *     More body
 *
 * →
 *
 * :::tip[Hello]
 * Body text
 * More body
 * :::
 */

const ADMONITION_RE = /^!!!\s+(\w+)(?:\s+"(.*)")?\s*$/;

export function preprocessAdmonitions(markdown: string): string {
  const lines = markdown.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    const match = line.match(ADMONITION_RE);

    if (!match) {
      result.push(line);
      i++;
      continue;
    }

    const [, type, title] = match;
    result.push(title ? `:::${type}[${title}]` : `:::${type}`);
    i++;

    // Collect body: 4-space indented lines, with blank lines between them
    let foundBody = false;
    while (i < lines.length) {
      if (lines[i]!.startsWith("    ")) {
        result.push(lines[i]!.slice(4));
        foundBody = true;
        i++;
      } else if (lines[i]!.trim() === "" && foundBody) {
        // Blank line within body: keep only if next line is indented
        if (i + 1 < lines.length && lines[i + 1]!.startsWith("    ")) {
          result.push("");
          i++;
        } else {
          break;
        }
      } else if (lines[i]!.trim() === "" && !foundBody) {
        // Blank line before body starts — skip
        i++;
      } else {
        break;
      }
    }

    result.push(":::");
  }

  return result.join("\n");
}
