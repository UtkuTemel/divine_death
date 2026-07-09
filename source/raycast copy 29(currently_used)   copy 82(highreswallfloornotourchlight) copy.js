const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);

// 1. Set a fixed internal resolution (Try 640x360 or 800x450 for widescreen)
const INTERNAL_WIDTH = 640;
const INTERNAL_HEIGHT = 360;
canvas.width = INTERNAL_WIDTH;
canvas.height = INTERNAL_HEIGHT;

// 2. Use CSS to stretch the canvas to fill the screen
canvas.style.width = "100vw";
canvas.style.height = "100vh";
canvas.style.display = "block";

// 3. Force crisp pixel scaling (no blurry bilinear filtering)
canvas.style.imageRendering = "pixelated"; 
// Fallbacks for different browsers
canvas.style.imageRendering = "-moz-crisp-edges";
canvas.style.imageRendering = "-webkit-crisp-edges";

// 4. Now, 1 ray = 1 pixel of your internal resolution. Perfect quality, great performance.
let NUM_RAYS = canvas.width;
const RAY_STEP_SIZE = 2; // Increase step size for better performance
const MAX_RAYS = Math.min(Math.floor(canvas.width / 2.5), 300); // Limit maximum rays

// Pre-allocate a buffer large enough to handle maximum possible rays
const MAX_INTERNAL_RAYS = 2000; 
const globalDepthBuffer = new Float32Array(MAX_INTERNAL_RAYS);

const loadedImages = new Set(); // Track loaded images to prevent duplicates

// Modify your image loading functions to use caching
function loadImageWithCache(src) {
    if (loadedImages.has(src)) {
        return null; // Already loaded
    }
    
    const img = new Image();
    img.src = src;
    loadedImages.add(src);
    return img;
}


// Add this near the top of your code, with other constants
const GAME_STATES = {
    MENU: 0,
    PLAYING: 1,
    PAUSED: 2,
    DIALOGUE: 3
};

let gameState = GAME_STATES.MENU;

// Menu items
const menuItems = [
    { text: "Start Game", action: "start" },
    { text: "Controls", action: "controls" },
    { text: "About", action: "about" }
];

let selectedMenuItem = 0;

const GAME_PROGRESS = {
    hasStudiedInLibrary: false,
    // Add other global flags here as needed
};

const GAME_STATE = {
    levels: {}, // This will store the persistent state for each level
    player: {
        health: 100,
        inventory: [],
        position: null
    }
};
function initializeLevelState(levelName) {
    if (!GAME_STATE.levels[levelName]) {
        GAME_STATE.levels[levelName] = {
            enemies: [],
            items: [],
            objects: [],
            visited: false
        };
    }
}



const backgroundImage = new Image();
backgroundImage.src = "background.avif"; // Replace with your image path
backgroundImage.onload = function() {
    console.log("Background loaded");
};

const floorCeilingColors = {
    default: {
        floor: "rgb(66, 41, 71)",
        ceiling: "rgb(142, 6, 196)"
    },
    library: {
        floor: "rgb(40, 30, 30)",
        ceiling: "rgb(20, 10, 10)"
    }
};



const levelTextures = {}; // This will store loaded textures for each level

function loadLevelTextures(levelName) {
    projectiles.length = 0;
    const level = LEVELS[levelName];
    if (!level) return;
    
    currentLevel = levelName;
    map = level.map;
    
    // Initialize level state if needed
    initializeLevelState(levelName);
    
    // Load persistent objects
    objects = [...(level.objects || [])];
    wallObjects = [...(level.wallObjects || [])];
    
    // Fix: Initialize door states for wall objects
    wallObjects.forEach(obj => {
        if (obj.type === "door") {
            // Initialize door properties if not already set
            if (obj.state === undefined) {
                obj.state = DOOR_STATES.CLOSED;
                obj.animationProgress = 0;
                // Set locked state based on the door definition
                if (obj.locked === undefined) {
                    obj.locked = false;
                }
            }
        }
    });

    rebuildDoorLookup();

    
    // Initialize if not exists
    if (!levelTextures[levelName]) {
        levelTextures[levelName] = {
            floor: new Image(),
            ceiling: new Image(),
            loaded: false
        };
        
        levelTextures[levelName].floor.src = level.floorTexture;
        levelTextures[levelName].ceiling.src = level.ceilingTexture;
        
        // Set up loading tracking
        let imagesLoaded = 0;
        const checkLoaded = () => {
            imagesLoaded++;
            if (imagesLoaded === 2) {
                levelTextures[levelName].loaded = true;
            }
        };
        
        levelTextures[levelName].floor.onload = checkLoaded;
        levelTextures[levelName].ceiling.onload = checkLoaded;
    }
    
    return levelTextures[levelName];
}
const wallColors = {
    1: "rgb(150, 0, 255)",  // Neon Purple for type 1 walls
    2: "rgb(0, 0, 139)",    // Dark Blue for type 2 walls
    3: "rgb(0, 0, 200)",   // Blue for NPC-related walls (ignored in raycasting)
    4: "rgb(200, 200, 0)",
    5: "rgb(94, 44, 4)",
    6: "rgb(178, 34, 34)"  
};

const wallHeights = {
    1: 0.5,   // Normal height
    2: 0.3,   // Normal height  
    3: 1.0,   // Normal height
    4: 2.0,   // Taller wall - 100% taller
    5: 1.0,   // Normal height
    6: 1.0,   // Normal height
    7: 5,   // Tall wall - 80% taller
    8: 1.0    // Pillar - normal height but special rendering
    
};


// Add this with your other image declarations (near npcImages)
const wallTextures = {
    4: new Image(), // For woods
    5: new Image(), // For library walls
    6: new Image(), //Brick wall
    7: new Image(), // Tall wall texture
    8: new Image()  // Pillar texture
};

wallTextures[4].src = "forestwall.png"; // Make sure this matches your filename exactly
wallTextures[5].src = "library_wall.png"; // Make sure this matches your filename exactly
wallTextures[6].src = "isikli (1).png";
wallTextures[7].src = "tall_wall.png"; 
wallTextures[8].src = "pillar.png";

const SPRITE_SIDES = {
    TWO_SIDED: 2,
    FOUR_SIDED: 4,
    EIGHT_SIDED: 8
};

// Default sprite configurations
const DEFAULT_SPRITE_CONFIG = {
    sides: SPRITE_SIDES.FOUR_SIDED,
    enabled: true,
    angleOffset: 0 // For objects that aren't aligned with grid
};

const npcImages = {
    default: loadImageWithCache("npc.png"),
    guard: loadImageWithCache("guard.png"),
    oldMan: loadImageWithCache("oldMan.png")
};
npcImages.default.src = "npc.png";   // Default NPC
npcImages.guard.src = "guard.png";   // Guard NPC
npcImages.oldMan.src = "oldMan.png";

const npcHeights = {
    "default": 0,   // Normal NPCs
    "guard": 0,     // Guards stand on the ground
    "mage": 0,    // Floating NPC
    "oldMan": 10,   // Slightly above ground
    "bat": -80,     // Flying
    "chest": 0,    // Raised object
    "campfire": 0, // On the ground
};



const ANIMATED_WALLS = {
    9: { // Use a new wall type for animated walls
        frames: [new Image(), new Image(), new Image()], // 3-frame animation
        frameCount: 3,
        frameDelay: 10, // frames between animation updates
        currentFrame: 0,
        frameCounter: 0,
        loaded: false
    },
    10: { // Another animated wall type
        frames: [new Image(), new Image(), new Image(), new Image(), new Image()], // 2-frame animation  
        frameCount: 5,
        frameDelay: 15,
        currentFrame: 0,
        frameCounter: 0,
        loaded: false
    }
};

// Load animated wall textures
ANIMATED_WALLS[9].frames[0].src = "wall_anim1_frame1.png";
ANIMATED_WALLS[9].frames[1].src = "wall_anim1_frame2.png";
ANIMATED_WALLS[9].frames[2].src = "wall_anim1_frame3.png";

ANIMATED_WALLS[10].frames[0].src = "duvarkucukisik20.png";
ANIMATED_WALLS[10].frames[1].src = "duvarkucukisik21.png";
ANIMATED_WALLS[10].frames[2].src = "duvarkucukisik22.png";
ANIMATED_WALLS[10].frames[3].src = "duvarkucukisik31.png";
ANIMATED_WALLS[10].frames[4].src = "duvarkucukisik32.png";
// Check when all frames are loaded
function checkAnimatedWallLoaded(wallType) {
    const wall = ANIMATED_WALLS[wallType];
    let loadedCount = 0;
    
    wall.frames.forEach(frame => {
        frame.onload = () => {
            loadedCount++;
            if (loadedCount === wall.frameCount) {
                wall.loaded = true;
            }
        };
    });
}

checkAnimatedWallLoaded(9);
checkAnimatedWallLoaded(10);

const objectImages = {
  bookcase: {
        front: new Image(),
        frontLeft: new Image(),
        left: new Image(),
        backLeft: new Image(),
        back: new Image(),
        backRight: new Image(),
        right: new Image(),
        frontRight: new Image(),
        side: new Image() // For 2-sided objects
    },
    chest: {
        front: new Image(),
        frontLeft: new Image(),
        left: new Image(),
        backLeft: new Image(),
        back: new Image(),
        backRight: new Image(),
        right: new Image(),
        frontRight: new Image(),
        side: new Image() // For 2-sided objects
    }
};

objectImages.bookcase.front.src = "bookcase front.png";
objectImages.bookcase.left.src = "bookcase left.png";
objectImages.bookcase.right.src = "bookcase right.png";
objectImages.bookcase.back.src = "bookcase front.png";

objectImages.chest.front.src = "chest_front.png";
objectImages.chest.left.src = "chest_side.png";
objectImages.chest.right.src = "chest_side.png";
objectImages.chest.back.src = "chest_back.png";
objectImages.chest.frontLeft.src = "chest_frontleft.png";
objectImages.chest.frontRight.src = "chest_frontright.png";
objectImages.chest.backLeft.src = "chest_backright.png";
objectImages.chest.backRight.src = "chest_backleft.png";

objectImages.weeds = new Image();
objectImages.weeds.src = "weeds.png";

objectImages.campfire = new Image();
objectImages.campfire.src = "campfire.png";

let doorLookup = new Map();
 
function rebuildDoorLookup() {
    doorLookup.clear();
    for (const obj of wallObjects) {
        if (obj.type === "door") {
            doorLookup.set(obj.mapY * 10000 + obj.mapX, obj); // numeric key, no string concat
        }
    }
}

const losCachePool = [];
let losCachePoolMapSize = -1;
 
function getLosCacheBuffer(index, size) {
    if (losCachePoolMapSize !== size) {
        losCachePool.length = 0;
        losCachePoolMapSize = size;
    }
    if (!losCachePool[index]) {
        losCachePool[index] = new Int8Array(size);
    }
    losCachePool[index].fill(-1);
    return losCachePool[index];
}




let wallObjects = [];

// 1. Define object types
const WALL_OBJECTS = {
    torch: {
        frames: 6, // Number of animation frames
        images: [], // Will hold loaded images
        currentFrame: 0,
        frameCount: 0,
        frameDelay: 5,
        size: 0.4,
        yPos: 0.5,
        glow: true,
        loaded: false
    },
    painting: {
        image: new Image(),
        size: 0.6, // Takes up 60% of wall height
        yPos: 0.5, // Centered vertically
        glow: false,
        loaded: false
    }
};

WALL_OBJECTS.painting.image.onload = () => {
    WALL_OBJECTS.painting.loaded = true;
    console.log("Painting image loaded successfully");
};
WALL_OBJECTS.painting.image.onerror = () => {
    console.error("Failed to load painting image, using fallback");
    // Create a colorful fallback
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    // Frame
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, 0, 128, 128);
    
    // Canvas
    ctx.fillStyle = '#F5DEB3';
    ctx.fillRect(10, 10, 108, 108);
    
    // Art - simple landscape
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(15, 15, 98, 40); // Sky
    
    ctx.fillStyle = '#228B22';
    ctx.fillRect(15, 55, 98, 30); // Grass
    
    ctx.fillStyle = '#8B0000';
    ctx.fillRect(40, 35, 48, 30); // Building
    
    // Signature
    ctx.fillStyle = '#000000';
    ctx.font = '10px Arial';
    ctx.fillText('Artist', 90, 110);
    
    const img = new Image();
    img.src = canvas.toDataURL();
    WALL_OBJECTS.painting.image = img;
    WALL_OBJECTS.painting.loaded = true;
};
WALL_OBJECTS.painting.image.src = "painting.png";


function loadTorchFrames() {
    const torch = WALL_OBJECTS.torch;
    let loadedCount = 0;
    
    for (let i = 0; i < torch.frames; i++) {
        const img = new Image();
        img.onload = () => {
            loadedCount++;
            if (loadedCount === torch.frames) {
                torch.loaded = true;
                console.log("All torch frames loaded");
            }
        };
        img.onerror = () => {
            console.error(`Failed to load torch frame ${i+1}`);
            loadedCount++; // Still count as loaded to prevent infinite waiting
        };
        img.src = `torchbloom${i+1}.png`;
        torch.images.push(img);
    }
}
loadTorchFrames();

const DOOR_TYPES = {
    WOODEN: {
        name: "Wooden Door",
        openImage: "door_open.png",
        closedImage: "door_closed.png",
        lockedImage: "door_locked.png",
        keyRequired: "KEY",
        openSound: "door_open.wav",
        closeSound: "door_close.wav",
        lockedSound: "door_locked.wav"
    },
    IRON: {
        name: "Iron Door", 
        openImage: "iron_door_open.png",
        closedImage: "iron_door_closed.png",
        lockedImage: "iron_door_locked.png",
        keyRequired: "IRON_KEY",
        openSound: "iron_door_open.wav",
        closeSound: "iron_door_close.wav",
        lockedSound: "iron_locked.wav"
    }
};

// Door states
const DOOR_STATES = {
    CLOSED: 0,
    OPENED: 1, // New state for a door that is open (and player can pass through)
    LOCKED: 4
};

// Add door object definition to WALL_OBJECTS
WALL_OBJECTS.door = {
    frames: 1,
    images: [],
    currentFrame: 0,
    frameCount: 0,
    frameDelay: 5,
    size: 0.8,
    yPos: 1,
    glow: false,
    loaded: false,
    // Door specific properties
    state: DOOR_STATES.CLOSED,
    type: "WOODEN",
    animationProgress: 0,
    animationSpeed: 0.05,
    targetLevel: null,
    targetPosition: null
};

// Load door images
function loadDoorImages() {
    const door = WALL_OBJECTS.door;
    
    // Load closed door image
    const closedImg = new Image();
    closedImg.onload = () => {
        door.images[DOOR_STATES.CLOSED] = closedImg;
        checkDoorLoaded();
    };
    closedImg.onerror = () => {
        console.error("Failed to load closed door image");
        // Create fallback image
        createFallbackDoorImage(DOOR_STATES.CLOSED);
    };
    closedImg.src = DOOR_TYPES.WOODEN.closedImage;
    
    // Load open door image  
    const openImg = new Image();
    openImg.onload = () => {
        door.images[DOOR_STATES.OPEN] = openImg;
        checkDoorLoaded();
    };
    openImg.onerror = () => {
        console.error("Failed to load open door image");
        createFallbackDoorImage(DOOR_STATES.OPEN);
    };
    openImg.src = DOOR_TYPES.WOODEN.openImage;
    
    // Load locked door image
    const lockedImg = new Image();
    lockedImg.onload = () => {
        door.images[DOOR_STATES.LOCKED] = lockedImg;
        checkDoorLoaded();
    };
    lockedImg.onerror = () => {
        console.error("Failed to load locked door image");
        createFallbackDoorImage(DOOR_STATES.LOCKED);
    };
    lockedImg.src = DOOR_TYPES.WOODEN.lockedImage;
}

function createFallbackDoorImage(state) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    switch(state) {
        case DOOR_STATES.CLOSED:
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(0, 0, 64, 128);
            ctx.fillStyle = '#D2691E';
            ctx.fillRect(20, 10, 24, 100);
            break;
        case DOOR_STATES.OPEN:
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(0, 0, 64, 128);
            ctx.fillStyle = '#D2691E';
            ctx.fillRect(40, 10, 20, 100);
            break;
        case DOOR_STATES.LOCKED:
            ctx.fillStyle = '#696969';
            ctx.fillRect(0, 0, 64, 128);
            ctx.fillStyle = '#FFD700';
            ctx.fillRect(25, 50, 15, 20);
            break;
    }
    
    const img = new Image();
    img.src = canvas.toDataURL();
    WALL_OBJECTS.door.images[state] = img;
    checkDoorLoaded();
}

function checkDoorLoaded() {
    const door = WALL_OBJECTS.door;
    if (door.images[DOOR_STATES.CLOSED] && door.images[DOOR_STATES.OPEN] && door.images[DOOR_STATES.LOCKED]) {
        door.loaded = true;
        console.log("All door images loaded");
    }
}

// Initialize door system
loadDoorImages();

// Add door interaction state
let nearbyDoor = null;
let showDoorPrompt = false;
let doorInteractionState = "closed";

// Helper to find a door at a specific map coordinate
function getDoorAt(mapX, mapY) {
    return doorLookup.get(mapY * 10000 + mapX);
}

const STATUS_EFFECTS = {
    BURNING: {
        name: "Burning",
        duration: 12000, // 12 seconds
        tickRate: 3000,  // Damage every 3 seconds
        damagePerTick: 2,
        color: "orange",
        particleColor: "rgba(255, 69, 0, 0.5)",
        shining: true,        
        lightRadius: 250,
        lightIntensity: 1.2,
        lightColor: { r: 255, g: 150, b: 50 }, // Warm orange fire
        flicker: true,
        animation: {
            frames: [],
            frameCount: 4,
            frameDelay: 8, // Adjust this to make the fire animate faster/slower
            currentFrame: 0,
            frameCounter: 0,
            loaded: false
        }
    }
    // Future: FROZEN, POISONED, etc.
};

function loadStatusEffectAnimations() {
    const burningAnim = STATUS_EFFECTS.BURNING.animation;
    let loadedCount = 0;
    
    // Replace these strings with your actual filenames!
    const fileNames = ["fireeffect1.png", "fireeffect2.png", "fireeffect3.png", "fireeffect4.png"]; 
    
    fileNames.forEach(src => {
        const img = new Image();
        img.onload = () => {
            loadedCount++;
            if (loadedCount === burningAnim.frameCount) {
                burningAnim.loaded = true;
                console.log("Burning effect animation loaded");
            }
        };
        img.onerror = () => console.error(`Failed to load ${src}`);
        img.src = src;
        burningAnim.frames.push(img);
    });
}
loadStatusEffectAnimations(); // Execute the loader

// --- 2. SPELL & SCROLL SYSTEM ---
const SPELLS = {
    FIREBALL: {
        name: "Fireball",
        type: "PROJECTILE",
        ageCost: 3,
        damage: 15, // Initial hit damage
        speed: 8,
        range: 600,
        sprite: "fireball.png", // You will need this image
        size: 10,
        onHitEffect: "BURNING", // Refers to STATUS_EFFECTS key
        sound: "fireball_cast.wav",
        shining: true,     // Makes the projectile act as a light source
        lightRadius: 250,   // How far the light reaches in pixels
        lightIntensity: 1.5,
        lightColor: { r: 255, g: 150, b: 50 },
        flicker: true

    },
    TELEPORT: {
        name: "Teleport",
        type: "DASH",
        ageCost: 2,
        distance: 256, // Tweakable: 256 pixels is exactly 4 tiles (4 * 64)
        duration: 300, // Matches castDuration
        sound: "teleport_cast.wav"
    }
    // Future: ICE_SHARD, HEAL_SELF, etc.
};

function applyAgeDebuffs() {
    // Calculate how many 5-year milestones past age 20 the player has hit
    const debuffLevel = Math.max(0, Math.floor((player.age - 20) / 5));

    // 1. Health Debuff (-10 max health per milestone)
    player.maxHealth = Math.max(10, player.baseMaxHealth - (debuffLevel * 10));
    if (player.health > player.maxHealth) {
        player.health = player.maxHealth; // Cap current health to new max
    }

    // 2. Speed Debuff (-0.3 speed per milestone, ensuring it doesn't drop below 1)
    player.speed = Math.max(1.0, player.baseSpeed - (debuffLevel * 0.3));

    // 3. Attack Speed Debuff (+15% swing time per milestone)
    player.attackSpeedMultiplier = 1.0 + (debuffLevel * 0.15);

    console.log(`Aged! Current Age: ${player.age}. MaxHP: ${player.maxHealth}, Speed: ${player.speed}, AtkSpeedMult: ${player.attackSpeedMultiplier}`);
}

const ITEM_TYPES = {
    KEY: {
        name: "Old Key",
        image: "key.png",
        description: "An old rusty key that might unlock something.",
        size: 0.3,
        collectible: true,
        consumable: false
    },
    POTION: {
        name: "Health Potion",
        image: "potion.png",
        description: "Restores 25 health when used.",
        size: 0.25,
        collectible: true,
        consumable: true
    },
    SCROLL: {
        name: "Ancient Scroll",
        image: "scroll.png",
        description: "Contains forbidden knowledge.",
        size: 0.35,
        collectible: true
    }
    // Add more item types as needed
};

const SCROLL_ITEMS = {
    SCROLL_FIRE: {
        name: "Scroll of Fireball",
        type: "SCROLL", // New Item Type
        textureKey: "SCROLL_FIRE",
        spellId: "FIREBALL", // Links to SPELLS
        image: "scroll_fire.png",
        description: "Casts a ball of fire that burns enemies.",
        size: 0.3,
        collectible: true,
        consumable: false // Scrolls are reusable (or true if one-time use)
    },
    SCROLL_TELEPORT: {
        name: "Scroll of Teleportation",
        type: "SCROLL",
        textureKey: "SCROLL_TELEPORT",
        spellId: "TELEPORT",
        image: "scroll_teleport.png", // Ensure you have this image
        description: "Glides the caster forward rapidly. Phases through enemies.",
        size: 0.3,
        collectible: true,
        consumable: false 
    }
};

// Merge into main ITEM_TYPES for the game to recognize them
Object.assign(ITEM_TYPES, SCROLL_ITEMS);

const spellImages = {
    castingHand: loadImageWithCache("hand_cast.png"), // The hand performing the spell
    fireball: loadImageWithCache("fireball.png")      // The projectile
};

const SHIELD_STATES = {
    LOWERED: 0,
    RAISING: 1,
    RAISED: 2,
    LOWERING: 3
};

const SHIELD_TYPES = {
    BASIC: {
        name: "Basic Shield",
        image: "shield1.png", // Keep as fallback/icon
        frameBase: "shield_raise_", // Prefix for animation files
        frameCount: 4, // How many frames in the raising animation
        animationSpeed: 1, // Speed multiplier
        cooldown: 3000,
        parryWindow: 200,
        pushForce: 2.0
    }
    // Add more shield types here later
};

// Shield state
let shield = {
    active: false, // This now means "Is blocking/parrying active?" (Only true when RAISED)
    state: SHIELD_STATES.LOWERED,
    type: SHIELD_TYPES.BASIC,
    cooldownTimer: 0,
    canActivate: true,
    parryActive: false,
    parryTimer: 0,
    image: new Image(),
    
    // New Animation Properties
    frames: [], // Will hold the Image objects
    currentFrameIndex: 0,
    frameTimer: 0,
    frameDelay: 50 // ms per frame
};

function loadShieldAssets() {
    const type = SHIELD_TYPES.BASIC;
    shield.image.src = type.image; // Icon/Fallback
    
    // Load animation frames
    for(let i = 1; i <= type.frameCount; i++) {
        const img = new Image();
        // Assuming your files are named shield_raise_1.png, shield_raise_2.png, etc.
        // If you don't have these yet, the code handles it gracefully below.
        img.src = `${type.frameBase}${i}.png`; 
        shield.frames.push(img);
    }
}
loadShieldAssets();

// Track previous weapon when shield is active
let previousWeapon = null;

function createWeapon({
    name,
    damage,
    range,
    arc,
    swingDuration,
    frameRate,
    damageFrame,
    cooldownDuration,
    animationSrcBase,
    frameCount
}) {
    const animationFrames = [];
    for (let i = 1; i <= frameCount; i++) {
        const img = loadImageWithCache(`${animationSrcBase}${i}.png`);
        if (img) animationFrames.push(img);
    }

    return {
        type: 'weapon',
        name,
        damage,
        range,
        arc,
        swingDuration,
        frameRate,
        damageFrame,
        cooldownDuration,
        animationFrames,
        isSwinging: false,
        icon: animationFrames[0],
        currentFrame: 0,
        lastFrameTime: 0,
        hasDealtDamage: false,
        swingCooldown: 0
    };
}
const sword = createWeapon({
    name: "Basic Sword",
    damage: 20,
    range: 60,
    arc: Math.PI / 4,
    swingDuration: 400,
    frameRate: 20,
    damageFrame: 5,
    cooldownDuration: 600, // 600ms cooldown
    animationSrcBase: "kirik",
    frameCount: 10
});

const axe = createWeapon({
    name: "Heavy Axe",
    damage: 35,
    range: 70,
    arc: Math.PI / 3,
    swingDuration: 500,
    frameRate: 8,
    damageFrame: 2,
    cooldownDuration: 1000, // 600ms cooldown
    animationSrcBase: "axe",
    frameCount: 4
});

const inventory = [sword];
let equippedItemIndex = 0;
let equippedItem = inventory[equippedItemIndex];

const playerInventory = {
    items: [],
    maxSlots: 12,
    isOpen: false,
    selectedSlot: 0,
    slotsPerRow: 4
};

const chestInterface = {
    isOpen: false,
    selectedSlot: 0,
    activeChest: null, // Stores reference to the specific chest object currently open
    slotsPerRow: 4
};

const itemImages = {};
for (const itemType in ITEM_TYPES) {
    itemImages[itemType] = new Image();
    itemImages[itemType].src = ITEM_TYPES[itemType].image;
}

// Add ground items array
let groundItems = [];

const enemyImage = new Image();
enemyImage.src = "enemy.png"; 
let currentEnemies = [];
let activeLightSources = [];
const projectileImage = new Image();
projectileImage.src = "projectile.png";
const projectiles = [];

const ENEMY_TYPES = {
    BASIC: {
        name: "Basic Enemy",
        speed: 0.9,
        health: 100,
        damage: 15,
        visionRange: 250,
        attackType: "BASIC_ATTACK",
        sizeMultiplier: 0.6,
        yOffset: 0,
        walkAnimation: {
            frameFiles: ["skt1walking1.png","skt1walking2.png","skt1walking3.png","skt1walking4.png","skt1walking5.png","skt1walking6.png","skt1walking7.png","skt1walking8.png"], // Different enemies can have different frame counts
            frameDelay: 10,
            loaded: false,
            frames: []
        },
        attackAnimation: {
            frameFiles: ["skt1attack1.png","skt1attack2.png","skt1attack3.png"],
            loaded: false,
            frames: []
        },
        idleAnimation: {
            frameFiles: ["skt1standing1.png","skt1standing2.png","skt1standing3.png","skt1standing4.png"], // Use your actual filenames
            frameDelay: 20, // A slower delay often looks good for idle
            loaded: false,
            frames: []
        },
        idleImage: "enemy.png",
        deadImage: "blood_puddle.png",
        deadSizeMultiplier: 0.3, // Make it smaller/flatter when dead
        deadYOffset: -20,          // Adjust this to move the puddle up/down
    },
    FAST: {
        name: "Fast Enemy",
        speed: 2.0,
        health: 20,
        damage: 8,
        visionRange: 300,
        attackType: "QUICK_STRIKE",
        sizeMultiplier: 0.8,
        yOffset: 40,
        walkAnimation: {
            frameFiles: ["fast_walk1.png", "fast_walk2.png"],
            frameDelay: 8, // Faster animation
            loaded: false,
            frames: []
        },
        attackAnimation: {
            frameFiles: ["fast_attack1.png", "fast_attack2.png"],
            loaded: false,
            frames: []
        },
        idleImage: "fast_enemy.png"
    },
    // Add more enemy types as needed
    HEAVY: {
        name: "Heavy Enemy",
        speed: 0.8,
        health: 50,
        damage: 15,
        visionRange: 200,
        attackType: "HEAVY_SLAM",
        sizeMultiplier: 1.3,
        yOffset: 20,
        walkAnimation: {
            frameFiles: ["heavy_walk1.png", "heavy_walk2.png", "heavy_walk3.png"],
            frameDelay: 15, // Slower animation
            loaded: false,
            frames: []
        },
        attackAnimation: {
            frameFiles: ["heavy_attack1.png", "heavy_attack2.png", "heavy_attack3.png"],
            loaded: false,
            frames: []
        },
        idleImage: "heavy_enemy.png"
    },
    ZOMBIE: {
        name: "Zombie Enemy",
        speed: 0.5,
        health: 50,
        damage: 25,
        visionRange: 200,
        attackType: "ZOMBIE_SLASH",
        sizeMultiplier: 0.5,
        yOffset: 0,
        walkAnimation: {
            frameFiles: ["zombiewalk1.png", "zombiewalk2.png", "zombiewalk3.png", "zombiewalk4.png", "zombiewalk5.png", "zombiewalk6.png"],
            frameDelay: 10, 
            loaded: false,
            frames: []
        },
        idleAnimation: {
            frameFiles: ["zombiestanding1.png", "zombiestanding2.png", "zombiestanding3.png"], // Use your actual filenames
            frameDelay: 20, // A slower delay often looks good for idle
            loaded: false,
            frames: []
        },
        attackAnimation: {
            frameFiles: ["zombieattack1.png", "zombieattack2.png", "zombieattack3.png", "zombieattack4.png"],
            loaded: false,
            frames: []
        },
        idleImage: "zombiestanding1.png",
        deadImage: "blood_puddle.png",
        deadSizeMultiplier: 0.3, // Make it smaller/flatter when dead
        deadYOffset: -20,          // Adjust this to move the puddle up/down

        
    }
};
function loadEnemyAssets() {
    for (const type in ENEMY_TYPES) {
        const enemyType = ENEMY_TYPES[type];
        
        // Load walk animation frames
        enemyType.walkAnimation.frames = [];
        for (const frameFile of enemyType.walkAnimation.frameFiles) {
            const img = new Image();
            img.src = frameFile;
            img.onload = () => {
                if (enemyType.walkAnimation.frames.length === enemyType.walkAnimation.frameFiles.length) {
                    enemyType.walkAnimation.loaded = true;
                }
            };
            enemyType.walkAnimation.frames.push(img);
        }
        
        // Load attack animation frames
        enemyType.attackAnimation.frames = [];
        for (const frameFile of enemyType.attackAnimation.frameFiles) {
            const img = new Image();
            img.src = frameFile;
            img.onload = () => {
                if (enemyType.attackAnimation.frames.length === enemyType.attackAnimation.frameFiles.length) {
                    enemyType.attackAnimation.loaded = true;
                }
            };
            enemyType.attackAnimation.frames.push(img);
        }
        if (enemyType.idleAnimation) { // Check if the enemy type has one
            enemyType.idleAnimation.frames = [];
            for (const frameFile of enemyType.idleAnimation.frameFiles) {
                const img = new Image();
                img.src = frameFile;
                img.onload = () => {
                    if (enemyType.idleAnimation.frames.length === enemyType.idleAnimation.frameFiles.length) {
                        enemyType.idleAnimation.loaded = true;
                    }
                };
                enemyType.idleAnimation.frames.push(img);
            }
        }
        // Load idle image
        enemyType.idleImg = new Image();
        enemyType.idleImg.src = enemyType.idleImage;
    }
}

// Call this during game initialization
loadEnemyAssets();
let currentRoamingNpcs = []; // Add this global variable
const ROAMING_NPC_TYPES = {
    MUSHROOM_PERSON: {
        name: "Mushroom Person",
        speed: 1, // Slower than player
        radius: 15,
        interactionRadius: 60,
        sizeMultiplier: 0.5, // 1.0 = Normal, 0.5 = Half size, 2.0 = Double size
        yOffset: 0,          // Adjust this if they look like they are floating or sinking
        // Frames for walking animation
        walkFrames: ["mushroom_walk1.png", "mushroom_walk2.png", "mushroom_walk3.png", "mushroom_walk4.png"],
        frameDelay: 15,
        // Dialogue data
        dialogue: {
            normal: [
                "Mush... room...", 
                "I am walking here!", 
                "The spores guide me."
            ],
            postLibrary: [
                "You smell of old paper...",
                "Do you know the fungus secrets?"
            ]
        },
        images: [], // Will hold loaded images
        loaded: false
    }
    // Add more types here later
};

// 2. Loader function for Roaming NPCs
function loadRoamingNPCAssets() {
    for (const type in ROAMING_NPC_TYPES) {
        const npcDef = ROAMING_NPC_TYPES[type];
        let loadedCount = 0;
        
        npcDef.walkFrames.forEach(src => {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === npcDef.walkFrames.length) {
                    npcDef.loaded = true;
                }
            };
            npcDef.images.push(img);
        });
    }
}
loadRoamingNPCAssets();
let showInteractionText = false;
let nearbyNPC = null;
let showDialogue = false;

let dialogueIndex = 0;
let hasStudiedInLibrary = false;
let nearLibrary = false;
let inLibraryCutscene = false;
let libraryCutsceneText = "You have practiced the art of dark and mysterious for 5 years, which felt like a moment...";
const libraryYears = 5; // Years spent in library

const ENEMY_KNOCKBACK_FORCE = 5;
const ENEMY_COLLISION_RADIUS = 20; // Adjust based on your sprite sizes
const PLAYER_COLLISION_RADIUS = 15;



const TILE_SIZE = 64;
const FOV = Math.PI / 3;
const PROJECTION_PLANE_DIST = (canvas.width / 2) / Math.tan(FOV / 2);

// Dynamic Depth & Illumination Variables
let currentMaxDepth = 600;
let currentMaxLight = 500;
let isDepthFlickering = false;
let depthFlickerOffset = 0;
let depthFlickerTimer = 0;
const MIN_WALL_DISTANCE = 10; // Minimum distance from walls in pixels

// Add this near your other constants
const LEVELS = {
    ENTRANCE: {
        name: "Prison Entrance",
        maxDepth: 600,
        maxLightDistance: 450,
        flickerEnabled: false,
        map: [
            [6, 6, 6, 0, 6, 6, 6, 6],
            [6, 0, 0, 0, 0, 0, 0, 6],
            [0, 0, 3, 0, 0, 0, 0, 6],
            [6, 0, 0, 0, 6, 6, 0, 6],
            [6, 0, 3, 0, 0, 6, 0, 6],
            [6, 3, 0, 0, 0, 0, 0, 6],
            [6, 6, 9, 9, 9, 6, 6, 6]
        ],//TODO: putting a wall at (5,3) crashes the game(freezes) since the first frame.
        playerStart: { x: 100, y: 100, angle: 0 },
        background: "background.avif",
        floorType: "UTKUZEMIN.png",
        ceilingType: "default",
        floorTexture: "UTKUZEMIN.png",
        ceilingTexture: "UTKUZEMIN.png",
        roomHeight: 64,
        objects: [
            {
                x: 2 * TILE_SIZE + TILE_SIZE / 2,
                y: 2 * TILE_SIZE + TILE_SIZE / 2,
                type: "npc",
                name: "Lost Soul",
                interactionType: "talk",
                image: "default",
                interactable: true,
                dialogue: {
                    normal: ["Hello, Welcome to the prison of the mind", "Here, knowledge comes before all!"],
                    postLibrary: ["Long time no see", "Have you learned the dark arts yet?"]
                },
                yOffset: npcHeights["default"] || 0,
                sizeMultiplier: 1.0
            },
            {
                x: 1 * TILE_SIZE + TILE_SIZE / 2,
                y: 5 * TILE_SIZE + TILE_SIZE / 2,
                type: "npc",
                name: "Mega Man",
                image: "guard",
                interactable: true,
                dialogue: {
                    normal: ["The secrets of magic...", "Take years to master."],
                    postLibrary: ["As now you know the secrets", "Years will pass like an instance"]
                },
                interactionType: "talk",
                yOffset: npcHeights["guard"] || 0,
                sizeMultiplier: 0.7
            },
            {
                x: 5 * TILE_SIZE + TILE_SIZE / 2,  // Convert to pixel coordinates
                y: 4 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",
                image: "bookcase",      // image key in a new objectImages map
                interactable: true,     // if false, will not respond to interaction
                dialogue: {
                   normal: ["An old bookcase covered in dust."],
                   postLibrary: ["You recall a passage from one of these tomes."]
                },
                collision: true,        // blocks player/enemy movement
                interactionType: "inspect",
                yOffset: 260,
                sizeMultiplier: 2,
                spriteConfig: {
                   sides: SPRITE_SIDES.FOUR_SIDED,
                   enabled: true,
                   angleOffset: 0
                }
            }
        ],
        wallObjects: [  // New array just for wall-mounted objects
            { mapX: 1, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 2, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 3, mapY: 6, wallFace: 'east', type: "torch" },
            { mapX: 2, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 1, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 6, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 0, wallFace: 'south', type: "painting" },
            { 
    mapX: 5, 
    mapY: 0, 
    wallFace: 'south', 
    type: "door",
    doorType: "WOODEN",
    locked: true,
    keyRequired: "KEY",
    targetLevel: "LIBRARY",
    targetPosition: { x: 100, y: 100 }
}
        ],//TODO:torches appear to the right of the walls, make sure to put them in center
        enemies: [
       {
        x: 5 * TILE_SIZE + TILE_SIZE / 2,
        y: 2 * TILE_SIZE + TILE_SIZE / 2,
        type: "BASIC", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 },
            { x: 7 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 }
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       },
       {
        x: 3 * TILE_SIZE + TILE_SIZE / 2,
        y: 5 * TILE_SIZE + TILE_SIZE / 2,
        type: "BASIC", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 3 * TILE_SIZE + TILE_SIZE / 2, y: 5 * TILE_SIZE + TILE_SIZE / 2 },
            { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 }
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       },
       {
        x: 6 * TILE_SIZE + TILE_SIZE / 2,
        y: 3 * TILE_SIZE + TILE_SIZE / 2,
        type: "ZOMBIE", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 6 * TILE_SIZE + TILE_SIZE / 2, y: 3 * TILE_SIZE + TILE_SIZE / 2 }      
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       },
       {
        x: 6 * TILE_SIZE + TILE_SIZE / 2,
        y: 1 * TILE_SIZE + TILE_SIZE / 2,
        type: "ZOMBIE", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 6 * TILE_SIZE + TILE_SIZE / 2, y: 1 * TILE_SIZE + TILE_SIZE / 2 }
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       }
        ],
        items: [
            {
                x: 3 * TILE_SIZE + TILE_SIZE / 2,
                y: 3 * TILE_SIZE + TILE_SIZE / 2,
                type: "KEY",
                id: "entrance_key_1"
            },
            {
                x: 4 * TILE_SIZE + TILE_SIZE / 2,
                y: 2 * TILE_SIZE + TILE_SIZE / 2,
                type: "POTION",
                id: "entrance_potion_1"
            }
        ],
        exits: [
            {
                x: 7 * TILE_SIZE,
                y: 1 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "LIBRARY",
                targetPosition: { x: 100, y: 100 }
            },
            {
                x: 0 * TILE_SIZE,
                y: 2 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "TEST",
                targetPosition: { x: 100, y: 100 }
            },
            {
                x: 3 * TILE_SIZE,
                y: 0 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "TALL_WALLS_TEST",
                targetPosition: { x: 3 * TILE_SIZE + 30, y: 6 * TILE_SIZE - 30 }
            }
        ]
    },
    MAZE: {
        name: "Ancient Maze",
        maxDepth: 300,        // Much darker level!
        maxLightDistance: 250,
        flickerEnabled: true,
        map: [
            [10, 10, 10, 10, 10, 10, 10, 10],
            [10, 0, 0, 0, 0, 0, 0, 10],
            [10, 10, 10, 10, 10, 10, 0, 10],
            [10, 0, 0, 0, 0, 0, 0, 10],
            [10, 0, 10, 10, 10, 10, 10, 10],
            [10, 0, 0, 0, 0, 0, 0, 10],
            [10, 10, 10, 10, 10, 10, 0, 10],
            [0, 0, 0, 0, 0, 0, 0, 9],
            [9, 9, 9, 9, 9, 9, 9, 9],
        ],
        playerStart: { x: 100, y: 100, angle: 0 },
        background: "black.jpg",
        floorType: "library",
        floorTexture: "woodFloor.avif",
        ceilingTexture: "stoneTex.webp",
        ceilingType: "library",
        roomHeight: 64,
        objects: [
            
        ],
        wallObjects: [  // New array just for wall-mounted objects
            { mapX: 1, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 2, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 3, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 4, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 6, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 1, mapY: 2, wallFace: 'north', type: "torch" },
            { mapX: 2, mapY: 2, wallFace: 'north', type: "torch" },
            { mapX: 3, mapY: 2, wallFace: 'north', type: "torch" },
            { mapX: 4, mapY: 2, wallFace: 'north', type: "torch" },
            { mapX: 5, mapY: 2, wallFace: 'north', type: "torch" },
            { mapX: 6, mapY: 2, wallFace: 'north', type: "torch" },
            { mapX: 1, mapY: 2, wallFace: 'south', type: "torch" },
            { mapX: 2, mapY: 2, wallFace: 'south', type: "torch" },
            { mapX: 3, mapY: 2, wallFace: 'south', type: "torch" },
            { mapX: 4, mapY: 2, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 2, wallFace: 'south', type: "torch" },
            { mapX: 6, mapY: 2, wallFace: 'south', type: "torch" },
            { mapX: 1, mapY: 4, wallFace: 'north', type: "torch" },
            { mapX: 2, mapY: 4, wallFace: 'north', type: "torch" },
            { mapX: 3, mapY: 4, wallFace: 'north', type: "torch" },
            { mapX: 4, mapY: 4, wallFace: 'north', type: "torch" },
            { mapX: 5, mapY: 4, wallFace: 'north', type: "torch" },
            { mapX: 6, mapY: 4, wallFace: 'north', type: "torch" },
            { mapX: 1, mapY: 4, wallFace: 'south', type: "torch" },
            { mapX: 2, mapY: 4, wallFace: 'south', type: "torch" },
            { mapX: 3, mapY: 4, wallFace: 'south', type: "torch" },
            { mapX: 4, mapY: 4, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 4, wallFace: 'south', type: "torch" },
            { mapX: 6, mapY: 4, wallFace: 'south', type: "torch" },
            { mapX: 7, mapY: 2, wallFace: 'west', type: "torch" }
            
        ],
        enemies: [
       {
        x: 4 * TILE_SIZE + TILE_SIZE / 2,
        y: 1 * TILE_SIZE + TILE_SIZE / 2,
        type: "BASIC", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 4 * TILE_SIZE + TILE_SIZE / 2, y: 1 * TILE_SIZE + TILE_SIZE / 2 },
            
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       },
       {
        x: 6 * TILE_SIZE + TILE_SIZE / 2,
        y: 1 * TILE_SIZE + TILE_SIZE / 2,
        type: "BASIC", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 6 * TILE_SIZE + TILE_SIZE / 2, y: 1 * TILE_SIZE + TILE_SIZE / 2 }
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       }
        ],
        
        exits: [
            {
                x: 0 * TILE_SIZE,
                y: 7 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "LIBRARY",
                targetPosition: { x: 6 * TILE_SIZE - 20, y: 1 * TILE_SIZE + 30 }
            }
        ]
    },
    TEST: {
        name: "Test Level",
        maxDepth: 300,        // Much darker level!
        maxLightDistance: 250,
        flickerEnabled: false,
        map: [
            
                [2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
                [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6],
                [2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6],
                [2, 6, 6, 6, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 6],
                [2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 0, 6, 6, 6],
            
        ],
        
        playerStart: { x: 100, y: 100, angle: Math.PI },
        background: "black.jpg",
        floorType: "UTKUZEMIN.png",
        ceilingType: "default",
        floorTexture: "UTKUZEMIN.png",
        ceilingTexture: "UTKUZEMIN.png",
        roomHeight: 64,
        objects: [
            {
                x: 2 * TILE_SIZE + TILE_SIZE / 2,
                y: 2 * TILE_SIZE + TILE_SIZE / 2,
                type: "npc",
                interactable: true,
                image: "default",
                dialogue: {
                    normal: ["Hello, Welcome to the prison of the mind", "Here, knowledge comes before all!"],
                    postLibrary: ["Long time no see", "Have you learned the dark arts yet?"]
                },
                interactionType: "talk",
                yOffset: npcHeights["default"] || -0.5,
                sizeMultiplier: 1.5
            },
            {
                x: 1 * TILE_SIZE + TILE_SIZE / 2,
                y: 5 * TILE_SIZE + TILE_SIZE / 2,
                type: "npc",
                image: "guard",
                interactable: true,
                dialogue: {
                    normal: ["The secrets of magic...", "Take years to master."],
                    postLibrary: ["As now you know the secrets", "Years will pass like an instance"]
                },
                interactionType: "talk",
                yOffset: npcHeights["guard"] || 0,
                sizeMultiplier: 0.7
            },
            {
                x: 4 * TILE_SIZE + TILE_SIZE / 2, 
                y: 4 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",
                image: "chest", 
                interactable: true,
                // NEW: Add inventory to the chest
                chestItems: [axe], // The Axe variable defined earlier
                dialogue: {
                   normal: ["A heavy wooden chest."],
                   postLibrary: ["A heavy wooden chest."]
                },
                collision: true,
                interactionType: "chest", // NEW: Specific interaction type
                yOffset: 0,
                sizeMultiplier: 1,
                spriteConfig: {
                    sides: SPRITE_SIDES.EIGHT_SIDED,
                    enabled: true,
                    angleOffset: 0
                }
            },
            {
                x: 3 * TILE_SIZE + TILE_SIZE / 2,
                y: 3 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",       // Generic object
                image: "weeds",      // You need a puddle.png in objectImages
                interactable: false,  // Can't talk to a puddle
                collision: false,     // <--- Walk through it
                yOffset: 0,           // Sits on floor
                sizeMultiplier: 0.2   // Adjust size
            },
            {
                x: 5 * TILE_SIZE + TILE_SIZE / 2,
                y: 2 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",       // Generic object
                image: "weeds",      // You need a puddle.png in objectImages
                interactable: false,  // Can't talk to a puddle
                collision: false,     // <--- Walk through it
                yOffset: 0,           // Sits on floor
                sizeMultiplier: 0.2   // Adjust size
            },
            {
                x: 4 * TILE_SIZE + TILE_SIZE / 2,
                y: 4 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",       // Generic object
                image: "weeds",      // You need a puddle.png in objectImages
                interactable: false,  // Can't talk to a puddle
                collision: false,     // <--- Walk through it
                yOffset: 0,           // Sits on floor
                sizeMultiplier: 0.2   // Adjust size
            },
            {
                x: 3 * TILE_SIZE + TILE_SIZE / 2,
                y: 1 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",       // Generic object
                image: "weeds",      // You need a puddle.png in objectImages
                interactable: false,  // Can't talk to a puddle
                collision: false,     // <--- Walk through it
                yOffset: 0,           // Sits on floor
                sizeMultiplier: 0.2   // Adjust size
            },{
                x: 4 * TILE_SIZE + TILE_SIZE / 2,
                y: 2 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",       // Generic object
                image: "weeds",      // You need a puddle.png in objectImages
                interactable: false,  // Can't talk to a puddle
                collision: false,     // <--- Walk through it
                yOffset: 0,           // Sits on floor
                sizeMultiplier: 0.2   // Adjust size
            },
        ],
        wallObjects: [  // New array just for wall-mounted objects
            { mapX: 2, mapY: 4, wallFace: 'west', type: "torch" },
            { mapX: 2, mapY: 2, wallFace: 'south', type: "torch" },
            { mapX: 1, mapY: 1, wallFace: 'east', type: "torch" },
            { mapX: 6, mapY: 1, wallFace: 'west', type: "torch" },
            { mapX: 1, mapY: 6, wallFace: 'north', type: "torch" },
            { mapX: 6, mapY: 6, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 3, wallFace: 'north', type: "painting" }
        ],
        enemies: [
       {
            x: 5 * TILE_SIZE + TILE_SIZE / 2,
            y: 2 * TILE_SIZE + TILE_SIZE / 2,
            type: "BASIC", // âœ… Use the ENEMY_TYPES system
            patrolPoints: [
                { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 },
                { x: 7 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 }
            ],
            patrolIndex: 0,
            state: "patrolling",
        }
       ],
       roamingNpcs: [
            {
                type: "MUSHROOM_PERSON",
                name: "Mushroom People",
                x: 3 * TILE_SIZE,
                y: 3 * TILE_SIZE,
                patrolPoints: [
                    { x: 3 * TILE_SIZE, y: 3 * TILE_SIZE },
                    { x: 3 * TILE_SIZE, y: 5 * TILE_SIZE },
                    { x: 6 * TILE_SIZE, y: 5 * TILE_SIZE }
                ]
            },
            {
                type: "MUSHROOM_PERSON",
                name: "Mushroom People",
                x: 3 * TILE_SIZE,
                y: 3 * TILE_SIZE,
                patrolPoints: [
                    { x: 2 * TILE_SIZE, y: 3 * TILE_SIZE },
                    { x: 2 * TILE_SIZE, y: 5 * TILE_SIZE },
                    { x: 7 * TILE_SIZE, y: 5 * TILE_SIZE }
                ]
            },
             {
                type: "MUSHROOM_PERSON",
                name: "Mushroom People",
                x: 3 * TILE_SIZE,
                y: 3 * TILE_SIZE,
                patrolPoints: [
                    { x: 4 * TILE_SIZE, y: 2 * TILE_SIZE },
                    { x: 4 * TILE_SIZE, y: 4 * TILE_SIZE },
                    { x: 7 * TILE_SIZE, y: 4 * TILE_SIZE }
                ]
            }
        ],
        exits: [
            {
                x: 0 * TILE_SIZE,
                y: 2 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "MAZE",
                targetPosition: { x: 100, y: 100 }
            },
            {
                x: 8 * TILE_SIZE,
                y: 8 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "PILLAR_MAZE", 
                targetPosition: { x: TILE_SIZE + 10, y: TILE_SIZE + 10 }
            }
        ]
    },
    LIBRARY: {
        name: "Ancient Library",
        map: [
            [2, 5, 5, 5, 5, 5, 5, 5],
            [0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 3, 0, 0, 0, 0, 2],
            [2, 0, 0, 0, 1, 0, 0, 2],
            [2, 0, 0, 0, 0, 1, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 2],
            [2, 6, 6, 6, 6, 1, 1, 2]
        ],
        playerStart: { x: 100, y: 100, angle: 0 },
        background: "background.jpg",
        floorType: "library",
        floorTexture: "woodFloor.avif",
        ceilingTexture: "stoneTex.webp",
        ceilingType: "library",
        roomHeight: 64,
        objects: [
            {
                x: 2 * TILE_SIZE + TILE_SIZE / 2,
                y: 2 * TILE_SIZE + TILE_SIZE / 2,
                type: "npc",
                image: "oldMan",
                dialogue: {
                    normal: ["This library contains forbidden knowledge", "Time behaves differently here..."],
                    postLibrary: ["You've experienced it now", "The elasticity of time"]
                },
                interactionType: "talk",
                yOffset: npcHeights["oldMan"] || 0,
                sizeMultiplier: 1.5
            },
        ],
        wallObjects: [  // New array just for wall-mounted objects
            { mapX: 4, mapY: 3, wallFace: 'north', type: "torch" },
            { mapX: 2, mapY: 0, wallFace: 'west', type: "torch" },
            { mapX: 0, mapY: 3, wallFace: 'north', type: "painting" }
        ],
        items: [
            {
                x: 2 * TILE_SIZE + TILE_SIZE / 2,
                y: 3 * TILE_SIZE + TILE_SIZE / 2,
                type: "SCROLL",
                id: "library_scroll_1"
            }
        ],
        exits: [
            {
                x: 0 * TILE_SIZE,
                y: 1 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "ENTRANCE",
                targetPosition: { x: 6 * TILE_SIZE - 20, y: 1 * TILE_SIZE + 30 }
            }
        ]
    },
     TALL_WALLS_TEST: {
        name: "Tall Walls Test",
        maxDepth: 300,        // Much darker level!
        maxLightDistance: 250,
        flickerEnabled: false,

        map: [
            [7, 7, 7, 7, 7, 7, 7, 7],
            [7, 0, 0, 0, 0, 0, 0, 7],
            [7, 0, 0, 0, 0, 0, 0, 7],
            [0, 0, 0, 6, 6, 0, 0, 7],
            [7, 0, 0, 0, 6, 0, 0, 7],
            [7, 0, 0, 0, 6, 0, 0, 7],
            [7, 0, 0, 0, 6, 0, 0, 7],
            [7, 0, 0, 0, 0, 0, 0, 7],
            [7, 0, 0, 0, 0, 0, 0, 7],
            [7, 0, 0, 0, 0, 0, 0, 7],
            [7, 7, 7, 7, 7, 7, 7, 7]
            
        ],
        playerStart: { x: 2 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2, angle: 0 },
        background: "black.jpg",
        floorType: "default",
        ceilingType: "default",
        floorTexture: "UTKUZEMIN.png",
        ceilingTexture: "UTKUZEMIN.png",
        roomHeight: 320,
        objects: [],
        wallObjects: [],
        enemies: [],
        items: [],
        exits: [
            {
                x: 0 * TILE_SIZE,
                y: 3 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "ENTRANCE",
                targetPosition: { x: 100, y: 100 }
            }
        ]
    },
    WOODS: {
        name: "The Woods",
        maxDepth: 0,        // Much darker level!
        maxLightDistance: 0,
        flickerEnabled: false,
        map: [
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
            [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
            [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
            [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
            [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
            [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
            [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
            [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
        ],
        playerStart: { x: 300, y: 300, angle: 0 },
        background: "black.jpg",
        floorType: "default",
        floorTexture: "soilfloor.jpg",
        ceilingTexture: "nightsky.jpg",
        ceilingType: "default",
        roomHeight: 200,
        objects: [
            {
                x: 4 * TILE_SIZE + TILE_SIZE / 2,
                y: 4 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",       // Generic object
                image: "campfire",      // You need a puddle.png in objectImages
                interactable: false,  // Can't talk to a puddle
                collision: true,     // <--- Walk through it
                yOffset: 0,           // Sits on floor
                sizeMultiplier: 0.5,   // Adjust size
                shining: true,
                lightRadius: 300,
                lightIntensity: 1.5,
                lightColor: { r: 255, g: 150, b: 50 }, 
                flicker: true,
                flickerOffset: 0
            }
            
        ],
        
        enemies: [
       
        ],
        
        exits: [
            {
                x: 0 * TILE_SIZE,
                y: 7 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "LIBRARY",
                targetPosition: { x: 6 * TILE_SIZE - 20, y: 1 * TILE_SIZE + 30 }
            }
        ]
    },
    
    PILLAR_MAZE: {
        name: "Pillar Maze",
        maxDepth: 300,        // Much darker level!
        maxLightDistance: 250,
        flickerEnabled: false,
        map: [
            [6, 6, 6, 6, 6, 6, 6, 6],
            [6, 0, 8, 0, 8, 0, 8, 6],
            [6, 8, 0, 8, 0, 8, 0, 6],
            [6, 0, 8, 0, 8, 0, 8, 6],
            [6, 8, 0, 8, 0, 8, 0, 6],
            [6, 0, 8, 0, 8, 0, 8, 6],
            [6, 6, 6, 6, 6, 6, 6, 6]
        ],
        playerStart: { x: TILE_SIZE + 10, y: TILE_SIZE + 10, angle: 0 },
        background: "background.avif",
        floorType: "default",
        ceilingType: "default",
        floorTexture: "UTKUZEMIN.png",
        ceilingTexture: "UTKUZEMIN.png",
        roomHeight: 64,
        objects: [],
        wallObjects: [],
        enemies: [],
        items: [],
        exits: [
            {
                x: 6 * TILE_SIZE,
                y: 5 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "ENTRANCE",
                targetPosition: { x: 100, y: 100 }
            }
        ]
    },
    BIGBAD: {
        name: "The Big Bad",
        maxDepth: 300,        // Much darker level!
        maxLightDistance: 250,
        flickerEnabled: true,
        map: [
[6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6],
[6,0,0,0,0,0,0,0,6,0,0,6,0,0,0,6,0,0,0,0,0,0,0,0,6],
[6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,6],
[6,0,0,0,0,0,0,0,6,0,0,6,0,0,0,6,0,0,0,0,0,0,0,0,6],
[6,0,0,0,0,0,0,0,6,6,6,6,0,0,0,6,6,6,6,6,6,6,6,6,6],
[6,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
[6,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
[6,6,6,6,6,6,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
[6,0,0,0,0,0,0,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
[6,0,0,6,6,6,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
[6,0,0,6,6,6,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
[6,0,0,6,6,6,6,6,6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
[6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6],
[6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6]



        ],//TODO: putting a wall at (5,3) crashes the game(freezes) since the first frame.
       playerStart: { 
          x: 6 * TILE_SIZE + TILE_SIZE / 2, 
          y: 8 * TILE_SIZE + TILE_SIZE / 2, 
          angle: 180 
        },
        background: "black.jpg",
        floorType: "UTKUZEMIN.png",
        ceilingType: "default",
        floorTexture: "UTKUZEMIN.png",
        ceilingTexture: "UTKUZEMIN.png",
        roomHeight: 64,
        objects: [
            {
                x: 2 * TILE_SIZE + TILE_SIZE / 2,
                y: 2 * TILE_SIZE + TILE_SIZE / 2,
                type: "npc",
                interactionType: "talk",
                image: "default",
                interactable: true,
                dialogue: {
                    normal: ["Hello, Welcome to the prison of the mind", "Here, knowledge comes before all!"],
                    postLibrary: ["Long time no see", "Have you learned the dark arts yet?"]
                },
                yOffset: npcHeights["default"] || 0,
                sizeMultiplier: 1.0
            },
            {
                x: 1 * TILE_SIZE + TILE_SIZE / 2,
                y: 5 * TILE_SIZE + TILE_SIZE / 2,
                type: "npc",
                image: "guard",
                interactable: true,
                dialogue: {
                    normal: ["The secrets of magic...", "Take years to master."],
                    postLibrary: ["As now you know the secrets", "Years will pass like an instance"]
                },
                interactionType: "talk",
                yOffset: npcHeights["guard"] || 0,
                sizeMultiplier: 0.7
            },
            {
                x: 5 * TILE_SIZE + TILE_SIZE / 2,  // Convert to pixel coordinates
                y: 4 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",
                image: "bookcase",      // image key in a new objectImages map
                interactable: true,     // if false, will not respond to interaction
                dialogue: {
                   normal: ["An old bookcase covered in dust."],
                   postLibrary: ["You recall a passage from one of these tomes."]
                },
                collision: true,        // blocks player/enemy movement
                interactionType: "inspect",
                yOffset: 260,
                sizeMultiplier: 2,
                spriteConfig: {
                   sides: SPRITE_SIDES.FOUR_SIDED,
                   enabled: true,
                   angleOffset: 0
                }
            }, {
                x: 1 * TILE_SIZE + TILE_SIZE / 2, 
                y: 10 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",
                image: "chest", 
                interactable: true,
                shining: true,
                lightRadius: 300,
                lightIntensity: 1.5,
                lightColor: { r: 50, g: 255, b: 50 }, 
                flicker: true,
                // NEW: Add inventory to the chest
                chestItems: [
                    axe,
                    {
                       type: "POTION",
                       name: ITEM_TYPES.POTION.name, // Optional: helps with display
                       quantity: 3,                  // Give a stack of 3
                       description: ITEM_TYPES.POTION.description
                    },
                    {
                       ...SCROLL_ITEMS.SCROLL_FIRE,
                       quantity: 1
                    },
                    {
                      ...SCROLL_ITEMS.SCROLL_TELEPORT,
                      quantity: 1
                    }                

                ], // The Axe variable defined earlier
                dialogue: {
                   normal: ["A heavy wooden chest."],
                   postLibrary: ["A heavy wooden chest."]
                },
                collision: true,
                interactionType: "chest", // NEW: Specific interaction type
                yOffset: 0,
                sizeMultiplier: 1,
                spriteConfig: {
                    sides: SPRITE_SIDES.EIGHT_SIDED,
                    enabled: true,
                    angleOffset: 0
                }
            },
        ],
        wallObjects: [  // New array just for wall-mounted objects
            { mapX: 6, mapY: 7, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 7, wallFace: 'south', type: "torch" },
            { mapX: 4, mapY: 7, wallFace: 'south', type: "torch" },
            { mapX: 3, mapY: 7, wallFace: 'south', type: "torch" },
            { mapX: 2, mapY: 7, wallFace: 'south', type: "torch" },
            { mapX: 1, mapY: 7, wallFace: 'south', type: "torch" },
            { mapX: 3, mapY: 10, wallFace: 'west', type: "painting"},
           /* { mapX: 0, mapY: 8, wallFace: 'east', type: "torch" },
            { mapX: 0, mapY: 9, wallFace: 'east', type: "torch" },
            { mapX: 0, mapY: 10, wallFace: 'east', type: "torch" },
            { mapX: 0, mapY: 11, wallFace: 'east', type: "torch" },
            { mapX: 0, mapY: 12, wallFace: 'east', type: "torch" },
            { mapX: 3, mapY: 11, wallFace: 'north', type: "torch" },
            { mapX: 4, mapY: 11, wallFace: 'north', type: "torch" },
            { mapX: 5, mapY: 11, wallFace: 'north', type: "torch" },
            { mapX: 6, mapY: 11, wallFace: 'north', type: "torch" },
            { mapX: 7, mapY: 11, wallFace: 'north', type: "torch" },
            { mapX: 8, mapY: 11, wallFace: 'north', type: "torch" },*/
            { 
    mapX: 5, 
    mapY: 0, 
    wallFace: 'north', 
    type: "door",
    doorType: "WOODEN",
    locked: true,
    keyRequired: "KEY",
    targetLevel: "LIBRARY",
    targetPosition: { x: 100, y: 100 }
}
        ],//TODO:torches appear to the right of the walls, make sure to put them in center
        enemies: [
       {
        x: 5 * TILE_SIZE + TILE_SIZE / 2,
        y: 2 * TILE_SIZE + TILE_SIZE / 2,
        type: "BASIC", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 },
            { x: 7 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 }
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       },
       {
        x: 3 * TILE_SIZE + TILE_SIZE / 2,
        y: 5 * TILE_SIZE + TILE_SIZE / 2,
        type: "BASIC", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 3 * TILE_SIZE + TILE_SIZE / 2, y: 5 * TILE_SIZE + TILE_SIZE / 2 },
            { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 }
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       },
       {
        x: 6 * TILE_SIZE + TILE_SIZE / 2,
        y: 3 * TILE_SIZE + TILE_SIZE / 2,
        type: "ZOMBIE", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 6 * TILE_SIZE + TILE_SIZE / 2, y: 3 * TILE_SIZE + TILE_SIZE / 2 }      
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       },
       {
        x: 6 * TILE_SIZE + TILE_SIZE / 2,
        y: 1 * TILE_SIZE + TILE_SIZE / 2,
        type: "ZOMBIE", // Reference to ENEMY_TYPES key
        patrolPoints: [
            { x: 6 * TILE_SIZE + TILE_SIZE / 2, y: 1 * TILE_SIZE + TILE_SIZE / 2 }
        ],
        patrolIndex: 0,
        state: "patrolling",
        // All other properties will be inherited from ENEMY_TYPES
       }
        ],
        items: [
            {
                x: 3 * TILE_SIZE + TILE_SIZE / 2,
                y: 3 * TILE_SIZE + TILE_SIZE / 2,
                type: "KEY",
                id: "entrance_key_1"
            },
            {
                x: 4 * TILE_SIZE + TILE_SIZE / 2,
                y: 2 * TILE_SIZE + TILE_SIZE / 2,
                type: "POTION",
                id: "entrance_potion_1"
            }
        ],
        exits: [
            {
                x: 7 * TILE_SIZE,
                y: 1 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "LIBRARY",
                targetPosition: { x: 100, y: 100 }
            },
            {
                x: 0 * TILE_SIZE,
                y: 2 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "TEST",
                targetPosition: { x: 100, y: 100 }
            },
            {
                x: 3 * TILE_SIZE,
                y: 0 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "TALL_WALLS_TEST",
                targetPosition: { x: 3 * TILE_SIZE + 30, y: 6 * TILE_SIZE - 30 }
            },
            {
                x: 24 * TILE_SIZE,
                y: 9 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "WOODS",
                targetPosition: { x: 1 * TILE_SIZE + 30, y: 1 * TILE_SIZE + 30 }
            }
        ]
    }
    
    // Add more levels here
};

let currentLevel = "ENTRANCE";
let map = [];
let objects = [];
let currentRoomHeight = 64;
let transitionAlpha = 0;
const TRANSITION_SPEED = 0.05;
let isTransitioning = false;


const player = {
    x: 100,
    y: 100,
    angle: 0,
    speed: 4,
    baseSpeed: 4,
    height: 32,
    health: 100,
    maxHealth: 100,
    baseMaxHealth: 100,   // NEW: Baseline for debuff calculation
    age: 20,
    attackSpeedMultiplier: 1.0,
    invincible: false, // For invincibility frames after being hit
    invincibleTimer: 0,
    pitch: 0,
    // --- NEW BOBBING VARIABLES ---
    walkAnimTimer: 0,    // Tracks the sine wave phase
    bobSpeed: 10,        // How fast the weapon swings
    bobAmount: 10,       // How many pixels it moves up/down
    // NEW: Teleport/Dash tracking variables
    isDashing: false,
    dashTimer: 0,
    dashSpeed: 0,
    dashAngle: 0
};

player.equippedScroll = null; // Stores the currently equipped scroll object
player.isCasting = false;
player.castingTimer = 0;
player.castDuration = 300; // How long the hand is visible

const MOUSE_SENSITIVITY = 0.002; // Horizontal (Rotation)
const PITCH_SENSITIVITY = 1.0;   // Vertical (Look up/down)
const MAX_PITCH = 200;           // Limit how far you can look up/down

player.handImage = new Image(); 
player.handImage.src = "kirik1.png";

// Enemy attack patterns
const ENEMY_ATTACKS = {
    BASIC_ATTACK: {
        name: "Basic Attack",
        damage: 15,
        range: 50,
        cooldown: 1000, // ms
        windup: 500, // ms before damage is applied
        duration: 700, // ms total animation
        knockback: 100,
        spriteFrames: 4 // Number of animation frames
    },
    ZOMBIE_SLASH: {
        name: "Zombie Slash",
        damage: 20,
        range: 50,
        cooldown: 1000, // ms
        windup: 300, // ms before damage is applied
        duration: 500, // ms total animation
        knockback: 100,
        spriteFrames: 4 // Number of animation frames
    },
    
    // Add more attack types as needed
};

const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);
// Replace your current key event listeners with these:

window.addEventListener("keydown", e => {
    keys[e.code] = true;
   // --- 1. CHEST INTERFACE INPUTS ---
    if (gameState === GAME_STATES.PLAYING && chestInterface.isOpen) {
        if (e.code === "KeyF" || e.code === "Escape") {
            chestInterface.isOpen = false;
            chestInterface.activeChest = null;
        } else if (e.code === "ArrowUp") {
            chestInterface.selectedSlot = Math.max(0, chestInterface.selectedSlot - chestInterface.slotsPerRow);
        } else if (e.code === "ArrowDown") {
            if (chestInterface.activeChest && chestInterface.activeChest.chestItems) {
                const maxSlots = Math.max(0, chestInterface.activeChest.chestItems.length - 1);
                chestInterface.selectedSlot = Math.min(maxSlots, chestInterface.selectedSlot + chestInterface.slotsPerRow);
            }
        } else if (e.code === "ArrowLeft") {
            chestInterface.selectedSlot = Math.max(0, chestInterface.selectedSlot - 1);
        } else if (e.code === "ArrowRight") {
            if (chestInterface.activeChest && chestInterface.activeChest.chestItems) {
                const maxSlots = Math.max(0, chestInterface.activeChest.chestItems.length - 1);
                chestInterface.selectedSlot = Math.min(maxSlots, chestInterface.selectedSlot + 1);
            }
        } else if (e.code === "Space") {
            transferItemFromChest();
        }
        return; 
    }

    // --- 2. MENU INPUTS ---
    if (gameState === GAME_STATES.MENU) {
        if (e.code === "ArrowUp") {
            selectedMenuItem = (selectedMenuItem - 1 + menuItems.length) % menuItems.length;
        } else if (e.code === "ArrowDown") {
            selectedMenuItem = (selectedMenuItem + 1) % menuItems.length;
        } else if (e.code === "Enter") {
            const selectedAction = menuItems[selectedMenuItem].action;
            if (selectedAction === "start") {
                loadLevel("BIGBAD");
                gameState = GAME_STATES.PLAYING;
            }
        }
    } 
    // --- 3. GAMEPLAY INPUTS ---
    else if (gameState === GAME_STATES.PLAYING) {
        
        // >>> FIX: PLAYER INVENTORY NAVIGATION <<<
        if (playerInventory.isOpen) {
            if (e.code === "KeyI" || e.code === "Escape") {
                playerInventory.isOpen = false;
            } 
            else if (e.code === "ArrowUp") {
                playerInventory.selectedSlot = Math.max(0, playerInventory.selectedSlot - playerInventory.slotsPerRow);
            } 
            // FIX: Check if we have items before navigating down
            else if (e.code === "ArrowDown") {
                if (playerInventory.items.length > 0) {
                    playerInventory.selectedSlot = Math.min(playerInventory.items.length - 1, playerInventory.selectedSlot + playerInventory.slotsPerRow);
                }
            } 
            else if (e.code === "ArrowLeft") {
                playerInventory.selectedSlot = Math.max(0, playerInventory.selectedSlot - 1);
            } 
            // FIX: Check if we have items before navigating right
            else if (e.code === "ArrowRight") {
                if (playerInventory.items.length > 0) {
                    playerInventory.selectedSlot = Math.min(playerInventory.items.length - 1, playerInventory.selectedSlot + 1);
                }
            } 
            else if (e.code === "Enter") {
                useSelectedItem(); 
            }
            // IMPORTANT: Return here so we don't process movement keys while inventory is open
            return; 
        } 
        
        // --- STANDARD CONTROLS (Only when inventory is closed) ---
        else {
            if (e.code === "KeyI") {
                playerInventory.isOpen = true;
                playerInventory.selectedSlot = 0;
            }

            if (e.code === "KeyF") {
                const handledEnvInteraction = checkItemProximity();
                if (!handledEnvInteraction) {
                    checkNPCInteraction();
                    if (nearbyNPC) {
                        if (nearbyNPC.interactionType === "chest") {
                            chestInterface.activeChest = nearbyNPC;
                            if (!chestInterface.activeChest.chestItems) {
                                chestInterface.activeChest.chestItems = [];
                            }
                            chestInterface.isOpen = true;
                            chestInterface.selectedSlot = 0;
                        } else {
                            gameState = GAME_STATES.DIALOGUE;
                            dialogueIndex = 0;
                            if (nearLibrary && !inLibraryCutscene && !GAME_PROGRESS.hasStudiedInLibrary) {
                                inLibraryCutscene = true;
                            }
                        }
                    }
                }
            } else if (e.code === "Escape") {
                gameState = GAME_STATES.MENU;
            }
            
            if (e.code === "KeyV") {
                activateShield();
            }
            if (e.code === "KeyB") {
                castSpell();
            }
        }
    } 
    // --- 4. DIALOGUE INPUTS ---
    else if (gameState === GAME_STATES.DIALOGUE) {
        if (e.code === "KeyF" || e.code === "Enter" || e.code === "Space") {
            let dialogueSet = [];
            if (inLibraryCutscene) {
                dialogueSet = [libraryCutsceneText];
            } else if (nearbyNPC) {
                dialogueSet = GAME_PROGRESS.hasStudiedInLibrary ?
                    nearbyNPC.dialogue.postLibrary :
                    nearbyNPC.dialogue.normal;
            }

            dialogueIndex++;

            if (dialogueIndex >= dialogueSet.length) {
                gameState = GAME_STATES.PLAYING;
                dialogueIndex = 0;
                if (inLibraryCutscene) {
                    inLibraryCutscene = false;
                    player.age += libraryYears;
                    GAME_PROGRESS.hasStudiedInLibrary = true;
                    localStorage.setItem('gameProgress', JSON.stringify(GAME_PROGRESS));
                }
            }
        }
    }
});


window.addEventListener("keyup", e => keys[e.code] = false);
window.addEventListener("keydown", e => {
    // Number keys for switching items
    if (e.code.startsWith("Digit")) {
        const index = parseInt(e.code.slice(5)) - 1;
        if (inventory[index]) {
            equippedItemIndex = index;
            equippedItem = inventory[equippedItemIndex];
        }
    }
});
window.addEventListener("keyup", e => {
    keys[e.code] = false;
    
    // Shield deactivation
    if (e.code === "KeyV" && gameState === GAME_STATES.PLAYING) {
        deactivateShield();
    }
});
canvas.addEventListener("click", async () => {
    if (gameState === GAME_STATES.PLAYING) {
        if (!document.pointerLockElement) {
            await canvas.requestPointerLock();
        }
    }
});

// 2. Handle Mouse Movement
document.addEventListener("mousemove", (e) => {
   if (gameState === GAME_STATES.PLAYING && 
        document.pointerLockElement === canvas && 
        !playerInventory.isOpen && 
        !chestInterface.isOpen) {
        // Horizontal Movement (Rotation)
        player.angle += e.movementX * MOUSE_SENSITIVITY;
        
        // Normalize angle (keep between 0 and 2*PI)
        player.angle %= (2 * Math.PI);
        if (player.angle < 0) player.angle += (2 * Math.PI);

        // Vertical Movement (Pitch/Shearing)
        player.pitch -= e.movementY * PITCH_SENSITIVITY;

        // Clamp Pitch (Don't let player look too far up or down)
        player.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, player.pitch));
    }
});
document.addEventListener("contextmenu", e => e.preventDefault());
// Handle Mouse Presses (Attack & Block Start)
document.addEventListener("mousedown", (e) => {
    // Only process input if Playing and Inventory is closed
    if (gameState !== GAME_STATES.PLAYING || playerInventory.isOpen || chestInterface.isOpen) return;

    // --- LEFT CLICK (Attack) ---
    if (e.button === 0) {
        // If pointer isn't locked yet, lock it (standard browser behavior)
        if (!document.pointerLockElement) {
            canvas.requestPointerLock();
            return; // Optional: Don't swing immediately on the "lock" click
        }
        
        // Same logic as 'C' key
        if (sword.swingCooldown <= 0) {
            useEquippedWeapon();
        }
    }

    // --- RIGHT CLICK (Block) ---
    if (e.button === 2) {
        // Same logic as 'V' key down
        activateShield();
    }
});

// Handle Mouse Releases (Block End)
document.addEventListener("mouseup", (e) => {
    if (gameState !== GAME_STATES.PLAYING) return;

    // --- RIGHT CLICK RELEASE ---
    if (e.button === 2) {
        // Same logic as 'V' key up
        deactivateShield();
    }
});

function isTooCloseToSolid(x, y, buffer = MIN_WALL_DISTANCE, options = { walls: true, objects: true }) {
    const checkRadius = buffer;
    const steps = 8;
    const currentObjects = LEVELS[currentLevel].objects;

    // 1. Tilemap collision (walls) - ALL wall types except 3 block movement
    if (options.walls) {
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const checkX = x + Math.cos(angle) * checkRadius;
            const checkY = y + Math.sin(angle) * checkRadius;

            const mapX = Math.floor(checkX / TILE_SIZE);
            const mapY = Math.floor(checkY / TILE_SIZE);

            if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length) {
                return true;
            }

            if (map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) { 
                return true;
            }
        }
    }

    // 2. Object & NPC collision - existing code remains the same
    if (options.objects) {
        for (const obj of currentObjects) {
            const dx = obj.x - x;
            const dy = obj.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            const isSolidObject = obj.collision === true;
            const isBlockingNPC = obj.type === "npc";

            if ((isSolidObject || isBlockingNPC) && dist < buffer) {
                return true;
            }
        }
        for (const npc of currentRoamingNpcs) {
            const dx = npc.x - x;
            const dy = npc.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < buffer + npc.radius) { // Use NPC radius
                return true;
            }
        }
    }

    return false;
}



function movePlayer(deltaTime) {
    if (playerInventory.isOpen || chestInterface.isOpen) return; 
    // -----------------

    let moveX = 0;
    let moveY = 0;

    // Forward/backward movement
    if (keys["ArrowUp"] || keys["KeyW"]) {
        moveX += Math.cos(player.angle) * player.speed;
        moveY += Math.sin(player.angle) * player.speed;
    }
    if (keys["ArrowDown"] || keys["KeyS"]) {
        moveX -= Math.cos(player.angle) * player.speed;
        moveY -= Math.sin(player.angle) * player.speed;
    }

    // Strafing (left/right)
    if (keys["KeyA"]) {
        moveX += Math.cos(player.angle - Math.PI / 2) * player.speed * 0.7;
        moveY += Math.sin(player.angle - Math.PI / 2) * player.speed * 0.7;
    }
    if (keys["KeyD"]) {
        moveX += Math.cos(player.angle + Math.PI / 2) * player.speed * 0.7;
        moveY += Math.sin(player.angle + Math.PI / 2) * player.speed * 0.7;
    }

    // --- NEW: Calculate Bobbing ---
    // Check if we are actually moving
    if (moveX !== 0 || moveY !== 0) {
        // Increment timer based on time passed
        player.walkAnimTimer += deltaTime * player.bobSpeed;
    } else {
        // Reset timer to 0 so the weapon snaps back to rest position when stopped
        // (You could also dampen this, but resetting is snappier)
        player.walkAnimTimer = 0;
    }

    const tryX = player.x + moveX;
    const tryY = player.y + moveY;

     // Check if new position would collide with enemies
    let wouldCollideWithEnemy = false;
    for (const enemy of currentEnemies) {
        if (enemy.state === "DEAD") continue;
        const dx = tryX - enemy.x;
        const dy = tryY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < ENEMY_COLLISION_RADIUS + PLAYER_COLLISION_RADIUS) {
            wouldCollideWithEnemy = true;
            break;
        }
    }

    // Only slide along walls
     // Only slide along walls and enemies
    if (
        !isTooCloseToSolid(tryX, player.y, MIN_WALL_DISTANCE, { walls: true, objects: false }) &&
        !isTooCloseToSolid(tryX, player.y, MIN_WALL_DISTANCE, { walls: false, objects: true }) &&
        !wouldCollideWithEnemy
    ) {
        player.x = tryX;
    }

    if (
        !isTooCloseToSolid(player.x, tryY, MIN_WALL_DISTANCE, { walls: true, objects: false }) &&
        !isTooCloseToSolid(player.x, tryY, MIN_WALL_DISTANCE, { walls: false, objects: true }) &&
        !wouldCollideWithEnemy
    ) {
        player.y = tryY;
    }


    // Rotation
    if (keys["KeyQ"] || keys["ArrowLeft"]) {
        player.angle -= 0.05;
    }
    if (keys["KeyE"] || keys["ArrowRight"]) {
        player.angle += 0.05;
    }
    player.angle %= (2 * Math.PI);
    if (player.angle < 0) {
        player.angle += (2 * Math.PI);
    }
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      fireProjectile();
    }
});
document.addEventListener("keydown", (e) => {
    if (e.code === "KeyC" && sword.swingCooldown <= 0) {
        useEquippedWeapon();
    }
});

  function renderMainMenu() {
    // Dark background with some transparency
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Game title
    ctx.font = "48px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("PRISON OF THE MIND", canvas.width/2, 150);
    
    // Menu items
    ctx.font = "24px 'Press Start 2P'";
    menuItems.forEach((item, index) => {
        if (index === selectedMenuItem) {
            ctx.fillStyle = "rgb(150, 0, 255)"; // Neon purple for selected item
        } else {
            ctx.fillStyle = "white";
        }
        ctx.fillText(item.text, canvas.width/2, 300 + index * 50);
    });
    
    // Instructions at bottom
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.fillText("Use ARROW KEYS to navigate, ENTER to select", canvas.width/2, canvas.height - 50);
}

function renderControlsScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = "36px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("CONTROLS", canvas.width/2, 100);
    
    ctx.font = "18px 'Press Start 2P'";
    ctx.textAlign = "left";
    
    const controls = [
        "WASD or Arrow Keys - Move",
        "Mouse - Look around",
        "F - Interact with objects/NPCs",
        "ESC - Pause game"
    ];
    
    controls.forEach((control, i) => {
        ctx.fillText(control, canvas.width/2 - 200, 200 + i * 40);
    });
    
    // Back option
    ctx.textAlign = "center";
    ctx.fillText("Press ESC to return", canvas.width/2, canvas.height - 50);
}

function renderAboutScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = "36px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("ABOUT", canvas.width/2, 100);
    
    ctx.font = "16px 'Press Start 2P'";
    ctx.textAlign = "center";
    
    const aboutLines = [
        "Prison of the Mind",
        "A mysterious dungeon exploration game",
        "Where time behaves strangely...",
        "",
        "Created with JavaScript",
        "2023"
    ];
    
    aboutLines.forEach((line, i) => {
        ctx.fillText(line, canvas.width/2, 200 + i * 30);
    });
    
    // Back option
    ctx.fillText("Press ESC to return", canvas.width/2, canvas.height - 50);
}


function loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        Object.assign(GAME_STATE, parsedState);
        console.log("Loaded saved game state");
    }
}

function saveGameState() {
    localStorage.setItem('gameState', JSON.stringify(GAME_STATE));
}

function autoSave() {
    savePlayerState();
    updateEnemyPersistentState();
    updateItemPersistentState();
    saveGameState();
}

// Call autoSave periodically (every 30 seconds)
setInterval(autoSave, 30000);

function createEnemyInstance(baseEnemy) {
    const typeDef = ENEMY_TYPES[baseEnemy.type] || ENEMY_TYPES.BASIC;
    
    return {
        ...baseEnemy,
        ...typeDef, // Copy all properties from the type definition
        // Override with instance-specific properties
        x: baseEnemy.x,
        y: baseEnemy.y,
        patrolPoints: baseEnemy.patrolPoints || [],
        attackCooldown: 0,
        currentHealth: baseEnemy.currentHealth || typeDef.health, // Use existing health if available
        state: baseEnemy.state || "patrolling",
        patrolIndex: baseEnemy.patrolIndex || 0,
        walkAnimation: {
            ...typeDef.walkAnimation,
            currentFrame: 0,
            frameCount: 0,
            isMoving: false
        },
        attackAnimation: {
            ...typeDef.attackAnimation,
            currentFrame: 0,
            isAttacking: false
        },
        idleAnimation: {
            ...(typeDef.idleAnimation || {}), // Safely copy properties
            currentFrame: 0,
            frameCount: 0
        }
    };
}



function loadLevel(levelName, playerState = null) {
    const level = LEVELS[levelName];
    if (!level) return;
    
    currentLevel = levelName;
    map = level.map;
    currentRoomHeight = level.roomHeight || 64;
    // --- NEW: Load Level Lighting Settings ---
    currentMaxDepth = level.maxDepth || 600;
    currentMaxLight = level.maxLightDistance || 500;
    isDepthFlickering = level.flickerEnabled || false;
    
    // Initialize level state if needed
    initializeLevelState(levelName);
    
    // Load persistent objects
    objects = [...(level.objects || [])];
    wallObjects = [...(level.wallObjects || [])];
    
    rebuildDoorLookup();

    
    // Load enemies - CRITICAL FIX: Only load living enemies from persistent state
    if (GAME_STATE.levels[levelName].enemies.length > 0) {
        currentEnemies = GAME_STATE.levels[levelName].enemies
            .filter(enemyData => enemyData.currentHealth > 0)
            .map(enemyData => {
                const enemy = createEnemyInstance(enemyData);
                // Ensure health is properly restored
                enemy.currentHealth = enemyData.currentHealth;
                enemy.state = enemyData.state || "patrolling"; // Add fallback
                enemy.patrolIndex = enemyData.patrolIndex || 0;
                enemy.x = enemyData.x;
                enemy.y = enemyData.y;
                return enemy;
            });
    } else {
        // First time loading this level
        currentEnemies = (level.enemies || []).map(createEnemyInstance);
    }
    currentRoamingNpcs = [];
    if (level.roamingNpcs) {
        currentRoamingNpcs = level.roamingNpcs.map(data => {
            const typeDef = ROAMING_NPC_TYPES[data.type];
            return {
                ...data, // x, y, patrolPoints
                ...typeDef, // Copy properties from definition
                // Instance properties
                currentFrame: 0,
                frameCounter: 0,
                patrolIndex: 0,
                facingAngle: 0,
                isMoving: true,
                type: "roaming_npc" // Tag for renderer
            };
        });
    }
    
    // Load items - CRITICAL FIX: Only load uncollected items
    if (GAME_STATE.levels[levelName].items.length > 0) {
        // Use items from persistent state, filtering out collected ones
        groundItems = GAME_STATE.levels[levelName].items.filter(item => !item.collected);
    } else {
        // First time loading this level - create items from level definition
        groundItems = [...(level.items || [])];
        GAME_STATE.levels[levelName].items = groundItems.map(item => ({
            ...item,
            collected: false // Initialize as not collected
        }));
    }
    
    // Mark level as visited
    GAME_STATE.levels[levelName].visited = true;
    
    // Load background image
    backgroundImage.src = level.background;
    loadLevelTextures(levelName);
    
    // Set player position
    if (playerState) {
        player.x = playerState.x;
        player.y = playerState.y;
        player.angle = playerState.angle;
    } else if (GAME_STATE.player.position && GAME_STATE.player.position.x) {
        player.x = GAME_STATE.player.position.x;
        player.y = GAME_STATE.player.position.y;
        player.angle = GAME_STATE.player.position.angle;
    } else {
        player.x = level.playerStart.x;
        player.y = level.playerStart.y;
        player.angle = level.playerStart.angle;
    }
    
    // Load player health and inventory
    if (GAME_STATE.player.health) {
        player.health = GAME_STATE.player.health;
    }
    if (GAME_STATE.player.inventory) {
        playerInventory.items = GAME_STATE.player.inventory;
    }
    
    // Reset level-specific states
    inLibraryCutscene = false;
    showDialogue = false;
    
    console.log(`Entered ${level.name}`);
}
function updateEnemyPersistentState() {
    if (!GAME_STATE.levels[currentLevel]) return;
    
    // Update ALL enemy states in persistent storage (including dead ones)
    GAME_STATE.levels[currentLevel].enemies = currentEnemies.map(enemy => ({
        type: enemy.type,
        x: enemy.x,
        y: enemy.y,
        currentHealth: enemy.currentHealth,
        state: enemy.state,
        patrolIndex: enemy.patrolIndex,
        patrolPoints: enemy.patrolPoints
    }));
    
    // Also include any enemies that were previously dead but might be in the level definition
    const level = LEVELS[currentLevel];
    if (level.enemies) {
        level.enemies.forEach(levelEnemy => {
            const exists = GAME_STATE.levels[currentLevel].enemies.some(
                savedEnemy => savedEnemy.x === levelEnemy.x && savedEnemy.y === levelEnemy.y
            );
            if (!exists) {
                // Add level enemy with dead state if it doesn't exist in saved state
                GAME_STATE.levels[currentLevel].enemies.push({
                    ...levelEnemy,
                    currentHealth: 0, // Mark as dead
                    state: "dead"
                });
            }
        });
    }
}

// Update the item state when items are collected
function updateItemPersistentState() {
    if (!GAME_STATE.levels[currentLevel]) return;
    
    // Update ALL items in persistent storage
    // First, mark all existing items in this level as collected
    GAME_STATE.levels[currentLevel].items.forEach(item => {
        // If the item is not on the ground, it must be collected
        const isOnGround = groundItems.some(groundItem => groundItem.id === item.id);
        item.collected = !isOnGround;
    });
    
    // Add any new items from groundItems that aren't in the persistent state
    groundItems.forEach(groundItem => {
        const exists = GAME_STATE.levels[currentLevel].items.some(
            savedItem => savedItem.id === groundItem.id
        );
        if (!exists) {
            GAME_STATE.levels[currentLevel].items.push({
                ...groundItem,
                collected: false
            });
        }
    });
}

function checkLevelTransitions() {
    if (isTransitioning) return;
    
    const level = LEVELS[currentLevel];
    if (!level.exits) return;
    
    for (const exit of level.exits) {
        if (player.x >= exit.x && player.x <= exit.x + exit.width &&
            player.y >= exit.y && player.y <= exit.y + exit.height) {
            startTransition(exit.targetLevel, exit.targetPosition);
            break;
        }
    }
}

// Save player state
function savePlayerState() {
    GAME_STATE.player = {
        health: player.health,
        inventory: playerInventory.items,
        position: {
            x: player.x,
            y: player.y,
            angle: player.angle
        }
    };
}

function startTransition(targetLevel, targetPosition) {
    isTransitioning = true;
    transitionAlpha = 0;
    
    // Save current state before transition
    updateEnemyPersistentState();
    updateItemPersistentState();
    savePlayerState();
    
    // Fade out
    const fadeOut = setInterval(() => {
        transitionAlpha += TRANSITION_SPEED;
        if (transitionAlpha >= 1) {
            clearInterval(fadeOut);
            
            // Load new level
            loadLevel(targetLevel, {
                x: targetPosition.x,
                y: targetPosition.y,
                angle: player.angle
            });
            
            // Fade in
            const fadeIn = setInterval(() => {
                transitionAlpha -= TRANSITION_SPEED;
                if (transitionAlpha <= 0) {
                    clearInterval(fadeIn);
                    isTransitioning = false;
                    transitionAlpha = 0;
                }
            }, 16);
        }
    }, 16);
}
function updateTorchAnimations() {
    const torch = WALL_OBJECTS.torch;
    if (!torch.loaded) return;
    
    torch.frameCount++;
    if (torch.frameCount >= torch.frameDelay) {
        torch.frameCount = 0;
        torch.currentFrame = (torch.currentFrame + 1) % torch.images.length;
    }
}
function castSpell() {
    // 1. Check if player has a scroll equipped
    if (!player.equippedScroll) {
        console.log("No scroll equipped!");
        return;
    }

    // 2. Visual: Trigger Casting Hand
    player.isCasting = true;
    player.castingTimer = player.castDuration || 300; 
    
    // 3. Get Spell Data
    const spellId = player.equippedScroll.spellId;
    const spell = SPELLS[spellId];

    if (!spell) return;
    
    player.age += spell.ageCost || 0;
    applyAgeDebuffs();

    // 4. Handle Spell Effect
    if (spell.type === "PROJECTILE") {
        const offset = 20; 
        const startX = player.x + Math.cos(player.angle) * offset;
        const startY = player.y + Math.sin(player.angle) * offset;

        projectiles.push({
            x: startX,
            y: startY,
            angle: player.angle, 
            speed: spell.speed,
            damage: spell.damage,
            range: spell.range,
            distanceTraveled: 0,
            size: spell.size,
            active: true,
            sprite: spellImages.fireball, 
            onHitEffect: spell.onHitEffect,
            source: "PLAYER",
            shining: spell.shining || false,
            lightRadius: spell.lightRadius || 0,
            lightIntensity: spell.lightIntensity || 1.0,  // NEW
            lightColor: spell.lightColor || null,         // NEW
            flicker: spell.flicker || false 
        });
    } 
    // NEW: Handle Teleport/Dash
    else if (spell.type === "DASH") {
        player.isDashing = true;
        player.dashTimer = spell.duration;
        player.dashAngle = player.angle; // Lock direction during the dash
        // Calculate speed (pixels per second) based on desired distance and duration
        player.dashSpeed = spell.distance / (spell.duration / 1000);
    }
}

function updateStatusEffectAnimations() {
    for (const key in STATUS_EFFECTS) {
        const anim = STATUS_EFFECTS[key].animation;
        if (anim && anim.loaded) {
            anim.frameCounter++;
            if (anim.frameCounter >= anim.frameDelay) {
                anim.frameCounter = 0;
                anim.currentFrame = (anim.currentFrame + 1) % anim.frameCount;
            }
        }
    }
}

function updateDash(deltaTime) {
    if (!player.isDashing) return;

    // Decrease the timer
    player.dashTimer -= deltaTime * 1000;
    
    // Check if dash is finished
    if (player.dashTimer <= 0) {
        player.isDashing = false;
        return;
    }

    // Calculate movement delta
    const moveDist = player.dashSpeed * deltaTime;
    const tryX = player.x + Math.cos(player.dashAngle) * moveDist;
    const tryY = player.y + Math.sin(player.dashAngle) * moveDist;

    // Move player, checking ONLY against walls (objects: false skips enemies and props)
    if (!isTooCloseToSolid(tryX, player.y, MIN_WALL_DISTANCE, { walls: true, objects: false })) {
        player.x = tryX;
    }
    if (!isTooCloseToSolid(player.x, tryY, MIN_WALL_DISTANCE, { walls: true, objects: false })) {
        player.y = tryY;
    }
}

function updateProjectiles(deltaTime) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];

        // Move
        const moveDist = p.speed * deltaTime * 60; // Normalize speed
        p.x += Math.cos(p.angle) * moveDist;
        p.y += Math.sin(p.angle) * moveDist;
        p.distanceTraveled += moveDist;

        // Range Check
        if (p.distanceTraveled >= p.range) {
            projectiles.splice(i, 1);
            continue;
        }

        // Wall Collision
        const mapX = Math.floor(p.x / TILE_SIZE);
        const mapY = Math.floor(p.y / TILE_SIZE);
        if (checkWallHit(mapX, mapY)) {
            projectiles.splice(i, 1);
            continue;
        }

        // Enemy Collision (If source is PLAYER)
        if (p.source === "PLAYER") {
            for (let j = 0; j < currentEnemies.length; j++) {
                const enemy = currentEnemies[j];
                if (enemy.state === "DEAD") continue;

                const dx = p.x - enemy.x;
                const dy = p.y - enemy.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                // Hit!
                if (dist < ENEMY_COLLISION_RADIUS + p.size) {
                    // Deal Instant Damage
                    enemy.currentHealth -= p.damage;
                    
                    // Apply Status Effect
                    if (p.onHitEffect) {
                        applyStatusEffect(enemy, p.onHitEffect);
                    }

                    // Check Death
                    if (enemy.currentHealth <= 0) {
                        enemy.state = "DEAD";
                        enemy.blocking = false;
                    } else {
                        // Aggro enemy
                        enemy.state = "chasing";
                        enemy.lastSeenX = player.x; 
                        enemy.lastSeenY = player.y;
                        enemy.memoryTimer = 4000;
                    }

                    projectiles.splice(i, 1);
                    break; 
                }
            }
        }
    }
}
function useEquippedWeapon() {
    if (equippedItem.type !== 'weapon' || equippedItem.swingCooldown > 0) return;

    equippedItem.isSwinging = true;
    equippedItem.swingCooldown = equippedItem.cooldownDuration; // ğŸ§  use weapon-specific cooldown
    equippedItem.currentFrame = 0;
    equippedItem.lastFrameTime = performance.now();
    equippedItem.hasDealtDamage = false;

    
}  
function renderSwordSwing() {
    if (!sword.isSwinging) return;

    const radius = 60; // How far the arc reaches
    const arcWidth = sword.arc; // Same as used for hit detection

    ctx.save();

    // Center of screen (player's POV)
    ctx.translate(canvas.width / 2, canvas.height / 2);

    /*// Draw swing arc
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 255, 0, 0.3)"; // Yellowish slash
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -arcWidth / 2, arcWidth / 2);
    ctx.closePath();
    ctx.fill();*/

    ctx.restore();
}



function getAbsoluteMaxDepth() {
    let maxD = currentMaxDepth + depthFlickerOffset;
    for (let i = 0; i < activeLightSources.length; i++) {
        const light = activeLightSources[i];
        const r = light.flicker ? light.radius + Math.max(0, depthFlickerOffset) : light.radius;
        const reach = Math.hypot(player.x - light.x, player.y - light.y) + r;
        if (reach > maxD) maxD = reach;
    }
    return maxD;
}

function isPointVisible(targetX, targetY, distToPlayer) {
    if (distToPlayer <= currentMaxDepth + depthFlickerOffset) return true;
    for (let i = 0; i < activeLightSources.length; i++) {
        const light = activeLightSources[i];
        const r = light.flicker ? light.radius + depthFlickerOffset : light.radius;
        if (Math.hypot(targetX - light.x, targetY - light.y) <= r) return true;
    }
    return false;
}

function calculateIllumination(targetX, targetY, playerDistance) {
    const MIN_BRIGHTNESS = 0.3;
    const MAX_BRIGHTNESS = 1.0;
    const effectiveMaxLight = Math.max(10, currentMaxLight + depthFlickerOffset);

    // Fast alternative to Math.pow(x, 1.5) is x * Math.sqrt(x)
    let distRatio = 1 - Math.min(1, playerDistance / effectiveMaxLight);
    let baseBrightness = MIN_BRIGHTNESS + (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * distRatio;
    let maxBrightness = baseBrightness * Math.sqrt(baseBrightness); 
    
    let finalR = maxBrightness, finalG = maxBrightness, finalB = maxBrightness;

    for (let i = 0; i < activeLightSources.length; i++) {
        const light = activeLightSources[i];
        const r = light.flicker ? light.radius + depthFlickerOffset : light.radius;
        
        // OPTIMIZATION: Compare squared distances before doing heavy math
        const dx = targetX - light.x;
        const dy = targetY - light.y;
        const distSq = (dx * dx) + (dy * dy);
        const radiusSq = r * r;
        
        if (distSq < radiusSq) {
            // Only check line of sight if we are strictly inside the light radius
            if (!isLineOfSightClear(targetX, targetY, light.x, light.y)) {
                continue; 
            }

            // Now we do the expensive square root only when absolutely necessary
            const distToLight = Math.sqrt(distSq);
            let lightRatio = 1 - Math.min(1, distToLight / r);
            let brightness = MIN_BRIGHTNESS + (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * lightRatio;
            
            // Fast power approximation
            brightness = (brightness * Math.sqrt(brightness)) * light.intensity;
            
            if (brightness > maxBrightness) maxBrightness = brightness;

            if (light.color) {
                finalR = Math.max(finalR, brightness * (light.color.r / 255));
                finalG = Math.max(finalG, brightness * (light.color.g / 255));
                finalB = Math.max(finalB, brightness * (light.color.b / 255));
            } else {
                finalR = Math.max(finalR, brightness);
                finalG = Math.max(finalG, brightness);
                finalB = Math.max(finalB, brightness);
            }
        }
    }

    return { 
        level: maxBrightness, 
        r: finalR, 
        g: finalG, 
        b: finalB,
        hasColor: finalR !== finalG || finalG !== finalB 
    };
}

function applyLightingOverlay(ctx, x, y, w, h, lightInfo) {
    // STEP 1: Multiply Pass (Restored original color tinting)
    ctx.globalCompositeOperation = "multiply";
    
    // Fast bitwise integer conversion (| 0) is much faster than Math.floor()
    const r = Math.min(255, lightInfo.r * 255) | 0;
    const g = Math.min(255, lightInfo.g * 255) | 0;
    const b = Math.min(255, lightInfo.b * 255) | 0;
    
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, w, h);

    // STEP 2: Bloom/Overexposure Pass (Restored original bloom effect)
    const maxIntensity = Math.max(lightInfo.r, lightInfo.g, lightInfo.b);
    if (maxIntensity > 1.0) {
        ctx.globalCompositeOperation = "lighter";
        
        const excess = maxIntensity - 1.0;
        const factor = (excess * 150) / maxIntensity;
        
        const overR = Math.min(255, lightInfo.r * factor) | 0;
        const overG = Math.min(255, lightInfo.g * factor) | 0;
        const overB = Math.min(255, lightInfo.b * factor) | 0;
        
        ctx.fillStyle = `rgb(${overR}, ${overG}, ${overB})`;
        ctx.fillRect(x, y, w, h);
    }
    
    // Reset blend mode only once at the end to save overhead
    ctx.globalCompositeOperation = "source-over";
}

function castRays() {
    const rays = [];
    const angleStep = FOV / NUM_RAYS;
    
    // We need these for the occlusion check
    const horizon = (canvas.height / 2) + player.pitch;

    for (let i = 0; i < NUM_RAYS; i++) {
        const rayAngle = player.angle - FOV / 2 + angleStep * i;
        const rayDirX = Math.cos(rayAngle);
        const rayDirY = Math.sin(rayAngle);

        const posX = player.x / TILE_SIZE;
        const posY = player.y / TILE_SIZE;

        let mapX = Math.floor(posX | 0);
        let mapY = Math.floor(posY | 0);

        const deltaDistX = Math.abs(1 / (rayDirX === 0 ? 1e-9 : rayDirX));
        const deltaDistY = Math.abs(1 / (rayDirY === 0 ? 1e-9 : rayDirY));

        let stepX, stepY;
        let sideDistX, sideDistY;

        if (rayDirX < 0) {
            stepX = -1;
            sideDistX = (posX - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1 - posX) * deltaDistX;
        }

        if (rayDirY < 0) {
            stepY = -1;
            sideDistY = (posY - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1 - posY) * deltaDistY;
        }

        let hitFullWall = false; 
        let hits = []; 
        let distAccumulator = 0; 

       const absoluteMaxDepth = getAbsoluteMaxDepth();

        // Safety break to prevent infinite loops
        while (!hitFullWall && distAccumulator < absoluteMaxDepth / TILE_SIZE) {
            let side = 0;
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }

            let perpWallDistTiles;
            if (side === 0) {
                perpWallDistTiles = (mapX - posX + (1 - stepX) / 2) / (rayDirX === 0 ? 1e-9 : rayDirX);
            } else {
                perpWallDistTiles = (mapY - posY + (1 - stepY) / 2) / (rayDirY === 0 ? 1e-9 : rayDirY);
            }
            distAccumulator = Math.abs(perpWallDistTiles);

            // Check bounds
            if (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[mapY].length) {
                const cellValue = map[mapY][mapX];
                
                if (cellValue > 0 && cellValue !== 3) {
                    const distPixels = distAccumulator * TILE_SIZE;
                    
                    const exactHitX = player.x + distPixels * rayDirX;
                    const exactHitY = player.y + distPixels * rayDirY;
                    
                    hits.push({
                        distance: distPixels, 
                        wallType: cellValue,
                        exactHitX: exactHitX,
                        exactHitY: exactHitY,
                        side: side,
                        mapX: mapX,
                        mapY: mapY,
                        rayDirX: rayDirX,
                        rayDirY: rayDirY
                    });

                    // --- NEW OCCLUSION CHECK ---
                    // Instead of checking if height >= 1.0, we check if the wall
                    // physically covers the top of the screen.
                    
                    const heightMult = wallHeights[cellValue] || 1.0;
                    
                    // 1. Calculate how the wall would look
                    // Correct fisheye for accurate height check
                    const beta = rayAngle - player.angle;
                    const correctedDist = distPixels * Math.cos(beta);
                    
                    const geometryHeight = (TILE_SIZE / correctedDist) * PROJECTION_PLANE_DIST;
                    const wallHeight = geometryHeight * heightMult;
                    const floorPixelY = horizon + (geometryHeight / 2);
                    const wallTop = floorPixelY - wallHeight;

                    // 2. Stop condition: 
                    // If the top of the wall is above the screen (y <= 0), 
                    // it blocks everything behind it. Stop!
                    // We also stop if it's explicitly marked as opaque (optional, but 3 blocks movement/sight usually)
                    if (wallTop <= 0) {
                        hitFullWall = true;
                    }
                    
                    // Fallback: If we hit too many transparent walls, stop to save performance
                    if (hits.length > 10) hitFullWall = true;
                }
            }
        }

        let finalDist = Infinity;
        if (hits.length > 0) {
            finalDist = hits[hits.length - 1].distance;
        }

        rays.push({
            angle: rayAngle,
            distance: finalDist,
            steps: hits
        });
    }

    return rays;
}
function checkWallHit(x, y) {
    // NEW: Treat out of bounds as a solid wall
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) {
        return true;
    }
    return map[y][x] > 0 && map[y][x] !== 3; // All walls except type 3 block movement
}

const persistentWallLightCache = new Map();


// --- Renderer (Includes Near Clip and Fixed Object Alignment) ---

function render3D(rays) {
    const columnWidth = canvas.width / NUM_RAYS;
    
    // Reset only the portion of the pre-allocated buffer we are using this frame
    globalDepthBuffer.fill(Infinity, 0, NUM_RAYS); 
    const depthBuffer = globalDepthBuffer; 

    persistentWallLightCache.clear();
    const wallLightCache = persistentWallLightCache;
    const mapWidthForCache = map[0] ? map[0].length : 1;

    const effectiveMaxDepth = currentMaxDepth + depthFlickerOffset;
    const MIN_DISTANCE_CLIP = 5.0;

    const horizon = (canvas.height / 2) + player.pitch;
    const DOOR_SCALE_X = 0.8; 
    const DOOR_SCALE_Y = 0.9; 

    // =========================================================
    // PASS 1: RENDER WALLS & FILL DEPTH BUFFER
    // =========================================================
    rays.forEach((ray, i) => {
        // Store raw Euclidean distance to the wall for occlusion checks later
        depthBuffer[i] = ray.distance; 

        if (!ray.steps || ray.steps.length === 0) return;

       for (let j = ray.steps.length - 1; j >= 0; j--) {
            const hit = ray.steps[j];

            // 1. CALCULATE GEOMETRY FIRST
            const beta = ray.angle - player.angle;
            let correctedDistance = hit.distance * Math.cos(beta);
            correctedDistance = Math.max(MIN_DISTANCE_CLIP, correctedDistance);
            
            // Save corrected distance for Pass 2 geometry
            hit.distanceCorrected = correctedDistance; 

            const heightMultiplier = wallHeights[hit.wallType] || 1.0;
            const geometryHeight = (TILE_SIZE / correctedDistance) * PROJECTION_PLANE_DIST;
            const wallHeight = geometryHeight * heightMultiplier;
            const floorPixelY = horizon + (geometryHeight / 2);
            const wallTop = floorPixelY - wallHeight; 

            // --- NEW: LIGHTING CACHE CHECK ---
            const cacheKey = (hit.mapY * mapWidthForCache + hit.mapX) * 2 + hit.side;

            let lightInfo;

            if (wallLightCache.has(cacheKey)) {
                lightInfo = wallLightCache.get(cacheKey);
            } else {

                // Pull the light check point 2 pixels towards the camera. 
                const lightCheckX = hit.exactHitX - (hit.rayDirX * 2);
                const lightCheckY = hit.exactHitY - (hit.rayDirY * 2);

                if (!isPointVisible(lightCheckX, lightCheckY, hit.distance)) {
                    lightInfo = { level: 0, r: 0, g: 0, b: 0, hasColor: false };
                } else {
                    lightInfo = calculateIllumination(lightCheckX, lightCheckY, correctedDistance);
                    if (hit.side === 1) {
                        lightInfo.level *= 0.85; 
                        lightInfo.r *= 0.85; lightInfo.g *= 0.85; lightInfo.b *= 0.85;
                    } 
                }
                // Save it for the next ray that hits this wall
                wallLightCache.set(cacheKey, lightInfo);
            }

            // OPTIMIZATION: Force integer coordinates to prevent Canvas anti-aliasing math
            const drawX = (i * columnWidth) | 0;
            const drawY = wallTop | 0;
            const drawW = Math.ceil(columnWidth); // Ceil ensures no vertical pixel gaps between columns
            const drawH = wallHeight | 0;

            // If pitch black, just draw black and skip textures
            if (lightInfo.level === 0) {
                ctx.fillStyle = "black";
                ctx.fillRect(drawX, drawY, drawW, drawH);
                continue;
            }

            // --- RENDER BASE WALL ---
            let wallTex = null;
            if (ANIMATED_WALLS[hit.wallType] && ANIMATED_WALLS[hit.wallType].loaded) {
                const anim = ANIMATED_WALLS[hit.wallType];
                wallTex = anim.frames[anim.currentFrame];
            } else if (wallTextures[hit.wallType] && wallTextures[hit.wallType].complete) {
                wallTex = wallTextures[hit.wallType];
            }

            let wallX;
            if (hit.side === 0) wallX = hit.exactHitY;
            else wallX = hit.exactHitX;
            wallX = (wallX / TILE_SIZE) % 1;
            if (wallX < 0) wallX += 1;
            if ((hit.side === 0 && hit.rayDirX > 0) || (hit.side === 1 && hit.rayDirY < 0)) {
                wallX = 1 - wallX;
            }

            if (wallTex) {
                const texX = Math.max(0.005, Math.min(0.995, wallX));
                ctx.drawImage(
                    wallTex, 
                    texX * wallTex.width, 0, 1, wallTex.height, 
                    drawX, drawY, drawW, drawH
                );
            } else {
                ctx.fillStyle = wallColors[hit.wallType] || 'rgb(80,80,80)';
                ctx.fillRect(drawX, drawY, drawW, drawH);
            }

            // --- RENDER DOOR FRAMES & LIGHTING ---
            const doorObj = getDoorAt(hit.mapX, hit.mapY);
            let isDoorFace = false;

            if (doorObj) {
                let faceHit = (hit.side === 0) ? (hit.rayDirX > 0 ? "west" : "east") : (hit.rayDirY > 0 ? "north" : "south");
                if (doorObj.wallFace === faceHit) isDoorFace = true;
            }

            if (isDoorFace) { 
                const doorStart = (1 - DOOR_SCALE_X) / 2;
                const doorEnd = 1 - doorStart;
                const doorDisplayHeight = wallHeight * DOOR_SCALE_Y;
                const doorTop = wallTop + (wallHeight - doorDisplayHeight);

                if (wallX < doorStart || wallX > doorEnd) {
                    applyLightingOverlay(ctx, drawX, drawY, drawW, drawH, lightInfo);
                } else {
                    const topFrameHeight = (doorTop - wallTop) | 0;
                    const bottomFrameY = (doorTop + doorDisplayHeight) | 0;
                    const bottomFrameHeight = ((wallTop + wallHeight) - bottomFrameY) | 0;
                    
                    if (topFrameHeight > 0) applyLightingOverlay(ctx, drawX, drawY, drawW, topFrameHeight, lightInfo);
                    if (bottomFrameHeight > 0) applyLightingOverlay(ctx, drawX, bottomFrameY, drawW, bottomFrameHeight, lightInfo);
                }
            } else {
                applyLightingOverlay(ctx, drawX, drawY, drawW, drawH, lightInfo);
            }

            // --- RENDER DOOR ITSELF ---
            if (isDoorFace) { 
                const doorStart = (1 - DOOR_SCALE_X) / 2;
                const doorEnd = 1 - doorStart;
                if (wallX >= doorStart && wallX <= doorEnd) {
                    const doorTexX = (wallX - doorStart) / DOOR_SCALE_X;
                    const doorDisplayHeight = wallHeight * DOOR_SCALE_Y;
                    const doorTop = wallTop + (wallHeight - doorDisplayHeight); 
                    const stateImage = doorObj.locked ? DOOR_STATES.LOCKED : DOOR_STATES.CLOSED;
                    const doorTex = WALL_OBJECTS.door.images[stateImage];
                    
                    if (doorTex && doorTex.complete) {
                        const doorDrawY = doorTop | 0;
                        const doorDrawH = doorDisplayHeight | 0;
                        ctx.drawImage(doorTex, doorTexX * doorTex.width, 0, 1, doorTex.height, drawX, doorDrawY, drawW, doorDrawH);
                        applyLightingOverlay(ctx, drawX, doorDrawY, drawW, doorDrawH, lightInfo);
                    }
                }
            }
        }
    });

    // =========================================================
    // PASS 2: RENDER WALL OBJECTS (STRICTER VISUAL CHECKS)
    // =========================================================

    const renderedWallObjects = new Set();
    
    rays.forEach((ray, i) => {
        for (const objPos of wallObjects) {
            if (objPos.type === "door") continue; 

            const baseKey = `${objPos.mapX},${objPos.mapY},${objPos.type},${objPos.wallFace}`;
            
            // Skip if already rendered
            if (objPos.type === 'torch' && renderedWallObjects.has(baseKey)) continue;
            if (objPos.type === 'painting' && renderedWallObjects.has(baseKey + `,${i}`)) continue;

            // --- 1. FIND STRICT HIT ---
            // Ray must hit the exact tile
            let targetHitIndex = ray.steps.findIndex(h => h.mapX === objPos.mapX && h.mapY === objPos.mapY);
            if (targetHitIndex === -1) continue; 
            
            let targetHit = ray.steps[targetHitIndex];

            // --- 2. STRICT OCCLUSION CHECK (Linear) ---
            // Blocks if ray hits a wall BEFORE the object
            let isOccluded = false;
            for (let k = 0; k < targetHitIndex; k++) {
                const priorHit = ray.steps[k];
                if (priorHit.wallType > 0 && priorHit.wallType !== 3) {
                    isOccluded = true; 
                    break;
                }
            }
            if (isOccluded) continue;

            // --- 3. ORIENTATION CHECK ---
            let isVisible = false;
            switch (objPos.wallFace) {
                case 'north': isVisible = player.y < objPos.mapY * TILE_SIZE; break;
                case 'south': isVisible = player.y > (objPos.mapY + 1) * TILE_SIZE; break;
                case 'east':  isVisible = player.x > (objPos.mapX + 1) * TILE_SIZE; break;
                case 'west':  isVisible = player.x < objPos.mapX * TILE_SIZE; break;
            }
            if (!isVisible) continue;
            
            // =========================================================
            // TYPE A: TORCH (SPRITE) - ROBUST CORNER FIX
            // =========================================================
            if (objPos.type === 'torch' && WALL_OBJECTS.torch.loaded) {
                const objectImg = WALL_OBJECTS.torch.images[WALL_OBJECTS.torch.currentFrame];
                if (!objectImg) continue;

                let objWorldX, objWorldY;
                const OFFSET = 2; 
                switch (objPos.wallFace) {
                    case 'north': objWorldX = (objPos.mapX + 0.5) * TILE_SIZE; objWorldY = (objPos.mapY * TILE_SIZE) - OFFSET; break;
                    case 'south': objWorldX = (objPos.mapX + 0.5) * TILE_SIZE; objWorldY = ((objPos.mapY + 1) * TILE_SIZE) + OFFSET; break;
                    case 'east':  objWorldX = ((objPos.mapX + 1) * TILE_SIZE) + OFFSET; objWorldY = (objPos.mapY + 0.5) * TILE_SIZE; break;
                    case 'west':  objWorldX = (objPos.mapX * TILE_SIZE) - OFFSET;       objWorldY = (objPos.mapY + 0.5) * TILE_SIZE; break;
                }

                const vecX = objWorldX - player.x;
                const vecY = objWorldY - player.y;
                const distToObject = Math.sqrt(vecX * vecX + vecY * vecY);

                let objAngle = Math.atan2(vecY, vecX) - player.angle;
                while (objAngle < -Math.PI) objAngle += 2 * Math.PI;
                while (objAngle > Math.PI) objAngle -= 2 * Math.PI;

                if (Math.abs(objAngle) < FOV / 1.5) {
                    // --- A. CALCULATE SCREEN POSITION ---
                    const angleStep = FOV / NUM_RAYS;
                    const screenX = (objAngle + FOV / 2) / angleStep * columnWidth;

                    // --- B. CENTER DEPTH CHECK (THE FIX) ---
                    // Determine which ray index corresponds to the CENTER of the sprite.
                    // If the center ray hit a wall closer than the torch, we hide the whole torch.
                    // This prevents "corner peeking" where an edge ray hits the torch but the center is blocked.
                    const centerRayIndex = Math.floor(screenX / columnWidth);
                    
                    if (centerRayIndex >= 0 && centerRayIndex < NUM_RAYS) {
                        // If the wall at the center column is closer than the torch (with small buffer), SKIP.
                        if (depthBuffer[centerRayIndex] < distToObject - 0.5) {
                            continue; // Skip rendering, do not add to 'renderedWallObjects', let other rays try (or fail).
                        }
                    }

                    // --- C. RENDER ---
                    const correctedObjDist = distToObject * Math.cos(objAngle);
                    const geometryHeight = (TILE_SIZE / correctedObjDist) * PROJECTION_PLANE_DIST;
                    
                    const wallHMult = wallHeights[map[objPos.mapY][objPos.mapX]] || 1.0;
                    const wallHeight = geometryHeight * wallHMult;
                    const floorPixelY = horizon + (geometryHeight / 2);
                    const wallTop = floorPixelY - wallHeight;
                    
                    const def = WALL_OBJECTS.torch;
                    const objectSize = wallHeight * def.size;
                    const yPos = wallTop + (wallHeight * def.yPos);
                    
                    ctx.drawImage(objectImg, screenX - objectSize / 2, yPos - objectSize / 2, objectSize, objectSize);
                    renderedWallObjects.add(baseKey);
                }
            } 
            // =========================================================
            // TYPE B: PAINTING (STRIP)
            // =========================================================
            else if (objPos.type === 'painting') {
                const def = WALL_OBJECTS.painting;
                let objectImg = null;
                if (WALL_OBJECTS.painting.image && WALL_OBJECTS.painting.image.complete) {
                    objectImg = WALL_OBJECTS.painting.image;
                }

                if (targetHit.distanceCorrected === undefined) continue;

                const correctedObjDist = targetHit.distanceCorrected; 
                const projectedUnitHeight = (TILE_SIZE / correctedObjDist) * PROJECTION_PLANE_DIST;
                const wallHMult = wallHeights[map[objPos.mapY][objPos.mapX]] || 1.0;
                const wallHeight = projectedUnitHeight * wallHMult;
                const floorPixelY = horizon + (projectedUnitHeight / 2);
                const wallTop = floorPixelY - wallHeight;
                
                const objectSize = wallHeight * def.size;
                const yPos = wallTop + (wallHeight * def.yPos) - objectSize/2;

                let wallX;
                if (targetHit.side === 0) wallX = targetHit.exactHitY;
                else wallX = targetHit.exactHitX;
                wallX = (wallX / TILE_SIZE) % 1;
                if (wallX < 0) wallX += 1;
                if ((targetHit.side === 0 && targetHit.rayDirX > 0) || (targetHit.side === 1 && targetHit.rayDirY < 0)) {
                    wallX = 1 - wallX;
                }

                const paintingWidthRatio = def.size;
                const startRatio = 0.5 - (paintingWidthRatio / 2);
                const endRatio = 0.5 + (paintingWidthRatio / 2);

                if (wallX >= startRatio && wallX <= endRatio) {
                    if (objectImg) {
                        const sX = objectImg.width * ((wallX - startRatio) / paintingWidthRatio);
                        ctx.drawImage(objectImg, sX, 0, 1, objectImg.height, i * columnWidth, yPos, columnWidth, objectSize);
                    } else {
                        ctx.fillStyle = "red"; 
                        ctx.fillRect(i * columnWidth, yPos, columnWidth, objectSize);
                    }
                    renderedWallObjects.add(baseKey + `,${i}`);
                }
            }
        }
    });
    
    return depthBuffer;
}



function calculateSpriteAngle(obj, playerX, playerY) {
    // Calculate angle from object to player
    const dx = playerX - obj.x;
    const dy = playerY - obj.y;
    let angle = Math.atan2(dy, dx);
    
    // Adjust for object's facing angle if needed
    if (obj.spriteConfig && obj.spriteConfig.angleOffset) {
        angle += obj.spriteConfig.angleOffset;
    }
    
    // Normalize to 0-2Ï€ range
    if (angle < 0) angle += 2 * Math.PI;
    
    return angle;
}

function getSpriteForAngle(obj, angle, numSides) {
    const sectorSize = (2 * Math.PI) / numSides;
    
    // Calculate which sector the player is in
    let sector = Math.floor((angle + sectorSize / 2) / sectorSize) % numSides;
    
    // For 2-sided objects, we need special handling
    if (numSides === SPRITE_SIDES.TWO_SIDED) {
        // Front (0) or back (1)
        return (sector === 0 || sector === 3 || sector === 4 || sector === 5) ? 'front' : 'back';
    }
    
    // For 4-sided objects
    if (numSides === SPRITE_SIDES.FOUR_SIDED) {
        switch(sector) {
            case 0: return 'front';
            case 1: return 'left';
            case 2: return 'back';
            case 3: return 'right';
            default: return 'front';
        }
    }
    
    // For 8-sided objects
    if (numSides === SPRITE_SIDES.EIGHT_SIDED) {
        const directions = ['front', 'frontLeft', 'left', 'backLeft', 'back', 'backRight', 'right', 'frontRight'];
        return directions[sector];
    }
    
    return 'front'; // Fallback
}

function getObjectSprite(obj, playerX, playerY) {
    // Determine the correct image set (check both objectImages and npcImages)
    const imageSet = objectImages[obj.image] || npcImages[obj.image];
    
    // If the image key doesn't exist at all, return default
    if (!imageSet) return npcImages.default;

    // If multi-sided sprites are disabled, not configured, or if the image is just a flat image
    if (!obj.spriteConfig || !obj.spriteConfig.enabled || !imageSet.front) {
        return imageSet.front || imageSet;
    }
    
    const numSides = obj.spriteConfig.sides || SPRITE_SIDES.FOUR_SIDED;
    const angle = calculateSpriteAngle(obj, playerX, playerY);
    const spriteKey = getSpriteForAngle(obj, angle, numSides);
    
    // Return the specific sprite, fallback to front if not available
    return imageSet[spriteKey] || imageSet.front || imageSet;
}


function updateAnimatedWalls() {
    for (const wallType in ANIMATED_WALLS) {
        const wall = ANIMATED_WALLS[wallType];
        if (!wall.loaded) continue;
        
        wall.frameCounter++;
        if (wall.frameCounter >= wall.frameDelay) {
            wall.frameCounter = 0;
            wall.currentFrame = (wall.currentFrame + 1) % wall.frameCount;
        }
    }
}
function renderPillar(ray, columnIndex, columnWidth, wallHeight, wallTop, brightness) {
    const texture = wallTextures[8];
    
    if (!texture.complete) {
        // Fallback: solid color pillar
        ctx.fillStyle = wallColors[8];
        ctx.fillRect(columnIndex * columnWidth, wallTop, columnWidth, wallHeight);
        return;
    }

    // For pillars, we use both X and Y coordinates from the hit position
    const hitX = player.x + Math.cos(ray.angle) * ray.distance;
    const hitY = player.y + Math.sin(ray.angle) * ray.distance;
    
    // Calculate texture coordinates from both axes for pillar wrapping
    const texX = (hitX % TILE_SIZE) / TILE_SIZE;
    const texY = (hitY % TILE_SIZE) / TILE_SIZE;
    
    // Pillars are rendered with full wrapping - use both coordinates
    const textureX = texX * texture.width;
    const textureY = texY * texture.height;
    
    ctx.drawImage(
        texture,
        textureX, textureY, 1, texture.height,
        columnIndex * columnWidth, wallTop, columnWidth, wallHeight
    );

    // Apply lighting
    ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
    ctx.fillRect(columnIndex * columnWidth, wallTop, columnWidth, wallHeight);
}
function renderPlayerHealth() {
    const barWidth = 200;
    const barHeight = 20;
    const margin = 20;
    const healthPercent = player.health / player.maxHealth;
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(margin, margin, barWidth, barHeight);
    
    ctx.fillStyle = healthPercent > 0.6 ? "green" : 
                    healthPercent > 0.3 ? "yellow" : "red";
    ctx.fillRect(margin, margin, barWidth * healthPercent, barHeight);
    
    ctx.strokeStyle = "white";
    ctx.strokeRect(margin, margin, barWidth, barHeight);
    
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText(`HP: ${Math.floor(player.health)}/${player.maxHealth}`, margin, margin + barHeight + 20);
}

// ğŸ”¹ Global or config option
let FLOOR_QUALITY = 1; 
// 1 = full quality, 2 = half res, 4 = very low res
// Create a reusable offscreen canvas for drawing and stretching rows
const floorBufferCanvas = document.createElement("canvas");
const floorBufferCtx = floorBufferCanvas.getContext("2d");
let floorImageData = null;
let floorPixels = null;
 
const ceilBufferCanvas = document.createElement("canvas");
const ceilBufferCtx = ceilBufferCanvas.getContext("2d");
let ceilImageData = null;
let ceilPixels = null;
 
let lastBufferedWidth = 0;
let lastBufferedFloorRows = 0;
let lastBufferedCeilRows = 0;
let rowImageData = null; // Will be initialized once
let rowPixels = null;
let lastReducedWidth = 0;

function renderFloorAndCeilingFast() {
    const textures = levelTextures[currentLevel];
    if (!textures || !textures.loaded) return;
 
    const floorTex = textures.floor;
    const ceilTex = textures.ceiling;
 
    if (!floorTex.offscreen) {
        const offscreen = document.createElement("canvas");
        offscreen.width = floorTex.width;
        offscreen.height = floorTex.height;
        const offCtx = offscreen.getContext("2d");
        offCtx.drawImage(floorTex, 0, 0);
        floorTex.offscreen = offscreen;
        floorTex.data = offCtx.getImageData(0, 0, floorTex.width, floorTex.height).data;
    }
    if (!ceilTex.offscreen) {
        const offscreen = document.createElement("canvas");
        offscreen.width = ceilTex.width;
        offscreen.height = ceilTex.height;
        const offCtx = offscreen.getContext("2d");
        offCtx.drawImage(ceilTex, 0, 0);
        ceilTex.offscreen = offscreen;
        ceilTex.data = offCtx.getImageData(0, 0, ceilTex.width, ceilTex.height).data;
    }
 
    const floorTextureSize = floorTex.width;
    const ceilTextureSize = ceilTex.width;
 
    const effectiveMaxDepth = currentMaxDepth + depthFlickerOffset;
    const effectiveMaxLight = Math.max(10, currentMaxLight + depthFlickerOffset);
    const MIN_BRIGHTNESS = 0.3;
    const MAX_BRIGHTNESS = 1.0;
 
    const reducedWidth = Math.floor(canvas.width / FLOOR_QUALITY);
 
    const currentPitch = player.pitch || 0;
    const horizon = (canvas.height / 2) + currentPitch;
    const playerEyeHeight = TILE_SIZE / 2;
    const absoluteMaxDepth = getAbsoluteMaxDepth();
 
    const mapW = map[0] ? map[0].length : 0;
    const mapH = map.length;
 
    for (let i = 0; i < activeLightSources.length; i++) {
        activeLightSources[i].losCache = getLosCacheBuffer(i, mapW * mapH);
    }
 
    // --- Resize buffers if needed ---
    const maxFloorRows = Math.ceil((canvas.height - Math.max(0, Math.floor(horizon))) / FLOOR_QUALITY) + 1;
    const maxCeilRows = Math.ceil(Math.min(canvas.height, Math.floor(horizon)) / FLOOR_QUALITY) + 1;
 
    if (reducedWidth !== lastBufferedWidth || maxFloorRows !== lastBufferedFloorRows) {
        floorBufferCanvas.width = reducedWidth;
        floorBufferCanvas.height = Math.max(1, maxFloorRows);
        floorImageData = floorBufferCtx.createImageData(floorBufferCanvas.width, floorBufferCanvas.height);
        floorPixels = floorImageData.data;
        lastBufferedFloorRows = maxFloorRows;
    }
    if (reducedWidth !== lastBufferedWidth || maxCeilRows !== lastBufferedCeilRows) {
        ceilBufferCanvas.width = reducedWidth;
        ceilBufferCanvas.height = Math.max(1, maxCeilRows);
        ceilImageData = ceilBufferCtx.createImageData(ceilBufferCanvas.width, ceilBufferCanvas.height);
        ceilPixels = ceilImageData.data;
        lastBufferedCeilRows = maxCeilRows;
    }
    lastBufferedWidth = reducedWidth;
 
    // ==========================================
    // --- FLOOR RENDER LOOP (writes into floorPixels buffer) ---
    // ==========================================
    let floorBufRow = 0;
    const floorStartY = Math.floor(horizon);
 
    for (let y = floorStartY; y < canvas.height; y += FLOOR_QUALITY, floorBufRow++) {
        const currentPixelRow = y - horizon;
        if (currentPixelRow <= 0) continue;
 
        const rowDistance = (playerEyeHeight * PROJECTION_PLANE_DIST) / currentPixelRow;
        if (rowDistance >= absoluteMaxDepth) {
            // OVERWRITE GHOST PIXELS WITH BLACK
            const rowOffset = floorBufRow * reducedWidth * 4;
            for (let x = 0; x < reducedWidth; x++) {
                const pIdx = rowOffset + x * 4;
                floorPixels[pIdx] = 0; floorPixels[pIdx + 1] = 0; floorPixels[pIdx + 2] = 0; floorPixels[pIdx + 3] = 255;
            }
            continue;
        }
 
        let playerBrightness = MIN_BRIGHTNESS +
                               (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * (1 - Math.min(1, rowDistance / effectiveMaxLight));
        playerBrightness = Math.pow(playerBrightness, 1.5);
 
        const floorStepX = rowDistance * (Math.cos(player.angle + FOV / 2) - Math.cos(player.angle - FOV / 2)) / reducedWidth;
        const floorStepY = rowDistance * (Math.sin(player.angle + FOV / 2) - Math.sin(player.angle - FOV / 2)) / reducedWidth;
        let floorX = player.x + rowDistance * Math.cos(player.angle - FOV / 2);
        let floorY = player.y + rowDistance * Math.sin(player.angle - FOV / 2);
 
        const rowOffset = floorBufRow * reducedWidth * 4;
 
        for (let x = 0; x < reducedWidth; x++) {
            let isVisible = rowDistance <= effectiveMaxDepth;
            let pixelR = playerBrightness;
            let pixelG = playerBrightness;
            let pixelB = playerBrightness;
 
            let tX = Math.floor(floorX / TILE_SIZE);
            let tY = Math.floor(floorY / TILE_SIZE);
            let isValidTile = (tX >= 0 && tX < mapW && tY >= 0 && tY < mapH);
            let tileIdx = isValidTile ? (tY * mapW + tX) : -1;
 
            for (let li = 0; li < activeLightSources.length; li++) {
                const light = activeLightSources[li];
                const r = light.flicker ? light.radius + depthFlickerOffset : light.radius;
 
                const dx = Math.abs(floorX - light.x);
                const dy = Math.abs(floorY - light.y);
                if (dx > r || dy > r) continue;
 
                const distSq = dx * dx + dy * dy;
                const radiusSq = r * r;
 
                if (distSq <= radiusSq) {
                    let hasLos = false;
                    if (isValidTile) {
                        let cached = light.losCache[tileIdx];
                        if (cached === -1) {
                            cached = isLineOfSightClear(floorX, floorY, light.x, light.y) ? 1 : 0;
                            light.losCache[tileIdx] = cached;
                        }
                        hasLos = (cached === 1);
                    } else {
                        hasLos = isLineOfSightClear(floorX, floorY, light.x, light.y);
                    }
 
                    if (!hasLos) continue;
 
                    isVisible = true;
                    let lBright = MIN_BRIGHTNESS + (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * (1 - Math.sqrt(distSq) / r);
                    lBright = (lBright * Math.sqrt(lBright)) * light.intensity;
 
                    if (light.color) {
                        pixelR = Math.max(pixelR, lBright * (light.color.r / 255));
                        pixelG = Math.max(pixelG, lBright * (light.color.g / 255));
                        pixelB = Math.max(pixelB, lBright * (light.color.b / 255));
                    } else {
                        pixelR = Math.max(pixelR, lBright);
                        pixelG = Math.max(pixelG, lBright);
                        pixelB = Math.max(pixelB, lBright);
                    }
                }
            }
 
            const pIdx = rowOffset + x * 4;
 
            if (!isVisible) {
                floorPixels[pIdx] = 0; floorPixels[pIdx + 1] = 0; floorPixels[pIdx + 2] = 0; floorPixels[pIdx + 3] = 255;
            } else {
                const fx = Math.floor(Math.abs(floorX) % TILE_SIZE / TILE_SIZE * floorTextureSize);
                const fy = Math.floor(Math.abs(floorY) % TILE_SIZE / TILE_SIZE * floorTextureSize);
 
                if (fx >= 0 && fy >= 0 && fx < floorTextureSize && fy < floorTextureSize) {
                    const fIdx = (fy * floorTextureSize + fx) * 4;
                    floorPixels[pIdx]     = Math.min(255, Math.floor(floorTex.data[fIdx] * pixelR));
                    floorPixels[pIdx + 1] = Math.min(255, Math.floor(floorTex.data[fIdx + 1] * pixelG));
                    floorPixels[pIdx + 2] = Math.min(255, Math.floor(floorTex.data[fIdx + 2] * pixelB));
                    floorPixels[pIdx + 3] = 255;
                }
            }
            floorX += floorStepX;
            floorY += floorStepY;
        }
    }
 
    if (floorBufRow > 0) {
        floorBufferCtx.putImageData(floorImageData, 0, 0);
        ctx.drawImage(
            floorBufferCanvas, 0, 0, reducedWidth, floorBufRow,
            0, floorStartY, canvas.width, canvas.height - floorStartY
        );
    }
 
    // ==========================================
    // --- CEILING RENDER LOOP (writes into ceilPixels buffer) ---
    // ==========================================
    const ceilingEnd = Math.min(canvas.height, Math.floor(horizon));
    let ceilBufRow = 0;
 
    for (let y = 0; y < ceilingEnd; y += FLOOR_QUALITY, ceilBufRow++) {
        const currentPixelRow = horizon - y;
        if (currentPixelRow <= 0) continue;
 
        const ceilingHeightAboveEye = currentRoomHeight - playerEyeHeight;
        const rowDistance = (ceilingHeightAboveEye * PROJECTION_PLANE_DIST) / currentPixelRow;
        if (rowDistance >= absoluteMaxDepth) {
            // OVERWRITE GHOST PIXELS WITH BLACK
            const rowOffset = ceilBufRow * reducedWidth * 4;
            for (let x = 0; x < reducedWidth; x++) {
                const pIdx = rowOffset + x * 4;
                ceilPixels[pIdx] = 0; ceilPixels[pIdx + 1] = 0; ceilPixels[pIdx + 2] = 0; ceilPixels[pIdx + 3] = 255;
            }
            continue;
        }
 
        let playerBrightness = MIN_BRIGHTNESS +
                               (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * (1 - Math.min(1, rowDistance / effectiveMaxLight));
        playerBrightness = Math.pow(playerBrightness, 1.5);
 
        const ceilStepX = rowDistance * (Math.cos(player.angle + FOV / 2) - Math.cos(player.angle - FOV / 2)) / reducedWidth;
        const ceilStepY = rowDistance * (Math.sin(player.angle + FOV / 2) - Math.sin(player.angle - FOV / 2)) / reducedWidth;
        let ceilX = player.x + rowDistance * Math.cos(player.angle - FOV / 2);
        let ceilY = player.y + rowDistance * Math.sin(player.angle - FOV / 2);
 
        const rowOffset = ceilBufRow * reducedWidth * 4;
 
        for (let x = 0; x < reducedWidth; x++) {
            let isVisible = rowDistance <= effectiveMaxDepth;
            let pixelR = playerBrightness;
            let pixelG = playerBrightness;
            let pixelB = playerBrightness;
 
            let tX = Math.floor(ceilX / TILE_SIZE);
            let tY = Math.floor(ceilY / TILE_SIZE);
            let isValidTile = (tX >= 0 && tX < mapW && tY >= 0 && tY < mapH);
            let tileIdx = isValidTile ? (tY * mapW + tX) : -1;
 
            for (let li = 0; li < activeLightSources.length; li++) {
                const light = activeLightSources[li];
                const r = light.flicker ? light.radius + depthFlickerOffset : light.radius;
 
                const dx = Math.abs(ceilX - light.x);
                const dy = Math.abs(ceilY - light.y);
                if (dx > r || dy > r) continue;
 
                const distSq = dx * dx + dy * dy;
                const radiusSq = r * r;
 
                if (distSq <= radiusSq) {
                    let hasLos = false;
                    if (isValidTile) {
                        let cached = light.losCache[tileIdx];
                        if (cached === -1) {
                            cached = isLineOfSightClear(ceilX, ceilY, light.x, light.y) ? 1 : 0;
                            light.losCache[tileIdx] = cached;
                        }
                        hasLos = (cached === 1);
                    } else {
                        hasLos = isLineOfSightClear(ceilX, ceilY, light.x, light.y);
                    }
 
                    if (!hasLos) continue;
 
                    isVisible = true;
                    let lBright = MIN_BRIGHTNESS + (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * (1 - Math.sqrt(distSq) / r);
                    lBright = (lBright * Math.sqrt(lBright)) * light.intensity;
 
                    if (light.color) {
                        pixelR = Math.max(pixelR, lBright * (light.color.r / 255));
                        pixelG = Math.max(pixelG, lBright * (light.color.g / 255));
                        pixelB = Math.max(pixelB, lBright * (light.color.b / 255));
                    } else {
                        pixelR = Math.max(pixelR, lBright);
                        pixelG = Math.max(pixelG, lBright);
                        pixelB = Math.max(pixelB, lBright);
                    }
                }
            }
 
            const pIdx = rowOffset + x * 4;
 
            if (!isVisible) {
                ceilPixels[pIdx] = 0; ceilPixels[pIdx + 1] = 0; ceilPixels[pIdx + 2] = 0; ceilPixels[pIdx + 3] = 255;
            } else {
                const cx = Math.floor(Math.abs(ceilX) % TILE_SIZE / TILE_SIZE * ceilTextureSize);
                const cy = Math.floor(Math.abs(ceilY) % TILE_SIZE / TILE_SIZE * ceilTextureSize);
 
                if (cx >= 0 && cy >= 0 && cx < ceilTextureSize && cy < ceilTextureSize) {
                    const cIdx = (cy * ceilTextureSize + cx) * 4;
                    ceilPixels[pIdx]     = Math.min(255, Math.floor(ceilTex.data[cIdx] * pixelR));
                    ceilPixels[pIdx + 1] = Math.min(255, Math.floor(ceilTex.data[cIdx + 1] * pixelG));
                    ceilPixels[pIdx + 2] = Math.min(255, Math.floor(ceilTex.data[cIdx + 2] * pixelB));
                    ceilPixels[pIdx + 3] = 255;
                }
            }
            ceilX += ceilStepX;
            ceilY += ceilStepY;
        }
    }
 
    if (ceilBufRow > 0) {
        ceilBufferCtx.putImageData(ceilImageData, 0, 0);
        ctx.drawImage(
            ceilBufferCanvas, 0, 0, reducedWidth, ceilBufRow,
            0, 0, canvas.width, ceilingEnd
        );
    }
 
    // --- OVERLAYS (unchanged) ---
    if (horizon < canvas.height) {
        const gradient = ctx.createLinearGradient(0, horizon, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);
    }
 
    if (horizon > 0) {
        const ceilingGradient = ctx.createLinearGradient(0, 0, 0, horizon);
        ceilingGradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        ceilingGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ceilingGradient;
        ctx.fillRect(0, 0, canvas.width, horizon);
    }
 
    ctx.fillStyle = "black";
    ctx.fillRect(0, horizon - 1, canvas.width, 2);
}
/*Alternative:
function renderFloorAndCeilingFast() {
    const textures = levelTextures[currentLevel];
    if (!textures || !textures.loaded) return;

    const floorTex = textures.floor;
    const ceilTex = textures.ceiling;

    // --- Texture Preparation (Unchanged) ---
    if (!floorTex.offscreen) {
        const offscreen = document.createElement("canvas");
        offscreen.width = floorTex.width;
        offscreen.height = floorTex.height;
        const offCtx = offscreen.getContext("2d");
        offCtx.drawImage(floorTex, 0, 0);
        floorTex.offscreen = offscreen;
        floorTex.data = offCtx.getImageData(0, 0, floorTex.width, floorTex.height).data;
    }
    if (!ceilTex.offscreen) {
        const offscreen = document.createElement("canvas");
        offscreen.width = ceilTex.width;
        offscreen.height = ceilTex.height;
        const offCtx = offscreen.getContext("2d");
        offCtx.drawImage(ceilTex, 0, 0);
        ceilTex.offscreen = offscreen;
        ceilTex.data = offCtx.getImageData(0, 0, ceilTex.width, ceilTex.height).data;
    }

    const floorTextureSize = floorTex.width;
    const ceilTextureSize = ceilTex.width;

    const MAX_LIGHT_DISTANCE = 500;
    const MIN_BRIGHTNESS = 0.3;
    const MAX_BRIGHTNESS = 1.0;

    // Resize buffer if needed
    const reducedWidth = Math.floor(canvas.width / FLOOR_QUALITY);
    if (reducedWidth !== lastReducedWidth) {
        rowCanvas.width = reducedWidth;
        rowCanvas.height = 1;
        rowImageData = rowCtx.createImageData(reducedWidth, 1);
        rowPixels = rowImageData.data;
        lastReducedWidth = reducedWidth;
    }

    const pixels = rowPixels;
    
    // --- PITCH CALCULATION FIX ---
    // Ensure pitch is a number, default to 0 if undefined
    const currentPitch = player.pitch || 0;
    const horizon = (canvas.height / 2) + currentPitch;
    const playerEyeHeight = TILE_SIZE / 2;

    // --- FLOOR RENDER LOOP ---
    // Start drawing FROM the horizon DOWN to the bottom of the screen
    // We add a small offset (+1) to start just below the horizon line to avoid div-by-zero visuals
    const floorStart = Math.max(0, Math.floor(horizon));
    
    for (let y = floorStart; y < canvas.height; y += FLOOR_QUALITY) {
        // Calculate distance relative to the horizon line
        const currentPixelRow = y - horizon;
        
        // If we are exactly at or 'above' the horizon in this loop, skip
        if (currentPixelRow <= 0) continue;

        const rowDistance = (playerEyeHeight * PROJECTION_PLANE_DIST) / currentPixelRow;

        // Optimization: Don't render if too far away (fog cutoff)
        if (rowDistance >= MAX_DEPTH) continue;

        let brightness = MIN_BRIGHTNESS + 
            (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * (1 - Math.min(1, rowDistance / MAX_LIGHT_DISTANCE));
        brightness = Math.pow(brightness, 1.5);

        // Calculate world coordinates for the start and end of this horizontal row
        const rayStepX = rowDistance * (Math.cos(player.angle + FOV / 2) - Math.cos(player.angle - FOV / 2)) / reducedWidth;
        const rayStepY = rowDistance * (Math.sin(player.angle + FOV / 2) - Math.sin(player.angle - FOV / 2)) / reducedWidth;
        
        let floorX = player.x + rowDistance * Math.cos(player.angle - FOV / 2);
        let floorY = player.y + rowDistance * Math.sin(player.angle - FOV / 2);

        for (let x = 0; x < reducedWidth; x++) {
            // Texture wrapping
            const fx = Math.floor(Math.abs(floorX) % TILE_SIZE / TILE_SIZE * floorTextureSize);
            const fy = Math.floor(Math.abs(floorY) % TILE_SIZE / TILE_SIZE * floorTextureSize);
            
            // Safety check
            if (fx >= 0 && fy >= 0 && fx < floorTextureSize && fy < floorTextureSize) {
                const fIdx = (fy * floorTextureSize + fx) * 4;
                const p = x * 4;
                pixels[p] = Math.floor(floorTex.data[fIdx] * brightness);
                pixels[p + 1] = Math.floor(floorTex.data[fIdx + 1] * brightness);
                pixels[p + 2] = Math.floor(floorTex.data[fIdx + 2] * brightness);
                pixels[p + 3] = 255;
            }
            floorX += rayStepX;
            floorY += rayStepY;
        }

        rowCtx.putImageData(rowImageData, 0, 0);
        ctx.drawImage(rowCanvas, 0, 0, reducedWidth, 1, 0, y, canvas.width, FLOOR_QUALITY);
    }

    // --- CEILING RENDER LOOP ---
    // Start drawing from TOP of screen DOWN to the horizon
    const ceilingEnd = Math.min(canvas.height, Math.floor(horizon));
    
    for (let y = 0; y < ceilingEnd; y += FLOOR_QUALITY) {
        // Calculate distance relative to horizon
        const currentPixelRow = horizon - y;
        
        if (currentPixelRow <= 0) continue;

        const ceilingHeightAboveEye = currentRoomHeight - playerEyeHeight;
        const rowDistance = (ceilingHeightAboveEye * PROJECTION_PLANE_DIST) / currentPixelRow;

        if (rowDistance >= MAX_DEPTH) continue;

        let brightness = MIN_BRIGHTNESS + 
            (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * (1 - Math.min(1, rowDistance / MAX_LIGHT_DISTANCE));
        brightness = Math.pow(brightness, 1.5);

        const rayStepX = rowDistance * (Math.cos(player.angle + FOV / 2) - Math.cos(player.angle - FOV / 2)) / reducedWidth;
        const rayStepY = rowDistance * (Math.sin(player.angle + FOV / 2) - Math.sin(player.angle - FOV / 2)) / reducedWidth;
        
        let ceilX = player.x + rowDistance * Math.cos(player.angle - FOV / 2);
        let ceilY = player.y + rowDistance * Math.sin(player.angle - FOV / 2);

        for (let x = 0; x < reducedWidth; x++) {
            const cx = Math.floor(Math.abs(ceilX) % TILE_SIZE / TILE_SIZE * ceilTextureSize);
            const cy = Math.floor(Math.abs(ceilY) % TILE_SIZE / TILE_SIZE * ceilTextureSize);

            if (cx >= 0 && cy >= 0 && cx < ceilTextureSize && cy < ceilTextureSize) {
                const cIdx = (cy * ceilTextureSize + cx) * 4;
                const p = x * 4;
                pixels[p] = Math.floor(ceilTex.data[cIdx] * brightness);
                pixels[p + 1] = Math.floor(ceilTex.data[cIdx + 1] * brightness);
                pixels[p + 2] = Math.floor(ceilTex.data[cIdx + 2] * brightness);
                pixels[p + 3] = 255;
            }
            ceilX += rayStepX;
            ceilY += rayStepY;
        }

        rowCtx.putImageData(rowImageData, 0, 0);
        ctx.drawImage(rowCanvas, 0, 0, reducedWidth, 1, 0, y, canvas.width, FLOOR_QUALITY);
    }

    // --- OVERLAY / GRADIENT FIX ---
    // The bright parts "moving in reverse" happened because gradients were fixed to center.
    // Now we anchor them to the 'horizon' variable.

    // 1. Floor Gradient (Dark at horizon, fades as it gets closer to player)
    if (horizon < canvas.height) {
        const floorGradient = ctx.createLinearGradient(0, horizon, 0, canvas.height);
        floorGradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)'); // Darkest at horizon
        floorGradient.addColorStop(0.35, 'rgba(0, 0, 0, 0)'); // Fade out quickly
        ctx.fillStyle = floorGradient;
        ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);
    }

    // 2. Ceiling Gradient (Dark at horizon, fades as it goes up)
    if (horizon > 0) {
        const ceilingGradient = ctx.createLinearGradient(0, 0, 0, horizon);
        ceilingGradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)'); // Darkest at horizon
        ceilingGradient.addColorStop(0.65, 'rgba(0, 0, 0, 0)'); // Fade upwards
        ctx.fillStyle = ceilingGradient;
        ctx.fillRect(0, 0, canvas.width, horizon);
    }
    
    // 3. Horizon Seam Fix (Black line to cover any 1-pixel gap between floor/ceiling)
    ctx.fillStyle = "black";
    ctx.fillRect(0, horizon - 1, canvas.width, 3);
}
*/


function renderSpriteLayer() {
    // 1. Collect ALL renderable entities into a single list
    const renderList = [];

    // Add Static Objects
    objects.forEach(obj => {
        renderList.push({ type: 'object', data: obj });
    });

    // Add Enemies
    currentEnemies.forEach(enemy => {
        renderList.push({ type: 'enemy', data: enemy });
    });
      
    // Add Roaming NPCs
    currentRoamingNpcs.forEach(npc => {
        renderList.push({ type: 'roaming_npc', data: npc });
    });

    // Add Ground Items
    groundItems.forEach(item => {
        renderList.push({ type: 'item', data: item });
    });

    // 2. Sort the entire list from Farthest to Closest
    // We calculate distance here once to ensure sorting is accurate
    renderList.forEach(item => {
        item.distSq = (item.data.x - player.x) ** 2 + (item.data.y - player.y) ** 2;
    });
    
    renderList.sort((a, b) => b.distSq - a.distSq);

    // --- LIGHTING CONSTANTS ---
    const effectiveMaxDepth = currentMaxDepth + depthFlickerOffset;
    const effectiveMaxLight = Math.max(10, currentMaxLight + depthFlickerOffset);
    const MIN_BRIGHTNESS = 0.3;
    const MAX_BRIGHTNESS = 1.0;
    

    // 3. Render Loop
    renderList.forEach(item => {
        const obj = item.data;
        const distance = Math.sqrt(item.distSq);

        // Near clip
        if (distance < 10) return;
        if (!isPointVisible(obj.x, obj.y, distance)) return;

        // --- CALCULATE BRIGHTNESS ---
        // Exactly matches the wall logic
        let lightInfo = calculateIllumination(obj.x, obj.y, distance);
        let brightness = lightInfo.level;

        const dx = obj.x - player.x;
        const dy = obj.y - player.y;

        const angleToObj = Math.atan2(dy, dx);
        let angleDiff = angleToObj - player.angle;

        // Normalize angle
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // FOV Check
        if (Math.abs(angleDiff) > FOV * 1.5) return;

        // --- VISIBILITY CHECK (Raycast) ---
        let isVisible = true;
        const checkSteps = Math.max(4, Math.floor(distance / 30)); 
        
        for (let i = 1; i <= checkSteps; i++) {
            const t = i / checkSteps;
            const checkX = player.x + Math.cos(angleToObj) * (distance * t);
            const checkY = player.y + Math.sin(angleToObj) * (distance * t);
            
            const mapX = Math.floor(checkX / TILE_SIZE);
            const mapY = Math.floor(checkY / TILE_SIZE);
            
            if (mapY >= 0 && mapY < map.length && 
                mapX >= 0 && mapX < map[mapY].length && 
                map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) {
                isVisible = false;
                break;
            }
        }
        if (!isVisible) return;

        // --- GEOMETRY CALCULATION ---
        const screenX = (canvas.width / 2) * (1 + angleDiff / (FOV / 2));
        const projectedUnitHeight = (TILE_SIZE / distance) * PROJECTION_PLANE_DIST;

        let sizeMult = obj.sizeMultiplier || 1.0;
        let yOff = obj.yOffset || 0;

        if (item.type === 'enemy' && obj.state === "DEAD") {
            const typeDef = ENEMY_TYPES[obj.type];
            sizeMult = typeDef.deadSizeMultiplier !== undefined ? typeDef.deadSizeMultiplier : sizeMult;
            yOff = typeDef.deadYOffset !== undefined ? typeDef.deadYOffset : yOff;
        } 
        else if (item.type === 'item') {
            const itemType = ITEM_TYPES[obj.type];
            sizeMult = itemType.size || 0.3; 
        }

        const totalHeight = projectedUnitHeight * sizeMult;
        const totalWidth = totalHeight; 

        const horizon = (canvas.height / 2) + player.pitch;
    
        const floorPixelY = horizon + (projectedUnitHeight / 2);
        const scaledOffset = yOff * (projectedUnitHeight / TILE_SIZE);
        const screenY = floorPixelY - totalHeight - scaledOffset;

        // --- SPRITE SELECTION ---
        let sprite = null;

        if (item.type === 'object') {
            sprite = getObjectSprite(obj, player.x, player.y);
        }
        else if (item.type === 'roaming_npc') {
            if (obj.loaded && obj.images.length > 0) {
                sprite = obj.images[obj.currentFrame];
            }
        } 
        else if (item.type === 'item') {
            sprite = itemImages[obj.type];
        }
        else if (item.type === 'enemy') {
            if (obj.state === "DEAD") {
                if (!obj.deadImg) {
                    obj.deadImg = new Image();
                    obj.deadImg.src = ENEMY_TYPES[obj.type].deadImage || "blood_puddle.png";
                }
                sprite = obj.deadImg;
            } 
            else if (obj.isAttacking && obj.attackAnimation.loaded) {
                const frameIndex = Math.min(obj.attackAnimation.currentFrame, obj.attackAnimation.frames.length - 1);
                sprite = obj.attackAnimation.frames[frameIndex];
            } 
            else if (obj.walkAnimation.isMoving && obj.walkAnimation.loaded) {
                sprite = obj.walkAnimation.frames[obj.walkAnimation.currentFrame];
            } 
            else if (obj.idleAnimation && obj.idleAnimation.loaded) {
                sprite = obj.idleAnimation.frames[obj.idleAnimation.currentFrame];
            }
            else if (obj.idleImg?.complete) {
                sprite = obj.idleImg;
            }
        }

        // --- DRAWING ---
        ctx.globalAlpha = 1.0;
        
        if (sprite && sprite.complete) {
            // Apply standard darkness/brightness scaling
            ctx.filter = `brightness(${Math.min(2.0, lightInfo.level)})`; 
            ctx.drawImage(sprite, screenX - totalWidth / 2, screenY, totalWidth, totalHeight);
            ctx.filter = "none"; 
            
            // Draw a glowing colored aura using globalCompositeOperation
            if (lightInfo.hasColor) {
                ctx.globalCompositeOperation = "lighter";
                
                const cx = screenX;
                const cy = screenY + totalHeight / 2;
                const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, totalWidth);
                
                grad.addColorStop(0, `rgba(${Math.floor(lightInfo.r * 255)}, ${Math.floor(lightInfo.g * 255)}, ${Math.floor(lightInfo.b * 255)}, ${Math.min(1.0, lightInfo.level * 0.4)})`);
                grad.addColorStop(1, "rgba(0,0,0,0)");
                
                ctx.fillStyle = grad;
                ctx.fillRect(screenX - totalWidth, screenY - totalHeight/2, totalWidth * 2, totalHeight * 2);
                
                ctx.globalCompositeOperation = "source-over"; // Reset blend mode
            }

            // NEW: Draw Status Effect Animations over the sprite
            if (obj.activeEffects && obj.state !== "DEAD") {
                obj.activeEffects.forEach(effect => {
                    const effectDef = STATUS_EFFECTS[effect.id];
                    if (effectDef && effectDef.animation && effectDef.animation.loaded) {
                        const animFrame = effectDef.animation.frames[effectDef.animation.currentFrame];
                        if (animFrame && animFrame.complete) {
                            // "lighter" mode makes the fire look brilliantly bright/additive over the sprite
                            ctx.globalCompositeOperation = "lighter"; 
                            ctx.drawImage(animFrame, screenX - totalWidth / 2, screenY, totalWidth, totalHeight);
                            ctx.globalCompositeOperation = "source-over"; // Reset blend mode
                        }
                    }
                });
            }

        } else {
            // Debug Fallback
            ctx.fillStyle = item.type === 'enemy' ? "red" : "blue";
            ctx.fillRect(screenX - totalWidth / 2, screenY, totalWidth, totalHeight);
        }

        // --- UI OVERLAYS (Health Bars / Prompts) ---
        // Note: We reset ctx.filter to "none" above, so these will remain bright/visible
        
        // 1. Enemy Health Bar
        if (item.type === 'enemy' && obj.state !== "DEAD" && distance < 300 && obj.currentHealth < obj.health) {
            const healthPercent = obj.currentHealth / obj.health;
            const barWidth = totalWidth * 0.8;
            const barHeight = 6;
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(screenX - barWidth/2, screenY - 15, barWidth, barHeight);
            ctx.fillStyle = healthPercent > 0.6 ? "#00ff00" : healthPercent > 0.3 ? "#ffff00" : "#ff0000";
            ctx.fillRect(screenX - barWidth/2, screenY - 15, barWidth * healthPercent, barHeight);
        }

        // 2. Item Collection Prompt
        if (item.type === 'item' && distance < 60) {
            ctx.font = "12px 'Press Start 2P'";
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText("Press F", screenX, screenY - 10);
        }
    });
    
    ctx.globalAlpha = 1.0;
}

function renderProjectiles() {
    ctx.fillStyle = "rgba(0, 100, 255, 0.8)";
    for (const p of projectiles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

function checkDoorProximity() {
    nearbyDoor = null;
    showDoorPrompt = false;
    
    for (const doorObj of wallObjects) {
        if (doorObj.type !== "door") continue;
        
        // Calculate door position in world coordinates
        const doorX = doorObj.mapX * TILE_SIZE + TILE_SIZE / 2;
        const doorY = doorObj.mapY * TILE_SIZE + TILE_SIZE / 2;
        
        const dx = doorX - player.x;
        const dy = doorY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 80) { // Door interaction radius
            nearbyDoor = doorObj;
            showDoorPrompt = true;
            break;
        }
    }
}

// Update door animations
function updateDoors() {
    for (const doorObj of wallObjects) {
        if (doorObj.type !== "door") continue;
        
        if (doorObj.state === DOOR_STATES.OPENING) {
            doorObj.animationProgress += WALL_OBJECTS.door.animationSpeed;
            if (doorObj.animationProgress >= 1) {
                doorObj.animationProgress = 1;
                doorObj.state = DOOR_STATES.OPEN;
                doorInteractionState = "open";
            }
        } 
        else if (doorObj.state === DOOR_STATES.CLOSING) {
            doorObj.animationProgress -= WALL_OBJECTS.door.animationSpeed;
            if (doorObj.animationProgress <= 0) {
                doorObj.animationProgress = 0;
                doorObj.state = DOOR_STATES.CLOSED;
                doorInteractionState = "closed";
            }
        }
    }
}

// New function to interact with doors
function interactWithDoor() {
    if (!nearbyDoor) return;
    
    const door = nearbyDoor;
    
    switch(door.state) {
        case DOOR_STATES.CLOSED:
            if (door.locked) {
                attemptToUnlockDoor(door);
            } else {
                openDoor(door);
            }
            break;
            
        case DOOR_STATES.OPEN:
            // Go through the door if it leads to another location
            if (door.targetLevel && door.targetPosition) {
                goThroughDoor(door);
            } else {
                closeDoor(door);
            }
            break;
            
        case DOOR_STATES.LOCKED:
            attemptToUnlockDoor(door);
            break;
    }
}

function attemptToUnlockDoor(door) {
    const doorType = DOOR_TYPES[door.doorType || "WOODEN"];
    const requiredKey = door.keyRequired || doorType.keyRequired;
    
    // Check if player has the required key
    const hasKey = playerInventory.items.some(item => 
        item.type === requiredKey
    );
    
    if (hasKey) {
        // Unlock the door
        door.locked = false;
        door.state = DOOR_STATES.CLOSED;
        doorInteractionState = "closed";
        console.log(`Unlocked ${doorType.name} with ${requiredKey}`);
        
        // Optional: Remove key from inventory (uncomment if you want keys to be consumable)
        // const keyIndex = playerInventory.items.findIndex(item => item.type === requiredKey);
        // if (keyIndex !== -1) {
        //     playerInventory.items.splice(keyIndex, 1);
        // }
        
    } else {
        // Door remains locked
        doorInteractionState = "locked";
        console.log(`${doorType.name} is locked. You need a ${requiredKey}`);
    }
}

function openDoor(door) {
    door.state = DOOR_STATES.OPENING;
    doorInteractionState = "opening";
    console.log("Opening door...");
}

function closeDoor(door) {
    door.state = DOOR_STATES.CLOSING;
    doorInteractionState = "closing";
    console.log("Closing door...");
}

function goThroughDoor(door) {
    if (door.targetLevel && door.targetPosition) {
        startTransition(door.targetLevel, door.targetPosition);
    }
}

function renderProjectiles3D() {
    // This replaces your existing renderProjectiles3D
    // It now handles sprites and billboarding correctly
    projectiles.forEach(p => {
        const dx = p.x - player.x;
        const dy = p.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clip
        if (distance < 5) return;
        if (!isPointVisible(p.x, p.y, distance)) return;

        const angleToProj = Math.atan2(dy, dx);
        let angleDiff = angleToProj - player.angle;

        // Normalize
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) > FOV / 1.5) return;

        // Projection
        const screenX = (canvas.width / 2) * (1 + angleDiff / (FOV / 2));
        const projectedHeight = (TILE_SIZE / distance) * PROJECTION_PLANE_DIST;
        
        // Size of projectile relative to distance
        const size = projectedHeight * (p.size / 30); 

        const horizon = (canvas.height / 2) + player.pitch;
        const screenY = horizon; 

        if (p.sprite && p.sprite.complete) {
            ctx.drawImage(p.sprite, screenX - size / 2, screenY - size / 2, size, size);
        } else {
            ctx.fillStyle = "orange";
            ctx.beginPath();
            ctx.arc(screenX, screenY, size/4, 0, Math.PI*2);
            ctx.fill();
        }
    });
}

function applyStatusEffect(entity, effectId) {
    if (!entity.activeEffects) entity.activeEffects = [];

    const effectDef = STATUS_EFFECTS[effectId];
    if (!effectDef) return;

    // Check if already applied
    const existing = entity.activeEffects.find(e => e.id === effectId);
    if (existing) {
        existing.timer = effectDef.duration; // Refresh duration
    } else {
        entity.activeEffects.push({
            id: effectId,
            timer: effectDef.duration,
            tickTimer: effectDef.tickRate
        });
        console.log(`${entity.name || "Enemy"} is now ${effectDef.name}`);
    }
}

function updateStatusEffects(deltaTime) {
    currentEnemies.forEach(enemy => {
        if (enemy.state === "DEAD" || !enemy.activeEffects) return;

        for (let i = enemy.activeEffects.length - 1; i >= 0; i--) {
            const effect = enemy.activeEffects[i];
            const def = STATUS_EFFECTS[effect.id];

            // Update timers
            effect.timer -= deltaTime * 1000;
            effect.tickTimer -= deltaTime * 1000;

            // Apply Tick Damage
            if (effect.tickTimer <= 0) {
                enemy.currentHealth -= def.damagePerTick;
                effect.tickTimer = def.tickRate; // Reset tick
                console.log("Burn damage tick!");
                
                // Visual Indicator (simple text particle logic can be added here)
            }

            // Remove expired effects
            if (effect.timer <= 0) {
                enemy.activeEffects.splice(i, 1);
            }
        }
    });
}

function renderPlayerHands() {
    
    if (player.isCasting) {
        const hand = spellImages.castingHand;
        if (hand && hand.complete) {
            // Render casting hand centered or slightly offset
            const scale = 0.6;
            const w = canvas.width * scale;
            const h = w * (hand.height / hand.width);
            const x = (canvas.width / 2) - (w / 2);
            const y = (canvas.height - h) + (player.pitch * 0.5) + 50; // Add bobbing if needed

            // NEW: If casting teleport, make hands translucent
            if (player.equippedScroll && player.equippedScroll.spellId === "TELEPORT") {
                ctx.globalAlpha = 0.4;
            }
            
            ctx.drawImage(hand, x, y, w, h);
        }
        return; // Don't draw weapon if casting
    }
    
    let handImage;

    if (equippedItem.isSwinging && equippedItem.animationFrames[equippedItem.currentFrame]) {
        handImage = equippedItem.animationFrames[equippedItem.currentFrame];
    } else {
        handImage = equippedItem.animationFrames[0]; // âœ… Use first frame as idle pose
    }

    if (!handImage || !handImage.complete) return;

   // --- CONFIGURATION ---
    const scale = 1.2; // How big the weapon is (0.7 = 70% of screen width)
    
    // 0.5 = Center (Default)
    // 0.7 = Shift Right (Standard FPS view)
    // 0.3 = Shift Left
    const horizontalPosition = 0.7; 
    
    const handWidth = canvas.width * scale;
    const handHeight = handWidth * (handImage.height / handImage.width);
    
    // Calculate X based on the horizontal position percentage
    const x = (canvas.width * horizontalPosition) - (handWidth / 2);
    
    const bobOffset = Math.sin(player.walkAnimTimer) * player.bobAmount;

    // Add bobOffset to the Y calculation
    const y = (canvas.height - handHeight * 0.95) + (player.pitch * 0.5) + bobOffset;

    ctx.globalAlpha = 1.0;
    ctx.drawImage(handImage, x, y, handWidth, handHeight);
    ctx.globalAlpha = 1.0;
}



function collectItem(item) {
    if (playerInventory.items.length >= playerInventory.maxSlots) {
        console.log("Inventory full!");
        return false;
    }
    
    // Check if item already exists in inventory (for stackable items)
    const existingItemIndex = playerInventory.items.findIndex(invItem => 
        invItem.type === item.type && invItem.stackable
    );
    
    if (existingItemIndex !== -1 && playerInventory.items[existingItemIndex].stackable) {
        playerInventory.items[existingItemIndex].quantity += item.quantity || 1;
    } else {
        playerInventory.items.push({
            ...item,
            quantity: item.quantity || 1,
            collected: true
        });
    }
    
    // Remove from ground items
    const itemIndex = groundItems.findIndex(groundItem => groundItem.id === item.id);
    if (itemIndex !== -1) {
        groundItems.splice(itemIndex, 1);
    }
    
    // Mark as collected in persistent state
    const levelItems = GAME_STATE.levels[currentLevel].items;
    const persistentItem = levelItems.find(persistentItem => persistentItem.id === item.id);
    if (persistentItem) {
        persistentItem.collected = true;
    }
    
    console.log(`Collected: ${ITEM_TYPES[item.type].name}`);
    return true;
}

function checkItemProximity() {
    nearbyDoor = null;
    showDoorPrompt = false;
    let actionTaken = false; // Track if something happened
    
    // Check Items
    for (let i = groundItems.length - 1; i >= 0; i--) {
        const item = groundItems[i];
        const dx = item.x - player.x;
        const dy = item.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 40) { 
            if (collectItem(item)) {
                actionTaken = true;
                break; 
            }
        }
    }

    // Check Doors
    for (const doorObj of wallObjects) {
        if (doorObj.type !== "door") continue;
        const doorX = doorObj.mapX * TILE_SIZE + TILE_SIZE / 2;
        const doorY = doorObj.mapY * TILE_SIZE + TILE_SIZE / 2;
        const dx = doorX - player.x;
        const dy = doorY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 80) { 
            nearbyDoor = doorObj;
            showDoorPrompt = true;
            // Only count as "action taken" if we actually interact with it via interactWithDoor()
            // But for prompt logic, we return false here so checkNPCInteraction isn't blocked
            // unless we actually executed the door open logic which is handled in the Keydown event
        }
    }
    
    // Handle Door interaction if door is nearby
    if (nearbyDoor && !actionTaken) {
        interactWithDoor();
        actionTaken = true;
    }

    return actionTaken;
}
function renderInventory() {
    if (!playerInventory.isOpen) return;
    
    // Semi-transparent background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Inventory window dimensions
    const invWidth = 600;
    const invHeight = 550; // Increased height to fit Spell section
    const invX = (canvas.width - invWidth) / 2;
    const invY = (canvas.height - invHeight) / 2;
    
    // Window background
    ctx.fillStyle = "rgb(40, 40, 60)";
    ctx.fillRect(invX, invY, invWidth, invHeight);
    ctx.strokeStyle = "rgb(150, 0, 255)";
    ctx.lineWidth = 3;
    ctx.strokeRect(invX, invY, invWidth, invHeight);
    
    // Title
    ctx.font = "24px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("INVENTORY", canvas.width / 2, invY + 40);

    // NEW: Display Player Age
    ctx.font = "14px 'Press Start 2P'";
    ctx.fillStyle = "rgb(255, 80, 80)"; // A reddish color to indicate life/blood
    ctx.fillText(`Age: ${Math.floor(player.age)}`, canvas.width / 2, invY + 65);
    
    // Close instruction
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillText("Press I to close", canvas.width / 2, invY + invHeight - 20);
    
    // Coordinates for sections
    const sectionX = invX + 50;
    const sectionWidth = invWidth - 100;
    let currentY = invY + 70;

    // 1. Weapon Section
    renderWeaponSection(sectionX, currentY, sectionWidth, 100);
    currentY += 110;

    // 2. Shield Section
    renderShieldSection(sectionX, currentY, sectionWidth, 80);
    currentY += 90;

    // 3. Magic/Spell Section (Fixed!)
    renderMagicSection(sectionX, currentY, sectionWidth, 80);
    currentY += 90;

    // 4. Items Grid
    renderItemsSection(sectionX, currentY, sectionWidth, 150);
}
function renderMagicSection(x, y, width, height) {
    ctx.fillStyle = "rgba(30, 0, 50, 0.8)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgb(200, 100, 255)";
    ctx.strokeRect(x, y, width, height);
    
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText("SPELL", x + 10, y + 20);
    
    if (player.equippedScroll) {
        // Draw Icon
        const icon = itemImages[player.equippedScroll.type]; // Or spellImages.icon
        if(icon) ctx.drawImage(icon, x + 20, y + 30, 50, 50);
        
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText(player.equippedScroll.name, x + 80, y + 45);
    } else {
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillStyle = "gray";
        ctx.fillText("No Scroll Equipped", x + 20, y + 50);
    }
}
function renderWeaponSection(x, y, width, height) {
    ctx.fillStyle = "rgba(30, 30, 50, 0.8)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgb(100, 100, 200)";
    ctx.strokeRect(x, y, width, height);
    
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText("WEAPONS", x + 10, y + 20);
    
    // Render equipped weapon
    if (equippedItem) {
        const weaponX = x + 20;
        const weaponY = y + 40;
        const weaponSize = 50;
        
        // Weapon slot background
        ctx.fillStyle = "rgba(50, 50, 80, 0.8)";
        ctx.fillRect(weaponX, weaponY, weaponSize, weaponSize);
        ctx.strokeStyle = "rgb(150, 0, 255)";
        ctx.strokeRect(weaponX, weaponY, weaponSize, weaponSize);
        
        // Weapon image (first frame)
        if (equippedItem.animationFrames[0] && equippedItem.animationFrames[0].complete) {
            ctx.drawImage(
                equippedItem.animationFrames[0],
                weaponX,
                weaponY,
                weaponSize,
                weaponSize
            );
        }
        
        // Weapon name
        ctx.font = "12px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.fillText(equippedItem.name, weaponX + weaponSize + 10, weaponY + 15);
        
        // Weapon stats
        ctx.font = "10px 'Press Start 2P'";
        ctx.fillText(`Damage: ${equippedItem.damage}`, weaponX + weaponSize + 10, weaponY + 30);
        ctx.fillText(`Range: ${equippedItem.range}`, weaponX + weaponSize + 10, weaponY + 45);
    }
}

// 1. Logic to move item from Chest -> Player
function transferItemFromChest() {
    if (!chestInterface.activeChest) return;
    
    const chestItems = chestInterface.activeChest.chestItems;
    if (chestItems.length === 0) return;

    // Get item at selected slot
    const item = chestItems[chestInterface.selectedSlot];
    
    // Add to player inventory
    // If it's a Weapon (defined by having 'damage' property or type 'weapon')
    if (item.type === 'weapon' || item.damage !== undefined) {
        // Add to main weapon inventory array
        inventory.push(item);
        console.log("Weapon acquired:", item.name);
    } else {
        // Regular item (potion/key) logic
        if (playerInventory.items.length >= playerInventory.maxSlots) {
            console.log("Inventory full!");
            return;
        }
        playerInventory.items.push({ ...item, quantity: 1, collected: true });
    }

    // Remove from chest
    chestItems.splice(chestInterface.selectedSlot, 1);
    
    // Fix selection index if list shrank
    if (chestInterface.selectedSlot >= chestItems.length) {
        chestInterface.selectedSlot = Math.max(0, chestItems.length - 1);
    }
}

// 2. Render the Chest Interface
function renderChestInterface() {
    if (!chestInterface.isOpen || !chestInterface.activeChest) return;

    const invWidth = 500;
    const invHeight = 300;
    const invX = (canvas.width - invWidth) / 2;
    const invY = (canvas.height - invHeight) / 2;

    ctx.fillStyle = "rgba(40, 20, 10, 0.95)";
    ctx.fillRect(invX, invY, invWidth, invHeight);
    ctx.strokeStyle = "gold";
    ctx.lineWidth = 3;
    ctx.strokeRect(invX, invY, invWidth, invHeight);

    ctx.font = "20px 'Press Start 2P'";
    ctx.fillStyle = "gold";
    ctx.textAlign = "center";
    ctx.fillText("CHEST CONTENTS", canvas.width / 2, invY + 40);

    const slotSize = 60;
    const padding = 15;
    const startX = invX + 50;
    const startY = invY + 80;
    const items = chestInterface.activeChest.chestItems || [];

    items.forEach((item, index) => {
        const row = Math.floor(index / chestInterface.slotsPerRow);
        const col = index % chestInterface.slotsPerRow;
        const x = startX + col * (slotSize + padding);
        const y = startY + row * (slotSize + padding);

        if (index === chestInterface.selectedSlot) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            ctx.fillRect(x - 5, y - 5, slotSize + 10, slotSize + 10);
            ctx.strokeStyle = "white";
            ctx.strokeRect(x - 5, y - 5, slotSize + 10, slotSize + 10);
        }

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(x, y, slotSize, slotSize);

        let imgToDraw = null;

        if (item.icon) {
            imgToDraw = item.icon;
        } 
        // FIX: Check for textureKey first
        else {
            const key = item.textureKey || item.type;
            if (itemImages[key]) {
                imgToDraw = itemImages[key];
            }
        }

        if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
            ctx.drawImage(imgToDraw, x, y, slotSize, slotSize);
        } else {
            ctx.fillStyle = "white";
            ctx.font = "8px 'Press Start 2P'";
            ctx.textAlign = "center";
            ctx.fillText(item.name ? item.name.substring(0, 4) : "???", x + slotSize/2, y + slotSize/2 + 4);
        }

        if (item.quantity > 1) {
            ctx.fillStyle = "white";
            ctx.font = "10px 'Press Start 2P'";
            ctx.textAlign = "right";
            ctx.fillText(item.quantity.toString(), x + slotSize - 5, y + slotSize - 5);
        }
    });

    if (items.length === 0) {
        ctx.font = "12px 'Press Start 2P'";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "center";
        ctx.fillText("Empty", canvas.width/2, startY + 50);
    }

    if (items[chestInterface.selectedSlot]) {
        const selItem = items[chestInterface.selectedSlot];
        ctx.font = "12px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText(selItem.name || selItem.type, canvas.width/2, invY + invHeight - 60);
    }

    ctx.font = "10px 'Press Start 2P'";
    ctx.fillStyle = "lightgray";
    ctx.fillText("SPACE: Take   F: Close", canvas.width/2, invY + invHeight - 20);
}

function renderShieldSection(x, y, width, height) {
    ctx.fillStyle = "rgba(30, 30, 50, 0.8)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgb(100, 100, 200)";
    ctx.strokeRect(x, y, width, height);
    
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText("SHIELD", x + 10, y + 20);
    
    const shieldX = x + 20;
    const shieldY = y + 40;
    const shieldSize = 50;
    
    // Shield slot background
    ctx.fillStyle = "rgba(50, 50, 80, 0.8)";
    ctx.fillRect(shieldX, shieldY, shieldSize, shieldSize);
    ctx.strokeStyle = shield.active ? "rgb(0, 255, 255)" : "rgb(100, 100, 200)";
    ctx.strokeRect(shieldX, shieldY, shieldSize, shieldSize);
    
    // Shield image
    if (shield.image.complete) {
        ctx.drawImage(
            shield.image,
            shieldX,
            shieldY,
            shieldSize,
            shieldSize
        );
    }
    
    // Shield info
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.fillText(shield.type.name, shieldX + shieldSize + 10, shieldY + 15);
    
    ctx.font = "10px 'Press Start 2P'";
    if (shield.cooldownTimer > 0) {
        const secondsLeft = (shield.cooldownTimer / 1000).toFixed(1);
        ctx.fillText(`Cooldown: ${secondsLeft}s`, shieldX + shieldSize + 10, shieldY + 30);
    } else {
        ctx.fillText("Ready to use", shieldX + shieldSize + 10, shieldY + 30);
    }
}

function renderItemsSection(x, y, width, height) {
    ctx.fillStyle = "rgba(30, 30, 50, 0.8)";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "rgb(100, 100, 200)";
    ctx.strokeRect(x, y, width, height);
    
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.fillText("ITEMS", x + 10, y + 20);
    
    const slotSize = 60;
    const slotsPerRow = 4;
    const padding = 10;
    
    for (let i = 0; i < playerInventory.maxSlots; i++) {
        const row = Math.floor(i / slotsPerRow);
        const col = i % slotsPerRow;
        const slotX = x + padding + col * (slotSize + padding);
        const slotY = y + 40 + row * (slotSize + padding);
        
        if (i === playerInventory.selectedSlot) {
            ctx.fillStyle = "rgba(150, 0, 255, 0.6)"; 
        } else {
            ctx.fillStyle = "rgba(20, 20, 40, 0.8)";
        }
        ctx.fillRect(slotX, slotY, slotSize, slotSize);
        ctx.strokeStyle = i === playerInventory.selectedSlot ? "rgb(255, 255, 255)" : "rgb(80, 80, 120)";
        ctx.lineWidth = i === playerInventory.selectedSlot ? 2 : 1;
        ctx.strokeRect(slotX, slotY, slotSize, slotSize);
        
        if (i < playerInventory.items.length) {
            const item = playerInventory.items[i];
            const key = item.textureKey || item.type;
            const itemImg = itemImages[key];
            
            if (itemImg && itemImg.complete) {
                ctx.drawImage(itemImg, slotX, slotY, slotSize, slotSize);
            } else {
                ctx.fillStyle = "gold";
                ctx.fillRect(slotX + 5, slotY + 5, slotSize - 10, slotSize - 10);
            }
            
            if (item.quantity > 1) {
                ctx.font = "10px 'Press Start 2P'";
                ctx.fillStyle = "white";
                ctx.textAlign = "right";
                ctx.fillText(item.quantity.toString(), slotX + slotSize - 5, slotY + slotSize - 5);
            }
        }
    }
    
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "right";
    ctx.fillText(
        `${playerInventory.items.length}/${playerInventory.maxSlots}`,
        x + width - 10,
        y + height - 10
    );
    
    // FIX: Added length > 0 check to prevent crash on empty inventory
    if (playerInventory.items.length > 0 && playerInventory.selectedSlot < playerInventory.items.length) {
        const selectedItem = playerInventory.items[playerInventory.selectedSlot];
        
        // Safety check if selectedItem is somehow undefined
        if (selectedItem) {
            const itemType = ITEM_TYPES[selectedItem.type] || selectedItem; 
            
            ctx.font = "12px 'Press Start 2P'";
            ctx.fillStyle = "white";
            ctx.textAlign = "left";
            
            ctx.fillText(selectedItem.name || itemType.name, x + 10, y + height - 40);
            
            const descriptionLines = wrapText(itemType.description || selectedItem.description || "", width - 20, ctx);
            ctx.font = "10px 'Press Start 2P'";
            descriptionLines.forEach((line, i) => {
                ctx.fillText(line, x + 10, y + height - 25 + (i * 12));
            });
            
            if (itemType.consumable) {
                ctx.font = "10px 'Press Start 2P'";
                ctx.fillStyle = "rgb(0, 255, 0)";
                ctx.fillText("Press ENTER to use", x + width - 120, y + height - 15);
            }
        }
    }
    
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillStyle = "rgb(200, 200, 200)";
    ctx.textAlign = "left";
    ctx.fillText("ARROWS: Navigate", x + 10, y + height - 15);
    ctx.fillText("ENTER: Use/Equip", x + 150, y + height - 15);
    ctx.fillText("I: Close", x + 280, y + height - 15);
}

function useSelectedItem() {
    if (playerInventory.selectedSlot >= playerInventory.items.length) return;
    
    const item = playerInventory.items[playerInventory.selectedSlot];
    
    switch(item.type) {
        case "POTION":
            if (player.health < player.maxHealth) {
                player.health = Math.min(player.maxHealth, player.health + 25);
                if (item.quantity > 1) {
                    item.quantity--;
                } else {
                    playerInventory.items.splice(playerInventory.selectedSlot, 1);
                    // Adjust slot if list shrank
                    if (playerInventory.selectedSlot >= playerInventory.items.length) {
                        playerInventory.selectedSlot = Math.max(0, playerInventory.items.length - 1);
                    }
                }
                savePlayerState();
                console.log("Used potion.");
            } else {
                console.log("Health full!");
            }
            break;
            
        case "SCROLL":
            // Equip the scroll
            player.equippedScroll = item;
            console.log(`Equipped ${item.name}`);
            playerInventory.isOpen = false; // Close inventory to return to game
            break;
            
        default:
            console.log(`Cannot use ${item.name}`);
    }
}

function useItem(itemIndex) {
    if (itemIndex >= playerInventory.items.length) return;
    
    const item = playerInventory.items[itemIndex];
    
    switch(item.type) {
        case "POTION":
            player.health = Math.min(player.maxHealth, player.health + 25);
            // Remove potion from inventory
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                playerInventory.items.splice(itemIndex, 1);
            }
            console.log("Used health potion!");
            break;
            
        case "SCROLL":
            // Add scroll effects here
            console.log("Read ancient scroll");
            break;
            
        default:
            console.log(`Cannot use ${ITEM_TYPES[item.type].name}`);
    }
}

// Add function to render ground items

function checkNPCInteraction() {
    let closestNPC = null;
    let minDistance = Infinity;
    showInteractionText = false;

    // 1. Check Static Objects/NPCs
    objects.forEach(obj => {
        if (!obj.interactable) return;
        const dx = obj.x - player.x;
        const dy = obj.y - player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 50 && dist < minDistance) {
            minDistance = dist;
            closestNPC = obj;
            showInteractionText = true;
        }
    });

    // 2. Check Roaming NPCs (New!)
    currentRoamingNpcs.forEach(npc => {
        const dx = npc.x - player.x;
        const dy = npc.y - player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < npc.interactionRadius && dist < minDistance) {
            minDistance = dist;
            closestNPC = npc;
            closestNPC.interactionType = "talk"; // Ensure dialog box works
            showInteractionText = true;
        }
    });

    nearbyNPC = closestNPC;
}

function resetLevel(levelName) {
    if (GAME_STATE.levels[levelName]) {
        delete GAME_STATE.levels[levelName];
    }
    if (currentLevel === levelName) {
        loadLevel(levelName);
    }
}

function renderDialogue() {
    if (!nearbyNPC) return;

    const dialogueSet = GAME_PROGRESS.hasStudiedInLibrary 
        ? nearbyNPC.dialogue.postLibrary 
        : nearbyNPC.dialogue.normal;

    // Ensure index doesn't crash
    if (dialogueIndex >= dialogueSet.length) return;

    // Dialogue box dimensions
    const boxHeight = 100;
    const boxY = canvas.height - boxHeight - 20;
    
    // Draw Main Text Box
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(50, boxY, canvas.width - 100, boxHeight);
    
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;
    ctx.strokeRect(50, boxY, canvas.width - 100, boxHeight);

    // --- NAME TAG LOGIC ---
    // Only draw the name tag if the entity HAS a name
    if (nearbyNPC.name) {
        ctx.fillStyle = "rgb(150, 0, 255)";
        ctx.fillRect(50, boxY - 30, 200, 30);
        
        ctx.font = "16px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.fillText(nearbyNPC.name, 60, boxY - 10);
    }

    // Draw Dialogue text
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    
    const lines = wrapText(dialogueSet[dialogueIndex], canvas.width - 140, ctx);
    lines.forEach((line, i) => {
        ctx.fillText(line, 70, boxY + 40 + (i * 25));
    });
    
    // "Next" indicator blinking
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.font = "12px 'Press Start 2P'";
        ctx.textAlign = "right";
        ctx.fillText("Press F â–¼", canvas.width - 70, boxY + boxHeight - 15);
    }
}

// Helper function for text wrapping
function wrapText(text, maxWidth, context) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}





function updateEnemies(deltaTime) {
    for (let i = currentEnemies.length - 1; i >= 0; i--) {
        const enemy = currentEnemies[i];
        
    if (enemy.state === "DEAD") {
        continue; // Skip movement and attack logic for corpses
    }

    // --- 2. CHECK HEALTH ---
    if (enemy.currentHealth <= 0) {
        enemy.state = "DEAD"; // Mark as dead
        enemy.blocking = false; // Disable collision (custom flag)
        
        // Optional: Play death sound here
        console.log(`${enemy.name} died!`);
        
        continue; // Stop processing this enemy for this frame
    }

        // Handle knockback first if active (only from attacks)
        if (enemy.knockbackTimer > 0) {
            // Store original position for collision recovery
            const originalX = enemy.x;
            const originalY = enemy.y;
            
            // Apply knockback
            enemy.x += enemy.knockbackX;
            enemy.y += enemy.knockbackY;
            
            // Check if knockback caused wall collision and revert if needed
            if (isEnemyInWall(enemy)) {
                enemy.x = originalX;
                enemy.y = originalY;
                enemy.knockbackX = 0;
                enemy.knockbackY = 0;
            }
            
            enemy.knockbackTimer--;
            
            // Skip other logic during knockback
            continue;
        }

        // Skip all other logic if attacking
        if (enemy.isAttacking) {
            updateEnemyAttackAnimation(enemy, deltaTime);
            continue;
        }

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
        const angleToPlayer = Math.atan2(dy, dx);

        // Handle attack cooldown (convert to seconds)
        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown -= deltaTime * 1000;
        }

        // Check if enemy should attack (when close to player)
        if (distToPlayer < ENEMY_ATTACKS[enemy.attackType].range && 
            enemy.attackCooldown <= 0) {
            startEnemyAttack(enemy);
            continue;
        }

        // Detection logic
        let hasLOS = false;
        if (distToPlayer < enemy.visionRange) {
            hasLOS = isLineOfSightClear(enemy.x, enemy.y, player.x, player.y);

            if (hasLOS) {
                if (enemy.state !== "chasing") {
                    enemy.state = "chasing";
                }
                // Set memory duration to 4000ms (4 seconds)
                enemy.memoryTimer = 4000; 
                
                // Store the last known coordinates
                enemy.lastSeenX = player.x;
                enemy.lastSeenY = player.y;
            }
        }

        // Track if enemy moved this frame
        let movedThisFrame = false;
        const prevX = enemy.x;
        const prevY = enemy.y;

        if (enemy.state === "chasing") {
            if (enemy.memoryTimer <= 0) {
                enemy.state = "patrolling";
            } else {
                if (!hasLOS) {
                    enemy.memoryTimer -= deltaTime * 1000;
                }

                const targetX = hasLOS ? player.x : (enemy.lastSeenX || player.x);
                const targetY = hasLOS ? player.y : (enemy.lastSeenY || player.y);
                
                const targetDx = targetX - enemy.x;
                const targetDy = targetY - enemy.y;
                const distToTarget = Math.sqrt(targetDx * targetDx + targetDy * targetDy);

                if (!hasLOS && distToTarget < 20) {
                    enemy.memoryTimer -= deltaTime * 3000; 
                } else {
                    const angle = Math.atan2(targetDy, targetDx);
                    const moveX = Math.cos(angle) * enemy.speed * deltaTime * 60;
                    const moveY = Math.sin(angle) * enemy.speed * deltaTime * 60;
                    
                    // NEW: Just use the flawless slider, no extra pathing logic needed!
                    moveEnemyWithCollision(enemy, moveX, moveY);
                    movedThisFrame = (enemy.x !== prevX || enemy.y !== prevY);
                }
            }
        } 
        else if (enemy.state === "patrolling") {
            const target = enemy.patrolPoints[enemy.patrolIndex];
            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 5) {
                enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
            } else {
                const angle = Math.atan2(dy, dx);
                const moveX = Math.cos(angle) * enemy.speed * 0.5 * deltaTime * 60;
                const moveY = Math.sin(angle) * enemy.speed * 0.5 * deltaTime * 60;
                
                // NEW: Just use the flawless slider here too
                moveEnemyWithCollision(enemy, moveX, moveY);
                movedThisFrame = (enemy.x !== prevX || enemy.y !== prevY);
            }
        }

        // Update walk animation based on movement
        enemy.walkAnimation.isMoving = movedThisFrame;

        if (movedThisFrame) {
            enemy.walkAnimation.frameCount++;
            if (enemy.walkAnimation.frameCount >= enemy.walkAnimation.frameDelay) {
                enemy.walkAnimation.frameCount = 0;
                enemy.walkAnimation.currentFrame = (enemy.walkAnimation.currentFrame + 1) % enemy.walkAnimation.frames.length;
            }
            // Reset idle frame so it starts from 0 when it stops
            if (enemy.idleAnimation) enemy.idleAnimation.currentFrame = 0;
        } else {
            // Not moving, so reset walk animation
            enemy.walkAnimation.currentFrame = 0;

            if (enemy.idleAnimation && enemy.idleAnimation.loaded) {
                enemy.idleAnimation.frameCount++;
                if (enemy.idleAnimation.frameCount >= enemy.idleAnimation.frameDelay) {
                    enemy.idleAnimation.frameCount = 0;
                    enemy.idleAnimation.currentFrame = (enemy.idleAnimation.currentFrame + 1) % enemy.idleAnimation.frames.length;
                }
            }
        }
    }
}


function updateEnemyAttackAnimation(enemy, deltaTime) {
    const attack = ENEMY_ATTACKS[enemy.attackType];
    
    // Update elapsed time using deltaTime (convert to ms)
    enemy.attackElapsed = (enemy.attackElapsed || 0) + deltaTime * 1000;
    
    // Update attack frame based on the attack animation frames
    const frameDuration = attack.duration / enemy.attackAnimation.frames.length;
    enemy.attackAnimation.currentFrame = Math.min(
        Math.floor(enemy.attackElapsed / frameDuration),
        enemy.attackAnimation.frames.length - 1
    );
    
    // Apply damage during windup phase
    if (enemy.attackElapsed >= attack.windup && 
        enemy.attackElapsed < attack.windup + frameDuration && 
        !enemy.hasAppliedDamage) {
        
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= attack.range && !player.invincible) {
            // Check if shield blocks the attack
            const wasBlocked = takeShieldHit(enemy);
            
            if (!wasBlocked) {
                // 2. CHECK INTERRUPTION: If raising, cancel it!
                if (shield.state === SHIELD_STATES.RAISING) {
                    cancelShieldAction();
                }

                // Apply damage
                player.health -= attack.damage;
                savePlayerState();
                
                const angle = Math.atan2(dy, dx);
                const totalKnockback = attack.knockback;
                
                // Break the knockback into smaller ~5 pixel chunks
                const steps = Math.max(1, Math.ceil(totalKnockback / 5)); 
                const stepX = (Math.cos(angle) * totalKnockback) / steps;
                const stepY = (Math.sin(angle) * totalKnockback) / steps;

                // Apply knockback incrementally and handle axes independently
                for (let i = 0; i < steps; i++) {
                    if (!isTooCloseToSolid(player.x + stepX, player.y, MIN_WALL_DISTANCE)) {
                        player.x += stepX;
                    }
                    if (!isTooCloseToSolid(player.x, player.y + stepY, MIN_WALL_DISTANCE)) {
                        player.y += stepY;
                    }
                }

                player.invincible = true;
                player.invincibleTimer = 500;
            }
            // If wasBlocked is true, shield handled it (either parry or regular block)
        }
        enemy.hasAppliedDamage = true;
    }
    
    // End attack when duration is over
    if (enemy.attackElapsed >= attack.duration) {
        enemy.isAttacking = false;
        enemy.attackElapsed = 0;
        enemy.hasAppliedDamage = false;
        enemy.state = "chasing";
        enemy.attackCooldown = attack.cooldown;
    }
}
function updateRoamingNpcs(deltaTime) {
    currentRoamingNpcs.forEach(npc => {
        // 1. Stop logic: If talking to THIS npc, stop moving
        if (showDialogue && nearbyNPC === npc) {
            npc.isMoving = false;
            return; // Skip movement update
        } else {
            npc.isMoving = true;
        }

        // 2. Patrol Logic
        const target = npc.patrolPoints[npc.patrolIndex];
        const dx = target.x - npc.x;
        const dy = target.y - npc.y;
        const distToTarget = Math.sqrt(dx*dx + dy*dy);

        if (distToTarget < 5) {
            // Reached point, go to next
            npc.patrolIndex = (npc.patrolIndex + 1) % npc.patrolPoints.length;
        } else {
            // Move towards target
            const angle = Math.atan2(dy, dx);
            npc.facingAngle = angle; // Can be used for sprite selection later
            
            const moveX = Math.cos(angle) * npc.speed * deltaTime * 60;
            const moveY = Math.sin(angle) * npc.speed * deltaTime * 60;

            // Collision Check (Simple wall check)
            const nextX = npc.x + moveX;
            const nextY = npc.y + moveY;
            
            if (!isTooCloseToSolid(nextX, npc.y, npc.radius, {walls: true, objects: false})) {
                npc.x = nextX;
            }
            if (!isTooCloseToSolid(npc.x, nextY, npc.radius, {walls: true, objects: false})) {
                npc.y = nextY;
            }
        }

        // 3. Animation Update
        if (npc.loaded) {
            npc.frameCounter++;
            if (npc.frameCounter >= npc.frameDelay) {
                npc.frameCounter = 0;
                npc.currentFrame = (npc.currentFrame + 1) % npc.images.length;
            }
        }
    });
}

function handleEnemyPlayerCollision(enemy, dx, dy, distToPlayer) {
    // Calculate normalized direction vector
    const nx = dx / distToPlayer;
    const ny = dy / distToPlayer;
    
    // Calculate overlap amount
    const overlap = (ENEMY_COLLISION_RADIUS + PLAYER_COLLISION_RADIUS) - distToPlayer;
    
    // Push enemy back to prevent overlap (but no knockback)
    enemy.x -= nx * overlap * 0.5;
    enemy.y -= ny * overlap * 0.5;
    
    // Start attack if not already attacking and cooldown is ready
    if (!enemy.isAttacking && enemy.attackCooldown <= 0) {
        startEnemyAttack(enemy);
    }
}

function moveEnemyWithCollision(enemy, dx, dy) {
    // 1. Move X and check collision (SLIDING LOGIC)
    const tryX = enemy.x + dx;
    if (!isTooCloseToSolid(tryX, enemy.y, ENEMY_COLLISION_RADIUS, { walls: true, objects: false })) {
        enemy.x = tryX;
    }

    // 2. Move Y and check collision (SLIDING LOGIC)
    const tryY = enemy.y + dy;
    if (!isTooCloseToSolid(enemy.x, tryY, ENEMY_COLLISION_RADIUS, { walls: true, objects: false })) {
        enemy.y = tryY;
    }

    // 3. Check collision with player
    const dxToPlayer = player.x - enemy.x;
    const dyToPlayer = player.y - enemy.y;
    const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);
    
    if (distToPlayer < ENEMY_COLLISION_RADIUS + PLAYER_COLLISION_RADIUS) {
        handleEnemyPlayerCollision(enemy, dxToPlayer, dyToPlayer, distToPlayer);
    }

    // 4. Check collision with other enemies (Soft Squeeze)
    currentEnemies.forEach(other => {
        if (other !== enemy && other.currentHealth > 0) {
            const dist = Math.hypot(enemy.x - other.x, enemy.y - other.y);
            const squeezeRadius = ENEMY_COLLISION_RADIUS * 1.2; 

            if (dist > 0 && dist < squeezeRadius) {
                // Push enemies apart more gently
                const nx = (enemy.x - other.x) / dist;
                const ny = (enemy.y - other.y) / dist;
                const overlap = squeezeRadius - dist;
                
                // Apply a much softer push (0.1) so forward momentum wins
                const pushX = nx * overlap * 0.1;
                const pushY = ny * overlap * 0.1;
                
                // Only push if it doesn't shove them into a wall
                if (!isTooCloseToSolid(enemy.x + pushX, enemy.y, ENEMY_COLLISION_RADIUS, { walls: true, objects: false })) {
                    enemy.x += pushX;
                }
                if (!isTooCloseToSolid(enemy.x, enemy.y + pushY, ENEMY_COLLISION_RADIUS, { walls: true, objects: false })) {
                    enemy.y += pushY;
                }
            }
        }
    });
}

const lightOcclusionCache = new Map();

function isLightLineOfSightClear(startX, startY, endX, endY) {
    // Convert world coordinates to map tiles
    const startTileX = Math.floor(startX / TILE_SIZE);
    const startTileY = Math.floor(startY / TILE_SIZE);
    const endTileX = Math.floor(endX / TILE_SIZE);
    const endTileY = Math.floor(endY / TILE_SIZE);

    const cacheKey = `${startTileX},${startTileY},${endTileX},${endTileY}`;

    // Sync cache clearing with the existing cacheFrame tracker
    if (lightOcclusionCache.lastFrame !== cacheFrame) {
        lightOcclusionCache.clear();
        lightOcclusionCache.lastFrame = cacheFrame;
    }

    if (lightOcclusionCache.has(cacheKey)) {
        return lightOcclusionCache.get(cacheKey);
    }

    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    
    // Sample every half-tile to prevent rays slipping through corners
    const steps = Math.ceil(distance / (TILE_SIZE / 2));

    for (let i = 0; i <= steps; i++) {
        const checkX = startX + dx * (i / steps);
        const checkY = startY + dy * (i / steps);
        const mapX = Math.floor(checkX / TILE_SIZE);
        const mapY = Math.floor(checkY / TILE_SIZE);

        if (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[0].length) {
            const tile = map[mapY][mapX];
            if (tile > 0 && tile !== 3) { // Exclude transparent walls if needed
                lightOcclusionCache.set(cacheKey, false);
                return false;
            }
        }
    }

    lightOcclusionCache.set(cacheKey, true);
    return true;
}

// Add visibility cache
const visibilityCache = new Map();
let lastCacheClear = 0;

function isLineOfSightClear(x1, y1, x2, y2) {
    const tX1 = Math.floor(x1 / TILE_SIZE);
    const tY1 = Math.floor(y1 / TILE_SIZE);
    const tX2 = Math.floor(x2 / TILE_SIZE);
    const tY2 = Math.floor(y2 / TILE_SIZE);
    
    if (tX1 === tX2 && tY1 === tY2) return true;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(5, Math.floor(distance / (TILE_SIZE / 2))); 
    
    for (let i = 0; i <= steps; i++) {
        const checkX = x1 + dx * (i / steps);
        const checkY = y1 + dy * (i / steps);

        const mapX = Math.floor(checkX / TILE_SIZE);
        const mapY = Math.floor(checkY / TILE_SIZE);

        if ((mapX !== tX1 || mapY !== tY1) && (mapX !== tX2 || mapY !== tY2)) {
            if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length || 
               (map[mapY][mapX] > 0 && map[mapY][mapX] !== 3)) { 
                return false;
            }
        }
    }
    return true;
}
function startEnemyAttack(enemy) {
    enemy.isAttacking = true;
    enemy.attackElapsed = 0;
    enemy.hasAppliedDamage = false;
    enemy.attackAnimation.currentFrame = 0;
    enemy.state = "attacking";
    
    // Reset walk animation
    enemy.walkAnimation.isMoving = false;
    enemy.walkAnimation.currentFrame = 0;
}

function updateEnemyAttack(enemy, deltaTime) {
    const attack = ENEMY_ATTACKS[enemy.attackType];
    
    // Update elapsed time using deltaTime (convert to ms)
    enemy.attackElapsed = (enemy.attackElapsed || 0) + deltaTime * 1000;
    
    // Update attack frame
    const frameDuration = attack.duration / attack.spriteFrames;
    enemy.currentAttackFrame = Math.min(
        Math.floor(enemy.attackElapsed / frameDuration),
        attack.spriteFrames - 1
    );
    
    // Apply damage during windup phase
     if (enemy.attackElapsed >= attack.windup && 
        enemy.attackElapsed < attack.windup + frameDuration && 
        !enemy.hasAppliedDamage) {
        
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= attack.range && !player.invincible) {
            // Apply damage
            player.health -= attack.damage;
            
            // Apply knockback to PLAYER (pushes player AWAY from enemy)
            // Apply knockback to PLAYER (pushes player AWAY from enemy)
            const angle = Math.atan2(dy, dx);
            const totalKnockback = attack.knockback;
            
            // Break the knockback into smaller chunks
            const steps = Math.max(1, Math.ceil(totalKnockback / 5)); 
            const stepX = (Math.cos(angle) * totalKnockback) / steps;
            const stepY = (Math.sin(angle) * totalKnockback) / steps;

            // Incrementally push the player until they hit the wall bounds
            for (let i = 0; i < steps; i++) {
                if (!isTooCloseToSolid(player.x + stepX, player.y, MIN_WALL_DISTANCE)) {
                    player.x += stepX;
                }
                if (!isTooCloseToSolid(player.x, player.y + stepY, MIN_WALL_DISTANCE)) {
                    player.y += stepY;
                }
            }

            // Set invincibility frames
            player.invincible = true;
            player.invincibleTimer = 500;
            
            console.log(`Player hit! Health: ${player.health}, Knockback: ${attack.knockback}`);
        }
        enemy.hasAppliedDamage = true;
    }
    
    // End attack when duration is over
    if (enemy.attackElapsed >= attack.duration) {
        enemy.isAttacking = false;
        enemy.attackElapsed = 0;
        enemy.hasAppliedDamage = false;
        enemy.state = "chasing"; // Return to chasing state
        enemy.attackCooldown = attack.cooldown;
    }
}
function isEnemyInWall(enemy) {
    // Required by knockback, parry, and shield bash physics to prevent out-of-bounds clipping
    return isTooCloseToSolid(enemy.x, enemy.y, ENEMY_COLLISION_RADIUS, { walls: true, objects: false });
}

function updateWeaponAnimation(timestamp) {
    if (!equippedItem.isSwinging) return;

    const frameDuration = (1000 / equippedItem.frameRate) * player.attackSpeedMultiplier;
    
    // Check if it's time to advance a frame
    if (timestamp - equippedItem.lastFrameTime >= frameDuration) {
        equippedItem.currentFrame++;
        equippedItem.lastFrameTime = timestamp; // Update time
    }

    // DAMAGE LOGIC: Check if we are at or past the damage frame, and haven't dealt damage yet
    const actualDamageFrame = Math.min(equippedItem.damageFrame, equippedItem.animationFrames.length - 1);
    
    if (equippedItem.currentFrame >= actualDamageFrame && !equippedItem.hasDealtDamage) {
        
        // Mark damage as dealt so we don't apply it multiple times for one swing
        equippedItem.hasDealtDamage = true;

        for (let i = currentEnemies.length - 1; i >= 0; i--) {
            const enemy = currentEnemies[i];
            if (enemy.state === "DEAD") continue;
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distance = Math.hypot(dx, dy);
            
            if (distance <= equippedItem.range) {
                let angleDiff = Math.atan2(dy, dx) - player.angle;
                
                // Normalize angle difference to -PI to +PI
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                if (Math.abs(angleDiff) < equippedItem.arc / 2) {
                    enemy.currentHealth -= equippedItem.damage;
                    
                    if (enemy.currentHealth <= 0) {
                        enemy.state = "DEAD";
                        enemy.blocking = false;
                        console.log("Enemy killed by weapon");
                        continue; 
                    }
                    
                    const nx = dx / distance;
                    const ny = dy / distance;
                    enemy.knockbackTimer = 10;
                    
                    let knockbackX = nx * ENEMY_KNOCKBACK_FORCE;
                    let knockbackY = ny * ENEMY_KNOCKBACK_FORCE;
                    
                    const originalX = enemy.x;
                    const originalY = enemy.y;
                    
                    enemy.x += knockbackX;
                    enemy.y += knockbackY;
                    
                    if (isEnemyInWall(enemy)) {
                        enemy.x = originalX;
                        enemy.y = originalY;
                        
                        knockbackX *= 0.3;
                        knockbackY *= 0.3;
                        
                        enemy.x += knockbackX;
                        enemy.y += knockbackY;
                        
                        if (isEnemyInWall(enemy)) {
                            enemy.x = originalX;
                            enemy.y = originalY;
                            enemy.knockbackX = 0;
                            enemy.knockbackY = 0;
                        } else {
                            enemy.knockbackX = knockbackX;
                            enemy.knockbackY = knockbackY;
                        }
                    } else {
                        enemy.knockbackX = knockbackX;
                        enemy.knockbackY = knockbackY;
                    }
                }
            }
        }
    }

    // End animation logic
    if (equippedItem.currentFrame >= equippedItem.animationFrames.length) {
        equippedItem.isSwinging = false;
        equippedItem.currentFrame = 0;
        equippedItem.hasDealtDamage = false; // Reset flag
    }
}
function checkEnemyCollision(x, y, radius) {
    // More comprehensive collision checking with multiple points
    const checkPoints = [
        { x: x + radius, y: y },
        { x: x - radius, y: y },
        { x: x, y: y + radius },
        { x: x, y: y - radius },
        { x: x + radius * 0.7, y: y + radius * 0.7 },
        { x: x - radius * 0.7, y: y + radius * 0.7 },
        { x: x + radius * 0.7, y: y - radius * 0.7 },
        { x: x - radius * 0.7, y: y - radius * 0.7 },
        // Add corner points for even better coverage
        { x: x + radius * 0.5, y: y + radius * 0.87 },
        { x: x - radius * 0.5, y: y + radius * 0.87 },
        { x: x + radius * 0.5, y: y - radius * 0.87 },
        { x: x - radius * 0.5, y: y - radius * 0.87 }
    ];

    for (const point of checkPoints) {
        const mapX = Math.floor(point.x / TILE_SIZE);
        const mapY = Math.floor(point.y / TILE_SIZE);

        if (mapY >= 0 && mapY < map.length &&
            mapX >= 0 && mapX < map[0].length &&
            map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) {
            return true;
        }
    }

    return false;
}
function activateShield() {
    // Can only activate if lowered and cooldown is ready
    if (shield.state !== SHIELD_STATES.LOWERED || shield.cooldownTimer > 0) return;
    
    // Start raising animation
    shield.state = SHIELD_STATES.RAISING;
    shield.currentFrameIndex = 0;
    shield.active = false; // Not active yet!
    shield.parryActive = false;
    
    // Note: We DO NOT remove previousWeapon anymore, as we want to render both.
}

function deactivateShield() {
    // If fully raised or currently raising, start lowering
    if (shield.state === SHIELD_STATES.RAISED || shield.state === SHIELD_STATES.RAISING) {
        shield.state = SHIELD_STATES.LOWERING;
        // Frame index stays where it is to reverse smoothly
        shield.active = false;
        shield.parryActive = false;
    }
}

// Helper to cancel shield immediately (used when taking damage)
function cancelShieldAction() {
    shield.state = SHIELD_STATES.LOWERED;
    shield.active = false;
    shield.parryActive = false;
    shield.currentFrameIndex = 0;
    shield.cooldownTimer = 500; // Small penalty
    console.log("Shield action cancelled by damage!");
}

function updateShield(deltaTime) {
    // Update cooldown
    if (shield.cooldownTimer > 0) {
        shield.cooldownTimer -= deltaTime * 1000;
    }

    // --- ANIMATION STATE MACHINE ---
    if (shield.state === SHIELD_STATES.RAISING) {
        shield.frameTimer += deltaTime * 1000;
        if (shield.frameTimer >= shield.frameDelay) {
            shield.frameTimer = 0;
            shield.currentFrameIndex++;
            
            // Animation Finished?
            if (shield.currentFrameIndex >= shield.frames.length - 1) {
                shield.currentFrameIndex = shield.frames.length - 1; // Hold last frame
                shield.state = SHIELD_STATES.RAISED;
                
                // NOW the shield becomes active
                shield.active = true;
                shield.parryActive = true;
                shield.parryTimer = shield.type.parryWindow;
                checkParry(); // Check immediately upon raising
            }
        }
    } 
    else if (shield.state === SHIELD_STATES.LOWERING) {
        shield.frameTimer += deltaTime * 1000;
        if (shield.frameTimer >= shield.frameDelay) {
            shield.frameTimer = 0;
            shield.currentFrameIndex--;
            
            // Animation Finished?
            if (shield.currentFrameIndex <= 0) {
                shield.currentFrameIndex = 0;
                shield.state = SHIELD_STATES.LOWERED;
                shield.active = false;
            }
        }
    }

    // Update parry timer (only if raised)
    if (shield.state === SHIELD_STATES.RAISED && shield.parryTimer > 0) {
        shield.parryTimer -= deltaTime * 1000;
        if (shield.parryTimer <= 0) {
            shield.parryActive = false;
        }
    }

    // Push enemies logic (only when raised)
    if (shield.state === SHIELD_STATES.RAISED) {
        pushEnemies();
    }
}

function checkParry() {
    if (!shield.parryActive) return;
    
    let parrySuccessOccurred = false;
    
    currentEnemies.forEach(enemy => {
        if (enemy.isAttacking && enemy.attackElapsed < ENEMY_ATTACKS[enemy.attackType].windup) {
            const dx = enemy.x - player.x;
            const dy = enemy.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < enemy.visionRange) {
                // Successful parry!
                performParry(enemy);
                parrySuccessOccurred = true;
            }
        }
    });
    
    return parrySuccessOccurred;
}
function performParry(enemy) {
    console.log("Parry successful!");
    
    // Apply knockback to enemy with wall collision prevention
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / distance;
    const ny = dy / distance;
    
    enemy.knockbackTimer = 15;
    
    // Store original position for collision recovery
    const originalX = enemy.x;
    const originalY = enemy.y;
    
    // Calculate knockback force
    let knockbackX = nx * ENEMY_KNOCKBACK_FORCE * 1.5;
    let knockbackY = ny * ENEMY_KNOCKBACK_FORCE * 1.5;
    
    // Apply knockback
    enemy.x += knockbackX;
    enemy.y += knockbackY;
    
    // Check if knockback would push through wall
    if (isEnemyInWall(enemy)) {
        // Try reduced knockback
        enemy.x = originalX;
        enemy.y = originalY;
        
        knockbackX *= 0.5;
        knockbackY *= 0.5;
        
        enemy.x += knockbackX;
        enemy.y += knockbackY;
        
        // If still in wall, cancel knockback entirely
        if (isEnemyInWall(enemy)) {
            enemy.x = originalX;
            enemy.y = originalY;
            enemy.knockbackX = 0;
            enemy.knockbackY = 0;
        } else {
            enemy.knockbackX = knockbackX;
            enemy.knockbackY = knockbackY;
        }
    } else {
        enemy.knockbackX = knockbackX;
        enemy.knockbackY = knockbackY;
    }
    
    // Enemy is stunned briefly
    enemy.state = "stunned";
    enemy.stunTimer = 500;
    
    // Cancel the enemy's attack
    enemy.isAttacking = false;
    enemy.attackElapsed = 0;
    enemy.hasAppliedDamage = false;
    
    // Shield stays active but parry window ends
    shield.parryActive = false;
}

function parrySuccess(enemy) {
    console.log("Parry successful!");
    
    // Apply knockback to enemy
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / distance;
    const ny = dy / distance;
    
    enemy.knockbackTimer = 15;
    enemy.knockbackX = nx * ENEMY_KNOCKBACK_FORCE * 1.5; // Stronger knockback for parry
    enemy.knockbackY = ny * ENEMY_KNOCKBACK_FORCE * 1.5;
    
    // Enemy is stunned briefly
    enemy.state = "stunned";
    enemy.stunTimer = 500; // 0.5 second stun
    
    // Shield doesn't get lowered on successful parry
    shield.parryActive = false;
}

function takeShieldHit(enemy) {
    // Only block if shield is fully RAISED
    if (shield.state !== SHIELD_STATES.RAISED) return false;
    
    // Check parry
    if (shield.parryActive && enemy.isAttacking && 
        enemy.attackElapsed < ENEMY_ATTACKS[enemy.attackType].windup) {
        performParry(enemy);
        return true; 
    }
    
    // Regular block -> triggers lowering logic (reverses animation)
    deactivateShield(); // This sets state to LOWERING
    shield.cooldownTimer = shield.type.cooldown;
    
    return true; 
}

function pushEnemies() {
    if (!shield.active) return;
    
    currentEnemies.forEach(enemy => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only push enemies that are very close, but allow them to get close enough to attack
        if (distance < 50 && distance > 30) {
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Store original position
            const originalX = enemy.x;
            const originalY = enemy.y;
            
            // Gentle push to create space but not prevent attacks
            enemy.x += nx * shield.type.pushForce * 0.3;
            enemy.y += ny * shield.type.pushForce * 0.3;
            
            // Check for wall collision and revert if needed
            if (isEnemyInWall(enemy)) {
                enemy.x = originalX;
                enemy.y = originalY;
            }
        }
    });
}


function renderShield() {
    // Draw if raising, raised, or lowering
    if (shield.state === SHIELD_STATES.LOWERED) return;

    // Determine which image to use
    let imgToDraw = shield.image; // Default fallback
    
    if (shield.frames.length > 0) {
        // Safe check for index bounds
        const idx = Math.max(0, Math.min(shield.currentFrameIndex, shield.frames.length - 1));
        // Only use the frame if it's loaded, otherwise fallback
        if (shield.frames[idx] && shield.frames[idx].complete) {
            imgToDraw = shield.frames[idx];
        }
    }

    if (!imgToDraw.complete) return;
    
    // Configuration for Shield (Left Side)
    const scale = 0.6; // Slightly smaller than screen width
    const aspectRatio = imgToDraw.height / imgToDraw.width;
    const drawWidth = canvas.width * scale;
    const drawHeight = drawWidth * aspectRatio;
    
    // Position on LEFT side
    // x = 0 aligns to left edge. We might want it slightly off-screen or centered left.
    // -drawWidth * 0.2 means 20% of it is off-screen to the left
    const x = -drawWidth * 0.1; 
    
    // Calculate Y based on pitch (look up/down) + Animation "Slide" if no frames exist
    // If you don't have animation frames, we simulate movement with Y offset
    let yOffset = 0;
    if (shield.frames.length === 0) {
        // Fallback procedural animation if no png frames found
        // 0 = lowered, 1 = raised
        const progress = shield.currentFrameIndex / 5; // Assuming max 5 "steps" logic
        yOffset = (1 - progress) * 200; // Slide up from bottom
    }

    const bobOffset = Math.sin(player.walkAnimTimer) * player.bobAmount;

    // Add bobOffset to Y calculation
    const y = (canvas.height - drawHeight * 0.8) + (player.pitch * 0.5) + yOffset + bobOffset;
    
    ctx.drawImage(imgToDraw, x, y, drawWidth, drawHeight);
}
function renderShieldUI() {
    const barWidth = 200;
    const barHeight = 10;
    const margin = 20;
    const shieldPercent = shield.cooldownTimer > 0 ? 0 : 1;
    
    // Shield cooldown bar
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(margin, margin + 80, barWidth, barHeight);
    
    if (shield.cooldownTimer > 0) {
        const cooldownPercent = 1 - (shield.cooldownTimer / shield.type.cooldown);
        ctx.fillStyle = "blue";
        ctx.fillRect(margin, margin + 80, barWidth * cooldownPercent, barHeight);
    } else {
        ctx.fillStyle = shield.active ? "cyan" : "blue";
        ctx.fillRect(margin, margin + 80, barWidth * shieldPercent, barHeight);
    }
    
    ctx.strokeStyle = "white";
    ctx.strokeRect(margin, margin + 80, barWidth, barHeight);
    
    // Shield status text
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    
    if (shield.cooldownTimer > 0) {
        const secondsLeft = (shield.cooldownTimer / 1000).toFixed(1);
        ctx.fillText(`Shield: ${secondsLeft}s`, margin, margin + 100);
    } else if (shield.active) {
        ctx.fillStyle = "cyan";
        ctx.fillText("Shield: ACTIVE", margin, margin + 100);
        
        // Only show PARRY! during the actual parry window
        if (shield.parryActive && shield.parryTimer > 0) {
            ctx.fillStyle = "gold";
            ctx.fillText("PARRY!", margin + 120, margin + 100);
        }
    } else {
        ctx.fillText("Shield: READY", margin, margin + 100);
    }
}

function checkLibraryProximity() {
    const wasNearLibrary = nearLibrary;
    nearLibrary = false;
    
    if (inLibraryCutscene || GAME_PROGRESS.hasStudiedInLibrary) return;

    for (let dist = TILE_SIZE; dist <= 1.5 * TILE_SIZE; dist += TILE_SIZE/2) { //The proximity check for library is controolled here
        const checkX = player.x + Math.cos(player.angle) * dist;
        const checkY = player.y + Math.sin(player.angle) * dist;
        const mapX = Math.floor(checkX / TILE_SIZE);
        const mapY = Math.floor(checkY / TILE_SIZE);

        if (map[mapY] && map[mapY][mapX] === 5) {
            nearLibrary = true;
            return;
        }
    }
    
    // Reset study status if player walks away
    if (wasNearLibrary && !nearLibrary) {
        GAME_PROGRESS.hasStudiedInLibrary = false;
    }
}

function renderLibraryCutscene() {
    // Fullscreen black overlay
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Main text settings
    ctx.font = "24px 'Press Start 2P'";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    
    // Calculate total text width
    const fullText = libraryCutsceneText.replace(libraryYears, "");
    const yearPos = libraryCutsceneText.indexOf(libraryYears);
    const beforeYear = libraryCutsceneText.substring(0, yearPos);
    const afterYear = libraryCutsceneText.substring(yearPos + libraryYears.toString().length);
    
    const beforeWidth = ctx.measureText(beforeYear).width;
    const yearWidth = ctx.measureText(libraryYears).width;
    const afterWidth = ctx.measureText(afterYear).width;
    const totalWidth = beforeWidth + yearWidth + afterWidth;
    
    // Start position to center everything
    const startX = (canvas.width - totalWidth) / 2;
    const textY = canvas.height / 2 - 20;
    
    // Draw each part
    ctx.fillText(beforeYear, startX + beforeWidth/2, textY);
    ctx.fillStyle = "red";
    ctx.fillText(libraryYears, startX + beforeWidth + yearWidth/2, textY);
    ctx.fillStyle = "white";
    ctx.fillText(afterYear, startX + beforeWidth + yearWidth + afterWidth/2, textY);
    
    // "Press F to proceed" hint
    ctx.font = "16px 'Press Start 2P'";
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.fillText("Press F to proceed", canvas.width - 20, canvas.height - 20);
}


function update(deltaTime, timestamp) {
    switch(gameState) {
        case GAME_STATES.PLAYING:
           if (!isTransitioning) {
                // NEW: Use dash movement if dashing, otherwise normal movement
                if (player.isDashing) {
                    updateDash(deltaTime);
                } else {
                    movePlayer(deltaTime);
                }
                objects.forEach(obj => {
                    if (obj.flicker) {
                        obj.flickerOffset = (Math.random() * 80) - 40;
                    }
                });
                // --- CONSOLIDATE ACTIVE LIGHT SOURCES ---
            activeLightSources.length = 0; // Clear previous frame's lights
            
            // 1. Projectiles
            for (const p of projectiles) {
                if (p.shining) activeLightSources.push({ x: p.x, y: p.y, radius: p.lightRadius, intensity: p.lightIntensity || 1.0, color: p.lightColor, flicker: p.flicker });
            }
            
            // 2. Enemies (Inherent or Status Effect)
            for (const e of currentEnemies) {
                if (e.state === "DEAD") continue;
                let shining = e.shining;
                let r = e.lightRadius || 0;
                let intensity = e.lightIntensity || 1.0;
                let color = e.lightColor;
                let flicker = e.flicker;

                if (e.activeEffects) {
                    for (const eff of e.activeEffects) {
                        const def = STATUS_EFFECTS[eff.id];
                        if (def && def.shining) {
                            shining = true;
                            r = Math.max(r, def.lightRadius || 0);
                            intensity = Math.max(intensity, def.lightIntensity || 1.0);
                            color = def.lightColor || color;
                            flicker = def.flicker !== undefined ? def.flicker : true;
                        }
                    }
                }
                if (shining) activeLightSources.push({ x: e.x, y: e.y, radius: r, intensity, color, flicker });
            }
            
            // 3. Roaming NPCs
            for (const n of currentRoamingNpcs) {
                if (n.shining) activeLightSources.push({ x: n.x, y: n.y, radius: n.lightRadius, intensity: n.lightIntensity || 1.0, color: n.lightColor, flicker: n.flicker });
            }
            
            
            // 4. Static Objects
            for (const o of objects) {
                if (o.shining) {
                    // Calculate a local flicker offset for this object if it's set to flicker
                    let localFlicker = o.flicker ? (Math.random() * 80) - 40 : 0;
        
                    activeLightSources.push({ 
                          x: o.x, 
                          y: o.y, 
                          radius: o.lightRadius + localFlicker, // Apply the flicker here
                          intensity: o.lightIntensity || 1.0, 
                          color: o.lightColor, 
                          flicker: o.flicker 
                    });
                }
          }
                checkLevelTransitions();
            }
            // Update player invincibility timer
            if (player.invincible) {
                player.invincibleTimer -= deltaTime * 1000;
              if (player.invincibleTimer <= 0) {
                  player.invincible = false;
                }
            }

            if (player.isCasting) {
                player.castingTimer -= deltaTime * 1000;
                if (player.castingTimer <= 0) {
                    player.isCasting = false;
                }
            }
            
            updateEnemies(deltaTime);
            updateRoamingNpcs(deltaTime);
            updateProjectiles(deltaTime);
            updateStatusEffects(deltaTime);
            updateStatusEffectAnimations();
            updateWeaponAnimation(timestamp);
            updateShield(deltaTime);
            updateDoors();

            

            // Update persistent enemy state periodically (every 2 seconds)
            if (timestamp % 2000 < deltaTime * 1000) {
                updateEnemyPersistentState();
            }


            if (equippedItem.swingCooldown > 0) {
                equippedItem.swingCooldown -= deltaTime * 1000;
            }
            if (isDepthFlickering) {
                depthFlickerTimer++;
                if (depthFlickerTimer >= 10) { // Sync with animated walls delay
                    depthFlickerTimer = 0;
                    // Randomly offset the light distance by +/- 40 pixels
                    depthFlickerOffset = (Math.random() * 80) - 40;
                }
            } else {
                depthFlickerOffset = 0;
            }
            updateAnimatedWalls();
            updateTorchAnimations();
            
            
            checkLibraryProximity();
            checkNPCInteraction();
            checkDoorProximity();
            
            break;

        case GAME_STATES.DIALOGUE:
            // When frozen in dialogue, we ONLY update visual animations
            // We DO NOT update player movement or enemy positions
            updateAnimatedWalls();
            updateTorchAnimations();
            
            // Optional: If you want Roaming NPCs to freeze mid-step:
            // Do nothing.
            
            // Optional: If you want Roaming NPCs to perform idle animation while you talk:
            /* currentRoamingNpcs.forEach(npc => {
                if (npc.loaded && npc.idleAnimation) { ... update idle frames ... }
            });
            */
            break;
        case GAME_STATES.MENU:
        case GAME_STATES.PAUSED:
            // Maybe update menu animations later
            break;
    }
    
}

function render() {
    // Clear screen
    ctx.fillStyle = "rgb(20, 20, 30)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    }

    switch(gameState) {
        case GAME_STATES.MENU:
            renderMainMenu();
            break;
        
        case GAME_STATES.PLAYING:
        case GAME_STATES.DIALOGUE:
            const rays = castRays();
            renderFloorAndCeilingFast();
            const depthBuffer = render3D(rays); // <--- Make render3D return the buffer
            renderSpriteLayer(depthBuffer);
            renderProjectiles3D();
            renderSwordSwing();
            // 1. Draw Weapon (Always draw weapon, on right side)
            renderPlayerHands(); 

            // 2. Draw Shield (Draw on top if active/animating, on left side)
            if (shield.state !== SHIELD_STATES.LOWERED) {
               renderShield();
            }
            
            renderShieldUI();

            if (player.invincible && Math.floor(performance.now() / 100) % 2 === 0) {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            
            renderPlayerHealth();
            
            

            // Only show prompts if we are NOT currently talking
            if (gameState === GAME_STATES.PLAYING) {
                if (nearLibrary && !GAME_PROGRESS.hasStudiedInLibrary && !inLibraryCutscene) {
                    showLibraryPrompt();
                }
                if (showInteractionText) {
                    showNPCPrompt();
                }
                if (showDoorPrompt) {
                    renderDoorPrompt();
                }
                renderInventory(); // Only allow inventory in playing state
                renderChestInterface();
            }

            // Render Dialogue Box if in DIALOGUE state
            if (gameState === GAME_STATES.DIALOGUE) {
                if (inLibraryCutscene) {
                    renderLibraryCutscene();
                } else {
                    renderDialogue();
                }
            }

            if (isTransitioning) {
                ctx.fillStyle = `rgba(0, 0, 0, ${transitionAlpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            break;
            
        case GAME_STATES.PAUSED:
            // Render paused screen
            break;
    }
}

let lastTime = 0;

function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // seconds
    lastTime = currentTime;

    update(deltaTime, currentTime);
    render();

    requestAnimationFrame(gameLoop);
}
function renderDoorPrompt() {
    if (!showDoorPrompt || !nearbyDoor) return;
    
    const door = nearbyDoor;
    const doorType = DOOR_TYPES[door.doorType || "WOODEN"];
    
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    
    let promptText = "";
    
    switch(door.state) {
        case DOOR_STATES.CLOSED:
            promptText = "Press F to open the door";
            break;
            
        case DOOR_STATES.OPEN:
            if (door.targetLevel) {
                promptText = "Press F to go through the door";
            } else {
                promptText = "Press F to close the door";
            }
            break;
            
        case DOOR_STATES.LOCKED:
            promptText = "Door is locked";
            break;
            
        case DOOR_STATES.OPENING:
            promptText = "Opening...";
            break;
            
        case DOOR_STATES.CLOSING:
            promptText = "Closing...";
            break;
    }
    
    // Show additional info for locked doors
    if (door.state === DOOR_STATES.LOCKED) {
        const requiredKey = door.keyRequired || doorType.keyRequired;
        const hasKey = playerInventory.items.some(item => item.type === requiredKey);
        
        ctx.fillText(promptText, canvas.width/2, canvas.height - 80);
        
        if (hasKey) {
            ctx.fillStyle = "green";
            ctx.fillText(`You have the ${requiredKey}`, canvas.width/2, canvas.height - 50);
        } else {
            ctx.fillStyle = "red";
            ctx.fillText(`Requires: ${requiredKey}`, canvas.width/2, canvas.height - 50);
        }
    } else {
        ctx.fillText(promptText, canvas.width/2, canvas.height - 50);
    }
}


function showLibraryPrompt() {
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("Press F to browse library", canvas.width/2, canvas.height - 50);
}

function showNPCPrompt() {
    if (!nearbyNPC) return;
    
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    
    let promptText = "Press F to interact";
    
    if (nearbyNPC.interactionType === "talk") promptText = "Press F to talk";
    else if (nearbyNPC.interactionType === "inspect") promptText = "Press F to inspect";
    else if (nearbyNPC.interactionType === "chest") promptText = "Press F to Open Chest";
    
    ctx.fillText(promptText, canvas.width/2, canvas.height - 50);
}
loadLevel("ENTRANCE");
gameState = GAME_STATES.MENU;
gameLoop();