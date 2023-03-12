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
let endTime;
let animationFrameId;
let debugView = false;

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
  DEATH: "death",
  WIN: "win",
};

const States = {
  NORMAL: "normal",
  SHOOTING: "shooting",
};

const ProjectileTemplates = {
  SMALL_BALL: {
    name: "projectile_small_ball_",
    body: newPhysicsBody(10, 120, 10, 10, 5, 0),
    animation: newAnimationData(Actions.IDLE, States.NORMAL),
    power: 1,
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

function newProjectile(template, x, y, dir) {
  const projectile = {
    ...template,
    body: { ...template.body, x, y, dir },
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
  document.getElementById("playMessage").style.display = "unset";

  console.log("START");
  //playTrack(track_guitar, true);
  //playTrack(track_drums, true);
  animationFrameId = requestAnimationFrame(frame);
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

  if (input_button_extra_1 === 1) {
    debugView = !debugView;
  }

  if (currTime - endTime > 3000) {
    console.log("END");
    cancelAnimationFrame(animationFrameId);
    cleanup();
  } else {
    animationFrameId = requestAnimationFrame(frame);

    update(currTime);
    draw(currTime);
    input(currTime);

    frameControl.frameCount++;
    if (Math.trunc(currTime) % 1000 === 0) {
      frameControl.fps = frameControl.frameCount;
      frameControl.frameCount = 0;
    }
  }
}

function update(time) {
  for (let i = characters.length - 1; i >= 0; i--) {
    if (!characters[i].active) {
      characters.splice(i, 1);
    }
  }

  characters.forEach((c) => {
    c.next = { action: c.next.action, state: c.next.state };
  });

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.body.x += p.body.dir * p.body.xSpeed;
    if (p.body.x < 0 || p.body.x > 320) {
      console.log("deleting projectile", i, p.body.x);
      projectiles.splice(i, 1);
    }
    const hitCharacter = characters.find((c) => collision(c.body, p.body));
    if (hitCharacter) {
      hitCharacter.isHit = true;
      hitCharacter.hitTime = time;
      hitCharacter.energy -= p.power;
      if (hitCharacter.energy < 0) {
        hitCharacter.energy = 0;
      }
      console.log("deleting projectile", i, hitCharacter.name);
      projectiles.splice(i, 1);
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
      playEffect(audio_sheet, 12, 13);
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
          if (time - c.lastStepTime > 400) {
            c.lastStepTime = time;
            playEffect(audio_sheet, 6, 6.1);
          }
        } else {
          c.next.action = Actions.IDLE;
        }
        if (c.next.fire === 0) {
          c.next.state = States.NORMAL;
        } else {
          c.next.state = States.SHOOTING;
          if (c.next.fire === 1) {
            newProjectile(ProjectileTemplates.SMALL_BALL, c.body.x + c.body.dir * 27, c.body.y - 21, c.body.dir);
            playEffect(audio_sheet, 14, 15);
          }
        }
      }
    });
  }

  characters.forEach((c) => {
    playAnimation(c, time);
  });
}

function draw(time) {
  renderer.clear(ctx);

  ctx.fillStyle = "rgb(128, 128, 128)";
  platforms.forEach((p) => {
    ctx.fillRect(p.start, p.height, p.end - p.start, 5);
  });

  characters.forEach((c) => {
    if (c.animation) {
      showSprite(c.body.x - SPRITE_SIZE / 2, c.body.y - SPRITE_SIZE, c.animation.currFrame, c.body.dir);
      if (debugView) {
        ctx.strokeStyle = "rgb(50, 0, 0)";
        const e = envelope(c.body, true);
        ctx.strokeRect(e.x1, e.y1, e.x2 - e.x1, e.y2 - e.y1);
        ctx.fillStyle = "rgb(255, 255, 255)";
        ctx.fillRect(c.body.x, c.body.y, 1, 1);
      }
    }
  });

  projectiles.forEach((p) => {
    if (p.animation) {
      showSprite(p.body.x - SPRITE_SIZE / 2, p.body.y - SPRITE_SIZE / 2, 37, p.body.dir);
      if (debugView) {
        ctx.strokeStyle = "rgb(50, 0, 0)";
        const e = envelope(p.body);
        ctx.strokeRect(e.x1, e.y1, e.x2 - e.x1, e.y2 - e.y1);
        ctx.fillStyle = "rgb(255, 255, 255)";
        ctx.fillRect(p.body.x, p.body.y, 1, 1);
      }
    }
  });

  if (debugView) {
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
  }

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
    const newAnim = animations.find((a) => a.action === character.next.action && a.state === character.next.state) ?? animations.find((a) => a.action === character.next.action);
    if (isSameAction(newAnim, character.animation)) {
      character.animation = newAnimationData(null, character.animation.state, character.animation.frameIndex, character.animation.previousTime, newAnim);
    } else {
      character.animation = newAnimationData(null, character.animation.state, 0, 0, newAnim);
    }
  }
  if (time - character.animation.previousTime > character.animation.delay) {
    character.animation.previousTime = time;
    if (++character.animation.frameIndex === character.animation.frames.length) {
      character.animation.playing = false;
      character.animation.frameIndex = 0;
    }
  }
  character.animation.currFrame = character.animation.frames[character.animation.frameIndex];
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
