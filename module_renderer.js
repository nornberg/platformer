"use strict";

let SCR_W;
let SCR_H;
export const SPRITE_SIZE = 56;

export const DefaultLayers = {
  ACTION: "action",
  GUI: "gui",
};

const RenderableTypes = {
  SPRITE: 1,
  GEOMETRY: 2,
  TEXT: 3,
};

let canvasScreen;
let ctxScreen;
let renderableId = 0;
const layers = [];
export const viewport = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};

export function getScreenInfo() {
  return { width: SCR_W, height: SCR_H };
}

export function newRenderableSprite(posX, posY, sizeX, sizeY, anchorX, anchorY, flipX, flipY, spriteSheet, index, layerId = DefaultLayers.ACTION) {
  const layer = layers.find((l) => l.id === layerId);
  if (!layer) {
    return null;
  }
  if (sizeX < SPRITE_SIZE && sizeY < SPRITE_SIZE) {
    sizeX = sizeY = SPRITE_SIZE;
  }
  const r = { id: renderableId++, visible: true, type: RenderableTypes.SPRITE, posX, posY, sizeX, sizeY, anchorX, anchorY, flipX, flipY, spriteSheet, index, layerId };
  layer.renderables.push(r);
  return r;
}

export function newRenderableGeometry(posX, posY, sizeX, sizeY, flipX, flipY, form, style, filled, layerId = DefaultLayers.ACTION) {
  const layer = layers.find((l) => l.id === layerId);
  if (!layer) {
    return null;
  }
  const r = { id: renderableId++, visible: true, type: RenderableTypes.GEOMETRY, posX, posY, sizeX, sizeY, flipX, flipY, form, style, filled, layerId };
  layer.renderables.push(r);
  return r;
}

export function newRenderableText(posX, posY, text, align, style, font, layerId = DefaultLayers.ACTION) {
  const layer = layers.find((l) => l.id === layerId);
  if (!layer) {
    return null;
  }
  const r = { id: renderableId++, visible: true, type: RenderableTypes.TEXT, posX, posY, text, align, style, font, layerId };
  layer.renderables.push(r);
  return r;
}

export function removeRenderable(renderable) {
  if (renderable) {
    const layer = layers.find((l) => l.id === renderable.layerId);
    const i = layer.renderables.indexOf(renderable);
    layer.renderables.splice(i, 1);
  }
}

export async function init(canvasElemId, width, height, aux) {
  SCR_W = width;
  SCR_H = height;

  canvasScreen = document.getElementById(canvasElemId);
  ctxScreen = canvasScreen.getContext("2d");
  ctxScreen.imageSmoothingEnabled = false;
  ctxScreen.mozImageSmoothingEnabled = false;
  ctxScreen.webkitImageSmoothingEnabled = false;
  ctxScreen.msImageSmoothingEnabled = false;

  setLayer(DefaultLayers.ACTION, width, height, 0, 0);
  setLayer(DefaultLayers.GUI, width, height, -99, 0);
  viewport.width = width;
  viewport.height = height;
  viewport.scaleX = canvasScreen.width / width;
  viewport.scaleY = canvasScreen.height / height;
}

export function setLayer(id, width, height, zIndex, distance) {
  let layer = layers.find((l) => l.id === id);
  if (!layer) {
    layer = {};
    layers.push(layer);
  }
  layer.canvas = new OffscreenCanvas(width, height);
  layer.ctx = layer.canvas.getContext("2d");
  layer.id = id;
  layer.distance = distance;
  layer.zIndex = zIndex;
  layer.renderables = [];
  layers.sort((l1, l2) => l2.zIndex - l1.zIndex);
}

export function render(time) {
  const actionLayer = layers.find((l) => (l.id = DefaultLayers.ACTION));
  if (viewport.x < 0) viewport.x = 0;
  if (viewport.x > actionLayer.canvas.width - viewport.width) viewport.x = actionLayer.canvas.width - viewport.width;
  if (viewport.y > 0) viewport.y = 0;
  if (viewport.y < -actionLayer.canvas.height + viewport.height) viewport.y = -actionLayer.canvas.height + viewport.height;
  ctxScreen.fillStyle = "rgb(150, 50, 150)";
  ctxScreen.fillRect(0, 0, SCR_W, SCR_H);
  layers.forEach((layer) => {
    layer.ctx.fillStyle = "rgb(50, 50, 50)";
    //layer.ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.renderables.forEach((r) => {
      if (r.visible) {
        switch (r.type) {
          case RenderableTypes.SPRITE:
            renderSprite(r, layer.ctx);
            break;
          case RenderableTypes.GEOMETRY:
            renderGeometry(r, layer.ctx);
            break;
          case RenderableTypes.TEXT:
            renderText(r, layer.ctx);
            break;
        }
      }
    });
    ctxScreen.setTransform(viewport.scaleX, 0, 0, viewport.scaleY, -viewport.x * layer.distance * viewport.scaleX, viewport.y * layer.distance * viewport.scaleY);
    ctxScreen.drawImage(layer.canvas.transferToImageBitmap(), 0, 0);
  });
}

export function renderSprite(r, ctx) {
  const SX = r.sizeX;
  const SY = r.sizeY;
  const spritesInARow = r.spriteSheet.width / SPRITE_SIZE;
  const iy = Math.trunc(r.index / spritesInARow);
  const ix = r.index % spritesInARow;
  const flipX = r.flipX ? -1 : 1;
  const flipY = r.flipY ? -1 : 1;
  ctx.save();
  ctx.translate(r.posX - r.anchorX * SX * flipX, r.posY - r.anchorY * SY * flipY);
  ctx.scale(flipX, flipY);
  ctx.drawImage(r.spriteSheet, ix * SX, iy * SY, SX, SY, 0, 0, SX, SY);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 1, 1);
  ctx.restore();
}

export function renderGeometry(r, ctx) {
  switch (r.form) {
    case "rect":
      if (r.filled) {
        ctx.fillStyle = r.style;
        ctx.fillRect(r.posX, r.posY, r.sizeX, r.sizeY);
      } else {
        ctx.strokeStyle = r.style;
        ctx.strokeRect(r.posX, r.posY, r.sizeX, r.sizeY);
      }
      break;
  }
}

export function renderText(r, ctx) {
  ctx.fillStyle = r.style;
  ctx.font = r.font;
  ctx.textAlign = r.align;
  ctx.textBaseline = "top";
  ctx.fillText(r.text, r.posX, r.posY);
}

export async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.addEventListener("load", () => {
      resolve(img);
    });
    img.addEventListener("error", () => {
      reject();
    });
  });
}
