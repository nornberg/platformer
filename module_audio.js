"use strict";

let audioCtx;
let audioOffset = null;

const audioSheets = [];
const audioEffects = [];
const audioTracks = [];

const PlayableTypes = {
  EFFECT: 0,
  TRACK: 1,
};

const playables = [];
let playableId = 0;

export function newPlayableEffect(effectId) {
  const playable = { id: playableId++, type: PlayableTypes.EFFECT, playing: false, effectId };
  playables.push(playable);
  return playable;
}

export function removePlayable(playable) {
  if (playable) {
    const i = playables.indexOf(playable);
    playables.splice(i, 1);
  }
}

export async function init() {
  audioCtx = new AudioContext();
}

export function play(time) {
  playables.forEach((p) => {
    switch (p.type && p.effectId) {
      case PlayableTypes.EFFECT:
        if (p.playing) {
          playEffect(p.effectId);
        }
        break;
      case PlayableTypes.TRACK:
        break;
    }
  });
}

// Chamar o array de audioBuffers e trabalhar em cima desse conceito.
// Um source é algo que "toca" um audioBuffer - pode ter mais de um source rodando um memso audioBuffer ao mesmo tempo.
// Unir este e o próximo em "setAudioBuffer"? Ou deixar separado porque são semanticamente diferentes?
export async function setAudioSheet(sheetId, arrayBuffer) {
  const buffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioSheets[sheetId] = buffer;
}

export async function setTrack(trackId, arrayBuffer) {
  const buffer = await audioCtx.decodeAudioData(arrayBuffer);
  audioTracks[trackId] = buffer;
}

export function setEffect(effectId, audioSheetId, start, end) {
  const effect = { id: effectId, audioSheetId, start, end };
  audioEffects[effectId] = effect;
}

export function playEffect(effectId) {
  const effect = audioEffects[effectId];
  if (effect.start !== effect.end) {
    effect.playing = true;
    console.log("EFFECT START PLAYING", effect.id);
    const source = audioCtx.createBufferSource();
    source.buffer = audioSheets[effect.audioSheetId];
    source.connect(audioCtx.destination);
    source.start(0, effect.start);
    source.stop(audioCtx.currentTime + effect.end - effect.start);
    source.onended = () => {
      console.log("EFFECT END PLAYING", effect.id);
      effect.playing = false;
    };
  }
}

export function playTrack(trackId, loop) {
  const source = audioCtx.createBufferSource();
  source.buffer = audioSheets[trackId];
  source.loop = loop;
  if (audioOffset === null) {
    source.start();
    audioOffset = audioCtx.currentTime;
  } else {
    source.start(0, audioCtx.currentTime - audioOffset);
  }
}

export async function loadAudio(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
}
