"use strict";

console.log("WAIT USER ACTION");
onkeydown = onclick = () => {
  onkeydown = onclick = undefined;
  main();
};

let renderer;
let canvasScreen;
let offscreenCanvas;
let ctxScreen;
let ctx;
let audioCtx;
let sprite_sheet;
let audio_sheet;
let track_guitar;
let track_drums;
let input_axis_hor = 0;
let input_axis_ver = 0;
let input_button_fire = 0;
let input_button_jump = 0;
let input_button_extra_1 = 0;
let trackOffset = null;

const SPRITE_SIZE = 56;

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
};

const States = {
  NORMAL: "normal",
  SHOOTING: "shooting",
};

const ProjectileTemplates = {
  SMALL_BALL: {
    name: "projectile_small_ball_",
    body: newPhysicsBody(10, 120, 10, 10, 10, 0),
    animation: newAnimationData(Actions.IDLE, States.NORMAL),
  },
};

const animations = [
  {
    state: States.NORMAL,
    action: Actions.IDLE,
    frames: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 2],
    delay: 50,
  },
  {
    state: States.NORMAL,
    action: Actions.WALK,
    frames: [10, 11, 12, 13, 14, 15],
    delay: 120,
  },
  {
    state: States.NORMAL,
    action: Actions.JUMP,
    frames: [16, 17, 17, 17, 17, 17, 17],
    delay: 100,
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
    state: States.SHOOTING,
    action: Actions.IDLE,
    frames: [4],
    delay: 100,
  },
  {
    state: States.SHOOTING,
    action: Actions.WALK,
    frames: [20, 21, 22, 23, 24, 25],
    delay: 120,
  },
  {
    state: States.SHOOTING,
    action: Actions.JUMP,
    frames: [26, 27, 27, 27, 27, 27, 27],
    delay: 100,
  },
  {
    state: States.SHOOTING,
    action: Actions.FALL,
    frames: [28],
    delay: 1000,
  },
];

const platforms = [
  { start: 0, end: 320, height: 235 },
  { start: 0, end: 150, height: 180 },
  { start: 250, end: 320, height: 120 },
];

const characters = [
  {
    name: "player",
    body: newPhysicsBody(160, 50, 24, 40, 3, 0),
    animation: newAnimationData(Actions.IDLE, States.NORMAL),
    lastStepTime: 0,
  },
];

const projectiles = [];

function newPhysicsBody(x, y, width, height, xSpeed, vSpeed) {
  return { dir: 1, floored: false, x, y, width, height, xSpeed, vSpeed };
}

function newAnimationData(action, state, frameIndex, previousTime, moreAttr) {
  return { action, state, frameIndex, previousTime, currFrame: 0, ...moreAttr };
}

function newProjectile(template, x, y, dir, xSpeed) {
  const projectile = {
    ...template,
    body: { ...template.body, x, y, dir, xSpeed },
  };
  projectiles.push(projectile);
  return projectile;
}

async function main() {
  document.getElementById("startMessage").style.display = "none";
  document.getElementById("loadingMessage").style.display = "unset";

  console.log("SETUP");
  await setup();

  console.log("LOAD");
  await load();

  document.getElementById("loadingMessage").style.display = "none";
  document.getElementById("screen").style.display = "unset";

  console.log("START");
  //playTrack(track_guitar, true);
  //playTrack(track_drums, true);
  requestAnimationFrame(frame);
}

async function setup() {
  canvasScreen = document.getElementById("screen");
  ctxScreen = canvasScreen.getContext("2d");

  offscreenCanvas = new OffscreenCanvas(320, 240);
  ctx = offscreenCanvas.getContext("2d");

  const kx = canvasScreen.width / offscreenCanvas.width;
  const ky = canvasScreen.height / offscreenCanvas.height;
  ctxScreen.scale(kx, ky);
  ctxScreen.imageSmoothingEnabled = false;
  ctxScreen.mozImageSmoothingEnabled = false;
  ctxScreen.webkitImageSmoothingEnabled = false;
  ctxScreen.msImageSmoothingEnabled = false;

  audioCtx = new AudioContext();

  document.addEventListener("keydown", keyDownHandler, false);
  document.addEventListener("keyup", keyUpHandler, false);
}

async function load() {
  renderer = await import("/module_draw.js");
  sprite_sheet = await loadImage("sheet_megaman.png");
  track_guitar = await loadTrack("multi-track_leadguitar.mp3");
  track_drums = await loadTrack("multi-track_drums.mp3");
  audio_sheet = await loadAudio("audio-sheet_countdown.mp3");
}

async function loadImage(url) {
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

function showSprite(x, y, idx, dir) {
  const spritesInARow = sprite_sheet.width / SPRITE_SIZE;
  const iy = Math.trunc(idx / spritesInARow);
  const ix = idx % spritesInARow;
  ctx.save();
  ctx.translate(x + SPRITE_SIZE / 2, y + SPRITE_SIZE / 2);
  if (dir > 0) {
    ctx.scale(1, 1);
    ctx.drawImage(sprite_sheet, ix * SPRITE_SIZE, iy * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
  } else {
    ctx.scale(-1, 1);
    ctx.drawImage(sprite_sheet, ix * SPRITE_SIZE, iy * SPRITE_SIZE, SPRITE_SIZE, SPRITE_SIZE, -SPRITE_SIZE / 2, -SPRITE_SIZE / 2, SPRITE_SIZE, SPRITE_SIZE);
  }
  ctx.restore();
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
  update(currTime);
  draw(currTime);
  input(currTime);
  requestAnimationFrame(frame);
  frameControl.frameCount++;
  if (Math.trunc(currTime) % 1000 === 0) {
    frameControl.fps = frameControl.frameCount;
    frameControl.frameCount = 0;
  }
}

function update(time) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.body.x += p.body.dir * p.body.xSpeed;
    if (p.body.x < 0 || p.body.x > 320) {
      console.log("deleting projectile", i, p.body.x);
      projectiles.splice(i, 1);
    }
  }

  characters.forEach((c) => {
    const floor = checkFloor(c);
    if (c.body.floored) {
      c.body.vSpeed = 0;
      c.body.y = floor.height;
    } else {
      c.body.vSpeed += 0.2;
      if (c.body.vSpeed > 5) c.body.vSpeed = 5;
      c.body.y += c.body.vSpeed;
    }
  });

  if (input_axis_hor !== 0) {
    characters[0].body.dir = input_axis_hor;
    characters[0].body.xSpeed += 0.1;
    if (characters[0].body.xSpeed > 3) characters[0].body.xSpeed = 3;
  } else {
    characters[0].body.xSpeed -= 0.3;
    if (characters[0].body.xSpeed < 0) characters[0].body.xSpeed = 0;
  }
  characters[0].body.x += characters[0].body.dir * characters[0].body.xSpeed;

  if (input_button_extra_1 === 1) {
    characters[0].action = Actions.HIT;
    characters[0].state = States.NORMAL;
    characters[0].hitTime = time;
    playEffect(audio_sheet, 8.1, 8.5);
  }

  if (characters[0].action === Actions.HIT) {
    characters[0].body.x -= characters[0].body.dir;
    if (time - characters[0].hitTime > 250) {
      characters[0].action = Actions.IDLE;
    }
  } else {
    if (characters[0].body.vSpeed < 0) {
      characters[0].action = Actions.JUMP;
    } else if (characters[0].body.vSpeed > 0) {
      characters[0].action = Actions.FALL;
    } else if (characters[0].body.xSpeed > 0) {
      characters[0].action = Actions.WALK;
      if (time - characters[0].lastStepTime > 400) {
        characters[0].lastStepTime = time;
        playEffect(audio_sheet, 6, 6.1);
      }
    } else {
      characters[0].action = Actions.IDLE;
    }

    if (input_button_fire === 0) {
      characters[0].state = States.NORMAL;
    } else {
      characters[0].state = States.SHOOTING;
      if (input_button_fire === 1) {
        console.log("FIRE");
        newProjectile(ProjectileTemplates.SMALL_BALL, characters[0].body.x + characters[0].body.dir * 27, characters[0].body.y - 21, characters[0].body.dir, 5);
        playEffect(audio_sheet, 14, 15);
      }
    }

    if (input_button_jump === 1 && characters[0].body.floored) {
      console.log("JUMP");
      characters[0].body.vSpeed = -5;
      characters[0].body.y--;
      playEffect(audio_sheet, 12, 13);
    }
  }

  characters.forEach((c) => {
    playAnimation(c, time);
  });
}

function draw(time) {
  //ctx.fillStyle = "rgb(50, 50, 50)";
  //ctx.fillRect(0, 0, 320, 240);
  renderer.clear(ctx);

  ctx.fillStyle = "rgb(128, 128, 128)";
  platforms.forEach((p) => {
    ctx.fillRect(p.start, p.height, p.end - p.start, 5);
  });

  characters.forEach((c) => {
    if (c.animation) {
      showSprite(c.body.x - SPRITE_SIZE / 2, c.body.y - SPRITE_SIZE, c.animation.currFrame, c.body.dir);
      ctx.strokeStyle = "rgb(18, 18, 18)";
      ctx.strokeRect(c.body.x - c.body.width / 2, c.body.y - c.body.height, c.body.width, c.body.height);
      ctx.fillStyle = "rgb(255, 255, 255)";
      ctx.fillRect(c.body.x, c.body.y, 1, 1);
    }
  });

  projectiles.forEach((p) => {
    if (p.animation) {
      showSprite(p.body.x - SPRITE_SIZE / 2, p.body.y - SPRITE_SIZE / 2, 37, p.body.dir);
      ctx.strokeStyle = "rgb(18, 18, 18)";
      ctx.strokeRect(p.body.x - p.body.width / 2, p.body.y - p.body.height / 2, p.body.width, p.body.height);
      ctx.fillStyle = "rgb(255, 255, 255)";
      ctx.fillRect(p.body.x, p.body.y, 1, 1);
    }
  });

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

  ctxScreen.drawImage(offscreenCanvas.transferToImageBitmap(), 0, 0);
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
      case "KeyQ":
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
      case "KeyQ":
        input_button_extra_1 = 0;
        return;
      default:
        return;
    }
  }
}

function playAnimation(character, time) {
  if (character.animation?.action !== character.action || character.animation?.state !== character.state) {
    const newAnim = animations.find((a) => a.action === character.action && a.state === character.state) ?? animations.find((a) => a.action === character.action);
    if (isSameAction(newAnim, character.animation)) {
      character.animation = newAnimationData(null, character.animation?.state, character.animation?.frameIndex, character.animation?.previousTime, newAnim);
    } else {
      character.animation = newAnimationData(null, character.animation?.state, 0, 0, newAnim);
    }
  }
  if (time - character.animation.previousTime > character.animation.delay) {
    character.animation.previousTime = time;
    if (++character.animation.frameIndex === character.animation.frames.length) character.animation.frameIndex = 0;
  }
  character.animation.currFrame = character.animation.frames[character.animation.frameIndex];
}

function isSameAction(anim1, anim2) {
  return anim1 && anim2 && anim1.action === anim2.action && anim1.frames.length === anim2.frames.length;
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
