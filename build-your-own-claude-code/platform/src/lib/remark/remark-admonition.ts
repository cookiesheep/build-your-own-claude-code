import { visit } from "unist-util-visit";
import type { Root } from "mdast";

const ADMONITION_TYPES = new Set(["tip", "warning", "danger", "success", "note", "info"]);

/** Extract text content from an mdast node tree */
function toString(node: any): string {
  if (node.type === "text") return node.value || "";
  if (node.children) return node.children.map(toString).join("");
  return "";
}

/**
 * remark plugin: transform containerDirective nodes (from remark-directive)
 * that match known admonition types into `<admonition>` elements.
 */
export function remarkAdmonition() {
  return (tree: Root) => {
    visit(tree, (node: any) => {
      if (node.type !== "containerDirective") return;
      if (!ADMONITION_TYPES.has(node.name)) return;

      // Extract label (the [title] part) — remark-directive stores it as
      // a child paragraph with data.directiveLabel = true
      let title = "";
      const labelIndex = node.children.findIndex(
        (child: any) => child.data?.directiveLabel,
      );
      if (labelIndex !== -1) {
        title = toString(node.children[labelIndex]);
        node.children.splice(labelIndex, 1);
      }

      // Tell remark-rehype to render as <admonition> with props
      node.data = node.data || {};
      node.data.hName = "admonition";
      node.data.hProperties = {
        admonitionType: node.name,
        title,
      };
    });
  };
}
