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

// Add this with your other image declarations (near npcImages)
const wallTextures = {
    5: new Image(), // For library walls
    6: new Image() //Brick wall
};

wallTextures[5].src = "library_wall.png"; // Make sure this matches your filename exactly
wallTextures[6].src = "isikli (1).png";

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
    "guard": 40,     // Guards stand on the ground
    "mage": -50,    // Floating NPC
    "oldMan": 10,   // Slightly above ground
    "bat": -80,     // Flying
    "chest": 20,    // Raised object
};



const objectImages = {
  bookcase: new Image(),
  
};

objectImages.bookcase.src = "bookcase.png";

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
    damageFrame: 3,
    cooldownDuration: 600, // 600ms cooldown
    animationSrcBase: "swing",
    frameCount: 4
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



const enemyImage = new Image();
enemyImage.src = "enemy.png"; 
const projectileImage = new Image();
projectileImage.src = "projectile.png";
const projectiles = [];

const ENEMY_TYPES = {
    BASIC: {
        name: "Basic Enemy",
        speed: 1.2,
        health: 100,
        damage: 15,
        visionRange: 250,
        attackType: "BASIC_ATTACK",
        sizeMultiplier: 1.0,
        yOffset: 30,
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
            [6, 6, 6, 6, 6, 6, 6, 6],
            [6, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 3, 0, 0, 0, 0, 6],
            [6, 0, 0, 0, 6, 6, 0, 6],
            [6, 0, 3, 0, 0, 6, 0, 6],
            [6, 3, 0, 0, 0, 0, 0, 6],
            [6, 6, 6, 6, 6, 6, 6, 6]
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
                x: 2 * TILE_SIZE + TILE_SIZE / 2,  // Convert to pixel coordinates
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
                yOffset: 70,
                sizeMultiplier: 1.2
            }
        ],
        wallObjects: [  // New array just for wall-mounted objects
            { mapX: 1, mapY: 0, wallFace: 'west', type: "torch" },
            { mapX: 2, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 3, mapY: 6, wallFace: 'east', type: "torch" },
            { mapX: 2, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 1, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 6, mapY: 0, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 0, wallFace: 'north', type: "painting" }
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
            }
        ]
    },
    MAZE: {
        name: "Ancient Maze",
        map: [
            [2, 6, 6, 6, 6, 6, 6, 6],
            [6, 0, 0, 0, 0, 0, 0, 6],
            [6, 6, 6, 6, 6, 6, 0, 6],
            [6, 0, 0, 0, 0, 0, 0, 6],
            [6, 0, 6, 6, 6, 6, 6, 6],
            [6, 0, 0, 0, 0, 0, 0, 6],
            [6, 6, 6, 6, 6, 6, 0, 6],
            [0, 0, 0, 0, 0, 0, 0, 6],
            [6, 6, 6, 6, 6, 6, 6, 6],
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
        background: "background.avif",
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
        patrolPoints: [
            { x: 5 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 },
            { x: 7 * TILE_SIZE + TILE_SIZE / 2, y: 2 * TILE_SIZE + TILE_SIZE / 2 }
        ],
        patrolIndex: 0,
        state: "patrolling",
        speed: 1.2,
        fov: Math.PI / 3,
        visionRange: 250,
        cooldown: 0,
        health: 30,
        maxHealth: 30,
        attackType: "SWORD_SWING",
        attackCooldown: 0,
        isAttacking: false,
        attackStartTime: 0,
        currentAttackFrame: 0,
        damage: 10
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

const swordSwingFrames = [];
const swordSwingFrameCount = 4; // or however many frames you have

for (let i = 1; i <= swordSwingFrameCount; i++) {
    const img = new Image();
    img.src = `swing${i}.png`;
    swordSwingFrames.push(img);
}

/*const sword = {
    isSwinging: false,
    swingCooldown: 0,
    swingDuration: 400, // in ms
    range: 60, // pixels
    arc: Math.PI / 4,// 45 degrees field in front of player
    animationFrames: swordSwingFrames,
    currentFrame: 0,
    frameRate: 10, // frames per second
    lastFrameTime: 0,
    damageFrame: 3, // The frame number when damage should be applied
    damage: 20 // Add damage as a property of the sword
};*/

player.handImage = new Image(); 
player.handImage.src = "swing1.png";

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
        // Existing in-game controls
        if (e.code === "KeyF") {
            if (nearbyNPC && !showDialogue) {
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
        // Add pause functionality
        else if (e.code === "Escape") {
            gameState = GAME_STATES.MENU;
        }
    }
    // Handle controls/about screens
    else if (gameState === GAME_STATES.PAUSED || 
             (gameState === GAME_STATES.MENU && (e.code === "Escape"))) {
        // Return to main menu
        gameState = GAME_STATES.MENU;
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

function isTooCloseToSolid(x, y, buffer = MIN_WALL_DISTANCE, options = { walls: true, objects: true }) {
    const checkRadius = buffer;
    const steps = 8;
    const currentObjects = LEVELS[currentLevel].objects;

    // 1. Tilemap collision (walls)
    if (options.walls) {
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const checkX = x + Math.cos(angle) * checkRadius;
            const checkY = y + Math.sin(angle) * checkRadius;

            const mapX = Math.floor(checkX / TILE_SIZE);
            const mapY = Math.floor(checkY / TILE_SIZE);

            if (mapY >= 0 && mapY < map.length &&
                mapX >= 0 && mapX < map[0].length &&
                map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) {
                return true; // Too close to a wall tile
            }
        }
    }

    // 2. Object & NPC collision
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
        currentHealth: typeDef.health, // Track current health separately
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
        }
    };
}



function loadLevel(levelName, playerState = null) {
    const level = LEVELS[levelName];
    if (!level) return;
    
    currentLevel = levelName;
    map = level.map;
    objects = [...(level.objects || [])];  // Regular objects
    wallObjects = [...(level.wallObjects || [])];  // Wall objects
    currentEnemies = (level.enemies || []).map(createEnemyInstance);
    
    // Load background image
    backgroundImage.src = level.background;

    loadLevelTextures(levelName);
    
    // Set player position
    if (playerState) {
        player.x = playerState.x;
        player.y = playerState.y;
        player.angle = playerState.angle;
    } else {
        player.x = level.playerStart.x;
        player.y = level.playerStart.y;
        player.angle = level.playerStart.angle;
    }
    
    // Reset level-specific states
    
    inLibraryCutscene = false;
    showDialogue = false;
    
    console.log(`Entered ${level.name}`);
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

function startTransition(targetLevel, targetPosition) {
    isTransitioning = true;
    transitionAlpha = 0;
    
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
          enemy.health -= 1;

          if (enemy.health <= 0) {
             currentEnemies.splice(j, 1); // Remove enemy if dead
          } else {
              // Apply knockback
              const magnitude = Math.sqrt(p.dx * p.dx + p.dy * p.dy);
              const nx = p.dx / magnitude;
              const ny = p.dy / magnitude;

              enemy.knockbackTimer = 10;
              enemy.knockbackX = nx * ENEMY_KNOCKBACK_FORCE;
              enemy.knockbackY = ny * ENEMY_KNOCKBACK_FORCE;
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

    setTimeout(() => {
        equippedItem.isSwinging = false;
        equippedItem.currentFrame = 0;
    }, equippedItem.swingDuration);
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
                if (map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) {
                    hit = true;
                    wallType = map[mapY][mapX];
                }
            }
        }
        
        rays.push({
            angle: rayAngle,
            distance: dist,
            wallType,
            exactHitX: player.x + cosRayAngle * dist,
            exactHitY: player.y + sinRayAngle * dist
        });
    }
    return rays;
}


function checkWallHit(x, y) {
    return y >= 0 && y < map.length && 
           x >= 0 && x < map[y].length && 
           map[y][x] > 0 && map[y][x] !== 3;
}
function render3D(rays) {
    const columnWidth = canvas.width / NUM_RAYS;
    const brightness = 0.8;
    const depthBuffer = new Array(NUM_RAYS).fill(Infinity);

     // Lighting parameters
    const MAX_LIGHT_DISTANCE = 500; // Distance at which walls become darkest
    const MIN_BRIGHTNESS = 0.3;     // Minimum brightness (0-1)
    const MAX_BRIGHTNESS = 1.0;     // Maximum brightness (0-1)

    // First pass: Render all walls
    rays.forEach((ray, i) => {
        if (ray.distance >= MAX_DEPTH || ray.wallType === 0) return;

        const wallHeight = Math.min(30000 / ray.distance, canvas.height);
        const wallTop = (canvas.height - wallHeight) / 2;
        const hitX = player.x + Math.cos(ray.angle) * ray.distance;
        const hitY = player.y + Math.sin(ray.angle) * ray.distance;
        const mapX = Math.floor(hitX / TILE_SIZE);
        const mapY = Math.floor(hitY / TILE_SIZE);

         // Calculate brightness based on distance (inverse square law approximation)
        let brightness = MIN_BRIGHTNESS + 
                        (MAX_BRIGHTNESS - MIN_BRIGHTNESS) * 
                        (1 - Math.min(1, ray.distance / MAX_LIGHT_DISTANCE));
        
        // Apply exponential falloff for more natural lighting
        brightness = Math.pow(brightness, 1.5);
        

        // Determine wall orientation (for edge cases)
        let wallOrientation = '';
        if (mapX === 0) wallOrientation = 'west';
        else if (mapX === map[0].length - 1) wallOrientation = 'east';
        else if (mapY === 0) wallOrientation = 'north';
        else if (mapY === map.length - 1) wallOrientation = 'south';
        else {
            // For interior walls, determine orientation based on hit position
            const relX = hitX % TILE_SIZE;
            const relY = hitY % TILE_SIZE;
            if (relX < 2 || relX > TILE_SIZE - 2) wallOrientation = relX < 2 ? 'west' : 'east';
            else wallOrientation = relY < 2 ? 'north' : 'south';
        }

        // Handle textured walls (types 5 and 6)
        if (ray.wallType === 5 || ray.wallType === 6) {
            const texture = wallTextures[ray.wallType];
            if (!texture.complete) {
                ctx.fillStyle = wallColors[ray.wallType];
                ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
                return;
            }

            // Calculate texture coordinate based on wall orientation
            let wallX;
            switch (wallOrientation) {
                case 'east':  // Right edge
                    wallX = (hitY % TILE_SIZE) / TILE_SIZE;
                    break;
                case 'west':  // Left edge
                    wallX = 1 - (hitY % TILE_SIZE) / TILE_SIZE;
                    break;
                case 'north': // Top edge
                    wallX = (hitX % TILE_SIZE) / TILE_SIZE;
                    break;
                case 'south': // Bottom edge
                    wallX = 1 - (hitX % TILE_SIZE) / TILE_SIZE;
                    break;
                default:
                    wallX = (hitX % TILE_SIZE) / TILE_SIZE;
            }
            

            ctx.drawImage(
                texture,
                wallX * texture.width, 0, 1, texture.height,
                i * columnWidth, wallTop, columnWidth, wallHeight
            );

            ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
            ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
        } else {
            // Solid color walls
            let baseColor = wallColors[ray.wallType] || "rgb(255, 255, 255)";
            let [r, g, b] = baseColor.match(/\d+/g).map(Number);
            r = Math.floor(r * brightness);
            g = Math.floor(g * brightness);
            b = Math.floor(b * brightness);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
        }
         // Flash red when player is hit
         if (player.invincible && Math.floor(performance.now() / 100) % 2 === 0) {
            ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }
    
        // Render player health
        renderPlayerHealth();

        
    });
    

    // Second pass: Render wall objects (torches, paintings)
   const renderedWallObjects = new Set();

 rays.forEach((ray, i) => {
    const rayMapX = Math.floor((player.x + Math.cos(ray.angle) * ray.distance) / TILE_SIZE);
    const rayMapY = Math.floor((player.y + Math.sin(ray.angle) * ray.distance) / TILE_SIZE);

    for (const objPos of wallObjects) {
        const objKey = `${objPos.mapX},${objPos.mapY},${objPos.type},${objPos.wallFace}`;

        if (renderedWallObjects.has(objKey)) continue;

        if (rayMapX !== objPos.mapX || rayMapY !== objPos.mapY) continue;

        if (objPos.type === "torch") {
            const torch = WALL_OBJECTS.torch;
            if (!torch.loaded) continue;

            const currentFrameImg = torch.images[torch.currentFrame];
            if (!currentFrameImg.complete) continue;

            const wallHeight = Math.min(30000 / ray.distance, canvas.height);
            const objectSize = wallHeight * torch.size;
            const yPos = (canvas.height - wallHeight) / 2 + wallHeight * torch.yPos;

            let xOffset = 0;
            switch (objPos.wallFace) {
                case 'north':
                case 'south':
                    xOffset = (ray.exactHitX % TILE_SIZE) / TILE_SIZE * columnWidth;
                    break;
                case 'east':
                case 'west':
                    xOffset = (ray.exactHitY % TILE_SIZE) / TILE_SIZE * columnWidth;
                    break;
            }

            ctx.drawImage(
                currentFrameImg,
                i * columnWidth + xOffset - objectSize / 2,
                yPos - objectSize,
                objectSize,
                objectSize
            );

            if (torch.glow && ray.distance < 250) {
                ctx.fillStyle = `rgba(255, 200, 100, ${0.3 - (ray.distance / 250 * 0.1)})`;
                ctx.fillRect(
                    i * columnWidth + xOffset - objectSize,
                    yPos - objectSize * 1.5,
                    objectSize * 2,
                    objectSize * 2
                );
            }

            renderedWallObjects.add(objKey);
        }
    }
});

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

    // 🔹 Create row buffer at reduced width
    const reducedWidth = Math.floor(canvas.width / FLOOR_QUALITY);
    const rowImageData = ctx.createImageData(reducedWidth, 1);
    const pixels = rowImageData.data;

    // --- FLOOR + CEILING ---
    for (let y = halfHeight; y < canvas.height; y += FLOOR_QUALITY) {
        const cameraY = y - halfHeight;
        const rowDistance = player.height / (cameraY / canvas.height);

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
            pixels[p] = floorTex.data[fIdx];
            pixels[p + 1] = floorTex.data[fIdx + 1];
            pixels[p + 2] = floorTex.data[fIdx + 2];
            pixels[p + 3] = 255;

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
                pixels[p] = ceilTex.data[cIdx];
                pixels[p + 1] = ceilTex.data[cIdx + 1];
                pixels[p + 2] = ceilTex.data[cIdx + 2];
                pixels[p + 3] = 255;

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

        const screenX = (canvas.width / 2) + Math.tan(angleDiff) * (canvas.width / 2);
        const baseSize = 10000;
        const size = Math.max(10, (baseSize / distance) * (obj.sizeMultiplier || 1));
        
        // Uniform lighting (0.8 brightness for all objects)
        ctx.globalAlpha = 1;
        
        let sprite;
        if (obj.type === "npc") {
          sprite = npcImages[obj.image] || npcImages.default;
        } else {
          sprite = objectImages[obj.image];
        }
        
        // Check if sprite is loaded
        if (!sprite || !sprite.complete) {
            ctx.globalAlpha = 1.0;
            return;
        }
        
        const yOffset = obj.yOffset || 0;
        ctx.drawImage(
            sprite, 
            screenX - size / 2, 
            (canvas.height / 2) - size / 1.5 + yOffset, 
            size, 
            size
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

// Add this function to render torches

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

        const screenX = (canvas.width / 2) + Math.tan(angleDiff) * (canvas.width / 2);
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

        // Draw the appropriate sprite
        ctx.drawImage(
            sprite, 
            screenX - size / 2, 
            canvas.height / 2 - size / 1.5 + (enemy.yOffset || 0), 
            size * (enemy.sizeMultiplier || 1), 
            size * (enemy.sizeMultiplier || 1)
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
    currentEnemies.forEach(enemy => {
        // Handle knockback first if active (only from attacks)
        if (enemy.knockbackTimer > 0) {
            enemy.x += enemy.knockbackX;
            enemy.y += enemy.knockbackY;
            enemy.knockbackTimer--;
            
            // Skip other logic during knockback
            return;
        }

        // Skip all other logic if attacking
        if (enemy.isAttacking) {
            updateEnemyAttackAnimation(enemy, deltaTime);
            return;
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
            return;
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
                moveEnemyWithCollision(enemy, moveX, moveY);
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
        } else {
            enemy.walkAnimation.currentFrame = 0; // Reset to first frame when not moving
        }
    });
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
            // Apply damage
            player.health -= enemy.damage;
            
            // Apply knockback to PLAYER
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
    // Apply knockback if active
    if (enemy.knockbackTimer > 0) {
        dx += enemy.knockbackX;
        dy += enemy.knockbackY;
        enemy.knockbackTimer--;
    }

    const newX = enemy.x + dx;
    const newY = enemy.y + dy;

    // Check wall collisions first
    const mapX = Math.floor(newX / TILE_SIZE);
    const mapY = Math.floor(enemy.y / TILE_SIZE);
    if (!checkWallHit(mapX, mapY)) {
        enemy.x = newX;
    }

    const mapX2 = Math.floor(enemy.x / TILE_SIZE);
    const mapY2 = Math.floor(newY / TILE_SIZE);
    if (!checkWallHit(mapX2, mapY2)) {
        enemy.y = newY;
    }

    // Check collision with player
    const dxToPlayer = player.x - enemy.x;
    const dyToPlayer = player.y - enemy.y;
    const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);
    
    if (distToPlayer < ENEMY_COLLISION_RADIUS + PLAYER_COLLISION_RADIUS) {
        handleEnemyPlayerCollision(enemy, dxToPlayer, dyToPlayer, distToPlayer);
    }

    // Check collision with other enemies (optional)
    currentEnemies.forEach(other => {
        if (other !== enemy) {
            const dist = Math.hypot(enemy.x - other.x, enemy.y - other.y);
            if (dist < ENEMY_COLLISION_RADIUS * 2) {
                // Push enemies apart
                const nx = (enemy.x - other.x) / dist;
                const ny = (enemy.y - other.y) / dist;
                const overlap = ENEMY_COLLISION_RADIUS * 2 - dist;
                
                enemy.x += nx * overlap * 0.5;
                enemy.y += ny * overlap * 0.5;
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

        const blockingTiles = [1, 2, 4, 5, 6]; // All wall types

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
function updateWeaponAnimation(timestamp) {
    if (!equippedItem.isSwinging) return;

    const frameDuration = 1000 / equippedItem.frameRate;
    if (timestamp - equippedItem.lastFrameTime >= frameDuration) {
        equippedItem.currentFrame++;

        if (equippedItem.currentFrame === equippedItem.damageFrame) {
            currentEnemies.forEach(enemy => {
                const dx = enemy.x - player.x;
                const dy = enemy.y - player.y;
                const distance = Math.hypot(dx, dy);
                
                if (distance <= equippedItem.range) {
                    let angleDiff = Math.atan2(dy, dx) - player.angle;
                    angleDiff = ((angleDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

                    if (Math.abs(angleDiff) < equippedItem.arc / 2) {
                        enemy.currentHealth -= equippedItem.damage;
                        const nx = dx / distance;
                        const ny = dy / distance;
                        enemy.knockbackTimer = 10;
                        enemy.knockbackX = nx * ENEMY_KNOCKBACK_FORCE;
                        enemy.knockbackY = ny * ENEMY_KNOCKBACK_FORCE;
                    }
                }
            });

            currentEnemies = currentEnemies.filter(e => e.currentHealth > 0);
        }

        if (equippedItem.currentFrame >= equippedItem.animationFrames.length) {
            equippedItem.isSwinging = false;
            equippedItem.currentFrame = 0;
        } else {
            equippedItem.lastFrameTime = timestamp;
        }
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

            if (equippedItem.swingCooldown > 0) {
                equippedItem.swingCooldown -= deltaTime * 1000;
            }
            updateTorchAnimations();
            
            
            checkLibraryProximity();
            checkNPCInteraction();
            
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
            renderEnemies();
            renderSwordSwing();
            renderPlayerHands();
            

            if (nearLibrary && !GAME_PROGRESS.hasStudiedInLibrary && !inLibraryCutscene) {
                showLibraryPrompt();
            }
            
            if (showInteractionText && !showDialogue) {
                showNPCPrompt();
            }
            
            renderDialogue();

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


