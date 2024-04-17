"use strict";

import * as mAudio from "./module_audio.js";
import * as mRenderer from "./module_renderer.js";
import * as mPhysics from "./module_physics.js";
import * as mInput from "./module_input.js";
import * as mAnim from "./module_animation.js";

export * as mAudio from "./module_audio.js";
export * as mRenderer from "./module_renderer.js";
export * as mPhysics from "./module_physics.js";
export * as mInput from "./module_input.js";
export * as mAnim from "./module_animation.js";

let endTime;
let requestAnimationFrameId;
let debugLevel = 1;

const DEBUG_STYLE_RELEASED = "gray";
const DEBUG_STYLE_PRESSED = "yellow";
const DEBUG_STYLE_HOLD = "darkgray";
const DEBUG_STYLE_AXIS_POS = "lightgreen";
const DEBUG_STYLE_AXIS_NEG = "red";
const DEBUG_STYLE_INFO = "white";

const frameControl = {
  startTime: undefined,
  fps: 0,
  frameCount: 0,
};

const inputControl = {
  xAxisL: 0,
  yAxisL: 0,
  xAxisR: 0,
  yAxisR: 0,
  jump: 0,
  shot: 0,
  extra1: 0,
  mappings: [],
};

let game = null;

export async function main(gameObj) {
  game = gameObj;
  await load();
  await setup();
  await start();
}

async function load() {
  console.log("LOAD");

  await game.load();
}

async function setup() {
  console.log("SETUP");

  await mRenderer.init("screen", 320, 240);
  await mAudio.init();
  await mPhysics.init();
  await mInput.init();
  await mAnim.init();

  await game.setup();

  frameControl.textSec = mRenderer.newRenderableText(0, 0, "sec", "left", DEBUG_STYLE_INFO, "11px sans-serif", mRenderer.DefaultLayers.GUI);
  frameControl.textFps = mRenderer.newRenderableText(320, 0, "fps", "right", DEBUG_STYLE_INFO, "11px sans-serif", mRenderer.DefaultLayers.GUI);
  frameControl.textViewport = mRenderer.newRenderableText(0, 10, "0,0", "left", DEBUG_STYLE_INFO, "11px sans-serif", mRenderer.DefaultLayers.GUI);
  inputControl.extra1 = mRenderer.newRenderableText(90, 0, "LB", "left", DEBUG_STYLE_RELEASED, "11px sans-serif", mRenderer.DefaultLayers.GUI);
  inputControl.jump = mRenderer.newRenderableText(110, 0, "X", "left", DEBUG_STYLE_RELEASED, "11px sans-serif", mRenderer.DefaultLayers.GUI);
  inputControl.shot = mRenderer.newRenderableText(120, 0, "A", "left", DEBUG_STYLE_RELEASED, "11px sans-serif", mRenderer.DefaultLayers.GUI);
  inputControl.xAxisL = mRenderer.newRenderableText(130, 0, "H", "left", DEBUG_STYLE_RELEASED, "11px sans-serif", mRenderer.DefaultLayers.GUI);
  inputControl.yAxisL = mRenderer.newRenderableText(140, 0, "V", "left", DEBUG_STYLE_RELEASED, "11px sans-serif", mRenderer.DefaultLayers.GUI);
  inputControl.xAxisR = mRenderer.newRenderableText(160, 0, "HR", "left", DEBUG_STYLE_RELEASED, "11px sans-serif", mRenderer.DefaultLayers.GUI);
  inputControl.yAxisR = mRenderer.newRenderableText(180, 0, "VR", "left", DEBUG_STYLE_RELEASED, "11px sans-serif", mRenderer.DefaultLayers.GUI);

  inputControl.renderables = [];
  const screen = mRenderer.getScreenInfo();
  const size = 10;
  let x = screen.width - size - 1;
  let y = screen.height / 2 - (Object.keys(mInput.mappings).length * size) / 2 - size;
  for (const name in mInput.mappings) {
    const m = mInput.mappings[name];
    if (m.isButton) {
      inputControl.renderables[name] = mRenderer.newRenderableGeometry(
        x,
        y,
        size,
        size,
        false,
        false,
        "rect",
        DEBUG_STYLE_RELEASED,
        m.state === mInput.PRESSED,
        mRenderer.DefaultLayers.GUI
      );
    } else {
      inputControl.renderables[name] = mRenderer.newRenderableGeometry(
        x,
        y,
        size / 2 + (m.value * size) / 2,
        size,
        false,
        false,
        "rect",
        DEBUG_STYLE_RELEASED,
        true,
        mRenderer.DefaultLayers.GUI
      );
    }
    y += size + 1;
  }
}

async function start() {
  console.log("START");
  requestAnimationFrameId = requestAnimationFrame(frame);
}

async function cleanup() {
  await game.cleanup();
  console.log("CLEANED UP - reload file");
}

async function frame(time) {
  const currTime = updateDebugInfo(time);
  if (currTime - endTime > 3000) {
    console.log("END");
    cancelAnimationFrame(requestAnimationFrameId);
    cleanup();
  } else {
    requestAnimationFrameId = requestAnimationFrame(frame);
    mInput.update(time);
    if (!(await game.update(time, debugLevel))) {
      if (!endTime) endTime = currTime;
    }
    mAnim.update(time);
    mRenderer.render(currTime);
    mAudio.play(currTime);
  }
}

function selectDebugStyle(key, axis) {
  if (axis) {
    return mInput.getAxis(key) === 0 ? DEBUG_STYLE_RELEASED : mInput.getAxis(key) > 0 ? DEBUG_STYLE_AXIS_POS : DEBUG_STYLE_AXIS_NEG;
  } else {
    return mInput.isJustPressed(key) ? DEBUG_STYLE_PRESSED : mInput.isPressed(key) ? DEBUG_STYLE_HOLD : DEBUG_STYLE_RELEASED;
  }
}

function updateDebugInfo(time) {
  if (!frameControl.startTime) {
    frameControl.startTime = time;
  }
  const currTime = time - frameControl.startTime;

  if (mInput.isJustPressed("LB")) {
    debugLevel = 1 - debugLevel;
  }

  frameControl.frameCount++;
  if (Math.trunc(currTime) % 1000 === 0) {
    frameControl.fps = frameControl.frameCount;
    frameControl.frameCount = 0;
    frameControl.textFps.text = `${frameControl.fps} fps`;
  }
  frameControl.textSec.text = `${(currTime / 1000).toFixed(1)} s`;
  frameControl.textViewport.text = `${mRenderer.viewport.x},${mRenderer.viewport.y}`;
  inputControl.extra1.style = selectDebugStyle("LB");
  inputControl.jump.style = selectDebugStyle("A");
  inputControl.shot.style = selectDebugStyle("X");
  inputControl.xAxisL.style = selectDebugStyle("H", true);
  inputControl.yAxisL.style = selectDebugStyle("V", true);
  inputControl.xAxisR.style = selectDebugStyle("HR", true);
  inputControl.yAxisR.style = selectDebugStyle("VR", true);

  frameControl.textSec.visible = debugLevel === 1;
  frameControl.textFps.visible = debugLevel === 1;
  frameControl.textViewport.visible = debugLevel === 1;
  inputControl.extra1.visible = debugLevel === 1;
  inputControl.jump.visible = debugLevel === 1;
  inputControl.shot.visible = debugLevel === 1;
  inputControl.xAxisL.visible = debugLevel === 1;
  inputControl.yAxisL.visible = debugLevel === 1;
  inputControl.xAxisR.visible = debugLevel === 1;
  inputControl.yAxisR.visible = debugLevel === 1;

  const size = 10;
  for (const name in inputControl.renderables) {
    const r = inputControl.renderables[name];
    const m = mInput.mappings[name];
    r.visible = debugLevel === 1;
    if (m.isButton) {
      r.style = mInput.isJustPressed(name) ? DEBUG_STYLE_PRESSED : mInput.isPressed(name) ? DEBUG_STYLE_HOLD : DEBUG_STYLE_RELEASED;
      r.filled = mInput.isPressed(name);
    } else {
      r.style = m.value !== 0 ? DEBUG_STYLE_PRESSED : DEBUG_STYLE_RELEASED;
      r.sizeX = size / 2 + (m.value * size) / 2;
      if (r.sizeX === 0) {
        r.sizeX = 1;
      }
    }
  }

  return currTime;
}
