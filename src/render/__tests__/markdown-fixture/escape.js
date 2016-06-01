import React from "react";
import { DocumentContext, directives as defaultDirectives } from "reactdown/runtime";
import { components as defaultComponents } from "reactdown/runtime";
let components = defaultComponents;
export default function Document({
  className,
  style
}) {
  return React.createElement(DocumentContext, {
    context: {
      meta
    }
  }, React.cloneElement(React.createElement(components.Root, null, React.createElement(components.Paragraph, null, "These should all get escaped:"), React.createElement(components.Paragraph, null, "Backslash: ", "\\"), React.createElement(components.Paragraph, null, "Backtick: ", "`"), React.createElement(components.Paragraph, null, "Asterisk: ", "*"), React.createElement(components.Paragraph, null, "Underscore: ", "_"), React.createElement(components.Paragraph, null, "Left brace: ", "{"), React.createElement(components.Paragraph, null, "Right brace: ", "}"), React.createElement(components.Paragraph, null, "Left bracket: ", "["), React.createElement(components.Paragraph, null, "Right bracket: ", "]"), React.createElement(components.Paragraph, null, "Left paren: ", "("), React.createElement(components.Paragraph, null, "Right paren: ", ")"), React.createElement(components.Paragraph, null, "Greater-than: ", ">"), React.createElement(components.Paragraph, null, "Hash: ", "#"), React.createElement(components.Paragraph, null, "Period: ", "."), React.createElement(components.Paragraph, null, "Bang: ", "!"), React.createElement(components.Paragraph, null, "Plus: ", "+"), React.createElement(components.Paragraph, null, "Minus: ", "-"), React.createElement(components.Paragraph, null, React.createElement(components.Strong, null, "GFM:")), React.createElement(components.Paragraph, null, "Pipe: ", "|"), React.createElement(components.Paragraph, null, "Tilde: ", "~"), React.createElement(components.Paragraph, null, React.createElement(components.Strong, null, "Commonmark:")), React.createElement(components.Paragraph, null, "Quote: \\\""), React.createElement(components.Paragraph, null, "Dollar: \\$"), React.createElement(components.Paragraph, null, "Percentage: \\%"), React.createElement(components.Paragraph, null, "Ampersand: \\&"), React.createElement(components.Paragraph, null, "Single quote: \\'"), React.createElement(components.Paragraph, null, "Comma: \\,"), React.createElement(components.Paragraph, null, "Forward slash: \\/"), React.createElement(components.Paragraph, null, "Colon: \\:"), React.createElement(components.Paragraph, null, "Semicolon: \\;"), React.createElement(components.Paragraph, null, "Less-than: \\<"), React.createElement(components.Paragraph, null, "Equals: \\="), React.createElement(components.Paragraph, null, "Question mark: \\?"), React.createElement(components.Paragraph, null, "At-sign: \\@"), React.createElement(components.Paragraph, null, "Caret: \\^"), React.createElement(components.Paragraph, null, "New line: \\\nonly works in paragraphs."), React.createElement(components.Paragraph, null, "Two spaces:", React.createElement(components.Break, null), "only works in paragraphs.")), {
    className,
    style
  }));
}
export let meta = {
  data: {},
  model: {
    "toc": [],
    "title": null
  }
};
