"use strict";

import * as mAudio from "./module_audio.js";
import * as mRenderer from "./module_renderer.js";
import * as mPhysics from "./module_physics.js";
import * as mInput from "./module_input.js";
import * as mAnim from "./module_animation.js";
import { AnimationIds, States, ObjectTypes, AudioIds } from "./constants.js";

let running = true;
let debugLevel = 0;
let fileSpriteSheet;
let projectile_id = 0;
const objects = [];

function newProjectileBall(x, y, dir) {
  const projectile = {
    name: `projectile_ball_${projectile_id++}`,
    active: true,
    type: ObjectTypes.PROJECTILE,
    body: mPhysics.newPhysicsBody(x, y, 10, 10, 5, 0, dir, 5, 0),
    animator: mAnim.newAnimator(AnimationIds.BALL_FIRED, States.NORMAL),
    renderable: mRenderer.newRenderableSprite(x, y, 10, 10, 0.5, 0.5, false, false, fileSpriteSheet, 0),
    playable: mAudio.newPlayableEffect(),
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
    animator: mAnim.newAnimator(AnimationIds.IDLE, States.NORMAL),
    renderable: mRenderer.newRenderableSprite(x, y, 24, 40, 0.5, 1, false, false, fileSpriteSheet, 0),
    playable: mAudio.newPlayableEffect(),
    energy: 3,
    lastStepTime: 0,
    renderableEnvelope: mRenderer.newRenderableGeometry(x, y, 24, 40, false, false, "rect", "white", false),
    renderableBoundingBox: mRenderer.newRenderableGeometry(x, y, 0, 0, false, false, "rect", "blue", false),
  };
  objects.push(character);
  return character;
}

export async function init(spriteSheet) {
  fileSpriteSheet = spriteSheet;
  newCharacterMegaman("player", 180, 50, 3, 1);
  newCharacterMegaman("enemy_01", 20, 180, 2, 1);
  newCharacterMegaman("enemy_02", 270, 120, 2, -1);
}

export function update(time, theDebugLevel) {
  debugLevel = theDebugLevel;
  removeInactiveObjects(time);
  updatePlayer(time);
  updateObjects(time);
  return running;
}

function removeInactiveObjects(time) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (!obj.active) {
      console.log("Removing object " + obj.name);
      releaseModules(obj);
      objects.splice(i, 1);
    }
  }
}

function updatePlayer(time) {
  if (objects.length === 1 && objects[0].name === "player") {
    mAudio.stopTrack(AudioIds.TRACK_GUITAR);
    objects[0].animator.animationId = AnimationIds.WIN;
    objects[0].body.dir = 1;
    objects[0].body.xSpeed = 0;
    objects[0].body.xAccel = 0;
    objects[0].body.xDecel = 0;
    running = false;
  } else if (objects[0].animator.animationId !== AnimationIds.WIN) {
    if (mInput.getAxis("H") !== 0) {
      objects[0].body.dir = mInput.getAxis("H");
      objects[0].body.xAccel = 0.1;
    } else {
      objects[0].body.xAccel = 0;
    }
    objects[0].firing = mInput.isJustPressed("X") ? 1 : mInput.isPressed("X") ? -1 : 0;
    if (mInput.isJustPressed("A") && objects[0].body.floored) {
      console.log("JUMP");
      objects[0].body.yAccel = 1.7;
    }
  }
}

function updateObjects(time) {
  objects.forEach((obj) => {
    if (running) {
      switch (obj.type) {
        case ObjectTypes.PROJECTILE:
          updateProjectiles(obj, time);
          break;
        case ObjectTypes.CHARACTER:
          updateCharacters(obj, time);
          break;
      }
      updatePhysics(obj, time);
    }
    updateModules(obj);
  });
}

function updateProjectiles(obj, time) {
  if (obj.animator.animationId === AnimationIds.BALL_HIT) {
    if (!obj.animator.playing) {
      obj.active = false;
    }
  }
  if ([AnimationIds.BALL_FIRED, AnimationIds.BALL_GOING].includes(obj.animator.animationId)) {
    if (obj.animator.animationId === AnimationIds.BALL_FIRED && !obj.animator.playing) {
      obj.animator.animationId = AnimationIds.BALL_GOING;
    }
    if (obj.body.x < 0 || obj.body.x > 320) {
      obj.active = false;
    }
    const hitCharacter = objects.filter((c) => c.type === ObjectTypes.CHARACTER).find((c) => mPhysics.collision(c.body, obj.body));
    if (hitCharacter) {
      obj.animator.animationId = AnimationIds.BALL_HIT;
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
}

function updateCharacters(obj, time) {
  if (obj.name !== "player") {
    obj.body.xAccel = 0.2;
    if (obj.body.floored && (obj.body.x < obj.body.floor.start || obj.body.x > obj.body.floor.end)) {
      obj.body.dir *= -1;
    }
  }
  if (obj.isHit) {
    obj.animator.animationId = obj.energy === 0 ? AnimationIds.DEATH : AnimationIds.HIT;
    obj.animator.state = States.NORMAL;
    obj.body.xAccel = -obj.body.dir;
    if (time - obj.hitTime > 250) {
      obj.isHit = false;
      if (obj.energy === 0) {
        obj.active = false;
      }
    }
  } else {
    if (obj.body.ySpeed < 0) {
      obj.animator.animationId = AnimationIds.JUMP;
    } else if (obj.body.ySpeed > 0) {
      obj.animator.animationId = AnimationIds.FALL;
    } else if (obj.body.xSpeed > 0) {
      obj.animator.animationId = AnimationIds.WALK;
    } else {
      obj.animator.animationId = AnimationIds.IDLE;
    }
    if (obj.firing === 0) {
      obj.animator.state = States.NORMAL;
    } else {
      obj.animator.state = States.SHOOTING;
      if (obj.firing === 1) {
        newProjectileBall(obj.body.x + obj.body.dir * 27, obj.body.y - 21, obj.body.dir);
      }
    }
  }
}

function updatePhysics(obj, time) {
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

function updateModules(obj) {
  if (obj.playable) {
    obj.playable.effectId = obj.animator.audioEffectId;
    obj.playable.playing = obj.playable.effectId != null;
  }
  if (obj.renderable) {
    obj.renderable.posX = obj.body.x;
    obj.renderable.posY = obj.body.y;
    obj.renderable.flipX = obj.body.dir < 0;
    obj.renderable.index = obj.animator.spriteIndex;
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
  mPhysics.removePhysicsBody(obj.body);
  mAudio.removePlayable(obj.playable);
  mAnim.removeAnimator(obj.animator);
}
