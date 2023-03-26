"use strict";

const RELEASED = 0;
const JUST_PRESSED = 1;
const PRESSED = 2;
const BTN_FIRE = 32;
export const BUTTONS = {
  y: 0,
  b: 1,
  a: 2,
  x: 3,
  lt: 4,
  rt: 5,
  lb: 6,
  rb: 7,
  select: 8,
  start: 9,
  lsb: 10,
  rsb: 11,
  sys1: 12,
  sys2: 13,
  sys3: 14,
  sys4: 15,
  sys5: 16,
  sys6: 17,
  sys7: 18,
  sys8: 19,
  sys9: 20,
};
export const AXES = {
  dUp: 9,
  dDown: 9,
  dLeft: 10,
  dRight: 10,
  lsh: 0,
  lsv: 1,
  rsh: 5,
  rsv: 2,
};

const mappings = {};
const presedKeys = {};
let gamepadDetected = false;
let gamepadAllowed = true;

export function init() {
  window.addEventListener("gamepadconnected", (e) => {});
  window.addEventListener("gamepaddisconnected", (e) => {});
  window.addEventListener("keydown", (e) => (presedKeys[e.keyCode] = true));
  window.addEventListener("keyup", (e) => delete presedKeys[e.keyCode]);
}

export function update() {
  const gamepads = [];
  if (gamepadAllowed) {
    try {
      const gamepads = navigator.getGamepads();
    } catch (e) {
      console.error(e);
      gamepadAllowed = false;
    }
  }
  gamepadDetected = !!gamepads[1];
  for (const name in mappings) {
    const m = mappings[name];
    if (m.isButton) {
      const gamepadButtonPressed = gamepadDetected ? gamepads[1].buttons[m.map].pressed : false;
      let state_g = m.map != undefined ? correctButtonState(m.state, gamepadButtonPressed) : false;
      let state_k = m.key != undefined ? correctButtonState(m.state, presedKeys[m.key]) : false;
      m.state = Math.max(state_g, state_k);
    } else {
      const gamepadAxeValue = gamepadDetected ? gamepads[1].axes[m.map] : 0;
      let value_g = correctAxis(gamepadAxeValue);
      let value_k = correctDigitalAxis(presedKeys[m.keyDec], presedKeys[m.keyInc]);
      m.value = value_g !== 0 ? value_g : value_k;
    }
  }
}

export function mapButton(buttonName, p5KeyMapping, buttonMapping) {
  mappings[buttonName] = { isButton: true, key: p5KeyMapping, map: buttonMapping, state: RELEASED };
}

export function mapAxis(axisName, p5KeyMappingDec, p5KeyMappingInc, axisMapping) {
  mappings[axisName] = {
    isAxis: true,
    keyDec: p5KeyMappingDec,
    keyInc: p5KeyMappingInc,
    map: axisMapping,
    value: 0,
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

export function correctAxis(v) {
  return v < 0 ? (v < -1 ? -1 : v > -0.1 ? 0 : v) : v > 1 ? 1 : v < 0.1 ? 0 : v;
}

export function correctDigitalAxis(keyDecPressed, keyIncPressed) {
  return keyDecPressed ? -1 : keyIncPressed ? 1 : 0;
}

export function correctButtonState(currState, pressed) {
  return !pressed ? RELEASED : currState === RELEASED ? JUST_PRESSED : PRESSED;
}

export function draw(mRender) {
  /*
  const size = 10;
  let x = NGS.canvas.width - size - 1;
  let y = 1;
  for (const name in mappings) {
    const m = mappings[name];
    if (m.isButton) {
      drawRect(x, y, size, size, m.state === PRESSED ? 255 : 252);
    } else {
      drawRect(x, y, size, size, 252);
      drawRect(x, y, size / 2 + (m.value * size) / 2, size, 255);
    }
    y += size + 1;
  }*/
}
