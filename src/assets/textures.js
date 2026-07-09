export const wallColors = {
    1: "rgb(150, 0, 255)",
    2: "rgb(0, 0, 139)",
    3: "rgb(0, 0, 200)",
    4: "rgb(200, 200, 0)",
    5: "rgb(94, 44, 4)",
    6: "rgb(178, 34, 34)"  
};

export const wallTextures = {
    5: new Image(),
    6: new Image()
};
wallTextures[5].src = "library_wall.png";
wallTextures[6].src = "brick_wall.png";

export const npcImages = {
    default: new Image(),
    guard: new Image(),
    mage: new Image(),
    oldMan: new Image()
};
npcImages.default.src = "npc.png";
npcImages.guard.src = "guard.png";