"use strict";

export const RELEASED = 0;
export const JUST_PRESSED = 1;
export const PRESSED = 2;

export const BUTTONS = {
  cross: 0,
  a: 0,
  circle: 1,
  b: 1,
  square: 2,
  x: 2,
  triangle: 3,
  y: 3,
  l1: 4,
  lb: 4,
  r1: 5,
  rb: 5,
  l2: 6,
  lt: 6,
  r2: 7,
  rt: 7,
  share: 8,
  back: 8,
  options: 9,
  start: 9,
  l3: 10,
  lsb: 10,
  r3: 11,
  rsb: 11,
  dPadUp: 12,
  dPadDown: 13,
  dPadLeft: 14,
  dPadRight: 15,
  ps: 16,
  guide: 16,
  sys1: 17,
  sys2: 18,
  sys3: 19,
  sys4: 20,
};

export const AXES = {
  lsh: 0,
  lsv: 1,
  rsh: 2,
  rsv: 3,
};

export const DPAD = {
  NONE: 0,
  HOR: 1,
  VER: 2,
};

export const mappings = {};
const presedKeys = {};
let gamepadAllowed = true;

export function init() {
  window.addEventListener("gamepadconnected", (e) => console.log("Gamepad connected.", e.gamepad.id, e.gamepad.mapping));
  window.addEventListener("gamepaddisconnected", (e) => console.log("Gamepad disconnected.", e.gamepad.id));
  window.addEventListener("keydown", (e) => (presedKeys[e.keyCode] = true));
  window.addEventListener("keyup", (e) => delete presedKeys[e.keyCode]);
}

export function update() {
  let gamepads = [];
  if (gamepadAllowed) {
    try {
      gamepads = navigator.getGamepads();
    } catch (e) {
      console.error(e);
      gamepadAllowed = false;
    }
  }

  const gamepad = gamepads.find((gp) => gp !== null);
  const gamepadDetected = !!gamepad;

  for (const name in mappings) {
    const m = mappings[name];
    if (m.isButton) {
      const gamepadButtonPressed = gamepadDetected ? gamepad.buttons[m.map].pressed : false;
      let state_g = m.map != undefined ? correctButtonState(m.state, gamepadButtonPressed) : false;
      let state_k = m.key != undefined ? correctButtonState(m.state, presedKeys[m.key]) : false;
      m.state = Math.max(state_g, state_k);
    } else {
      let value_k = correctDigitalAxis(presedKeys[m.keyDec], presedKeys[m.keyInc]);
      let value_g = 0;
      let value_d = 0;
      if (gamepadDetected) {
        value_g = correctAxis(gamepad.axes[m.map], m.map === AXES.lsv || m.map === AXES.rsv);
        if (m.acceptDpad === DPAD.HOR) {
          value_d = correctDigitalAxis(gamepad.buttons[BUTTONS.dPadLeft].pressed, gamepad.buttons[BUTTONS.dPadRight].pressed);
        } else if (m.acceptDpad === DPAD.VER) {
          value_d = correctDigitalAxis(gamepad.buttons[BUTTONS.dPadDown].pressed, gamepad.buttons[BUTTONS.dPadUp].pressed);
        }
      }
      m.value = value_g !== 0 ? value_g : value_d !== 0 ? value_d : value_k;
    }
  }
}

export function mapButton(buttonName, p5KeyMapping, buttonMapping) {
  mappings[buttonName] = { isButton: true, key: p5KeyMapping, map: buttonMapping, state: RELEASED };
}

export function mapAxis(axisName, p5KeyMappingDec, p5KeyMappingInc, axisMapping, acceptDpad = DPAD.NONE) {
  mappings[axisName] = {
    isAxis: true,
    keyDec: p5KeyMappingDec,
    keyInc: p5KeyMappingInc,
    map: axisMapping,
    value: 0,
    acceptDpad,
  };
}

export function isJustPressed(buttonName) {
  return mappings[buttonName].state === JUST_PRESSED;
}

export function isPressed(buttonName) {
  return mappings[buttonName].state !== RELEASED;
}

export function getAxis(axisName) {
  return mappings[axisName].value;
}

export function correctAxis(v, invert = false) {
  if (invert) v = -v;
  return v < 0 ? (v < -1 ? -1 : v > -0.1 ? 0 : v) : v > 1 ? 1 : v < 0.1 ? 0 : v;
}

export function correctDigitalAxis(keyDecPressed, keyIncPressed) {
  return keyDecPressed ? -1 : keyIncPressed ? 1 : 0;
}

export function correctButtonState(currState, pressed) {
  return !pressed ? RELEASED : currState === RELEASED ? JUST_PRESSED : PRESSED;
}
