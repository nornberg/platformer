"use strict";

const animations = [];
const animators = [];

export function setAnimation(id) {
  const a = { id, states: [] };
  animations[id] = a;
  return a;
}

export function addFrame(anim, state, spriteId, delay, audioEffectId) {
  if (!anim.states[state]) {
    anim.states[state] = { frames: [] };
  }
  if (delay || audioEffectId) {
    anim.states[state].frames.push({ spriteId, delay, audioEffectId });
  } else {
    anim.states[state].frames.push(spriteId);
  }
}

export function newAnimator(animId, state) {
  const an = { state: null, currFrame: 0, previousTime: 0, playing: false, active: true };
  animators.push(an);
  if (animId) {
    an.currAnim = animations[animId];
    an.state = state || Object.keys(an.currAnim.states)[0];
    an.currFrame = 0;
    an.currSpriteId = an.currAnim.states[an.state][an.currFrame];
  }
  return an;
}

export function init() {}

export function update(time) {
  animations.forEach((a) => {
    if (!a.active) {
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
  });
}

function isSameAction(anim1, anim2) {
  return anim1 && anim2 && anim1.action === anim2.action && anim1.frames?.length === anim2.frames?.length;
}
