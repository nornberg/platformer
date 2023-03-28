"use strict";

const animations = [];
const animators = [];

export function setAnimation(animationId) {
  const a = { states: [] };
  animations[animationId] = a;
  return a;
}

export function addFrame(anim, state, spriteIndex, delay, audioEffectId) {
  if (!anim.states[state]) {
    anim.states[state] = { frames: [] };
  }
  anim.states[state].frames.push({ spriteIndex, delay, audioEffectId });
}

export function newAnimator(animationId, state) {
  const an = { animationId, state, active: true, playing: false, curranimationId: null, frames: [], frameIndex: 0, frameTime: 0, isStartOfFrame: false };
  animators.push(an);
  return an;
}

export function removeAnimator(animator) {
  if (animator) {
    const i = animators.indexOf(animator);
    animators.splice(i, 1);
  }
}

export function init() {}

export function update(time) {
  animators.forEach((animator) => {
    if (!animator.active) {
      return;
    }

    let frame = null;
    let animationChanged = animator.curranimationId !== animator.animationId;

    if (animationChanged) {
      animator.curranimationId = animator.animationId;
      animator.frames = animations[animator.animationId].states[animator.state].frames;
      animator.playing = true;
      animator.frameTime = time;
      animator.frameIndex = 0;
      animator.isStartOfFrame = true;
      frame = animator.frames[animator.frameIndex];
    } else {
      frame = animator.frames[animator.frameIndex];
      const frameTimePassed = time - animator.frameTime > frame.delay;
      if (frameTimePassed) {
        animator.frameTime = time;
        animator.frameIndex++;
        if (animator.frameIndex === animator.frames.length) {
          animator.frameIndex = 0;
          animator.playing = false;
        }
        animator.isStartOfFrame = true;
        frame = animator.frames[animator.frameIndex];
      } else {
        animator.isStartOfFrame = false;
      }
    }

    animator.spriteIndex = frame.spriteIndex;
    if (animator.isStartOfFrame && frame.audioEffectId) {
      animator.audioEffectId = frame.audioEffectId;
    } else {
      animator.audioEffectId = null;
    }
  });
}
