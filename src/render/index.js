/**
 * @copyright 2016, Andrey Popp <8mayday@gmail.com>
 */

import * as DEFAULT_TYPES from 'babel-types';
import Renderer from './Renderer';

const DEFAULT_RENDER = {};

export default function render(node, options = {}) {
  let {
    types = DEFAULT_TYPES,
    render = DEFAULT_RENDER,
  } = options;
  let renderer = new Renderer(types, render);
  renderer.render(node);
  return {
    expression: renderer.expression,
    identifiersUsed: renderer.identifiersUsed,
  };
}
