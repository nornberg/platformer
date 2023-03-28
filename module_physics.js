"use strict";

const bodies = [];
let platforms = [];

export function setPlatforms(newPlatforms) {
  platforms = newPlatforms;
}

export function newPhysicsBody(x, y, width, height, xMaxSpeed, yMaxSpeed, dir, xAccel = 0, yAccel = 0, xDecel = 0, yDecel = 0, center = true) {
  const body = { dir, floored: false, x, y, width, height, xMaxSpeed, yMaxSpeed, xSpeed: 0, ySpeed: 0, xAccel, yAccel, xDecel, yDecel, center };
  bodies.push(body);
  return body;
}

export function removePhysicsBody(body) {
  if (body) {
    const i = bodies.indexOf(body);
    bodies.splice(i, 1);
  }
}

export async function init() {}

export function collision(body1, body2) {
  const e1 = calcEnvelope(body1);
  const e2 = calcEnvelope(body2);
  return e1.x2 > e2.x1 && e1.x1 < e2.x2 && e1.y2 > e2.y1 && e1.y1 < e2.y2;
}

export function checkFloor(body, yPrev) {
  const e = calcEnvelope(body);
  const floors = platforms.filter((p) => {
    const check = e.x2 > p.start && e.x1 < p.end && e.y2 >= p.height && yPrev <= p.height;
    return check;
  });

  if (floors.length === 0) {
    body.floor = null;
  } else {
    body.floor = floors[0];
  }
  body.floored = body.floor !== null;
}

export function calcEnvelope(body) {
  if (!body.center)
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
