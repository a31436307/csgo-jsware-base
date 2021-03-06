const csgo = require('../util/process.js');
const off = require('../util/offsets.js');
const Vec3 = require('../util/vec.js').Vec3;
const math = require('../util/math.js');
const ents = require('./entities.js');

var localPlayer;

/**
 * Call this to read the local player
 * The local player is just an Entity with some more data and a few more functions
 */
function readLocalPlayer() {
  let index = csgo.readClientState(off("dwClientState_GetLocalPlayer"),  "int"); // find the index of the local player
  localPlayer = ents.getEntity(index); // get the entity that corresponds to that index

  localPlayer.inCross = ents.getEntity(localPlayer.read(off("m_iCrosshairId"), "int") - 1); // the ID of the entity in the player's crosshair

  localPlayer.head = new Vec3(); // we're gonna redefine the head based off of m_vecOrigin instead of the bone
  localPlayer.head.x = localPlayer.read(off('m_vecOrigin'), 'float');
  localPlayer.head.y = localPlayer.read(off('m_vecOrigin') + 4, 'float');

  localPlayer.viewOffset = new Vec3(0, 0, localPlayer.read(off('m_vecOrigin')+8, 'float')); // lazy but also less memory reads

  localPlayer.head.z = localPlayer.read(off('m_vecViewOffset') + 8, 'float') + localPlayer.viewOffset.z;

  // get the player's view angles. these technically aren't part of the entity but we're gonna add them
  localPlayer.viewAngles = new Vec3(csgo.readClientState(off('dwClientState_ViewAngles'), "float"),
                                    csgo.readClientState(off('dwClientState_ViewAngles') + 4, "float"),
                                    0); // 0 roll angle

  /**
   * Look at the given target angle
   * @param {Vec2 or Vec3 } targetAngle (y: yaw, x: pitch, z: roll unused)
   */
  localPlayer.lookAt = (targetAngle) => {
    targetAngle = math.normalizeClamp(targetAngle);
    csgo.writeClientState(off('dwClientState_ViewAngles') + 4, targetAngle.y, 'float');
    csgo.writeClientState(off('dwClientState_ViewAngles'), targetAngle.x, 'float');
  }

  /**
   * Aim at the given point
   * @param {Vec3} target (x,y,z) coordinates of point to aim at
   */
  localPlayer.aimAtPoint = (target) => {
    let vecAngles = math.angles(localPlayer.head, target);
    localPlayer.lookAt(vecAngles);
  }

  // these are self explanatory, if you don't get it google dwForceAttack
  localPlayer.shootOnce = () => {
    csgo.writeClient(off('dwForceAttack'), 6, "int");
  }
  localPlayer.startShooting = () => {
    csgo.writeClient(off('dwForceAttack'), true, "int");
  }
  localPlayer.stopShooting = () => {
    csgo.writeClient(off('dwForceAttack'), false, "int");
  }

  /**
   * Makes the player jump for one tick
   */
  localPlayer.jump = () => {
    csgo.writeClient(off('dwForceJump'), 6, "int");
  }

  /**
   * flags which includes things such as checking if we're on the ground
   */
  localPlayer.flags = localPlayer.read(off('m_fFlags'), "int");

  localPlayer.onGround = localPlayer.flags == 257 || localPlayer.flags == 263;

  /**
   * The player is special entity with more data and functions specific to the current player
   */
  module.exports.player = localPlayer;
}

/**
 * Manage the loop that continously reads + updates the local player
 * Should only run after we're reading entities
 */
class readLoop {
  constructor() {
    this.looptime = 5;
    this.loop = () => {
      readLocalPlayer();
      setTimeout(this.loop, this.looptime);
    };
    this.loop();
  }
}
module.exports.readLoop = readLoop;

module.exports.readLocalPlayer = readLocalPlayer;
