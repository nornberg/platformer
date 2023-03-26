"use strict";

import * as mAudio from "./module_audio.js";
import * as mRenderer from "./module_renderer.js";
import * as mPhysics from "./module_physics.js";
import * as mInput from "./module_input.js";

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
let animationFrameId;
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

const Actions = {
  IDLE: "idle",
  WALK: "walk",
  JUMP: "jump",
  FALL: "fall",
  HIT: "hit",
  DEATH: "death",
  WIN: "win",
  BALL_FIRED: "ball_fired",
  BALL_GOING: "ball_going",
  BALL_HIT: "ball_hit",
};

const ObjectTypes = {
  CHARACTER: "character",
  PROJECTILE: "projectile",
};

const States = {
  NORMAL: "normal",
  SHOOTING: "shooting",
};

const AudioIds = {
  CHAR_AUDIO_SHEET: "char_audio_sheet",
  TRACK_GUITAR: "track_guitar",
  TRACK_DRUMS: "track_drums",
  EFFECT_CHAR_STEP: "effect_char_step",
  EFFECT_CHAR_JUMP: "effect_char_jump",
  EFFECT_CHAR_HIT: "effect_char_hit",
  EFFECT_BALL_SHOT: "effect_ball_shot",
  EFFECT_BALL_HIT: "effect_ball_hit",
};

const characterAnimations = [
  {
    state: States.NORMAL,
    action: Actions.IDLE,
    frames: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 2],
    delay: 50,
  },
  {
    state: States.NORMAL,
    action: Actions.WALK,
    frames: [{ frame: 10, audioEffect: AudioIds.EFFECT_CHAR_STEP }, 11, 12, { frame: 13, audioEffect: AudioIds.EFFECT_CHAR_STEP }, 14, 15],
    delay: 120,
  },
  {
    state: States.NORMAL,
    action: Actions.JUMP,
    frames: [
      { frame: 16, delay: 100, audioEffect: AudioIds.EFFECT_CHAR_JUMP },
      { frame: 17, delay: 1000 },
    ],
  },
  {
    state: States.NORMAL,
    action: Actions.FALL,
    frames: [18],
    delay: 1000,
  },
  {
    state: States.NORMAL,
    action: Actions.HIT,
    frames: [30, 35],
    delay: 30,
  },
  {
    state: States.NORMAL,
    action: Actions.DEATH,
    frames: [{ frame: 36, audioEffect: AudioIds.EFFECT_CHAR_HIT }, , 36, , 36, , 36, , 36, , 36],
    delay: 16,
  },
  {
    state: States.NORMAL,
    action: Actions.WIN,
    frames: [8],
    delay: 2000,
  },

  {
    state: States.SHOOTING,
    action: Actions.IDLE,
    frames: [4],
    delay: 100,
  },
  {
    state: States.SHOOTING,
    action: Actions.WALK,
    frames: [{ frame: 20, audioEffect: AudioIds.EFFECT_CHAR_STEP }, 21, 22, { frame: 23, audioEffect: AudioIds.EFFECT_CHAR_STEP }, 24, 25],
    delay: 120,
  },
  {
    state: States.SHOOTING,
    action: Actions.JUMP,
    frames: [{ frame: 26, audioEffect: AudioIds.EFFECT_CHAR_JUMP }, 27, 27, 27, 27, 27, 27],
    delay: 100,
  },
  {
    state: States.SHOOTING,
    action: Actions.FALL,
    frames: [28],
    delay: 1000,
  },
  {
    state: States.NORMAL,
    action: Actions.BALL_FIRED,
    frames: [{ frame: 61, audioEffect: AudioIds.EFFECT_BALL_SHOT }, 60],
    delay: 50,
  },
  {
    state: States.NORMAL,
    action: Actions.BALL_GOING,
    frames: [37, 38],
    delay: 100,
  },
  {
    state: States.NORMAL,
    action: Actions.BALL_HIT,
    frames: [{ frame: 60, audioEffect: AudioIds.EFFECT_BALL_HIT }, 61, 62, 63, 64, 65, 66],
    delay: 20,
  },
];

const platforms = [
  { start: 0, end: 320, height: 235 },
  { start: 0, end: 150, height: 180 },
  { start: 250, end: 320, height: 120 },
];

const objects = [];

function newAnimationData(action, state, frameIndex, previousTime, moreAttr) {
  return { action, state, frameIndex, previousTime, currFrame: 0, playing: true, ...moreAttr };
}

let projectile_id = 0;
function newProjectileBall(x, y, dir) {
  const projectile = {
    name: `projectile_ball_${projectile_id++}`,
    active: true,
    type: ObjectTypes.PROJECTILE,
    body: mPhysics.newPhysicsBody(x, y, 10, 10, 5, 0, dir, 5, 0),
    animation: newAnimationData(Actions.BALL_FIRED, States.NORMAL),
    renderable: mRenderer.newRenderableSprite(x, y, 10, 10, 0.5, 0.5, false, false, fileSpriteSheet, 0),
    playable: mAudio.newPlayableEffect(),
    next: {},
    power: 1,
    renderableEnvelope: mRenderer.newRenderableGeometry(x, y, 10, 10, false, false, "rect", "white", false),
    renderableBoundingBox: mRenderer.newRenderableGeometry(x, y, 0, 0, false, false, "rect", "blue", false),
  };
  objects.push(projectile);
  return projectile;
}

function newCharacterMegaman(name, x, y, xSpeed, dir) {
  const character = {
    name,
    active: true,
    type: ObjectTypes.CHARACTER,
    body: mPhysics.newPhysicsBody(x, y, 24, 40, xSpeed, 8, dir, 0, 0, 0.3, 0.3, false),
    animation: newAnimationData(),
    renderable: mRenderer.newRenderableSprite(x, y, 24, 40, 0.5, 1, false, false, fileSpriteSheet, 0),
    playable: mAudio.newPlayableEffect(),
    next: {},
    energy: 3,
    lastStepTime: 0,
    renderableEnvelope: mRenderer.newRenderableGeometry(x, y, 24, 40, false, false, "rect", "white", false),
    renderableBoundingBox: mRenderer.newRenderableGeometry(x, y, 0, 0, false, false, "rect", "blue", false),
  };
  objects.push(character);
  return character;
}

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
  animationFrameId = requestAnimationFrame(frame);
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

  mInput.mapAxis("H", 65, 68, mInput.AXES.lsh); // teclas A D
  mInput.mapAxis("V", 83, 87, mInput.AXES.lsv); // teclas S W
  mInput.mapAxis("HR", 37, 39, mInput.AXES.rsh); // setas LEFT RIGHT
  mInput.mapAxis("VR", 40, 38, mInput.AXES.rsv); // setas DOWN UP
  mInput.mapButton("X", 77, mInput.BUTTONS.x); // tecla M
  mInput.mapButton("A", 78, mInput.BUTTONS.a); // tecla N
  mInput.mapButton("B", 188, mInput.BUTTONS.b); // tecla .
  mInput.mapButton("Y", 66, mInput.BUTTONS.y); // tecla B
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
  await mAudio.setEffect(AudioIds.EFFECT_CHAR_STEP, AudioIds.CHAR_AUDIO_SHEET, 0, 0);
  await mAudio.setEffect(AudioIds.EFFECT_CHAR_JUMP, AudioIds.CHAR_AUDIO_SHEET, 12.3, 13);
  await mAudio.setEffect(AudioIds.EFFECT_CHAR_HIT, AudioIds.CHAR_AUDIO_SHEET, 0.1, 1);
  await mAudio.setEffect(AudioIds.EFFECT_BALL_SHOT, AudioIds.CHAR_AUDIO_SHEET, 18.15, 18.2);
  await mAudio.setEffect(AudioIds.EFFECT_BALL_HIT, AudioIds.CHAR_AUDIO_SHEET, 14.2, 15);

  newCharacterMegaman("player", 180, 50, 3, 1);
  newCharacterMegaman("enemy_01", 20, 180, 2, 1);
  newCharacterMegaman("enemy_02", 270, 120, 2, -1);

  mPhysics.setPlatforms(platforms);
  platforms.forEach((p) => {
    p.renderable = mRenderer.newRenderableGeometry(p.start, p.height, p.end - p.start, 5, 0, 0, "rect", "gray", true);
  });

  //mAudio.playTrack(AudioIds.TRACK_DRUMS);
  //mAudio.playTrack(AudioIds.TRACK_GUITAR);

  frameControl.textSec = mRenderer.newRenderableText(0, 0, "sec", "left", DEBUG_STYLE_INFO, "16px sans-serif");
  frameControl.textFps = mRenderer.newRenderableText(320, 0, "fps", "right", DEBUG_STYLE_INFO, "16px sans-serif");
  inputControl.extra1 = mRenderer.newRenderableText(90, 0, "LB", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.jump = mRenderer.newRenderableText(110, 0, "X", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.shot = mRenderer.newRenderableText(120, 0, "A", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.xAxisL = mRenderer.newRenderableText(130, 0, "H", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.yAxisL = mRenderer.newRenderableText(140, 0, "V", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.xAxisR = mRenderer.newRenderableText(160, 0, "HR", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
  inputControl.yAxisR = mRenderer.newRenderableText(180, 0, "VR", "left", DEBUG_STYLE_RELEASED, "11px sans-serif");
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
    cancelAnimationFrame(animationFrameId);
    cleanup();
  } else {
    animationFrameId = requestAnimationFrame(frame);
    mInput.update();
    update(currTime);
    mRenderer.render(currTime);
    mAudio.play(currTime);
  }
}

function update(time) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (!obj.active) {
      console.log("Removing object " + obj.name);
      releaseModules(obj);
      objects.splice(i, 1);
    } else {
      obj.next = { action: obj.next.action, state: obj.next.state };
    }
  }

  if (objects.length === 1 && objects[0].name === "player") {
    mAudio.stopTrack(AudioIds.TRACK_GUITAR);
    objects[0].next.action = Actions.WIN;
    objects[0].body.dir = 1;
    objects[0].body.xSpeed = 0;
    objects[0].body.xAccel = 0;
    objects[0].body.xDecel = 0;
    if (!endTime) endTime = time;
  } else if (objects[0].next.action !== Actions.WIN) {
    if (mInput.getAxis("H") !== 0) {
      objects[0].body.dir = mInput.getAxis("H");
      objects[0].body.xAccel = 0.1;
    } else {
      objects[0].body.xAccel = 0;
    }
    objects[0].next.fire = mInput.isJustPressed("X") ? 1 : mInput.isPressed("X") ? -1 : 0;
    if (mInput.isJustPressed("A") && objects[0].body.floored) {
      console.log("JUMP");
      objects[0].body.yAccel = 1.7;
    }
  }

  objects.forEach((obj) => {
    if (!endTime) {
      switch (obj.type) {
        case ObjectTypes.PROJECTILE:
          if (obj.animation.action === Actions.BALL_HIT) {
            if (!obj.animation.playing) {
              obj.active = false;
            }
          }
          if ([Actions.BALL_FIRED, Actions.BALL_GOING].includes(obj.animation.action)) {
            if (obj.animation.action === Actions.BALL_FIRED && !obj.animation.playing) {
              obj.next.action = Actions.BALL_GOING;
            }
            if (obj.body.x < 0 || obj.body.x > 320) {
              obj.active = false;
            }
            const hitCharacter = objects.filter((c) => c.type === ObjectTypes.CHARACTER).find((c) => mPhysics.collision(c.body, obj.body));
            if (hitCharacter) {
              obj.next.action = Actions.BALL_HIT;
              obj.body.xSpeed = 0;
              obj.body.xAccel = 0;
              hitCharacter.isHit = true;
              hitCharacter.hitTime = time;
              hitCharacter.energy -= obj.power;
              if (hitCharacter.energy < 0) {
                hitCharacter.energy = 0;
              }
            }
          }
          break;
        case ObjectTypes.CHARACTER:
          if (obj.name !== "player") {
            obj.body.xAccel = 0.2;
            if (obj.body.floored && (obj.body.x < obj.body.floor.start || obj.body.x > obj.body.floor.end)) {
              obj.body.dir *= -1;
            }
          }
          if (obj.isHit) {
            obj.next.action = obj.energy === 0 ? Actions.DEATH : Actions.HIT;
            obj.next.state = States.NORMAL;
            obj.body.xAccel = -obj.body.dir;
            if (time - obj.hitTime > 250) {
              obj.isHit = false;
              if (obj.energy === 0) {
                obj.active = false;
              }
            }
          } else {
            if (obj.body.ySpeed < 0) {
              obj.next.action = Actions.JUMP;
            } else if (obj.body.ySpeed > 0) {
              obj.next.action = Actions.FALL;
            } else if (obj.body.xSpeed > 0) {
              obj.next.action = Actions.WALK;
            } else {
              obj.next.action = Actions.IDLE;
            }
            if (obj.next.fire === 0) {
              obj.next.state = States.NORMAL;
            } else {
              obj.next.state = States.SHOOTING;
              if (obj.next.fire === 1) {
                newProjectileBall(obj.body.x + obj.body.dir * 27, obj.body.y - 21, obj.body.dir);
              }
            }
          }
          break;
      }

      const yPrev = mPhysics.calcEnvelope(obj.body).y2;

      if (obj.body.xAccel > 0) {
        obj.body.xSpeed += obj.body.xAccel;
        if (obj.body.xSpeed > obj.body.xMaxSpeed) {
          obj.body.xSpeed = obj.body.xMaxSpeed;
        }
      } else {
        obj.body.xSpeed -= obj.body.xDecel;
        if (obj.body.xSpeed < 0) {
          obj.body.xSpeed = 0;
        }
      }

      if (obj.body.yAccel > 0) {
        obj.body.ySpeed -= obj.body.yAccel;
        if (obj.body.ySpeed < -obj.body.yMaxSpeed) {
          obj.body.ySpeed = -obj.body.yMaxSpeed;
        }
        obj.body.yAccel -= obj.body.yDecel;
        if (obj.body.yAccel < 0) {
          obj.body.yAccel = 0;
        }
      } else if (!obj.body.floored) {
        obj.body.ySpeed += obj.body.yDecel;
        if (obj.body.ySpeed < -obj.body.yMaxSpeed) {
          obj.body.ySpeed = -obj.body.yMaxSpeed;
        }
      }

      obj.body.x += obj.body.dir * obj.body.xSpeed;
      obj.body.y += obj.body.ySpeed;

      mPhysics.checkFloor(obj.body, yPrev);
      if (obj.body.floored) {
        obj.body.ySpeed = 0;
        obj.body.y = obj.body.floor.height;
      }
    }
    playAnimation(obj, time);
    updateModules(obj);
  });
}

function updateModules(obj) {
  if (obj.playable) {
    obj.playable.effectId = obj.animation.currAudioEffect;
    obj.playable.playing = obj.playable.effectId != null;
  }
  if (obj.renderable) {
    obj.renderable.posX = obj.body.x;
    obj.renderable.posY = obj.body.y;
    obj.renderable.flipX = obj.body.dir < 0;
    obj.renderable.index = obj.animation.currFrame;
  }
  if (obj.renderableEnvelope) {
    const e = mPhysics.calcEnvelope(obj.body);
    obj.renderableEnvelope.posX = e.x1;
    obj.renderableEnvelope.posY = e.y1;
    obj.renderableEnvelope.sizeX = e.x2 - e.x1;
    obj.renderableEnvelope.sizeY = e.y2 - e.y1;
    obj.renderableEnvelope.visible = debugLevel === 1;
  }
  if (obj.renderableBoundingBox) {
    obj.renderableBoundingBox.posX = obj.renderable.posX - obj.renderable.anchorX * obj.renderable.sizeX;
    obj.renderableBoundingBox.posY = obj.renderable.posY - obj.renderable.anchorY * obj.renderable.sizeY;
    obj.renderableBoundingBox.sizeX = obj.renderable.sizeX;
    obj.renderableBoundingBox.sizeY = obj.renderable.sizeY;
    obj.renderableBoundingBox.flipX = obj.renderable.flipX;
    obj.renderableBoundingBox.flipY = obj.renderable.flipY;
    obj.renderableBoundingBox.visible = debugLevel === 1;
  }
}

function releaseModules(obj) {
  mRenderer.removeRenderable(obj.renderable);
  mRenderer.removeRenderable(obj.renderableEnvelope);
  mRenderer.removeRenderable(obj.renderableBoundingBox);
  mAudio.removePlayable(obj.playable);
}

function playAnimation(character, time) {
  if (!character.active) {
    return;
  }

  if (character.animation.action !== character.next.action || character.animation.state !== character.next.state) {
    if (!character.next.action) {
      character.next.action = character.animation.action;
      character.next.state = character.animation.state;
    }
    const newAnim = characterAnimations.find((a) => a.action === character.next.action && a.state === character.next.state) ?? characterAnimations.find((a) => a.action === character.next.action);
    if (isSameAction(newAnim, character.animation)) {
      character.animation = newAnimationData(null, character.animation.state, character.animation.frameIndex, character.animation.previousTime, newAnim);
    } else {
      character.animation = newAnimationData(null, character.animation.state, 0, 0, newAnim);
    }
  }

  const frameObj = character.animation.frames[character.animation.frameIndex];

  if (frameObj !== null && typeof frameObj === "object") {
    if (character.animation.currFrame !== frameObj.frame && frameObj.audioEffect) {
      character.animation.currAudioEffect = frameObj.audioEffect;
    } else {
      character.animation.currAudioEffect = null;
    }
    character.animation.currFrame = frameObj.frame;
    character.animation.currDelay = frameObj.delay ?? character.animation.delay;
  } else {
    character.animation.currAudioEffect = null;
    character.animation.currFrame = frameObj;
    character.animation.currDelay = character.animation.delay;
  }

  if (time - character.animation.previousTime > character.animation.currDelay) {
    character.animation.previousTime = time;
    if (++character.animation.frameIndex === character.animation.frames.length) {
      character.animation.playing = false;
      character.animation.frameIndex = 0;
    }
  }
}

function isSameAction(anim1, anim2) {
  return anim1 && anim2 && anim1.action === anim2.action && anim1.frames?.length === anim2.frames?.length;
}
