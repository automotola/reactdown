/**
 * @copyright 2016, Andrey Popp
 */

import detab from 'detab';
import collapse from 'collapse-white-space';
import normalizeURI from 'normalize-uri';
import trimLines from 'trim-lines';
import * as babelTypes from 'babel-types';
import visit from 'unist-util-visit';

export default class Renderer {

  constructor(types = babelTypes, components = {}) {
    this.definitions = {};
    this.footnotes = [];
    this.types = types;
    this.components = components;
    this.identifiersUsed = [];
  }

  renderElement(name, props, ...children) {
    let component = this.components[name];
    if (component === undefined) {
      component = this.types.stringLiteral(name);
    }
    if (this.types.isIdentifier(component)) {
      this.identifiersUsed.push(component);
    }
    let createElement = this.types.memberExpression(
      this.types.identifier('React'),
      this.types.identifier('createElement'));
    return this.types.callExpression(
      createElement,
      [component, this.renderElementProps(props), ...children]
    );
  }

  renderElementProps(_props) {
    return this.types.nullLiteral();
  }

  renderText(value) {
    if (value === null) {
      return this.types.nullLiteral();
    } else {
      return this.types.stringLiteral(value);
    }
  }

  /**
   * Stringify all footnote definitions, if any.
   *
   * @example
   *   generateFootnotes(); // '<div class="footnotes">\n<hr>\n...'
   *
   * @return {string} - Compiled footnotes, if any.
   * @this {HTMLCompiler}
   */
  generateFootnotes() {
    let definitions = this.footnotes;
    let index = -1;
    let results = [];

    if (!definitions.length) {
      return '';
    }

    while (++index < definitions.length) {
      let def = definitions[index];

      results[index] = this.listItem({
        'type': 'listItem',
        'data': {
          'htmlAttributes': {
            'id': 'fn-' + def.identifier
          }
        },
        'children': def.children.concat({
          'type': 'link',
          'url': '#fnref-' + def.identifier,
          'data': {
            'htmlAttributes': {
              'class': 'footnote-backref'
            }
          },
          'children': [{
            'type': 'text',
            'value': '↩'
          }]
        }),
        'position': def.position
      }, {});
    }

    return this.renderElement('footnotes', null, ...results);
  }

  break(_node) {
    return this.renderElement('break');
  }

  /**
   * Stringify an unknown node.
   *
   * @example
   *   unknown({
   *     data: {
   *       htmlName: 'section'
   *     },
   *     children: [
   *       {
   *         type: 'text',
   *         value: 'foo'
   *       }
   *     ]
   *   }); // '<section>foo</section>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  unknown(node) {
    let content = 'children' in node ?
      this.all(node) :
      [this.renderText(node.value)];
    let type = node.type || 'unknown';
    return this.renderElement(type, null, ...content);
  }

  /**
   * Visit a node.
   *
   * @example
   *   var compiler = new Renderer();
   *
   *   compiler.visit({
   *     type: 'strong',
   *     children: [{
   *       type: 'text',
   *       value: 'Foo'
   *     }]
   *   });
   *   // '**Foo**'
   *
   * @param {Object} node - Node.
   * @param {Object?} [parent] - `node`s parent.
   * @return {string} - Compiled `node`.
   */
  visit(node, parent) {
    let type = node && node.type;
    let fn = this[type];

    /*
     * Fail on non-nodes.
     */

    if (!type) {
      throw new Error('Expected node `' + node + '`');
    }

    if (typeof fn !== 'function') {
      fn = this.unknown;
    }

    return fn.call(this, node, parent);
  }

  /**
   * Stringify the children of `node`.
   *
   * @example
   *   all({
   *     children: [
   *       {
   *         type: 'text',
   *         value: 'foo'
   *       }
   *     ]
   *   }); // 'foo'
   *
   * @param {Node} parent - Parent to visit.
   * @return {Array.<string>} - List of compiled nodes.
   * @this {HTMLCompiler}
   */
  all(parent) {
    let nodes = parent.children;
    let values = [];
    let index = -1;

    while (++index < nodes.length) {
      let value = this.visit(nodes[index], parent);
      if (value) {
        values.push(value);
      }
    }

    return values;
  }

  /**
   * Stringify a root object.
   *
   * @example
   *   // This will additionally include defined footnotes,
   *   // when applicable.
   *   root({
   *     children: [
   *       {
   *         type: 'paragraph',
   *         children: [
   *           {
   *             type: 'text',
   *             value: 'foo'
   *           }
   *         ]
   *       }
   *     ]
   *   }); // '<p>foo</p>\n'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  root(node) {
    visit(node, 'definition', definition => {
      this.definitions[definition.identifier.toUpperCase()] = definition;
    });

    visit(node, 'footnoteDefinition', definition => {
      this.footnotes.push(definition);
    });

    return this.renderElement('root', null, ...this.all(node));
  }

  /**
   * Stringify a block quote.
   *
   * @example
   *   blockquote({
   *     children: [
   *       {
   *         type: 'paragraph',
   *         children: [
   *           {
   *             type: 'text',
   *             value: 'foo'
   *           }
   *         ]
   *       }
   *     ]
   *   }); // '<blockquote>\n<p>foo</p>\n</blockquote>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  blockquote(node) {
    return this.renderElement('blockquote', null, ...this.all(node));
  }

  /**
   * Stringify an inline footnote.
   *
   * @example
   *   // This additionally adds a definition at the bottem
   *   // of the document.
   *   footnote({
   *     children: [
   *       {
   *         type: 'text',
   *         value: 'foo'
   *       }
   *     ]
   *   }); // '<sup id="fnref-1"><a href="#fn-1">1</a></sup>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  footnote(node) {
    let index = -1;
    let identifiers = [];

    while (++index < this.definitions.length) {
      identifiers[index] = this.definitions[index].identifier;
    }

    index = -1;
    let identifier = 1;

    while (identifiers.indexOf(String(identifier)) !== -1) {
      identifier++;
    }

    identifier = String(identifier);

    this.footnotes.push({
      'type': 'footnoteDefinition',
      'identifier': identifier,
      'children': node.children,
      'position': node.position
    });

    return this.footnoteReference({
      'type': 'footnoteReference',
      'identifier': identifier,
      'position': node.position
    });
  }

  /**
   * Stringify a list.
   *
   * @example
   *   list({
   *     ordered: true
   *     loose: false
   *     children: [
   *       {
   *         type: 'listItem',
   *         children: [
   *           {
   *             type: 'paragraph',
   *             children: [
   *               {
   *                 type: 'text',
   *                 value: 'foo'
   *               }
   *             ]
   *           }
   *         ]
   *       }
   *     ]
   *   }); // '<ol>\n<li>foo</li>\n</ol>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  list(node) {
    let name = node.ordered ? 'ordered-list' : 'unordered-list';
    return this.renderElement(
      name,
      {start: node.start !== 1 ? node.start : null},
      ...this.all(node)
    );
  }

  /**
   * Stringify a list-item.
   *
   * @example
   *   listItem({
   *     children: [
   *       {
   *         type: 'paragraph',
   *         children: [
   *           {
   *             type: 'text',
   *             value: 'foo'
   *           }
   *         ]
   *       }
   *     ]
   *   }, {
   *     loose: false
   *   }); // '<li>foo</li>'
   *
   * @param {Node} node - Node to compile.
   * @param {Node} parent - Parent of `node`.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  listItem(node, parent) {
    let single = !parent.loose &&
      node.children.length === 1 &&
      node.children[0].children;
    return this.renderElement(
      'list-item',
      null,
      ...this.all(single ? node.children[0] : node)
    );
  }

  /**
   * Stringify a heading.
   *
   * @example
   *   heading({
   *     depth: 3,
   *     children: [
   *       {
   *         type: 'text',
   *         value: 'foo'
   *       }
   *     ]
   *   }); // '<h3>foo</h3>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  heading(node) {
    return this.renderElement('heading', {level: node.depth}, ...this.all(node));
  }

  /**
   * Stringify a paragraph.
   *
   * @example
   *   paragraph({
   *     children: [
   *       {
   *         type: 'text',
   *         value: 'foo'
   *       }
   *     ]
   *   }); // 'foo'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  paragraph(node) {
    let children = this.all(node);
    return this.renderElement('paragraph', null, ...children);
  }

  /**
   * Stringify a code block.
   *
   * @example
   *   code({
   *     value: 'foo &amp; bar;'
   *   }); // '<pre><code>foo &amp;amp; bar\n</code></pre>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  code(node) {
    let value = node.value ? detab(node.value + '\n') : '';
    value = this.encode(value);
    value = this.renderText(value);
    return this.renderElement('code', null, value);
  }

  /**
   * Stringify a table.
   *
   * @example
   *   table({
   *     children: [
   *       {
   *         type: 'tableRow',
   *         ...
   *       }
   *     ]
   *   }); // '<table><thead>...'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  table(node) {
    let rows = node.children;
    let index = rows.length;
    let align = node.align;
    let alignLength = align.length;
    let result = [];

    while (index--) {
      let pos = alignLength;
      let row = rows[index].children;
      let out = [];
      let name = index === 0 ? 'table-header-cell' : 'table-cell';

      while (pos--) {
        let cell = row[pos];
        out[pos] = this.renderElement(
          name,
          {align: align[pos]},
          ...(cell ? this.all(cell) : [])
        );
      }

      result[index] = this.renderElement('table-row', null, ...out);
    }

    return this.renderElement('table', null,
      this.renderElement('table-head', null, result[0]),
      this.renderElement('table-body', null, ...result.slice(1))
    );
  }

  /**
   * Stringify a literal HTML.
   *
   * @example
   *   html({
   *     value: '<i>italic</i>'
   *   }); // '<i>italic</i>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  html(node) {
    return this.renderElement('html', {html: node.value});
  }

  /**
   * Stringify a horizontal rule.
   *
   * @example
   *   rule(); // '<hr>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  rule(_node) {
    return this.renderElement('rule');
  }

  /**
   * Stringify inline code.
   *
   * @example
   *   inlineCode({
   *     value: 'foo &amp; bar;'
   *   }); // '<code>foo &amp;amp; bar;</code>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  inlineCode(node) {
    let value = node.value;
    value = this.encode(value);
    value = collapse(value);
    value = this.renderText(value);
    return this.renderElement('inline-code', null, value);
  }

  /**
   * Stringify strongly emphasised content.
   *
   * @example
   *   strong({
   *     children: [
   *       {
   *         type: 'text',
   *         value: 'foo'
   *       }
   *     ]
   *   }); // '<strong>foo</strong>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  strong(node) {
    return this.renderElement('strong', null, ...this.all(node));
  }

  /**
   * Stringify emphasised content.
   *
   * @example
   *   emphasis({
   *     children: [
   *       {
   *         type: 'text',
   *         value: 'foo'
   *       }
   *     ]
   *   }); // '<em>foo</em>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  emphasis(node) {
    return this.renderElement('emphasis', null, ...this.all(node));
  }

  /**
   * Stringify an inline break.
   *
   * @example
   *   hardBreak(); // '<br>\n'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  hardBreak(_node) {
    return this.renderElement('break');
  }

  thematicBreak(_node) {
    return this.renderElement('break');
  }

  /**
   * Stringify a link.
   *
   * @example
   *   link({
   *     url: 'http://example.com',
   *     children: [
   *       {
   *         type: 'text',
   *         value: 'foo'
   *       }
   *     ]
   *   }); // '<a href="http://example.com">foo</a>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  link(node) {
    return this.renderElement('link', {
      href: normalizeURI(node.url || ''),
      title: node.title
    }, ...this.all(node));
  }

  /**
   * Stringify a reference to a footnote.
   *
   * @example
   *   // If a definition was added previously:
   *   footnoteReference({
   *     identifier: 'foo'
   *   });
   *   // <sup id="fnref-foo">
   *   //   <a class="footnote-ref" href="#fn-foo">foo</a>
   *   // </sup>
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  footnoteReference(node) {
    let identifier = node.identifier;

    return this.renderElement('sup', {id: 'fnref-' + identifier},
      this.renderElement('a', {
        href: '#fn-' + identifier,
        className: 'footnote-ref'
      }, identifier));
  }

  /**
   * Stringify a reference to a link.
   *
   * @example
   *   // If a definition was added previously:
   *   linkReference({
   *     identifier: 'foo'
   *   }); // '<a href="http://example.com/fav.ico"></a>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  linkReference(node) {
    let def = this.definitions[node.identifier.toUpperCase()] || {};

    return this.renderElement('a', {
      href: normalizeURI(def.url || ''),
      title: def.title
    }, ...this.all(node));
  }

  /**
   * Stringify a reference to an image.
   *
   * @example
   *   // If a definition was added previously:
   *   imageReference({
   *     identifier: 'foo'
   *   }); // '<img src="http://example.com/fav.ico" alt="">'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  imageReference(node) {
    let def = this.definitions[node.identifier.toUpperCase()] || {};

    return this.renderElement('image', {
      src: normalizeURI(def.url || ''),
      alt: node.alt || '',
      title: def.title
    });
  }

  /**
   * Stringify an image.
   *
   * @example
   *   image({
   *     url: 'http://example.com/fav.ico'
   *   }); // '<img src="http://example.com/fav.ico" alt="">'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  image(node) {
    return this.renderElement('image', {
      src: normalizeURI(node.url || ''),
      alt: node.alt || '',
      title: node.title
    });
  }

  /**
   * Stringify a deletion.
   *
   * @example
   *   strikethrough({
   *     children: [
   *       {
   *         type: 'text',
   *         value: 'foo'
   *       }
   *     ]
   *   }); // '<del>foo</del>'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  strikethrough(node) {
    return this.renderElement('strikethrough', null, ...this.all(node));
  }

  delete(node) {
    return this.renderElement('strikethrough', null, ...this.all(node));
  }

  /**
   * Stringify text.
   *
   * @example
   *   text({value: '&'}); // '&amp;'
   *
   *   text({value: 'foo'}); // 'foo'
   *
   * @param {Node} node - Node to compile.
   * @return {string} - Compiled node.
   * @this {HTMLCompiler}
   */
  text(node) {
    let value = trimLines(this.encode(node.value));
    return this.renderText(value);
  }

  /*
   * Ignored nodes.
   */

  yaml() {
    return null;
  }

  definition() {
    return null;
  }

  footnoteDefinition() {
    return null;
  }

  encode(value) {
    return value;
  }

  render(node) {
    return this.visit(node);
  }

}
