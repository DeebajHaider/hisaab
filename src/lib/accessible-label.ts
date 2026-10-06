import * as React from "react";

/** The text of a visually hidden (`sr-only`) child, e.g. the "Edit Rent" in an
 *  icon-only button. Lets icon buttons get a tooltip without repeating the label. */
export function srOnlyText(children: React.ReactNode): string | undefined {
  let found: string | undefined;

  React.Children.forEach(children, (child) => {
    if (found || !React.isValidElement<{ className?: string; children?: React.ReactNode }>(child)) {
      return;
    }
    if (child.props.className?.split(/\s+/).includes("sr-only")) {
      const text = textOf(child.props.children).trim();
      if (text) found = text;
    }
  });

  return found;
}

function textOf(node: React.ReactNode): string {
  let out = "";
  React.Children.forEach(node, (child) => {
    if (typeof child === "string" || typeof child === "number") out += String(child);
  });
  return out;
}
