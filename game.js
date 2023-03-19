"use strict";

console.log("WAIT USER ACTION");
onkeydown = onclick = () => {
  onkeydown = onclick = undefined;
  main();
};

let mRenderer;
let mAudio;
let mPhysics;

let audioCtx;
let spriteSheet;
let audio_sheet;
let track_guitar;
let track_drums;
let input_axis_hor = 0;
let input_axis_ver = 0;
let input_button_fire = 0;
let input_button_jump = 0;
let input_button_extra_1 = 0;
let trackOffset = null;
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

const States = {
  NORMAL: "normal",
  SHOOTING: "shooting",
};

const AudioEffects = {
  STEP: { start: 6, end: 6.1 },
  JUMP: { start: 12, end: 13 },
  FIRE: { start: 14, end: 15 },
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
    frames: [{ frame: 10, audioEffect: AudioEffects.STEP }, 11, 12, { frame: 13, audioEffect: AudioEffects.STEP }, 14, 15],
    delay: 120,
  },
  {
    state: States.NORMAL,
    action: Actions.JUMP,
    frames: [
      { frame: 16, delay: 100, audioEffect: AudioEffects.JUMP },
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
    frames: [36, , 36, , 36, , 36, , 36, , 36],
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
    frames: [{ frame: 20, audioEffect: AudioEffects.STEP }, 21, 22, { frame: 23, audioEffect: AudioEffects.STEP }, 24, 25],
    delay: 120,
  },
  {
    state: States.SHOOTING,
    action: Actions.JUMP,
    frames: [{ frame: 26, audioEffect: AudioEffects.JUMP }, 27, 27, 27, 27, 27, 27],
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
    frames: [{ frame: 61, audioEffect: AudioEffects.FIRE }, 60],
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
    frames: [60, 61, 62, 63, 64, 65, 66],
    delay: 20,
  },
];

const platforms = [
  { start: 0, end: 320, height: 235 },
  { start: 0, end: 150, height: 180 },
  { start: 250, end: 320, height: 120 },
];

const ProjectileTemplates = {
  SMALL_BALL: {
    name: "projectile_small_ball_",
    body: newPhysicsBody(10, 120, 10, 10, 5, 0),
    animation: newAnimationData(Actions.BALL_FIRED, States.NORMAL),
    power: 1,
    next: {},
  },
};

const characters = [
  {
    name: "player",
    body: newPhysicsBody(180, 50, 24, 40, 0, 0),
    animation: newAnimationData(Actions.IDLE, States.NORMAL),
    active: true,
    energy: 3,
    lastStepTime: 0,
    next: {},
  },
  {
    name: "enemy_1",
    body: newPhysicsBody(20, 180, 24, 40, 1, 0),
    animation: newAnimationData(Actions.IDLE, States.NORMAL),
    active: true,
    energy: 3,
    lastStepTime: 0,
    next: {},
  },
  {
    name: "enemy_2",
    body: newPhysicsBody(270, 120, 24, 40, 1, 0, -1),
    animation: newAnimationData(Actions.IDLE, States.NORMAL),
    active: true,
    energy: 3,
    lastStepTime: 0,
    next: {},
  },
];

const projectiles = [];

function newPhysicsBody(x, y, width, height, xSpeed = 0, vSpeed = 0, dir = 1) {
  return { dir, floored: false, x, y, width, height, xSpeed, vSpeed };
}

function newAnimationData(action, state, frameIndex, previousTime, moreAttr) {
  return { action, state, frameIndex, previousTime, currFrame: 0, playing: true, ...moreAttr };
}

let projectile_id = 0;
function newProjectile(template, x, y, dir) {
  const projectile = {
    ...deepClone(template),
    name: template.name + projectile_id++,
    body: { ...template.body, x, y, dir },
    renderable: mRenderer.newRenderableSprite(x, y, template.body.width, template.body.height, 0.5, 0.5, false, false, spriteSheet, 0),
  };
  projectiles.push(projectile);
  return projectile;
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
  // TODO fazer loadAudio não depender do audio estar inicializado.
  audioCtx = new AudioContext();

  mRenderer = await import("/module_renderer.js");
  mAudio = await import("/module_audio.js");
  mPhysics = await import("/module_physics.js");

  spriteSheet = await mRenderer.loadImage("sheet_megaman.png");
  track_guitar = await loadTrack("multi-track_leadguitar.mp3");
  track_drums = await loadTrack("multi-track_drums.mp3");
  audio_sheet = await loadAudio("audio-sheet_countdown.mp3");

  frameControl.textSec = mRenderer.newRenderableText(0, 0, "sec", "left", "rgb(250, 250, 250)", "16px sans-serif");
  frameControl.textFps = mRenderer.newRenderableText(320, 0, "fps", "right", "rgb(250, 250, 250)", "16px sans-serif");
}

async function setup() {
  await mRenderer.init("screen", 320, 240);
  await mAudio.init();
  await mPhysics.init();

  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);

  characters.forEach((c) => {
    c.renderable = mRenderer.newRenderableSprite(0, 0, c.body.width, c.body.height, 0.5, 1, false, false, spriteSheet, 0);
  });
  platforms.forEach((p) => {
    p.renderable = mRenderer.newRenderableGeometry(p.start, p.height, p.end - p.start, 5, 0, 0, "rect", "gray");
  });
  updateModules();
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

async function loadAudio(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioBuffer.name = url;
  return audioBuffer;
}

async function loadTrack(url) {
  const audioBuffer = await loadAudio(url);
  return createTrack(audioBuffer, url);
}

function createTrack(audioBuffer, name) {
  const trackSource = audioCtx.createBufferSource();
  trackSource.buffer = audioBuffer;
  trackSource.connect(audioCtx.destination);
  trackSource.name = name;
  trackSource.bufferRef = audioBuffer;
  return trackSource;
}

function playTrack(trackSource, loop) {
  console.log("play track ", trackSource.name);

  if (trackSource.played) {
    trackSource = createTrack(trackSource.bufferRef, trackSource.name);
    console.log("-- recreated");
  }

  trackSource.loop = loop;
  trackSource.played = true;
  if (trackOffset === null) {
    trackSource.start();
    trackOffset = audioCtx.currentTime;
  } else {
    trackSource.start(0, audioCtx.currentTime - trackOffset);
  }
}

function playEffect(audioBuffer, tStart, tEnd) {
  console.log("play effect ", audioBuffer.name);
  const trackSource = createTrack(audioBuffer, audioBuffer.name);
  trackSource.start(0, tStart);
  trackSource.stop(audioCtx.currentTime + tEnd - tStart);
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
  for (let i = characters.length - 1; i >= 0; i--) {
    if (!characters[i].active) {
      releaseModules(characters[i]);
      characters.splice(i, 1);
    }
  }

  characters.forEach((c) => {
    c.next = { action: c.next.action, state: c.next.state };
  });

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p.animation.action === Actions.BALL_HIT && !p.animation.playing) {
      console.log("deleting projectile", i, "hit");
      releaseModules(p);
      projectiles.splice(i, 1);
    }
    if ([Actions.BALL_FIRED, Actions.BALL_GOING].includes(p.animation.action)) {
      if (p.animation.action === Actions.BALL_FIRED && !p.animation.playing) {
        p.next.action = Actions.BALL_GOING;
      }
      p.body.x += p.body.dir * p.body.xSpeed;
      if (p.body.x < 0 || p.body.x > 320) {
        console.log("deleting projectile", i, p.body.x);
        releaseModules(p);
        projectiles.splice(i, 1);
      }
      const hitCharacter = characters.find((c) => collision(c.body, p.body));
      if (hitCharacter) {
        p.next.action = Actions.BALL_HIT;
        hitCharacter.isHit = true;
        hitCharacter.hitTime = time;
        hitCharacter.energy -= p.power;
        if (hitCharacter.energy < 0) {
          hitCharacter.energy = 0;
        }
        console.log("projectile hit", i, hitCharacter.name);
      }
    }
  }

  if (characters.length === 1 && characters[0].name === "player") {
    characters[0].next.action = Actions.WIN;
    if (!endTime) endTime = time;
  } else {
    if (input_axis_hor !== 0) {
      characters[0].body.dir = input_axis_hor;
      characters[0].body.xSpeed += 0.1;
      if (characters[0].body.xSpeed > 3) characters[0].body.xSpeed = 3;
    } else {
      characters[0].body.xSpeed -= 0.3;
      if (characters[0].body.xSpeed < 0) characters[0].body.xSpeed = 0;
    }
    characters[0].next.fire = input_button_fire;

    if (input_button_jump === 1 && characters[0].body.floored) {
      console.log("JUMP");
      characters[0].body.vSpeed = -5;
      characters[0].body.y--;
    }

    characters.forEach((c) => {
      if (c.name !== "player") {
        if (c.body.floored && (c.body.x < c.body.floor.start || c.body.x > c.body.floor.end)) c.body.dir *= -1;
      }
    });

    characters.forEach((c) => {
      c.body.floor = checkFloor(c);
      if (c.body.floored) {
        c.body.vSpeed = 0;
        c.body.y = c.body.floor.height;
      } else {
        c.body.vSpeed += 0.2;
        if (c.body.vSpeed > 5) c.body.vSpeed = 5;
        c.body.y += c.body.vSpeed;
      }
      c.body.x += c.body.dir * c.body.xSpeed;
      if (c.isHit) {
        c.next.action = c.energy === 0 ? Actions.DEATH : Actions.HIT;
        c.next.state = States.NORMAL;
        c.body.x -= c.body.dir;
        if (time - c.hitTime > 250) {
          c.isHit = false;
          if (c.energy === 0) {
            c.active = false;
          }
        }
      } else {
        if (c.body.vSpeed < 0) {
          c.next.action = Actions.JUMP;
        } else if (c.body.vSpeed > 0) {
          c.next.action = Actions.FALL;
        } else if (c.body.xSpeed > 0) {
          c.next.action = Actions.WALK;
        } else {
          c.next.action = Actions.IDLE;
        }
        if (c.next.fire === 0) {
          c.next.state = States.NORMAL;
        } else {
          c.next.state = States.SHOOTING;
          if (c.next.fire === 1) {
            newProjectile(ProjectileTemplates.SMALL_BALL, c.body.x + c.body.dir * 27, c.body.y - 21, c.body.dir);
          }
        }
      }
    });
  }

  characters.forEach((c) => {
    playAnimation(c, time);
  });
  projectiles.forEach((p) => {
    playAnimation(p, time);
  });

  updateModules();
}

function updateModules() {
  characters.forEach((c) => {
    c.renderable.posX = c.body.x;
    c.renderable.posY = c.body.y;
    c.renderable.flipX = c.body.dir < 0;
    c.renderable.index = c.animation.currFrame;
  });
  projectiles.forEach((p) => {
    p.renderable.posX = p.body.x;
    p.renderable.posY = p.body.y;
    p.renderable.flipX = p.body.dir < 0;
    p.renderable.index = p.animation.currFrame;
  });
}

function releaseModules(obj) {
  mRenderer.removeRenderable(obj.renderable);
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
  if (time - character.animation.previousTime > character.animation.currDelay) {
    character.animation.previousTime = time;
    if (++character.animation.frameIndex === character.animation.frames.length) {
      character.animation.playing = false;
      character.animation.frameIndex = 0;
    }
  }
  const frameObj = character.animation.frames[character.animation.frameIndex];
  if (frameObj !== null && typeof frameObj === "object") {
    if (character.animation.currFrame !== frameObj.frame) {
      character.animation.currAudioEffect = frameObj.audioEffect;
    }
    character.animation.currFrame = frameObj.frame;
    character.animation.currDelay = frameObj.delay ?? character.animation.delay;
  } else {
    character.animation.currFrame = frameObj;
    character.animation.currDelay = character.animation.delay;
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
