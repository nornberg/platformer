"use strict";

import * as mAudio from "./module_audio.js";
import * as mRenderer from "./module_renderer.js";
import * as mPhysics from "./module_physics.js";
import * as mInput from "./module_input.js";
import * as mAnim from "./module_animation.js";
import * as mLogic from "./gameLogic.js";
import { AnimationIds, States, AudioIds } from "./constants.js";

document.getElementById("preloadingMessage").style.display = "none";
document.getElementById("startMessage").style.display = "unset";
console.log("WAIT USER ACTION");
onkeydown = onclick = () => {
  onkeydown = onclick = undefined;
  main();
};

let fileSpriteSheet;
let fileAudioSheet;
let fileTrackGuitar;
let fileTrackDrums;

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
};

const platforms = [
  { start: 0, end: 320, height: 235 },
  { start: 0, end: 150, height: 180 },
  { start: 250, end: 320, height: 120 },
];

async function main() {
  document.getElementById("startMessage").style.display = "none";
  document.getElementById("loadingMessage").style.display = "unset";

  console.log("LOAD");
  await load();

  console.log("SETUP");
  await setup();

  document.getElementById("loadingMessage").style.display = "none";
  document.getElementById("screen").style.display = "unset";
  document.getElementById("playMessage").style.display = "unset";

  console.log("START");
  //playTrack(track_guitar, true);
  //playTrack(track_drums, true);
  requestAnimationFrameId = requestAnimationFrame(frame);
}

async function load() {
  const assets = [
    mRenderer.loadImage("sheet_megaman.png").then((data) => (fileSpriteSheet = data)),
    mAudio.loadAudio("audio-sheet_countdown.mp3").then((data) => (fileAudioSheet = data)),
    mAudio.loadAudio("multi-track_leadguitar.mp3").then((data) => (fileTrackGuitar = data)),
    mAudio.loadAudio("multi-track_drums.mp3").then((data) => (fileTrackDrums = data)),
  ];
  await Promise.all(assets);
}

async function setup() {
  await mRenderer.init("screen", 320, 240);
  await mAudio.init();
  await mPhysics.init();
  await mInput.init();
  await mAnim.init();

  mInput.mapAxis("H", 65, 68, mInput.AXES.lsh); // teclas A D
  mInput.mapAxis("V", 83, 87, mInput.AXES.lsv); // teclas S W
  mInput.mapAxis("HR", 37, 39, mInput.AXES.rsh); // setas LEFT RIGHT
  mInput.mapAxis("VR", 40, 38, mInput.AXES.rsv); // setas DOWN UP
  mInput.mapButton("X", 77, mInput.BUTTONS.square); // tecla M
  mInput.mapButton("A", 78, mInput.BUTTONS.cross); // tecla N
  mInput.mapButton("B", 188, mInput.BUTTONS.circle); // tecla .
  mInput.mapButton("Y", 66, mInput.BUTTONS.triangle); // tecla B
  mInput.mapButton("LB", 45, mInput.BUTTONS.lb); // INSERT
  mInput.mapButton("RB", 33, mInput.BUTTONS.rb); // PAGE UP
  mInput.mapButton("LT", 46, mInput.BUTTONS.lt); // DELETE
  mInput.mapButton("RT", 34, mInput.BUTTONS.rt); // PAGE DOWN
  mInput.mapButton("SELECT", 8, mInput.BUTTONS.select); // BACKSPACE
  mInput.mapButton("START", 13, mInput.BUTTONS.start); // ENTER

  await mAudio.setAudioSheet(AudioIds.CHAR_AUDIO_SHEET, fileAudioSheet);
  await mAudio.setTrack(AudioIds.TRACK_GUITAR, fileTrackGuitar);
  await mAudio.setTrack(AudioIds.TRACK_DRUMS, fileTrackDrums);
  //await mAudio.setEffect(AudioIds.EFFECT_CHAR_STEP, AudioIds.CHAR_AUDIO_SHEET, 6, 6.1);
  mAudio.setEffect(AudioIds.EFFECT_CHAR_STEP, AudioIds.CHAR_AUDIO_SHEET, 0, 0);
  mAudio.setEffect(AudioIds.EFFECT_CHAR_JUMP, AudioIds.CHAR_AUDIO_SHEET, 12.3, 13);
  mAudio.setEffect(AudioIds.EFFECT_CHAR_HIT, AudioIds.CHAR_AUDIO_SHEET, 0.1, 1);
  mAudio.setEffect(AudioIds.EFFECT_BALL_SHOT, AudioIds.CHAR_AUDIO_SHEET, 18.15, 18.2);
  mAudio.setEffect(AudioIds.EFFECT_BALL_HIT, AudioIds.CHAR_AUDIO_SHEET, 14.2, 15);

  frameControl.textSec = mRenderer.newRenderableText(0, 0, "sec", "left", DEBUG_STYLE_INFO, "16px sans-serif");
  frameControl.textFps = mRenderer.newRenderableText(320, 0, "fps", "right", DEBUG_STYLE_INFO, "16px sans-serif");
  inputControl.extra1 = mRenderer.newRenderableText(90, 0, "LB", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.jump = mRenderer.newRenderableText(110, 0, "X", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.shot = mRenderer.newRenderableText(120, 0, "A", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.xAxisL = mRenderer.newRenderableText(130, 0, "H", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.yAxisL = mRenderer.newRenderableText(140, 0, "V", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.xAxisR = mRenderer.newRenderableText(160, 0, "HR", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.yAxisR = mRenderer.newRenderableText(180, 0, "VR", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");

  let a = mAnim.setAnimation(AnimationIds.IDLE);
  mAnim.addFrame(a, States.NORMAL, 1, 3000);
  mAnim.addFrame(a, States.NORMAL, 2, 30);
  mAnim.addFrame(a, States.NORMAL, 3, 30);
  mAnim.addFrame(a, States.NORMAL, 2, 30);
  mAnim.addFrame(a, States.SHOOTING, 4, 3000);
  mAnim.addFrame(a, States.SHOOTING, 4, 30);
  mAnim.addFrame(a, States.SHOOTING, 4, 30);
  mAnim.addFrame(a, States.SHOOTING, 4, 30);

  a = mAnim.setAnimation(AnimationIds.WALK);
  mAnim.addFrame(a, States.NORMAL, 10, 120, AudioIds.EFFECT_CHAR_STEP);
  mAnim.addFrame(a, States.NORMAL, 11, 120);
  mAnim.addFrame(a, States.NORMAL, 12, 120);
  mAnim.addFrame(a, States.NORMAL, 13, 120, AudioIds.EFFECT_CHAR_STEP);
  mAnim.addFrame(a, States.NORMAL, 14, 120);
  mAnim.addFrame(a, States.NORMAL, 15, 120);
  mAnim.addFrame(a, States.SHOOTING, 20, 120, AudioIds.EFFECT_CHAR_STEP);
  mAnim.addFrame(a, States.SHOOTING, 21, 120);
  mAnim.addFrame(a, States.SHOOTING, 22, 120);
  mAnim.addFrame(a, States.SHOOTING, 23, 120, AudioIds.EFFECT_CHAR_STEP);
  mAnim.addFrame(a, States.SHOOTING, 24, 120);
  mAnim.addFrame(a, States.SHOOTING, 25, 120);

  a = mAnim.setAnimation(AnimationIds.JUMP);
  mAnim.addFrame(a, States.NORMAL, 16, 100, AudioIds.EFFECT_CHAR_JUMP);
  mAnim.addFrame(a, States.NORMAL, 17, 1000);
  mAnim.addFrame(a, States.SHOOTING, 26, 100, AudioIds.EFFECT_CHAR_JUMP);
  mAnim.addFrame(a, States.SHOOTING, 27, 1000);

  a = mAnim.setAnimation(AnimationIds.FALL);
  mAnim.addFrame(a, States.NORMAL, 18, 1000);
  mAnim.addFrame(a, States.SHOOTING, 28, 1000);

  a = mAnim.setAnimation(AnimationIds.HIT);
  mAnim.addFrame(a, States.NORMAL, 30, 30);
  mAnim.addFrame(a, States.NORMAL, 35, 30);

  a = mAnim.setAnimation(AnimationIds.DEATH, 16);
  mAnim.addFrame(a, States.NORMAL, 36, 16, AudioIds.EFFECT_CHAR_HIT);
  mAnim.addFrame(a, States.NORMAL, null, 16);
  mAnim.addFrame(a, States.NORMAL, 36, 16);
  mAnim.addFrame(a, States.NORMAL, null, 16);
  mAnim.addFrame(a, States.NORMAL, 36, 16);
  mAnim.addFrame(a, States.NORMAL, null, 16);
  mAnim.addFrame(a, States.NORMAL, 36, 16);
  mAnim.addFrame(a, States.NORMAL, null, 16);
  mAnim.addFrame(a, States.NORMAL, 36, 16);
  mAnim.addFrame(a, States.NORMAL, null, 16);
  mAnim.addFrame(a, States.NORMAL, 36, 16);

  a = mAnim.setAnimation(AnimationIds.WIN);
  mAnim.addFrame(a, States.NORMAL, 8, 2000);

  a = mAnim.setAnimation(AnimationIds.BALL_FIRED);
  mAnim.addFrame(a, States.NORMAL, 61, 50, AudioIds.EFFECT_BALL_SHOT);

  a = mAnim.setAnimation(AnimationIds.BALL_GOING);
  mAnim.addFrame(a, States.NORMAL, 37, 100);
  mAnim.addFrame(a, States.NORMAL, 38, 100);

  a = mAnim.setAnimation(AnimationIds.BALL_HIT);
  mAnim.addFrame(a, States.NORMAL, 60, 20, AudioIds.EFFECT_BALL_HIT);
  mAnim.addFrame(a, States.NORMAL, 61, 100);
  mAnim.addFrame(a, States.NORMAL, 62, 100);
  mAnim.addFrame(a, States.NORMAL, 63, 100);
  mAnim.addFrame(a, States.NORMAL, 64, 100);
  mAnim.addFrame(a, States.NORMAL, 65, 100);
  mAnim.addFrame(a, States.NORMAL, 66, 100);

  mPhysics.setPlatforms(platforms);
  platforms.forEach((p) => {
    p.renderable = mRenderer.newRenderableGeometry(p.start, p.height, p.end - p.start, 5, 0, 0, "rect", "gray", true);
  });

  await mLogic.init(fileSpriteSheet);

  //mAudio.playTrack(AudioIds.TRACK_DRUMS);
  //mAudio.playTrack(AudioIds.TRACK_GUITAR);
}

function cleanup() {
  mAudio.stopTrack(AudioIds.TRACK_DRUMS);
  mAudio.stopTrack(AudioIds.TRACK_GUITAR);

  document.getElementById("screen").style.display = "none";
  document.getElementById("playMessage").style.display = "none";
  document.getElementById("endMessage").style.display = "unset";

  console.log("WAIT USER ACTION");
  onkeydown = onclick = () => {
    onkeydown = onclick = undefined;
    location.reload();
  };
}

function selectDebugStyle(key, axis) {
  if (axis) {
    return mInput.getAxis(key) === 0 ? DEBUG_STYLE_RELEASED : mInput.getAxis(key) === 1 ? DEBUG_STYLE_AXIS_POS : DEBUG_STYLE_AXIS_NEG;
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
  inputControl.extra1.style = selectDebugStyle("LB");
  inputControl.jump.style = selectDebugStyle("A");
  inputControl.shot.style = selectDebugStyle("X");
  inputControl.xAxisL.style = selectDebugStyle("H", true);
  inputControl.yAxisL.style = selectDebugStyle("V", true);
  inputControl.xAxisR.style = selectDebugStyle("HR", true);
  inputControl.yAxisR.style = selectDebugStyle("VR", true);

  frameControl.textSec.visible = debugLevel === 1;
  frameControl.textFps.visible = debugLevel === 1;
  inputControl.extra1.visible = debugLevel === 1;
  inputControl.jump.visible = debugLevel === 1;
  inputControl.shot.visible = debugLevel === 1;
  inputControl.xAxisL.visible = debugLevel === 1;
  inputControl.yAxisL.visible = debugLevel === 1;
  inputControl.xAxisR.visible = debugLevel === 1;
  inputControl.yAxisR.visible = debugLevel === 1;

  return currTime;
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
    if (!mLogic.update(time, debugLevel)) {
      if (!endTime) endTime = currTime;
    }
    mAnim.update(time);
    mRenderer.render(currTime);
    mAudio.play(currTime);
  }
}
