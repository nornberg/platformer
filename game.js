"use strict";

console.log("WAIT USER ACTION");
onkeydown = onclick = () => {
  onkeydown = onclick = undefined;
  main();
};

let mRenderer;
let mAudio;
let mPhysics;

let fileSpriteSheet;
let fileAudioSheet;
let fileTrackGuitar;
let fileTrackDrums;

let input_axis_hor = 0;
let input_axis_ver = 0;
let input_button_fire = 0;
let input_button_jump = 0;
let input_button_extra_1 = 0;
let endTime;
let animationFrameId;

const frameControl = {
  startTime: undefined,
  fps: 0,
  frameCount: 0,
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

function newPhysicsBody(x, y, width, height, xSpeed = 0, vSpeed = 0, dir = 1) {
  return { dir, floored: false, x, y, width, height, xSpeed, vSpeed };
}

function newAnimationData(action, state, frameIndex, previousTime, moreAttr) {
  return { action, state, frameIndex, previousTime, currFrame: 0, playing: true, ...moreAttr };
}

let projectile_id = 0;
function newProjectileBall(x, y, dir) {
  const projectile = {
    name: `projectile_ball_${projectile_id++}`,
    active: true,
    type: ObjectTypes.PROJECTILE,
    body: newPhysicsBody(x, y, 10, 10, 5, 0, dir),
    animation: newAnimationData(Actions.BALL_FIRED, States.NORMAL),
    renderable: mRenderer.newRenderableSprite(x, y, 10, 10, 0.5, 0.5, false, false, fileSpriteSheet, 0),
    playable: mAudio.newPlayableEffect(),
    next: {},
    power: 1,
  };
  objects.push(projectile);
  return projectile;
}

function newCharacterMegaman(name, x, y, dir) {
  const character = {
    name,
    active: true,
    type: ObjectTypes.CHARACTER,
    body: newPhysicsBody(x, y, 24, 40, 2, 0, dir),
    animation: newAnimationData(Actions.IDLE, States.NORMAL),
    renderable: mRenderer.newRenderableSprite(x, y, 24, 40, 0.5, 1, false, false, fileSpriteSheet, 0),
    playable: mAudio.newPlayableEffect(),
    next: {},
    energy: 3,
    lastStepTime: 0,
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
  mRenderer = await import("/module_renderer.js");
  mAudio = await import("/module_audio.js");
  mPhysics = await import("/module_physics.js");

  fileSpriteSheet = await mRenderer.loadImage("sheet_megaman.png");
  fileAudioSheet = await mAudio.loadAudio("audio-sheet_countdown.mp3");
  fileTrackGuitar = await mAudio.loadAudio("multi-track_leadguitar.mp3");
  fileTrackDrums = await mAudio.loadAudio("multi-track_drums.mp3");

  frameControl.textSec = mRenderer.newRenderableText(0, 0, "sec", "left", "rgb(250, 250, 250)", "16px sans-serif");
  frameControl.textFps = mRenderer.newRenderableText(320, 0, "fps", "right", "rgb(250, 250, 250)", "16px sans-serif");
}

async function setup() {
  await mRenderer.init("screen", 320, 240);
  await mAudio.init();
  await mPhysics.init();

  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);

  await mAudio.setAudioSheet(AudioIds.CHAR_AUDIO_SHEET, fileAudioSheet);
  await mAudio.setTrack(AudioIds.TRACK_GUITAR, fileTrackGuitar);
  await mAudio.setTrack(AudioIds.TRACK_DRUMS, fileTrackDrums);
  await mAudio.setEffect(AudioIds.EFFECT_CHAR_STEP, AudioIds.CHAR_AUDIO_SHEET, 6, 6.1);
  //await mAudio.setEffect(AudioIds.EFFECT_CHAR_STEP, AudioIds.CHAR_AUDIO_SHEET, 0, 0);
  await mAudio.setEffect(AudioIds.EFFECT_CHAR_JUMP, AudioIds.CHAR_AUDIO_SHEET, 12.3, 13);
  await mAudio.setEffect(AudioIds.EFFECT_CHAR_HIT, AudioIds.CHAR_AUDIO_SHEET, 0.1, 1);
  await mAudio.setEffect(AudioIds.EFFECT_BALL_SHOT, AudioIds.CHAR_AUDIO_SHEET, 18.15, 18.2);
  await mAudio.setEffect(AudioIds.EFFECT_BALL_HIT, AudioIds.CHAR_AUDIO_SHEET, 14.2, 15);

  newCharacterMegaman("player", 180, 50, 1);
  newCharacterMegaman("enemy_01", 20, 180, 1);
  newCharacterMegaman("enemy_02", 270, 120, -1);

  platforms.forEach((p) => {
    p.renderable = mRenderer.newRenderableGeometry(p.start, p.height, p.end - p.start, 5, 0, 0, "rect", "gray");
  });
}

function cleanup() {
  document.getElementById("screen").style.display = "none";
  document.getElementById("playMessage").style.display = "none";
  document.getElementById("endMessage").style.display = "unset";

  console.log("WAIT USER ACTION");
  onkeydown = onclick = () => {
    onkeydown = onclick = undefined;
    location.reload();
  };
}

async function frame(time) {
  if (!frameControl.startTime) {
    frameControl.startTime = time;
  }
  const currTime = time - frameControl.startTime;

  if (input_button_extra_1 === 1) {
    mRenderer.setDebugLevel(mRenderer.setDebugLevel() + 1);
  }
  mRenderer.setDebugLevel(1);

  if (currTime - endTime > 3000) {
    console.log("END");
    cancelAnimationFrame(animationFrameId);
    cleanup();
  } else {
    animationFrameId = requestAnimationFrame(frame);

    update(currTime);
    mRenderer.render(currTime);
    mAudio.play(currTime);
    input(currTime);

    frameControl.frameCount++;
    if (Math.trunc(currTime) % 1000 === 0) {
      frameControl.fps = frameControl.frameCount;
      frameControl.frameCount = 0;
      frameControl.textFps.text = `${frameControl.fps} fps`;
    }
    frameControl.textSec.text = `${(currTime / 1000).toFixed(1)} s`;
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
    objects[0].next.action = Actions.WIN;
    objects[0].body.dir = 1;
    objects[0].body.xSpeed = 0;
    if (!endTime) endTime = time;
  } else if (objects[0].next.action !== Actions.WIN) {
    if (input_axis_hor !== 0) {
      objects[0].body.dir = input_axis_hor;
      objects[0].body.xSpeed += 0.1;
      if (objects[0].body.xSpeed > 3) objects[0].body.xSpeed = 3;
    } else {
      objects[0].body.xSpeed -= 0.3;
      if (objects[0].body.xSpeed < 0) objects[0].body.xSpeed = 0;
    }
    objects[0].next.fire = input_button_fire;
    if (input_button_jump === 1 && objects[0].body.floored) {
      console.log("JUMP");
      objects[0].body.vSpeed = -5;
      objects[0].body.y--;
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
            obj.body.x += obj.body.dir * obj.body.xSpeed;
            if (obj.body.x < 0 || obj.body.x > 320) {
              obj.active = false;
            }
            const hitCharacter = objects.filter((c) => c.type === ObjectTypes.CHARACTER).find((c) => collision(c.body, obj.body));
            if (hitCharacter) {
              obj.next.action = Actions.BALL_HIT;
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
          obj.body.floor = checkFloor(obj);
          if (obj.name !== "player") {
            if (obj.body.floored && (obj.body.x < obj.body.floor.start || obj.body.x > obj.body.floor.end)) obj.body.dir *= -1;
          }
          if (obj.body.floored) {
            obj.body.vSpeed = 0;
            obj.body.y = obj.body.floor.height;
          } else {
            obj.body.vSpeed += 0.2;
            if (obj.body.vSpeed > 5) obj.body.vSpeed = 5;
            obj.body.y += obj.body.vSpeed;
          }
          obj.body.x += obj.body.dir * obj.body.xSpeed;
          if (obj.isHit) {
            obj.next.action = obj.energy === 0 ? Actions.DEATH : Actions.HIT;
            obj.next.state = States.NORMAL;
            obj.body.x -= obj.body.dir;
            if (time - obj.hitTime > 250) {
              obj.isHit = false;
              if (obj.energy === 0) {
                obj.active = false;
              }
            }
          } else {
            if (obj.body.vSpeed < 0) {
              obj.next.action = Actions.JUMP;
            } else if (obj.body.vSpeed > 0) {
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
}

function releaseModules(obj) {
  mRenderer.removeRenderable(obj.renderable);
  mAudio.removePlayable(obj.playable);
}

function input(time) {
  if (input_button_fire === 1) {
    input_button_fire = -1;
  }
  if (input_button_jump === 1) {
    input_button_jump = -1;
  }
  if (input_button_extra_1 === 1) {
    input_button_extra_1 = -1;
  }
}

function keyDownHandler(e) {
  if ("code" in e) {
    switch (e.code) {
      case "Unidentified":
        break;
      case "ArrowRight":
      case "Right": // IE <= 9 and FF <= 36
      case "KeyD":
        input_axis_hor = 1;
        return;
      case "ArrowLeft":
      case "Left": // IE <= 9 and FF <= 36
      case "KeyA":
        input_axis_hor = -1;
        return;
      case "ArrowUp":
      case "Up": // IE <= 9 and FF <= 36
      case "KeyW":
        input_axis_ver = 1;
        return;
      case "ArrowDown":
      case "Down": // IE <= 9 and FF <= 36
      case "KeyS":
        input_axis_ver = -1;
        return;
      case "KeyM":
        if (!input_button_fire) input_button_fire = 1;
        return;
      case "KeyN":
        if (!input_button_jump) input_button_jump = 1;
        return;
      case "Digit1":
        if (!input_button_extra_1) input_button_extra_1 = 1;
        return;
      default:
        return;
    }
  }
}

function keyUpHandler(e) {
  if ("code" in e) {
    switch (e.code) {
      case "Unidentified":
        break;
      case "ArrowRight":
      case "Right": // IE <= 9 and FF <= 36
      case "KeyD":
      case "ArrowLeft":
      case "Left": // IE <= 9 and FF <= 36
      case "KeyA":
        input_axis_hor = 0;
        return;
      case "ArrowUp":
      case "Up": // IE <= 9 and FF <= 36
      case "KeyW":
      case "ArrowDown":
      case "Down": // IE <= 9 and FF <= 36
      case "KeyS":
        input_axis_ver = 0;
        return;
      case "KeyM":
        input_button_fire = 0;
        return;
      case "KeyN":
        input_button_jump = 0;
        return;
      case "Digit1":
        input_button_extra_1 = 0;
        return;
      default:
        return;
    }
  }
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

function checkFloor(character) {
  const c = character;
  const floors = platforms.filter((p) => {
    const check = c.body.x + c.body.width / 2 > p.start && c.body.x - c.body.width / 2 < p.end && c.body.y >= p.height && c.body.y <= p.height + 5;
    return check;
  });
  if (floors.length === 0) {
    c.body.floored = false;
    return null;
  } else {
    c.body.floored = true;
    return floors[0];
  }
}

function collision(body1, body2) {
  const e1 = envelope(body1);
  const e2 = envelope(body2);
  return e1.x2 > e2.x1 && e1.x1 < e2.x2 && e1.y2 > e2.y1 && e1.y1 < e2.y2;
}

function envelope(body, base = false) {
  if (base)
    return {
      x1: body.x - body.width / 2,
      y1: body.y - body.height,
      x2: body.x + body.width / 2,
      y2: body.y,
    };
  else
    return {
      x1: body.x - body.width / 2,
      y1: body.y - body.height / 2,
      x2: body.x + body.width / 2,
      y2: body.y + body.height / 2,
    };
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
