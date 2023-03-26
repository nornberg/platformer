"use strict";

let SCR_W;
let SCR_H;
export const SPRITE_SIZE = 56;

const RenderableTypes = {
  SPRITE: 1,
  GEOMETRY: 2,
  TEXT: 3,
};

let canvasScreen;
let offscreenCanvas;
let ctxScreen;
let ctx;

let renderableId = 0;
const renderables = [];

export function newRenderableSprite(posX, posY, sizeX, sizeY, anchorX, anchorY, flipX, flipY, spriteSheet, index) {
  sizeX = sizeY = SPRITE_SIZE;
  const r = { id: renderableId++, visible: true, type: RenderableTypes.SPRITE, posX, posY, sizeX, sizeY, anchorX, anchorY, flipX, flipY, spriteSheet, index };
  renderables.push(r);
  return r;
}

export function newRenderableGeometry(posX, posY, sizeX, sizeY, flipX, flipY, form, style, filled) {
  const r = { id: renderableId++, visible: true, type: RenderableTypes.GEOMETRY, posX, posY, sizeX, sizeY, flipX, flipY, form, style, filled };
  renderables.push(r);
  return r;
}

export function newRenderableText(posX, posY, text, align, style, font) {
  const r = { id: renderableId++, visible: true, type: RenderableTypes.TEXT, posX, posY, text, align, style, font };
  renderables.push(r);
  return r;
}

export function removeRenderable(renderable) {
  if (renderable) {
    const i = renderables.indexOf(renderable);
    renderables.splice(i, 1);
  }
}

export async function init(canvasElemId, width, height, aux) {
  SCR_W = width;
  SCR_H = height;

  canvasScreen = document.getElementById(canvasElemId);
  ctxScreen = canvasScreen.getContext("2d");

  offscreenCanvas = new OffscreenCanvas(SCR_W, SCR_H);
  ctx = offscreenCanvas.getContext("2d");

  const kx = canvasScreen.width / offscreenCanvas.width;
  const ky = canvasScreen.height / offscreenCanvas.height;
  ctxScreen.scale(kx, ky);
  ctxScreen.imageSmoothingEnabled = false;
  ctxScreen.mozImageSmoothingEnabled = false;
  ctxScreen.webkitImageSmoothingEnabled = false;
  ctxScreen.msImageSmoothingEnabled = false;
}

export function render(time) {
  clearScreen();

  renderables.forEach((r) => {
    if (r.visible) {
      switch (r.type) {
        case RenderableTypes.SPRITE:
          renderSprite(r);
          break;
        case RenderableTypes.GEOMETRY:
          renderGeometry(r);
          break;
        case RenderableTypes.TEXT:
          renderText(r);
          break;
      }
    }
  });

  /*
    ctx.fillStyle = "rgb(250, 250, 250)";
    ctx.font = "16px sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText((time / 1000).toFixed(1) + " s", 0, 0);
    ctx.textAlign = "right";
    ctx.fillText(frameControl.fps + " fps", 320, 0);
    
    ctx.textAlign = "center";
    ctx.fillStyle = input_button_fire ? "rgb(255, 28, 28)" : "rgb(250, 250, 250)";
    ctx.fillText("fire", 160 + 20, 0);
    ctx.fillStyle = input_button_jump ? "rgb(255, 28, 28)" : "rgb(250, 250, 250)";
    ctx.fillText("jump", 160 - 20, 0);
    */

  ctxScreen.drawImage(offscreenCanvas.transferToImageBitmap(), 0, 0);
}

export function clearScreen() {
  ctx.fillStyle = "rgb(50, 50, 50)";
  ctx.fillRect(0, 0, 320, 240);
}

export function renderSprite(r) {
  const SX = SPRITE_SIZE;
  const SY = SPRITE_SIZE;
  const spritesInARow = r.spriteSheet.width / SPRITE_SIZE;
  const iy = Math.trunc(r.index / spritesInARow);
  const ix = r.index % spritesInARow;
  const flipX = r.flipX ? -1 : 1;
  const flipY = r.flipY ? -1 : 1;
  ctx.save();
  ctx.translate(r.posX - r.anchorX * SX * flipX, r.posY - r.anchorY * SY * flipY);
  ctx.scale(flipX, flipY);
  ctx.drawImage(r.spriteSheet, ix * SX, iy * SY, SX, SY, 0, 0, SX, SY);
  ctx.restore();
}

export function renderGeometry(r) {
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

export function renderText(r) {
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
