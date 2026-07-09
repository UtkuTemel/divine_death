const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const RAY_STEP_SIZE = 2; // Increase step size for better performance
const MAX_RAYS = Math.min(Math.floor(canvas.width / 2.5), 300); // Limit maximum rays

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
    PAUSED: 2
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
    1: 1.0,   // Normal height
    2: 1.0,   // Normal height  
    3: 1.0,   // Normal height
    4: 1.0,   // Normal height
    5: 1.0,   // Normal height
    6: 1.0,   // Normal height
    7: 5,   // Tall wall - 80% taller
    8: 1.0    // Pillar - normal height but special rendering
};


// Add this with your other image declarations (near npcImages)
const wallTextures = {
    5: new Image(), // For library walls
    6: new Image(), //Brick wall
    7: new Image(), // Tall wall texture
    8: new Image()  // Pillar texture
};

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
    "guard": 200,     // Guards stand on the ground
    "mage": -50,    // Floating NPC
    "oldMan": 10,   // Slightly above ground
    "bat": -80,     // Flying
    "chest": 20,    // Raised object
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

let wallObjects = [];

// 1. Define object types
const WALL_OBJECTS = {
    torch: {
        frames: 7, // Number of animation frames
        images: [], // Will hold loaded images
        currentFrame: 0,
        frameCount: 0,
        frameDelay: 5,
        size: 0.35,
        yPos: 0.65,
        glow: true,
        loaded: false
    },
    painting: {
        image: new Image(),
        size: 0.3,
        yPos: 0.5,
        glow: false
    }
};
// Load all torch animation frames with proper load checking
for (let i = 0; i < 7; i++) {
    const img = new Image();
    img.src = `torch-${i+1}.png`;
    img.onload = () => {
        WALL_OBJECTS.torch.imagesLoaded++;
        if (WALL_OBJECTS.torch.imagesLoaded === 7) {
            WALL_OBJECTS.torch.loaded = true;
        }
    };
    WALL_OBJECTS.torch.images.push(img);
}
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
        img.src = `torch-${i+1}.png`;
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
    OPENING: 1,
    OPEN: 2,
    CLOSING: 3,
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

const SHIELD_TYPES = {
    BASIC: {
        name: "Basic Shield",
        image: "shield1.png",
        cooldown: 3000, // 3 seconds
        parryWindow: 200, // 200ms parry window
        pushForce: 2.0
    }
    // Add more shield types here later
};

// Shield state
let shield = {
    active: false,
    type: SHIELD_TYPES.BASIC,
    cooldownTimer: 0,
    canActivate: true,
    parryActive: false,
    parryTimer: 0,
    image: new Image()
};

// Load shield image
shield.image.src = SHIELD_TYPES.BASIC.image;

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
        currentFrame: 0,
        lastFrameTime: 0,
        swingCooldown: 0
    };
}
const sword = createWeapon({
    name: "Basic Sword",
    damage: 20,
    range: 60,
    arc: Math.PI / 4,
    swingDuration: 400,
    frameRate: 10,
    damageFrame: 5,
    cooldownDuration: 600, // 600ms cooldown
    animationSrcBase: "kirik",
    frameCount: 7
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

const inventory = [sword, axe];
let equippedItemIndex = 0;
let equippedItem = inventory[equippedItemIndex];

const playerInventory = {
    items: [],
    maxSlots: 12,
    isOpen: false,
    selectedSlot: 0,
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
        sizeMultiplier: 1.3,
        yOffset: 170,
        walkAnimation: {
            frameFiles: ["walking1.png", "walking2.png", "walking3.png", "walking4.png", "walking5.png", "walking6.png"], // Different enemies can have different frame counts
            frameDelay: 10,
            loaded: false,
            frames: []
        },
        attackAnimation: {
            frameFiles: ["attack1.png", "attack2.png", "attack3.png", "attack4.png"],
            loaded: false,
            frames: []
        },
        idleAnimation: {
            frameFiles: ["standing1.png", "standing2.png", "standing3.png"], // Use your actual filenames
            frameDelay: 20, // A slower delay often looks good for idle
            loaded: false,
            frames: []
        },
        idleImage: "enemy.png"
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
        sizeMultiplier: 1.3,
        yOffset: 170,
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
        idleImage: "zombiestanding1.png"
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
let NUM_RAYS = Math.floor(canvas.width / 5); // 1 ray every 5 pixels
const MAX_DEPTH = 600;
const MIN_WALL_DISTANCE = 20; // Minimum distance from walls in pixels

// Add this near your other constants
const LEVELS = {
    ENTRANCE: {
        name: "Prison Entrance",
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
                sizeMultiplier: 2
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
            { mapX: 1, mapY: 0, wallFace: 'west', type: "torch" },
            { mapX: 2, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 3, mapY: 6, wallFace: 'east', type: "torch" },
            { mapX: 2, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 1, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 6, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 0, wallFace: 'north', type: "painting" },
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
            }
        ]
    },
    MAZE: {
        name: "Ancient Maze",
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
        background: "background.jpg",
        floorType: "library",
        floorTexture: "woodFloor.avif",
        ceilingTexture: "stoneTex.webp",
        ceilingType: "library",
        objects: [
            
        ],
        wallObjects: [  // New array just for wall-mounted objects
            { mapX: 1, mapY: 0, wallFace: 'west', type: "torch" },
            { mapX: 2, mapY: 0, wallFace: 'west', type: "torch" },
            { mapX: 3, mapY: 0, wallFace: 'west', type: "torch" },
            { mapX: 4, mapY: 0, wallFace: 'west', type: "torch" },
            { mapX: 5, mapY: 0, wallFace: 'west', type: "torch" },
            { mapX: 6, mapY: 0, wallFace: 'west', type: "torch" },
            { mapX: 1, mapY: 2, wallFace: 'west', type: "torch" },
            { mapX: 2, mapY: 2, wallFace: 'west', type: "torch" },
            { mapX: 3, mapY: 2, wallFace: 'west', type: "torch" },
            { mapX: 4, mapY: 2, wallFace: 'west', type: "torch" },
            { mapX: 5, mapY: 2, wallFace: 'west', type: "torch" },
            { mapX: 6, mapY: 2, wallFace: 'west', type: "torch" },
            { mapX: 1, mapY: 4, wallFace: 'west', type: "torch" },
            { mapX: 2, mapY: 4, wallFace: 'west', type: "torch" },
            { mapX: 3, mapY: 4, wallFace: 'west', type: "torch" },
            { mapX: 4, mapY: 4, wallFace: 'west', type: "torch" },
            { mapX: 5, mapY: 4, wallFace: 'west', type: "torch" },
            { mapX: 6, mapY: 4, wallFace: 'west', type: "torch" },
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
        map: [
            
                [2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
                [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 3, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 1, 1, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 0, 6, 6, 6],
            
        ],
        
        playerStart: { x: 100, y: 100, angle: Math.pi },
        background: "black.jpg",
        floorType: "UTKUZEMIN.png",
        ceilingType: "default",
        floorTexture: "UTKUZEMIN.png",
        ceilingTexture: "UTKUZEMIN.png",
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
                sizeMultiplier: 2
            },
            {
                x: 4 * TILE_SIZE + TILE_SIZE / 2,  // Convert to pixel coordinates
                y: 4 * TILE_SIZE + TILE_SIZE / 2,
                type: "object",
                image: "chest",      // image key in a new objectImages map
                interactable: true,     // if false, will not respond to interaction
                dialogue: {
                   normal: ["An old bookcase covered in dust."],
                   postLibrary: ["You recall a passage from one of these tomes."]
                },
                collision: true,        // blocks player/enemy movement
                interactionType: "inspect",
                yOffset: 260,
                sizeMultiplier: 3,
                spriteConfig: {
                   sides: SPRITE_SIDES.EIGHT_SIDED,
                   enabled: true,
                   angleOffset: 0
                }
            }
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
            type: "BASIC", // ✅ Use the ENEMY_TYPES system
            patrolPoints: [
                { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 },
                { x: 7 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 }
            ],
            patrolIndex: 0,
            state: "patrolling",
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
        map: [
            [7, 7, 7, 7, 7, 7, 7, 7],
            [7, 0, 0, 0, 0, 0, 0, 7],
            [7, 0, 0, 0, 0, 0, 0, 7],
            [0, 0, 0, 0, 0, 0, 0, 7],
            [7, 0, 0, 0, 0, 0, 0, 7],
            [7, 0, 0, 0, 0, 0, 0, 7],
            [7, 7, 7, 7, 7, 7, 7, 7]
        ],
        playerStart: { x: 2 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2, angle: 0 },
        background: "background.avif",
        floorType: "default",
        ceilingType: "default",
        floorTexture: "UTKUZEMIN.png",
        ceilingTexture: "UTKUZEMIN.png",
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
    
    PILLAR_MAZE: {
        name: "Pillar Maze",
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
    }
    
    // Add more levels here
};

let currentLevel = "ENTRANCE";
let map = [];
let objects = [];
let transitionAlpha = 0;
const TRANSITION_SPEED = 0.05;
let isTransitioning = false;


const player = {
    x: 100,
    y: 100,
    angle: 0,
    speed: 4,
    height: 32,
    health: 100,
    maxHealth: 100,
    invincible: false, // For invincibility frames after being hit
    invincibleTimer: 0
};



player.handImage = new Image(); 
player.handImage.src = "kirik1.png";

// Enemy attack patterns
const ENEMY_ATTACKS = {
    BASIC_ATTACK: {
        name: "Basic Attack",
        damage: 15,
        range: 50,
        cooldown: 1000, // ms
        windup: 300, // ms before damage is applied
        duration: 500, // ms total animation
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
    
    if (gameState === GAME_STATES.MENU) {
        // Menu navigation
        if (e.code === "ArrowUp") {
            selectedMenuItem = (selectedMenuItem - 1 + menuItems.length) % menuItems.length;
        } else if (e.code === "ArrowDown") {
            selectedMenuItem = (selectedMenuItem + 1) % menuItems.length;
        } else if (e.code === "Enter") {
            const selectedAction = menuItems[selectedMenuItem].action;
            if (selectedAction === "start") {
                // Initialize game world before switching state
                loadLevel("ENTRANCE");
                gameState = GAME_STATES.PLAYING;
            } else if (selectedAction === "controls") {
                // Handle controls screen
            } else if (selectedAction === "about") {
                // Handle about screen
            }
        }
    } 
    else if (gameState === GAME_STATES.PLAYING) {
        if (playerInventory.isOpen) {
            if (e.code === "KeyI") {
                playerInventory.isOpen = false;
            }
            else if (e.code === "ArrowUp") {
                playerInventory.selectedSlot = Math.max(0, playerInventory.selectedSlot - playerInventory.slotsPerRow);
            }
            else if (e.code === "ArrowDown") {
                playerInventory.selectedSlot = Math.min(playerInventory.items.length - 1, playerInventory.selectedSlot + playerInventory.slotsPerRow);
            }
            else if (e.code === "ArrowLeft") {
                playerInventory.selectedSlot = Math.max(0, playerInventory.selectedSlot - 1);
            }
            else if (e.code === "ArrowRight") {
                playerInventory.selectedSlot = Math.min(playerInventory.items.length - 1, playerInventory.selectedSlot + 1);
            }
            else if (e.code === "Enter") {
                useSelectedItem();
            }
            else if (e.code === "Escape") {
                playerInventory.isOpen = false;
            }
        } else {
            // Regular gameplay controls when inventory is closed
            if (e.code === "KeyI") {
                playerInventory.isOpen = true;
                playerInventory.selectedSlot = 0; // Reset selection when opening
            }
            
            if (e.code === "KeyF") {
                checkItemProximity();

                 if (nearbyDoor) {
                    interactWithDoor();
                }
                
                else if (nearbyNPC && !showDialogue) {
                    showDialogue = true;
                    dialogueIndex = 0;
                } 
                else if (showDialogue) {
                    const dialogueSet = GAME_PROGRESS.hasStudiedInLibrary 
                        ? nearbyNPC.dialogue.postLibrary 
                        : nearbyNPC.dialogue.normal;
                    
                    dialogueIndex++;
                    if (dialogueIndex >= dialogueSet.length) {
                        showDialogue = false;
                    }
                }
                else if (nearLibrary && !inLibraryCutscene && !GAME_PROGRESS.hasStudiedInLibrary) {
                    inLibraryCutscene = true;
                }
                else if (inLibraryCutscene) {
                    inLibraryCutscene = false;
                    player.age += libraryYears;
                    GAME_PROGRESS.hasStudiedInLibrary = true;
                    localStorage.setItem('gameProgress', JSON.stringify(GAME_PROGRESS));
                }
            }
            else if (e.code === "Escape") {
                gameState = GAME_STATES.MENU;
            }
        }
        
        if (e.code === "KeyV" && !playerInventory.isOpen) {
            activateShield();
        }
    }
    // Handle controls/about screens
    else if (gameState === GAME_STATES.PAUSED || 
             (gameState === GAME_STATES.MENU && (e.code === "Escape"))) {
        // Return to main menu
        gameState = GAME_STATES.MENU;
    }
    if (e.code === "KeyV" && gameState === GAME_STATES.PLAYING) {
        activateShield();
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

            if (mapY >= 0 && mapY < map.length &&
                mapX >= 0 && mapX < map[0].length &&
                map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) { // All walls except type 3 block
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
    }

    return false;
}



function movePlayer(deltaTime) {
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

    const tryX = player.x + moveX;
    const tryY = player.y + moveY;

     // Check if new position would collide with enemies
    let wouldCollideWithEnemy = false;
    for (const enemy of currentEnemies) {
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
    
    // Initialize level state if needed
    initializeLevelState(levelName);
    
    // Load persistent objects
    objects = [...(level.objects || [])];
    wallObjects = [...(level.wallObjects || [])];
    
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
function fireProjectile() {
    const offset = 10; // distance in front of player to start projectile
    const startX = player.x + Math.cos(player.angle) * offset;
    const startY = player.y + Math.sin(player.angle) * offset;
  
    const projectileSpeed = 4;

    const projectile = {
      x: player.x,
      y: player.y,
      angle: player.angle,
      dx: Math.cos(player.angle) * projectileSpeed,
      dy: Math.sin(player.angle) * projectileSpeed,
      speed: projectileSpeed,
      size: 5,
      active: true
    };

projectiles.push(projectile);
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];

        // Move
        p.x += Math.cos(p.angle) * p.speed;
        p.y += Math.sin(p.angle) * p.speed;

        // Wall collision
        const mapX = Math.floor(p.x / TILE_SIZE);
        const mapY = Math.floor(p.y / TILE_SIZE);
        if (map[mapY]?.[mapX] && map[mapY][mapX] !== 0) {
            projectiles.splice(i, 1);
            continue;
        }

        // Enemy collision
        for (let j = 0; j < currentEnemies.length; j++) {
            const enemy = currentEnemies[j];
            const dx = p.x - enemy.x;
            const dy = p.y - enemy.y;
            if (Math.sqrt(dx * dx + dy * dy) < 10) {
                enemy.currentHealth -= 1;

                if (enemy.currentHealth <= 0) {
                    currentEnemies.splice(j, 1); // Remove enemy if dead
                } else {
                    // Apply knockback with wall collision prevention
                    const magnitude = Math.sqrt(p.dx * p.dx + p.dy * p.dy);
                    const nx = p.dx / magnitude;
                    const ny = p.dy / magnitude;

                    enemy.knockbackTimer = 10;
                    
                    // Store original position
                    const originalX = enemy.x;
                    const originalY = enemy.y;
                    
                    // Apply knockback
                    enemy.x += nx * ENEMY_KNOCKBACK_FORCE;
                    enemy.y += ny * ENEMY_KNOCKBACK_FORCE;
                    
                    // Check for wall collision and revert if needed
                    if (isEnemyInWall(enemy)) {
                        enemy.x = originalX;
                        enemy.y = originalY;
                        enemy.knockbackX = 0;
                        enemy.knockbackY = 0;
                    } else {
                        enemy.knockbackX = nx * ENEMY_KNOCKBACK_FORCE;
                        enemy.knockbackY = ny * ENEMY_KNOCKBACK_FORCE;
                    }
                }

                projectiles.splice(i, 1); // Always remove projectile
                break;
            }
        }
    }
}
function useEquippedWeapon() {
    if (equippedItem.type !== 'weapon' || equippedItem.swingCooldown > 0) return;

    equippedItem.isSwinging = true;
    equippedItem.swingCooldown = equippedItem.cooldownDuration; // 🧠 use weapon-specific cooldown
    equippedItem.currentFrame = 0;
    equippedItem.lastFrameTime = performance.now();

    
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
function castRays() {
    const rays = [];
    const angleStep = FOV / NUM_RAYS;
    const cosPlayerAngle = Math.cos(player.angle);
    const sinPlayerAngle = Math.sin(player.angle);
    
    for (let i = 0; i < NUM_RAYS; i++) {
        const rayAngle = player.angle - FOV/2 + angleStep * i;
        const cosRayAngle = Math.cos(rayAngle);
        const sinRayAngle = Math.sin(rayAngle);
        
        let dist = 0;
        let hit = false;
        let wallType = 0;
    

        while (!hit && dist < MAX_DEPTH) {
            dist += RAY_STEP_SIZE;
            
            const exactHitX = player.x + cosRayAngle * dist;
            const exactHitY = player.y + sinRayAngle * dist;
            
            const mapX = Math.floor(exactHitX / TILE_SIZE);
            const mapY = Math.floor(exactHitY / TILE_SIZE);

            if (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[mapY].length) {
                const cellValue = map[mapY][mapX];
                
                if (cellValue > 0 && cellValue !== 3) {
                    hit = true;
                    wallType = cellValue;
                }
            }
        }
        
        rays.push({
            angle: rayAngle,
            distance: dist,
            wallType,
            exactHitX: player.x + cosRayAngle * dist,
            exactHitY: player.y + sinRayAngle * dist,
            
        });
    }
    return rays;
}


function checkWallHit(x, y) {
    return y >= 0 && y < map.length && 
           x >= 0 && x < map[y].length && 
           map[y][x] > 0 && map[y][x] !== 3; // All walls except type 3 block movement
}
function render3D(rays) {
  const columnWidth = canvas.width / NUM_RAYS;
  const brightness = 0.8;
  const depthBuffer = new Array(NUM_RAYS).fill(Infinity);

  // Lighting parameters
  const MAX_LIGHT_DISTANCE = 500;
  const MIN_BRIGHTNESS = 0.3;
  const MAX_BRIGHTNESS = 1.0;

  // First pass: Render all walls
  rays.forEach((ray, i) => {
    if (ray.distance >= MAX_DEPTH || ray.wallType === 0) return;

    // Get wall height multiplier (default to 1.0 if not specified)
    const heightMultiplier = wallHeights[ray.wallType] || 1.0;

    // Calculate base wall height and apply height multiplier
    const baseWallHeight = Math.min(30000 / ray.distance, canvas.height);
    const wallHeight = baseWallHeight * heightMultiplier;
    const wallTop = (canvas.height - wallHeight) / 2;

    const hitX = player.x + Math.cos(ray.angle) * ray.distance;
    const hitY = player.y + Math.sin(ray.angle) * ray.distance;
    const mapX = Math.floor(hitX / TILE_SIZE);
    const mapY = Math.floor(hitY / TILE_SIZE);

    // Calculate brightness based on distance
    let brightness =
      MIN_BRIGHTNESS +
      (MAX_BRIGHTNESS - MIN_BRIGHTNESS) *
        (1 - Math.min(1, ray.distance / MAX_LIGHT_DISTANCE));
    brightness = Math.pow(brightness, 1.5);

    // Determine wall orientation
    let wallOrientation = '';
    if (mapX === 0) wallOrientation = 'west';
    else if (mapX === map[0].length - 1) wallOrientation = 'east';
    else if (mapY === 0) wallOrientation = 'north';
    else if (mapY === map.length - 1) wallOrientation = 'south';
    else {
      const relX = hitX % TILE_SIZE;
      const relY = hitY % TILE_SIZE;
      if (relX < 2 || relX > TILE_SIZE - 2)
        wallOrientation = relX < 2 ? 'west' : 'east';
      else wallOrientation = relY < 2 ? 'north' : 'south';
    }

    // Special handling for pillars (wall type 8)
    if (ray.wallType === 8) {
      renderPillar(ray, i, columnWidth, wallHeight, wallTop, brightness);
      return;
    }

    // Handle textured walls (types 5, 6, 7)
    if (ray.wallType === 5 || ray.wallType === 6 || ray.wallType === 7) {
      const texture = wallTextures[ray.wallType];
      if (!texture.complete) {
        ctx.fillStyle = wallColors[ray.wallType];
        ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
        return;
      }

      // Calculate texture coordinate based on wall orientation
      let wallX;
      switch (wallOrientation) {
        case 'east':
          wallX = (hitY % TILE_SIZE) / TILE_SIZE;
          break;
        case 'west':
          wallX = 1 - (hitY % TILE_SIZE) / TILE_SIZE;
          break;
        case 'north':
          wallX = (hitX % TILE_SIZE) / TILE_SIZE;
          break;
        case 'south':
          wallX = 1 - (hitX % TILE_SIZE) / TILE_SIZE;
          break;
        default:
          wallX = (hitX % TILE_SIZE) / TILE_SIZE;
      }

      // For tall walls, we might want to adjust texture scaling
      let textureScaleY = 1.0;
      if (ray.wallType === 7 && heightMultiplier > 1.0) {
        textureScaleY = 1.0 / heightMultiplier; // Stretch texture vertically for tall walls
      }

      ctx.drawImage(
        texture,
        wallX * texture.width,
        0,
        1,
        texture.height,
        i * columnWidth,
        wallTop,
        columnWidth,
        wallHeight
      );

      ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
      ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
    } else if (ANIMATED_WALLS[ray.wallType]) {
      const animatedWall = ANIMATED_WALLS[ray.wallType];
      if (!animatedWall.loaded) {
        ctx.fillStyle = wallColors[ray.wallType] || 'rgb(255, 255, 255)';
        ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
        return;
      }

      const currentFrame = animatedWall.frames[animatedWall.currentFrame];

      // Calculate texture coordinate based on wall orientation
      let wallX;
      switch (wallOrientation) {
        case 'east':
          wallX = (hitY % TILE_SIZE) / TILE_SIZE;
          break;
        case 'west':
          wallX = 1 - (hitY % TILE_SIZE) / TILE_SIZE;
          break;
        case 'north':
          wallX = (hitX % TILE_SIZE) / TILE_SIZE;
          break;
        case 'south':
          wallX = 1 - (hitX % TILE_SIZE) / TILE_SIZE;
          break;
        default:
          wallX = (hitX % TILE_SIZE) / TILE_SIZE;
      }

      ctx.drawImage(
        currentFrame,
        wallX * currentFrame.width,
        0,
        1,
        currentFrame.height,
        i * columnWidth,
        wallTop,
        columnWidth,
        wallHeight
      );

      ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
      ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
    } else {
      // Solid color walls
      let baseColor = wallColors[ray.wallType] || 'rgb(255, 255, 255)';
      let [r, g, b] = baseColor.match(/\d+/g).map(Number);
      r = Math.floor(r * brightness);
      g = Math.floor(g * brightness);
      b = Math.floor(b * brightness);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
    }

    // Flash red when player is hit
    if (player.invincible && Math.floor(performance.now() / 100) % 2 === 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Render player health
    renderPlayerHealth();
  });

  // Second pass: Render wall objects (torches, paintings)
  const renderedWallObjects = new Set();

  rays.forEach((ray, i) => {
    const rayMapX = Math.floor(
      (player.x + Math.cos(ray.angle) * ray.distance) / TILE_SIZE
    );
    const rayMapY = Math.floor(
      (player.y + Math.sin(ray.angle) * ray.distance) / TILE_SIZE
    );

    for (const objPos of wallObjects) {
      const objKey = `${objPos.mapX},${objPos.mapY},${objPos.type},${objPos.wallFace}`;
      if (renderedWallObjects.has(objKey)) continue;
      if (rayMapX !== objPos.mapX || rayMapY !== objPos.mapY) continue;

      if (objPos.type === 'torch') {
        const torch = WALL_OBJECTS.torch;
        if (!torch.loaded) continue;

        const currentFrameImg = torch.images[torch.currentFrame];
        if (!currentFrameImg.complete) continue;

        const actualWallType = map[objPos.mapY][objPos.mapX];
        const wallHeightMultiplier = wallHeights[actualWallType] || 1.0;
        const wallHeight =
          Math.min(30000 / ray.distance, canvas.height) * wallHeightMultiplier;

        const objectSize = wallHeight * torch.size;
        const yPos = (canvas.height - wallHeight) / 2 + wallHeight * torch.yPos;

        let xOffset = 0;
        switch (objPos.wallFace) {
          case 'north':
          case 'south':
            xOffset =
              ((ray.exactHitX % TILE_SIZE) / TILE_SIZE - 0.5) * columnWidth;
            break;
          case 'east':
          case 'west':
            xOffset =
              ((ray.exactHitY % TILE_SIZE) / TILE_SIZE - 0.5) * columnWidth;
            break;
        }

        // Compute projected screen X position
        let screenX = i * columnWidth + xOffset - objectSize / 2;

        const fadeEdge = 0.01; // Was 0.1. Smaller value = fades closer to the edge.
      const fadeStart = canvas.width * fadeEdge;
      const fadeEnd = canvas.width * (1 - fadeEdge);

      let alpha = 1.0;
      if (screenX < fadeStart) {
        // Fading on the left edge
        alpha = screenX / fadeStart;
      } else if (screenX + objectSize > fadeEnd) {
        // Fading on the right edge
        alpha = (canvas.width - (screenX + objectSize)) / fadeStart;
      }

      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

      // 2. NOW CLAMP THE POSITION
      //    This prevents drawImage from trying to draw at x < 0
      if (screenX < 0) screenX = 0;
      if (screenX + objectSize > canvas.width)
        screenX = canvas.width - objectSize;
        ctx.drawImage(
          currentFrameImg,
          screenX,
          yPos - objectSize,
          objectSize,
          objectSize
        );
        ctx.globalAlpha = 1.0;

        /*
        if (torch.glow && ray.distance < 250) {
          ctx.fillStyle = `rgba(255, 200, 100, ${
            0.3 - (ray.distance / 250) * 0.1
          })`;
          ctx.fillRect(
            i * columnWidth + xOffset - objectSize,
            yPos - objectSize * 1.5,
            objectSize * 2,
            objectSize * 2
          );
        }
        */

        renderedWallObjects.add(objKey);
      } else if (objPos.type === 'door') {
        renderDoor(objPos, ray, i, columnWidth, renderedWallObjects, objKey);
      }
    }
  });
}

function renderDoor(
  doorObj,
  ray,
  columnIndex,
  columnWidth,
  renderedWallObjects,
  objKey
) {
  const door = WALL_OBJECTS.door;
  if (!door.loaded) return;

  // Get the appropriate door image based on state
  let doorImage;
  if (doorObj.locked && doorObj.state === DOOR_STATES.CLOSED) {
    doorImage = door.images[DOOR_STATES.LOCKED];
  } else if (
    doorObj.state === DOOR_STATES.OPEN ||
    doorObj.state === DOOR_STATES.OPENING
  ) {
    doorImage = door.images[DOOR_STATES.OPEN];
  } else {
    doorImage = door.images[DOOR_STATES.CLOSED];
  }

  if (!doorImage || !doorImage.complete) {
    const actualWallType = map[doorObj.mapY][doorObj.mapX];
    const wallHeightMultiplier = wallHeights[actualWallType] || 1.0;
    const wallHeight =
      Math.min(30000 / ray.distance, canvas.height) * wallHeightMultiplier;
    const doorSize = wallHeight * door.size;
    const yPos = (canvas.height - wallHeight) / 2 + wallHeight * door.yPos;

    // Calculate screenX for fallback
    let screenX = columnIndex * columnWidth - doorSize / 2;

    // Clipping and fade for fallback
    if (screenX < 0) screenX = 0;
    if (screenX + doorSize > canvas.width)
      screenX = canvas.width - doorSize;

    const fadeEdge = 0.1;
    const fadeStart = canvas.width * fadeEdge;
    const fadeEnd = canvas.width * (1 - fadeEdge);
    let alpha = 1.0;
    if (screenX < fadeStart) alpha = screenX / fadeStart;
    else if (screenX + doorSize > fadeEnd)
      alpha = (canvas.width - (screenX + doorSize)) / fadeStart;

    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = doorObj.locked ? '#696969' : '#8B4513';
    ctx.fillRect(screenX, yPos - doorSize, doorSize, doorSize);
    ctx.globalAlpha = 1.0;
    renderedWallObjects.add(objKey);
    return;
  }

  const actualWallType = map[doorObj.mapY][doorObj.mapX];
  const wallHeightMultiplier = wallHeights[actualWallType] || 1.0;
  const wallHeight =
    Math.min(30000 / ray.distance, canvas.height) * wallHeightMultiplier;
  const doorSize = wallHeight * door.size;
  const yPos = (canvas.height - wallHeight) / 2 + wallHeight * door.yPos;

  let xOffset = 0;
  switch (doorObj.wallFace) {
    case 'north':
    case 'south':
      xOffset = ((ray.exactHitX % TILE_SIZE) / TILE_SIZE) * columnWidth;
      break;
    case 'east':
    case 'west':
      xOffset = ((ray.exactHitY % TILE_SIZE) / TILE_SIZE) * columnWidth;
      break;
  }

  let finalXOffset = xOffset;
  if (
    doorObj.state === DOOR_STATES.OPENING ||
    doorObj.state === DOOR_STATES.CLOSING
  ) {
    const animOffset = doorSize * 0.8 * doorObj.animationProgress;
    if (doorObj.wallFace === 'north' || doorObj.wallFace === 'south') {
      finalXOffset +=
        doorObj.state === DOOR_STATES.OPENING ? animOffset : -animOffset;
    }
  }

  let screenX = columnIndex * columnWidth + finalXOffset - doorSize / 2;
  if (screenX < 0) screenX = 0;
  if (screenX + doorSize > canvas.width)
    screenX = canvas.width - doorSize;

  const fadeEdge = 0.1;
  const fadeStart = canvas.width * fadeEdge;
  const fadeEnd = canvas.width * (1 - fadeEdge);
  let alpha = 1.0;
  if (screenX < fadeStart) alpha = screenX / fadeStart;
  else if (screenX + doorSize > fadeEnd)
    alpha = (canvas.width - (screenX + doorSize)) / fadeStart;

  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  ctx.drawImage(doorImage, screenX, yPos - doorSize, doorSize, doorSize);

  ctx.globalAlpha = 1.0;
  renderedWallObjects.add(objKey);
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
    
    // Normalize to 0-2π range
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
    // If multi-sided sprites are disabled or not configured, use default
    if (!obj.spriteConfig || !obj.spriteConfig.enabled) {
        return objectImages[obj.image] || npcImages[obj.image] || npcImages.default;
    }
    
    const numSides = obj.spriteConfig.sides || SPRITE_SIDES.FOUR_SIDED;
    const angle = calculateSpriteAngle(obj, playerX, playerY);
    const spriteKey = getSpriteForAngle(obj, angle, numSides);
    
    // Get the appropriate image
    const imageSet = objectImages[obj.image] || npcImages[obj.image];
    if (!imageSet) return npcImages.default;
    
    // Return the specific sprite, fallback to front if not available
    return imageSet[spriteKey] || imageSet.front || imageSet;
}
function renderDoor(doorObj, ray, columnIndex, columnWidth, renderedWallObjects, objKey) {
    const door = WALL_OBJECTS.door;
    if (!door.loaded) return;

    // Get the appropriate door image based on state
    let doorImage;
    if (doorObj.locked && doorObj.state === DOOR_STATES.CLOSED) {
        doorImage = door.images[DOOR_STATES.LOCKED];
    } else if (doorObj.state === DOOR_STATES.OPEN || doorObj.state === DOOR_STATES.OPENING) {
        doorImage = door.images[DOOR_STATES.OPEN];
    } else {
        doorImage = door.images[DOOR_STATES.CLOSED];
    }

    if (!doorImage || !doorImage.complete) {
        // Fallback: draw a simple door rectangle
        const actualWallType = map[doorObj.mapY][doorObj.mapX];
        const wallHeightMultiplier = wallHeights[actualWallType] || 1.0;
        const wallHeight = Math.min(30000 / ray.distance, canvas.height) * wallHeightMultiplier;
        const doorSize = wallHeight * door.size;
        const yPos = (canvas.height - wallHeight) / 2 + wallHeight * door.yPos;
        
        // ADDED: Calculate screenX for fallback
        let screenX = columnIndex * columnWidth - doorSize / 2; // Simplified xOffset for fallback

        // ADDED: Clipping and fade for fallback
        if (screenX < 0) screenX = 0;
        if (screenX + doorSize > canvas.width) screenX = canvas.width - doorSize;
        
        const fadeEdge = 0.1;
        const fadeStart = canvas.width * fadeEdge;
        const fadeEnd = canvas.width * (1 - fadeEdge);
        let alpha = 1.0;
        if (screenX < fadeStart) alpha = screenX / fadeStart;
        else if (screenX + doorSize > fadeEnd)
            alpha = (canvas.width - (screenX + doorSize)) / fadeStart;
        
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = doorObj.locked ? "#696969" : "#8B4513";
        ctx.fillRect(
            screenX, // OLD: columnIndex * columnWidth - doorSize / 2
        	yPos - doorSize,
        	doorSize,
        	doorSize
        );
        ctx.globalAlpha = 1.0; // ADDED: Reset alpha
        renderedWallObjects.add(objKey);
        return;
    }

    // Calculate door position and size
    const actualWallType = map[doorObj.mapY][doorObj.mapX];
    const wallHeightMultiplier = wallHeights[actualWallType] || 1.0;
    const wallHeight = Math.min(30000 / ray.distance, canvas.height) * wallHeightMultiplier;
    const doorSize = wallHeight * door.size;
    const yPos = (canvas.height - wallHeight) / 2 + wallHeight * door.yPos;

    // Calculate position on wall
    let xOffset = 0;
    switch (doorObj.wallFace) {
        case 'north':
        case 'south':
            xOffset = (ray.exactHitX % TILE_SIZE) / TILE_SIZE * columnWidth;
            break;
        case 'east':
        case 'west':
            xOffset = (ray.exactHitY % TILE_SIZE) / TILE_SIZE * columnWidth;
            break;
    }

    // Apply opening/closing animation (horizontal slide)
    let finalXOffset = xOffset;
    if (doorObj.state === DOOR_STATES.OPENING || doorObj.state === DOOR_STATES.CLOSING) {
        const animOffset = doorSize * 0.8 * doorObj.animationProgress;
        if (doorObj.wallFace === 'north' || doorObj.wallFace === 'south') {
            finalXOffset += (doorObj.state === DOOR_STATES.OPENING ? animOffset : -animOffset);
        }
    }

    // ADDED: Calculate screenX, apply clipping and fade
    let screenX = columnIndex * columnWidth + finalXOffset - doorSize / 2;
    
    // Prevent object from being stuck at screen edges
    if (screenX < 0) screenX = 0;
    if (screenX + doorSize > canvas.width) screenX = canvas.width - doorSize;

    // Apply edge fade
    const fadeEdge = 0.1; // 10% screen edge fade
    const fadeStart = canvas.width * fadeEdge;
    const fadeEnd = canvas.width * (1 - fadeEdge);

    let alpha = 1.0;
    if (screenX < fadeStart) alpha = screenX / fadeStart;
    else if (screenX + doorSize > fadeEnd)
        // Apply the same fix as the torch
        alpha = (canvas.width - (screenX + doorSize)) / fadeStart; 
    
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    // END ADDED BLOCK

    ctx.drawImage(
        doorImage,
        screenX, // OLD: columnIndex * columnWidth + finalXOffset - doorSize / 2,
        yPos - doorSize,
      	doorSize,
      	doorSize
    );
    
    ctx.globalAlpha = 1.0; // ADDED: Reset alpha

    renderedWallObjects.add(objKey);
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

// 🔹 Global or config option
let FLOOR_QUALITY = 3; 
// 1 = full quality, 2 = half res, 4 = very low res

function renderFloorAndCeilingFast() {
    const textures = levelTextures[currentLevel];
    if (!textures || !textures.loaded) return;

    const floorTex = textures.floor;
    const ceilTex = textures.ceiling;

    // 🔹 Prepare offscreen caches once
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
    const halfHeight = canvas.height / 2;

    // Lighting parameters (same as walls)
    const MAX_LIGHT_DISTANCE = 500;
    const MIN_BRIGHTNESS = 0.3;
    const MAX_BRIGHTNESS = 1.0;

    // 🔹 Create row buffer at reduced width
    const reducedWidth = Math.floor(canvas.width / FLOOR_QUALITY);
    const rowImageData = ctx.createImageData(reducedWidth, 1);
    const pixels = rowImageData.data;

    // --- FLOOR + CEILING ---
    for (let y = halfHeight; y < canvas.height; y += FLOOR_QUALITY) {
        const cameraY = y - halfHeight;
        const rowDistance = player.height / (cameraY / canvas.height);

        // STOP RENDERING AT SAME DISTANCE AS WALLS
        if (rowDistance >= MAX_DEPTH) {
            continue; // Skip this row if it's beyond the maximum render distance
        }

        // Calculate brightness based on distance (same formula as walls)
        let brightness = MIN_BRIGHTNESS + 
                        (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * 
                        (1 - Math.min(1, rowDistance / MAX_LIGHT_DISTANCE));
        brightness = Math.pow(brightness, 1.5);

        const floorStepX = rowDistance * (Math.cos(player.angle + FOV / 2) - Math.cos(player.angle - FOV / 2)) / reducedWidth;
        const floorStepY = rowDistance * (Math.sin(player.angle + FOV / 2) - Math.sin(player.angle - FOV / 2)) / reducedWidth;

        let floorX = player.x + rowDistance * Math.cos(player.angle - FOV / 2);
        let floorY = player.y + rowDistance * Math.sin(player.angle - FOV / 2);

        for (let x = 0; x < reducedWidth; x++) {
            // Floor texel
            const fx = Math.floor((floorX % TILE_SIZE) / TILE_SIZE * floorTextureSize);
            const fy = Math.floor((floorY % TILE_SIZE) / TILE_SIZE * floorTextureSize);
            const fIdx = (fy * floorTextureSize + fx) * 4;

            const p = x * 4;
            
            // PIXEL RENDERING EXPLANATION:
            // floorTex.data[fIdx] = Red value (0-255)
            // floorTex.data[fIdx + 1] = Green value (0-255)  
            // floorTex.data[fIdx + 2] = Blue value (0-255)
            // floorTex.data[fIdx + 3] = Alpha value (0-255) - we ignore this
            
            // Multiply each color channel by brightness to darken distant pixels
            pixels[p] = Math.min(255, Math.floor(floorTex.data[fIdx] * brightness));     // Red
            pixels[p + 1] = Math.min(255, Math.floor(floorTex.data[fIdx + 1] * brightness)); // Green
            pixels[p + 2] = Math.min(255, Math.floor(floorTex.data[fIdx + 2] * brightness)); // Blue
            pixels[p + 3] = 255; // Alpha (fully opaque)

            floorX += floorStepX;
            floorY += floorStepY;
        }

        // Stretch row back to full width
        const targetHeight = FLOOR_QUALITY;
        ctx.putImageData(rowImageData, 0, y);
        ctx.drawImage(
            ctx.canvas, 0, y, reducedWidth, 1,
            0, y, canvas.width, targetHeight
        );

        // --- CEILING mirrored ---
        const ceilingY = canvas.height - y - 1;
        if (ceilingY >= 0) {
            let ceilX = player.x + rowDistance * Math.cos(player.angle - FOV / 2);
            let ceilY = player.y + rowDistance * Math.sin(player.angle - FOV / 2);

            for (let x = 0; x < reducedWidth; x++) {
                const cx = Math.floor((ceilX % TILE_SIZE) / TILE_SIZE * ceilTextureSize);
                const cy = Math.floor((ceilY % TILE_SIZE) / TILE_SIZE * ceilTextureSize);
                const cIdx = (cy * ceilTextureSize + cx) * 4;

                const p = x * 4;
                
                // Same brightness calculation for ceiling
                pixels[p] = Math.min(255, Math.floor(ceilTex.data[cIdx] * brightness));     // Red
                pixels[p + 1] = Math.min(255, Math.floor(ceilTex.data[cIdx + 1] * brightness)); // Green
                pixels[p + 2] = Math.min(255, Math.floor(ceilTex.data[cIdx + 2] * brightness)); // Blue
                pixels[p + 3] = 255; // Alpha

                ceilX += floorStepX;
                ceilY += floorStepY;
            }

            ctx.putImageData(rowImageData, 0, ceilingY);
            ctx.drawImage(
                ctx.canvas, 0, ceilingY, reducedWidth, 1,
                0, ceilingY, canvas.width, FLOOR_QUALITY
            );
        }
    }

    // --- Overlays (same as before) ---
    const gradient = ctx.createLinearGradient(0, canvas.height / 2, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    const ceilingGradient = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
    ceilingGradient.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    ceilingGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ceilingGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
}


function renderObjects() {
    const sortedObjects = [...objects].sort((a, b) => {
        let distA = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
        let distB = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
        return distB - distA; // Sort from farthest to closest
    });
    
    sortedObjects.forEach(obj => {
        const dx = obj.x - player.x;
        const dy = obj.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Don't render objects that are too close (behind player)
        if (distance < 5) return;

        // Calculate angle to object
        const angleToObj = Math.atan2(dy, dx);
        let angleDiff = angleToObj - player.angle;

        // Normalize angle difference
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Check if object is within field of view (wider FOV for objects)
        if (Math.abs(angleDiff) > FOV * 1.5) return; // Increased FOV tolerance

        // Cast a ray to check if there's a wall between player and object
        // Use a more lenient ray casting approach
        let isVisible = true;
        const checkSteps = Math.max(5, Math.floor(distance / 20)); // Dynamic step count
        
        for (let i = 1; i <= checkSteps; i++) {
            const checkDistance = distance * (i / checkSteps);
            const checkX = player.x + Math.cos(angleToObj) * checkDistance;
            const checkY = player.y + Math.sin(angleToObj) * checkDistance;
            
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

        const screenX = canvas.width * (0.5 + angleDiff / FOV);
        const baseSize = 10000;

        // Calculate base size without multiplier first
        const rawSize = Math.max(10, baseSize / distance);
        const totalHeight = rawSize * (obj.sizeMultiplier || 1); // Apply multiplier
        const totalWidth = totalHeight; // Assuming square sprites for now

        const yOffset = (obj.yOffset || 0);

        // --- ✨ Apply perspective scaling to yOffset ✨ ---
        const perspectiveScale = TILE_SIZE / distance; // How much smaller is it than at TILE_SIZE distance?
        const projectedYOffset = yOffset * perspectiveScale;
        // --- End scaling ---

        // Anchor bottom edge to horizon + projected offset
        const screenY = (canvas.height / 2) - totalHeight + projectedYOffset; // Use projected offset
        // Uniform lighting (0.8 brightness for all objects)
        ctx.globalAlpha = 1;
        
         let sprite;
        if (obj.type === "npc") {
            sprite = getObjectSprite(obj, player.x, player.y);
        } else {
            sprite = getObjectSprite(obj, player.x, player.y);
        }
        
        // Check if sprite is loaded
        if (!sprite || !sprite.complete) {
            ctx.globalAlpha = 1.0;
            
            // Fallback: draw a colored rectangle with direction indicator
            ctx.fillStyle = "rgba(100, 100, 255, 0.8)";
            ctx.fillRect(screenX - size / 2, (canvas.height / 2) - size / 1.5, size, size);
            
            // Draw a line showing the facing direction for debugging
            if (obj.spriteConfig && obj.spriteConfig.enabled) {
                const angle = calculateSpriteAngle(obj, player.x, player.y);
                const spriteKey = getSpriteForAngle(obj, angle, obj.spriteConfig.sides);
                ctx.fillStyle = "red";
                ctx.font = "10px Arial";
                ctx.fillText(spriteKey, screenX - 20, (canvas.height / 2) - size / 1.5 - 10);
            }
            
            return;
        }
        
        
        ctx.drawImage(
            sprite,
            screenX - totalWidth / 2, // Center horizontally
            screenY,                  // Use new screenY
            totalWidth,
            totalHeight
        );
        
        // Reset alpha for other rendering
        ctx.globalAlpha = 1.0;
    });
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
    projectiles.forEach(p => {
      const dx = p.x - player.x;
      const dy = p.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 1) return; // too close
  
      const angleToProjectile = Math.atan2(dy, dx);
      let angleDiff = angleToProjectile - player.angle;
  
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  
      // Skip if outside of field of view
      if (Math.abs(angleDiff) > FOV / 2) return;
  
      // Visibility check (optional ray check between player and projectile)
      if (!isLineOfSightClear(player.x, player.y, p.x, p.y)) return;
  
      const screenX = (canvas.width / 2) + Math.tan(angleDiff) * (canvas.width / 2);
      const size = 5000 / distance; // adjust this value for projectile size scaling
  
      
      ctx.globalAlpha = 0.9;
      
      if (projectileImage.complete && projectileImage.naturalWidth > 0) {
        const aspectRatio = projectileImage.naturalWidth / projectileImage.naturalHeight;
        const spriteWidth = size;
        const spriteHeight = size / aspectRatio;
        ctx.drawImage(
            projectileImage,
            screenX - spriteWidth / 2,
            canvas.height / 2 - spriteHeight / 1.5,
            spriteWidth,
            spriteHeight
        );
      } else {
        // Fallback in case image isn't loaded yet
        ctx.fillStyle = "cyan";
        ctx.beginPath();
        ctx.arc(screenX, canvas.height / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
    });
}

function renderPlayerHands() {
    let handImage;

    if (equippedItem.isSwinging && equippedItem.animationFrames[equippedItem.currentFrame]) {
        handImage = equippedItem.animationFrames[equippedItem.currentFrame];
    } else {
        handImage = equippedItem.animationFrames[0]; // ✅ Use first frame as idle pose
    }

    if (!handImage || !handImage.complete) return;

    const handWidth = canvas.width * 0.7;
    const handHeight = handWidth * (handImage.height / handImage.width);
    const x = (canvas.width - handWidth) / 2;
    const y = canvas.height - handHeight * 0.95;

    ctx.globalAlpha = 1.0;
    ctx.drawImage(handImage, x, y, handWidth, handHeight);
    ctx.globalAlpha = 1.0;
}

function renderEnemies() {
    currentEnemies.forEach(enemy => {
        if (enemy.currentHealth <= 0) return;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 5) return;

        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - player.angle;

        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Wider FOV tolerance for enemies
        if (Math.abs(angleDiff) > FOV * 1) return;

        // Improved visibility check
        let isVisible = true;
        const checkSteps = Math.max(5, Math.floor(distance / 20));
        
        for (let i = 1; i <= checkSteps; i++) {
            const checkDistance = distance * (i / checkSteps);
            const checkX = player.x + Math.cos(angleToEnemy) * checkDistance;
            const checkY = player.y + Math.sin(angleToEnemy) * checkDistance;
            
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

        const screenX = canvas.width * (0.5 + angleDiff / FOV);
        const size = 10000 / distance;

        ctx.globalAlpha = 0.8;

        // Determine which sprite to use
        let sprite;
        if (enemy.isAttacking && enemy.attackAnimation.loaded) {
            const frameIndex = Math.min(
                enemy.attackAnimation.currentFrame, 
                enemy.attackAnimation.frames.length - 1
            );
            sprite = enemy.attackAnimation.frames[frameIndex];
        } 
        else if (enemy.walkAnimation.isMoving && enemy.walkAnimation.loaded) {
            sprite = enemy.walkAnimation.frames[enemy.walkAnimation.currentFrame];
        } 
        else if (enemy.idleAnimation && enemy.idleAnimation.loaded) {
            sprite = enemy.idleAnimation.frames[enemy.idleAnimation.currentFrame];
        }
        else if (enemy.idleImg?.complete) {
            sprite = enemy.idleImg;
        }

        // Fallback if no sprite is available
        if (!sprite || !sprite.complete) {
            ctx.fillStyle = enemy.isAttacking ? "orange" : "red";
            ctx.fillRect(screenX - size / 2, canvas.height / 2 - size / 1.5, size, size);
            ctx.globalAlpha = 1.0;
            return;
        }

        // Calculate total height including multiplier
        // Calculate base size without multiplier first
        // Note: 'size' was already calculated before as 10000 / distance
        const rawSize = Math.max(10, size); // Reuse existing 'size' calculation
        const totalHeight = rawSize * (enemy.sizeMultiplier || 1); // Apply multiplier
        const totalWidth = totalHeight; // Assuming square sprites

        const yOffset = (enemy.yOffset || 0);

        // --- ✨ Apply perspective scaling to yOffset ✨ ---
        const perspectiveScale = TILE_SIZE / distance;
        const projectedYOffset = yOffset * perspectiveScale;
        // --- End scaling ---

        // Anchor bottom edge to horizon + projected offset
        const screenY = (canvas.height / 2) - totalHeight + projectedYOffset; // Use projected offset
        
        // Update the drawImage call to use the new variables
        ctx.drawImage(
            sprite,
            screenX - totalWidth / 2, // Center using totalWidth
            screenY,                 // Use calculated screenY
            totalWidth,
            totalHeight
        );

        // Draw health bar
        if (distance < 200) {
            const healthPercent = enemy.currentHealth / enemy.health;
            const barWidth = size * 0.8;
            
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(
                screenX - barWidth/2, 
                canvas.height/2 - size/1.5 - 15, 
                barWidth, 
                5
            );
            
            ctx.fillStyle = healthPercent > 0.6 ? "green" : 
                            healthPercent > 0.3 ? "yellow" : "red";
            ctx.fillRect(
                screenX - barWidth/2, 
                canvas.height/2 - size/1.5 - 15, 
                barWidth * healthPercent, 
                5
            );
        }

        ctx.globalAlpha = 1.0;
    });
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
    
    for (let i = groundItems.length - 1; i >= 0; i--) {
        const item = groundItems[i];
        const dx = item.x - player.x;
        const dy = item.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 40) { // Collection radius
            if (collectItem(item)) {
                // Item collected and removed from array
                break; // Only collect one item per frame
            }
        }
    }
    // Check for nearby doors
    checkDoorProximity();
}
function renderInventory() {
    if (!playerInventory.isOpen) return;
    
    // Semi-transparent background
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Inventory window
    const invWidth = 600;
    const invHeight = 400;
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
    
    // Close instruction
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillText("Press I to close", canvas.width / 2, invY + invHeight - 20);
    
    // Inventory grid
    const slotSize = 80;
    const slotsPerRow = 4;
    const startX = invX + 50;
    const startY = invY + 80;
    
    // Draw weapon and shield sections
    renderWeaponSection(invX + 50, startY, invWidth - 100, 100);
    renderShieldSection(invX + 50, startY + 120, invWidth - 100, 80);
    renderItemsSection(invX + 50, startY + 220, invWidth - 100, 150);
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
    
    // Item slots
    const slotSize = 60;
    const slotsPerRow = 4;
    const padding = 10;
    
    for (let i = 0; i < playerInventory.maxSlots; i++) {
        const row = Math.floor(i / slotsPerRow);
        const col = i % slotsPerRow;
        const slotX = x + padding + col * (slotSize + padding);
        const slotY = y + 40 + row * (slotSize + padding);
        
        // Slot background - highlight selected slot
        if (i === playerInventory.selectedSlot) {
            ctx.fillStyle = "rgba(150, 0, 255, 0.6)"; // Highlight selected slot
        } else {
            ctx.fillStyle = "rgba(20, 20, 40, 0.8)";
        }
        ctx.fillRect(slotX, slotY, slotSize, slotSize);
        ctx.strokeStyle = i === playerInventory.selectedSlot ? "rgb(255, 255, 255)" : "rgb(80, 80, 120)";
        ctx.lineWidth = i === playerInventory.selectedSlot ? 2 : 1;
        ctx.strokeRect(slotX, slotY, slotSize, slotSize);
        
        // Item in slot
        if (i < playerInventory.items.length) {
            const item = playerInventory.items[i];
            const itemType = ITEM_TYPES[item.type];
            const itemImg = itemImages[item.type];
            
            if (itemImg && itemImg.complete) {
                ctx.drawImage(itemImg, slotX, slotY, slotSize, slotSize);
            } else {
                // Fallback colored square
                ctx.fillStyle = "gold";
                ctx.fillRect(slotX + 5, slotY + 5, slotSize - 10, slotSize - 10);
            }
            
            // Quantity for stackable items
            if (item.quantity > 1) {
                ctx.font = "10px 'Press Start 2P'";
                ctx.fillStyle = "white";
                ctx.textAlign = "right";
                ctx.fillText(item.quantity.toString(), slotX + slotSize - 5, slotY + slotSize - 5);
            }
        }
    }
    
    // Inventory count
    ctx.font = "12px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "right";
    ctx.fillText(
        `${playerInventory.items.length}/${playerInventory.maxSlots}`,
        x + width - 10,
        y + height - 10
    );
    
    // Item description for selected item
    if (playerInventory.selectedSlot < playerInventory.items.length) {
        const selectedItem = playerInventory.items[playerInventory.selectedSlot];
        const itemType = ITEM_TYPES[selectedItem.type];
        
        ctx.font = "12px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        
        // Item name
        ctx.fillText(itemType.name, x + 10, y + height - 40);
        
        // Item description with wrapping
        const descriptionLines = wrapText(itemType.description, width - 20, ctx);
        ctx.font = "10px 'Press Start 2P'";
        descriptionLines.forEach((line, i) => {
            ctx.fillText(line, x + 10, y + height - 25 + (i * 12));
        });
        
        // Usage instructions
        if (itemType.consumable) {
            ctx.font = "10px 'Press Start 2P'";
            ctx.fillStyle = "rgb(0, 255, 0)";
            ctx.fillText("Press ENTER to use", x + width - 120, y + height - 15);
        }
    }
    
    // Navigation instructions
    ctx.font = "10px 'Press Start 2P'";
    ctx.fillStyle = "rgb(200, 200, 200)";
    ctx.textAlign = "left";
    ctx.fillText("ARROWS: Navigate", x + 10, y + height - 15);
    ctx.fillText("ENTER: Use item", x + 150, y + height - 15);
    ctx.fillText("I: Close", x + 280, y + height - 15);
}

function useSelectedItem() {
    if (playerInventory.selectedSlot >= playerInventory.items.length) return;
    
    const item = playerInventory.items[playerInventory.selectedSlot];
    
    switch(item.type) {
        case "POTION":
            player.health = Math.min(player.maxHealth, player.health + 25);
            // Remove potion from inventory
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                playerInventory.items.splice(playerInventory.selectedSlot, 1);
                // Adjust selected slot if we removed the last item
                if (playerInventory.selectedSlot >= playerInventory.items.length) {
                    playerInventory.selectedSlot = Math.max(0, playerInventory.items.length - 1);
                }
            }
            // Save player state after using potion
            savePlayerState();
            console.log("Used health potion! Health restored.");
            break;
            
        case "SCROLL":
            // Add scroll effects here
            console.log("Read ancient scroll - gained temporary knowledge!");
            // Example effect: temporary damage boost
            // You could implement this later
            break;
            
        default:
            console.log(`Cannot use ${ITEM_TYPES[item.type].name}`);
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
function renderGroundItems() {
    groundItems.forEach(item => {
        const dx = item.x - player.x;
        const dy = item.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 300) { // Only render items within certain distance
            const angleToItem = Math.atan2(dy, dx);
            let angleDiff = angleToItem - player.angle;
            
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            if (Math.abs(angleDiff) > FOV * 1.5) return;
            
            // Visibility check
            let isVisible = true;
            const checkSteps = Math.max(3, Math.floor(distance / 30));
            
            for (let i = 1; i <= checkSteps; i++) {
                const checkDistance = distance * (i / checkSteps);
                const checkX = player.x + Math.cos(angleToItem) * checkDistance;
                const checkY = player.y + Math.sin(angleToItem) * checkDistance;
                
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
            
           const screenX = canvas.width * (0.5 + angleDiff / FOV);
            const baseSize = 5000;
            const size = Math.max(15, baseSize / distance);
            
            const itemType = ITEM_TYPES[item.type];
            const itemImg = itemImages[item.type];
            
            if (itemImg && itemImg.complete) {
                ctx.globalAlpha = 0.9;
                ctx.drawImage(
                    itemImg,
                    screenX - size / 2,
                    canvas.height / 2 - size / 1.5,
                    size,
                    size
                );
                ctx.globalAlpha = 1.0;
            } else {
                // Fallback: colored square
                ctx.fillStyle = "gold";
                ctx.fillRect(
                    screenX - size / 2,
                    canvas.height / 2 - size / 1.5,
                    size,
                    size
                );
            }
            
            // Collection prompt when close
            if (distance < 60) {
                ctx.font = "12px 'Press Start 2P'";
                ctx.fillStyle = "white";
                ctx.textAlign = "center";
                ctx.fillText("Press F to collect", screenX, canvas.height / 2 - size / 1.5 - 10);
            }
        }
    });
}

function checkNPCInteraction() {
    let closestNPC = null;
    let minDistance = Infinity;
    showInteractionText = false; // Reset this every frame

    objects.forEach(obj => {
         if (!obj.interactable) return;

        const dx = obj.x - player.x;
        const dy = obj.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50 && distance < minDistance) {
          minDistance = distance;
          closestNPC = obj; // Keep this name for compatibility
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
    if (showDialogue && nearbyNPC) {
        const dialogueSet = GAME_PROGRESS.hasStudiedInLibrary 
            ? nearbyNPC.dialogue.postLibrary 
            : nearbyNPC.dialogue.normal;

        // Dialogue box
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
        ctx.fillRect(50, canvas.height - 120, canvas.width - 100, 60);
        ctx.strokeStyle = "white";
        ctx.strokeRect(50, canvas.height - 120, canvas.width - 100, 60);

        // Dialogue text (properly centered)
        ctx.font = "16px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        
        // Wrap long text if needed
        const lines = wrapText(dialogueSet[dialogueIndex], canvas.width - 140, ctx);
        lines.forEach((line, i) => {
            ctx.fillText(line, 70, canvas.height - 90 + (i * 20));
        });
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
        
        // Skip and remove dead enemies entirely
        if (enemy.currentHealth <= 0) {
            currentEnemies.splice(i, 1);
            continue;
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
        if (distToPlayer < enemy.visionRange) {
            const lineOfSightClear = isLineOfSightClear(enemy.x, enemy.y, player.x, player.y);

            if (lineOfSightClear) {
                if (enemy.state !== "chasing") {
                    enemy.state = "chasing";
                }
                enemy.cooldown = 300;
            }
        }

        // Track if enemy moved this frame
        let movedThisFrame = false;
        const prevX = enemy.x;
        const prevY = enemy.y;

        if (enemy.state === "chasing") {
            if (enemy.cooldown <= 0) {
                enemy.state = "patrolling";
            } else {
                enemy.cooldown -= deltaTime * 1000;
                const angle = Math.atan2(dy, dx);
                const moveX = Math.cos(angle) * enemy.speed * deltaTime * 60;
                const moveY = Math.sin(angle) * enemy.speed * deltaTime * 60;
                // Try to move toward player
                moveEnemyWithCollision(enemy, moveX, moveY);
                // If enemy is stuck against a wall, try to path around it
                if (!movedThisFrame && isEnemyNearWall(enemy)) {
                    tryPathAroundWall(enemy, player.x, player.y, deltaTime);
                }
                movedThisFrame = (enemy.x !== prevX || enemy.y !== prevY);
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
                moveEnemyWithCollision(enemy, moveX, moveY);
                if (!movedThisFrame && isEnemyNearWall(enemy)) {
                    tryPathAroundWall(enemy, target.x, target.y, deltaTime);
                }
                
                movedThisFrame = (enemy.x !== prevX || enemy.y !== prevY);
            }
        }

        // Update walk animation based on movement
        enemy.walkAnimation.isMoving = movedThisFrame;
        
        if (movedThisFrame) {
            enemy.walkAnimation.frameCount++;
            if (enemy.walkAnimation.frameCount >= enemy.walkAnimation.frameDelay) {
                enemy.walkAnimation.frameCount = 0;
                enemy.walkAnimation.currentFrame = 
                    (enemy.walkAnimation.currentFrame + 1) % enemy.walkAnimation.frames.length;
            }
            // Reset idle frame so it starts from 0 when it stops
            if (enemy.idleAnimation) enemy.idleAnimation.currentFrame = 0; 
        
        } else {
            // Not moving, so reset walk animation
            enemy.walkAnimation.currentFrame = 0; 
            
            // --- ADD THIS LOGIC TO UPDATE IDLE ANIMATION ---
            if (enemy.idleAnimation && enemy.idleAnimation.loaded) {
                enemy.idleAnimation.frameCount++;
                if (enemy.idleAnimation.frameCount >= enemy.idleAnimation.frameDelay) {
                    enemy.idleAnimation.frameCount = 0;
                    enemy.idleAnimation.currentFrame = 
                        (enemy.idleAnimation.currentFrame + 1) % enemy.idleAnimation.frames.length;
                }
            }
            // --- END OF NEW LOGIC ---
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
                // No shield active or failed parry - apply damage and knockback
                player.health -= enemy.damage;
                savePlayerState();
                
                const angle = Math.atan2(dy, dx);
                const newX = player.x + Math.cos(angle) * attack.knockback;
                const newY = player.y + Math.sin(angle) * attack.knockback;

                if (!isTooCloseToSolid(newX, newY, MIN_WALL_DISTANCE)) {
                    player.x = newX;
                    player.y = newY;
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
    // Store original position for collision recovery
    const originalX = enemy.x;
    const originalY = enemy.y;
    
    // Apply movement
    enemy.x += dx;
    enemy.y += dy;

    // Check wall collisions and resolve them
    let collisionResolved = false;
    
    // Check multiple points around the enemy for better collision detection
    const checkRadius = ENEMY_COLLISION_RADIUS;
    const checkPoints = [
        { x: enemy.x, y: enemy.y }, // Center
        { x: enemy.x + checkRadius, y: enemy.y }, // Right
        { x: enemy.x - checkRadius, y: enemy.y }, // Left
        { x: enemy.x, y: enemy.y + checkRadius }, // Bottom
        { x: enemy.x, y: enemy.y - checkRadius }, // Top
        { x: enemy.x + checkRadius * 0.7, y: enemy.y + checkRadius * 0.7 }, // Bottom-right
        { x: enemy.x - checkRadius * 0.7, y: enemy.y + checkRadius * 0.7 }, // Bottom-left
        { x: enemy.x + checkRadius * 0.7, y: enemy.y - checkRadius * 0.7 }, // Top-right
        { x: enemy.x - checkRadius * 0.7, y: enemy.y - checkRadius * 0.7 }  // Top-left
    ];

    for (const point of checkPoints) {
        const mapX = Math.floor(point.x / TILE_SIZE);
        const mapY = Math.floor(point.y / TILE_SIZE);
        
        if (checkWallHit(mapX, mapY)) {
            // Collision detected - push enemy back
            collisionResolved = true;
            
            // Calculate push direction based on collision point
            const pushX = (point.x - enemy.x) * 0.1;
            const pushY = (point.y - enemy.y) * 0.1;
            
            enemy.x -= pushX;
            enemy.y -= pushY;
            
            // If still in collision after push, revert to original position
            const newMapX = Math.floor(enemy.x / TILE_SIZE);
            const newMapY = Math.floor(enemy.y / TILE_SIZE);
            if (checkWallHit(newMapX, newMapY)) {
                enemy.x = originalX;
                enemy.y = originalY;
            }
            break;
        }
    }

    // If collision was too severe, revert completely
    if (collisionResolved && isEnemyInWall(enemy)) {
        enemy.x = originalX;
        enemy.y = originalY;
    }

    // Check collision with player
    const dxToPlayer = player.x - enemy.x;
    const dyToPlayer = player.y - enemy.y;
    const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);
    
    if (distToPlayer < ENEMY_COLLISION_RADIUS + PLAYER_COLLISION_RADIUS) {
        handleEnemyPlayerCollision(enemy, dxToPlayer, dyToPlayer, distToPlayer);
    }

    // Check collision with other enemies
    currentEnemies.forEach(other => {
        if (other !== enemy && other.currentHealth > 0) {
            const dist = Math.hypot(enemy.x - other.x, enemy.y - other.y);
            if (dist < ENEMY_COLLISION_RADIUS * 2) {
                // Push enemies apart more gently
                const nx = (enemy.x - other.x) / dist;
                const ny = (enemy.y - other.y) / dist;
                const overlap = ENEMY_COLLISION_RADIUS * 2 - dist;
                
                enemy.x += nx * overlap * 0.3;
                enemy.y += ny * overlap * 0.3;
                
                // Ensure we don't push through walls
                if (isEnemyInWall(enemy)) {
                    enemy.x -= nx * overlap * 0.3;
                    enemy.y -= ny * overlap * 0.3;
                }
            }
        }
    });
}

// Add visibility cache
const visibilityCache = new Map();
let cacheFrame = 0;

function isLineOfSightClear(x1, y1, x2, y2) {
    const cacheKey = `${Math.floor(x1)},${Math.floor(y1)},${Math.floor(x2)},${Math.floor(y2)}`;
    
    // Clear cache every 60 frames to prevent memory buildup
    if (cacheFrame % 60 === 0) {
        visibilityCache.clear();
    }
    cacheFrame++;
    
    if (visibilityCache.has(cacheKey)) {
        return visibilityCache.get(cacheKey);
    }

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(5, Math.floor(distance / 10)); // Reduced steps for performance
    
    for (let i = 0; i <= steps; i++) {
        const checkX = x1 + dx * (i / steps);
        const checkY = y1 + dy * (i / steps);

        const mapX = Math.floor(checkX / TILE_SIZE);
        const mapY = Math.floor(checkY / TILE_SIZE);

        const blockingTiles = [1, 2, 4, 5, 6, 7, 8, 9, 10]; // All wall types

        if (blockingTiles.includes(map[mapY]?.[mapX])) {
            visibilityCache.set(cacheKey, false);
            return false;
        }
    }

    visibilityCache.set(cacheKey, true);
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
            const newX = player.x + Math.cos(angle) * attack.knockback;
            const newY = player.y + Math.sin(angle) * attack.knockback;

            // Only move player if new position isn't in a wall
            if (!isTooCloseToSolid(newX, newY, MIN_WALL_DISTANCE)) {
            player.x = newX;
            player.y = newY;
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
    const checkRadius = ENEMY_COLLISION_RADIUS;
    const checkPoints = [
        { x: enemy.x + checkRadius, y: enemy.y },
        { x: enemy.x - checkRadius, y: enemy.y },
        { x: enemy.x, y: enemy.y + checkRadius },
        { x: enemy.x, y: enemy.y - checkRadius },
        { x: enemy.x + checkRadius * 0.7, y: enemy.y + checkRadius * 0.7 },
        { x: enemy.x - checkRadius * 0.7, y: enemy.y + checkRadius * 0.7 },
        { x: enemy.x + checkRadius * 0.7, y: enemy.y - checkRadius * 0.7 },
        { x: enemy.x - checkRadius * 0.7, y: enemy.y - checkRadius * 0.7 }
    ];

    for (const point of checkPoints) {
        const mapX = Math.floor(point.x / TILE_SIZE);
        const mapY = Math.floor(point.y / TILE_SIZE);
        if (checkWallHit(mapX, mapY)) {
            return true;
        }
    }
    return false;
}
function isEnemyNearWall(enemy) {
    const checkDistance = ENEMY_COLLISION_RADIUS + 10; // Check slightly beyond collision radius
    const directions = [
        { x: 1, y: 0 },   // Right
        { x: -1, y: 0 },  // Left
        { x: 0, y: 1 },   // Down
        { x: 0, y: -1 }   // Up
    ];

    for (const dir of directions) {
        const checkX = enemy.x + dir.x * checkDistance;
        const checkY = enemy.y + dir.y * checkDistance;
        const mapX = Math.floor(checkX / TILE_SIZE);
        const mapY = Math.floor(checkY / TILE_SIZE);
        
        if (checkWallHit(mapX, mapY)) {
            return true;
        }
    }
    return false;
}

function tryPathAroundWall(enemy, targetX, targetY, deltaTime) {
    // Try different directions to get around the wall
    const directions = [
        { angle: Math.PI / 2, priority: 1 },   // Right
        { angle: -Math.PI / 2, priority: 2 },  // Left
        { angle: 0, priority: 3 },             // Down
        { angle: Math.PI, priority: 4 }        // Up
    ];

    // Sort directions by which ones get us closer to target
    directions.sort((a, b) => {
        const testAX = enemy.x + Math.cos(a.angle) * 20;
        const testAY = enemy.y + Math.sin(a.angle) * 20;
        const testBX = enemy.x + Math.cos(b.angle) * 20;
        const testBY = enemy.y + Math.sin(b.angle) * 20;
        
        const distA = Math.hypot(testAX - targetX, testAY - targetY);
        const distB = Math.hypot(testBX - targetX, testBY - targetY);
        
        return distA - distB;
    });

    // Try each direction
    for (const dir of directions) {
        const moveX = Math.cos(dir.angle) * enemy.speed * 0.3 * deltaTime * 60;
        const moveY = Math.sin(dir.angle) * enemy.speed * 0.3 * deltaTime * 60;
        
        const originalX = enemy.x;
        const originalY = enemy.y;
        
        enemy.x += moveX;
        enemy.y += moveY;
        
        if (!isEnemyInWall(enemy)) {
            // This direction works, keep moving this way for a bit
            return;
        } else {
            // Revert and try next direction
            enemy.x = originalX;
            enemy.y = originalY;
        }
    }
}

function updateWeaponAnimation(timestamp) {
    if (!equippedItem.isSwinging) return;

    const frameDuration = 1000 / equippedItem.frameRate;
    if (timestamp - equippedItem.lastFrameTime >= frameDuration) {
        equippedItem.currentFrame++;

        // CRITICAL FIX: Check if damageFrame is within valid range
        if (equippedItem.currentFrame === Math.min(equippedItem.damageFrame, equippedItem.animationFrames.length - 1)) {
            for (let i = currentEnemies.length - 1; i >= 0; i--) {
                const enemy = currentEnemies[i];
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const distance = Math.hypot(dx, dy);
                
                if (distance <= equippedItem.range) {
                    let angleDiff = Math.atan2(dy, dx) - player.angle;
                    angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

                    if (Math.abs(angleDiff) < equippedItem.arc / 2) {
                        enemy.currentHealth -= equippedItem.damage;
                        
                        // Check if enemy died from this hit
                        if (enemy.currentHealth <= 0) {
                            currentEnemies.splice(i, 1);
                            continue; // Skip to next enemy, this one is dead
                        }
                        
                        const nx = dx / distance;
                        const ny = dy / distance;
                        enemy.knockbackTimer = 10;
                        
                        // Calculate knockback
                        let knockbackX = nx * ENEMY_KNOCKBACK_FORCE;
                        let knockbackY = ny * ENEMY_KNOCKBACK_FORCE;
                        
                        // Store original position for collision recovery
                        const originalX = enemy.x;
                        const originalY = enemy.y;
                        
                        // Apply knockback
                        enemy.x += knockbackX;
                        enemy.y += knockbackY;
                        
                        // Check if knockback caused wall collision
                        if (isEnemyInWall(enemy)) {
                            // Try reduced knockback
                            enemy.x = originalX;
                            enemy.y = originalY;
                            
                            knockbackX *= 0.3;
                            knockbackY *= 0.3;
                            
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
                    }
                }
            }
        }

        // CRITICAL FIX: End animation when we reach the last frame, not when currentFrame exceeds frame count
        if (equippedItem.currentFrame >= equippedItem.animationFrames.length) {
            equippedItem.isSwinging = false;
            equippedItem.currentFrame = 0;
        } else {
            equippedItem.lastFrameTime = timestamp;
        }
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
    if (!shield.canActivate || shield.cooldownTimer > 0) return;
    
    // Store current weapon and switch to shield
    if (!shield.active) {
        previousWeapon = equippedItem;
        shield.active = true;
        shield.parryActive = true;
        shield.parryTimer = SHIELD_TYPES.BASIC.parryWindow;
        
        // Parry check - if enemy is attacking during parry window
        checkParry();
    }
}

function deactivateShield() {
    if (shield.active) {
        shield.active = false;
        
        // Reset parry
        shield.parryActive = false;
        shield.parryTimer = 0;

        // Return to previous weapon
        if (previousWeapon) {
            equippedItem = previousWeapon;
        }
        
        
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
    if (!shield.active) return false;
    
    // Check if this is a successful parry
    if (shield.parryActive && enemy.isAttacking && 
        enemy.attackElapsed < ENEMY_ATTACKS[enemy.attackType].windup) {
        performParry(enemy);
        return true; // Successful parry - no damage
    }
    
    // Regular block - shield gets lowered
    deactivateShield();
    shield.cooldownTimer = shield.type.cooldown;
    shield.canActivate = false;
    
    return true; // Damage was blocked, but shield is lowered
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

function updateShield(deltaTime) {
    // Update cooldown timer
    if (shield.cooldownTimer > 0) {
        shield.cooldownTimer -= deltaTime * 1000;
        if (shield.cooldownTimer <= 0) {
            shield.canActivate = true;
        }
    }
    
    // Update parry timer
    if (shield.parryTimer > 0) {
        shield.parryTimer -= deltaTime * 1000;
        if (shield.parryTimer <= 0) {
            shield.parryActive = false;
        }
    }
    
    // Push enemies while shield is active
    if (shield.active) {
        pushEnemies();
    }
}
function renderShield() {
    if (!shield.active || !shield.image.complete) return;
    
    const shieldWidth = canvas.width * 0.6;
    const shieldHeight = shieldWidth * (shield.image.height / shield.image.width);
    const x = (canvas.width - shieldWidth) / 2;
    const y = canvas.height - shieldHeight * 0.5;
    
    ctx.globalAlpha = 1.0;
    ctx.drawImage(shield.image, x, y, shieldWidth, shieldHeight);
    ctx.globalAlpha = 1.0;
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
                movePlayer(deltaTime);
                checkLevelTransitions();
                
            }
            // Update player invincibility timer
            if (player.invincible) {
                player.invincibleTimer -= deltaTime * 1000;
              if (player.invincibleTimer <= 0) {
                  player.invincible = false;
                }
            }
            
            updateEnemies(deltaTime);
            updateProjectiles();
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
            updateAnimatedWalls();
            updateTorchAnimations();
            
            
            checkLibraryProximity();
            checkNPCInteraction();
            checkDoorProximity();
            
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
            const rays = castRays();
            renderFloorAndCeilingFast();
            render3D(rays);
            renderProjectiles3D();
            renderObjects();
            renderGroundItems();
            renderEnemies();
            renderSwordSwing();
             if (shield.active) {
                renderShield();
            } else {
                renderPlayerHands();
            }
            
            renderShieldUI();
            
            

            if (nearLibrary && !GAME_PROGRESS.hasStudiedInLibrary && !inLibraryCutscene) {
                showLibraryPrompt();
            }
            
            if (showInteractionText && !showDialogue) {
                showNPCPrompt();
            }
            if (showDoorPrompt) {
                renderDoorPrompt();
            }
            
            renderDialogue();
            renderInventory();

            if (inLibraryCutscene) {
                renderLibraryCutscene();
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
    
    const promptText = nearbyNPC.interactionType === "talk" 
        ? "Press F to talk" 
        : "Press F to inspect";
    
    ctx.fillText(promptText, canvas.width/2, canvas.height - 50);
}
loadLevel("ENTRANCE");
gameState = GAME_STATES.MENU;
gameLoop();