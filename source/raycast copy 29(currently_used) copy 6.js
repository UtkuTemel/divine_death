const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


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
wallTextures[6].src = "brick_wall.png";

const npcImages = {
    default: new Image(),
    guard: new Image(),
    mage: new Image(),
    oldMan: new Image()
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
let wallObjects = [];
// 1. Define object types
const WALL_OBJECTS = {
    torch: {
        image: new Image(),
        size: 0.35,
        yPos: 0.65,
        glow: true
    },
    painting: {
        image: new Image(),
        size: 0.3,
        yPos: 0.5,
        glow: false
    }
};
WALL_OBJECTS.painting.image.src = "painting.png";
WALL_OBJECTS.torch.image.src = "torch.png";

const enemyImage = new Image();
enemyImage.src = "enemy.png"; 
const projectileImage = new Image();
projectileImage.src = "projectile.png";
const projectiles = [];


let showInteractionText = false;
let nearbyNPC = null;
let showDialogue = false;

let dialogueIndex = 0;
let hasStudiedInLibrary = false;
let nearLibrary = false;
let inLibraryCutscene = false;
let libraryCutsceneText = "You have practiced the art of dark and mysterious for 5 years, which felt like a moment...";
const libraryYears = 5; // Years spent in library



const TILE_SIZE = 64;
const FOV = Math.PI / 3;
let NUM_RAYS = Math.floor(canvas.width / 5); // 1 ray every 5 pixels
const MAX_DEPTH = 600;

// Add this near your other constants
const LEVELS = {
    ENTRANCE: {
        name: "Prison Entrance",
        map: [
            [2, 6, 6, 6, 6, 6, 6, 6],
            [2, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 3, 0, 0, 0, 0, 6, 6, 6, 6, 6, 6, 6, 6],
            [2, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
            [2, 0, 0, 0, 0, 6, 0, 6, 6, 6, 6, 6, 6, 6, 6],
            [6, 3, 0, 0, 0, 0, 0, 2],
            [6, 6, 6, 6, 6, 6, 6, 2]
        ],//TODO: putting a wall at (5,3) crashes the game(freezes) since the first frame.
        playerStart: { x: 100, y: 100, angle: 0 },
        background: "background.avif",
        floorType: "default",
        ceilingType: "default",
        floorTexture: "purple_floor.jpg",
        ceilingTexture: "blue_ceiling.jpg",
        objects: [
            {
                x: 2 * TILE_SIZE + TILE_SIZE / 2,
                y: 2 * TILE_SIZE + TILE_SIZE / 2,
                type: "npc",
                image: "default",
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
                dialogue: {
                    normal: ["The secrets of magic...", "Take years to master."],
                    postLibrary: ["As now you know the secrets", "Years will pass like an instance"]
                },
                yOffset: npcHeights["guard"] || 0,
                sizeMultiplier: 2
            }
        ],
        wallObjects: [  // New array just for wall-mounted objects
            { mapX: 2, mapY: 4, wallFace: 'west', type: "torch" },
            { mapX: 2, mapY: 2, wallFace: 'south', type: "torch" },
            { mapX: 3, mapY: 6, wallFace: 'east', type: "torch" },
            { mapX: 2, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 1, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 6, mapY: 6, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 3, wallFace: 'north', type: "painting" }
        ],//TODO:torches appear to the right of the walls, make sure to put them in center
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
              health: 1
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
                image: "default",
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
                dialogue: {
                    normal: ["The secrets of magic...", "Take years to master."],
                    postLibrary: ["As now you know the secrets", "Years will pass like an instance"]
                },
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
              health: 1
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
                yOffset: npcHeights["oldMan"] || 0,
                sizeMultiplier: 1.5
            },
        ],
        wallObjects: [  // New array just for wall-mounted objects
            { mapX: 2, mapY: 4, wallFace: 'west', type: "torch" },
            { mapX: 2, mapY: 4, wallFace: 'west', type: "torch" },
            { mapX: 5, mapY: 3, wallFace: 'north', type: "painting" }
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
    height: 32 // Half of tile size works well
};
const sword = {
    isSwinging: false,
    swingCooldown: 0,
    swingDuration: 200, // milliseconds
    range: 50, // pixels
    arc: Math.PI / 3, // 60 degrees field in front of player
};

player.handImage = new Image(); 
player.handImage.src = "playerHandsStaff.png";

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



function movePlayer(deltaTime) {
    let nextX = player.x;
    let nextY = player.y;

    if (keys["ArrowUp"] || keys["KeyW"]) {
        nextX += Math.cos(player.angle) * player.speed;
        nextY += Math.sin(player.angle) * player.speed;
    }
    if (keys["ArrowDown"] || keys["KeyS"]) {
        nextX -= Math.cos(player.angle) * player.speed;
        nextY -= Math.sin(player.angle) * player.speed;
    }

    // Check if next position is walkable
    const mapX = Math.floor(nextX / TILE_SIZE);
    const mapY = Math.floor(nextY / TILE_SIZE);

    // SAFETY CHECK: Verify map coordinates are within bounds
    if (mapY >= 0 && mapY < map.length && 
        mapX >= 0 && mapX < map[0].length && 
        map[mapY][mapX] === 0) {
        player.x = nextX;
        player.y = nextY;
    }

    if (keys["ArrowLeft"] || keys["KeyA"]) {
        player.angle -= 0.05;
    }
    if (keys["ArrowRight"] || keys["KeyD"]) {
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
        swingSword();
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

function loadLevel(levelName, playerState = null) {
    const level = LEVELS[levelName];
    if (!level) return;
    
    currentLevel = levelName;
    map = level.map;
    objects = [...(level.objects || [])];  // Regular objects
    wallObjects = [...(level.wallObjects || [])];  // Wall objects
    currentEnemies = level.enemies || [];
    
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
function fireProjectile() {
    const offset = 10; // distance in front of player to start projectile
    const startX = player.x + Math.cos(player.angle) * offset;
    const startY = player.y + Math.sin(player.angle) * offset;
  
    const projectile = {
      x: startX,
      y: startY,
      angle: player.angle,
      speed: 4,
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
          currentEnemies.splice(j, 1); // Remove enemy
          projectiles.splice(i, 1); // Remove projectile
          break;
        }
      }
    }
}
function swingSword() {
    if (sword.swingCooldown > 0) return;

    sword.isSwinging = true;
    sword.swingCooldown = 1; // ms
    setTimeout(() => sword.isSwinging = false, sword.swingDuration);

    // Get the current level's enemy array
    const currentLevelData = LEVELS[currentLevel];
    if (!currentLevelData || !currentLevelData.enemies) return;

    // Damage enemies in range
    currentLevelData.enemies.forEach(enemy => {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.hypot(dx, dy);
        
        if (distance <= sword.range) {
            const angleToEnemy = Math.atan2(dy, dx);
            let angleDiff = angleToEnemy - player.angle;

            // Normalize angle
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            // Check if enemy is within swing arc
            if (Math.abs(angleDiff) < sword.arc / 2) {
                enemy.health -= 1; // Reduce health
                console.log("Enemy hit! Health:", enemy.health); // Debug log
            }
        }
    });

    // Remove dead enemies from both currentLevelData and currentEnemies
    currentLevelData.enemies = currentLevelData.enemies.filter(enemy => enemy.health > 0);
    currentEnemies = currentLevelData.enemies;
}  
function renderSwordSwing() {
    if (!sword.isSwinging) return;

    const radius = 60; // How far the arc reaches
    const arcWidth = sword.arc; // Same as used for hit detection

    ctx.save();

    // Center of screen (player's POV)
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Draw swing arc
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 255, 0, 0.3)"; // Yellowish slash
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -arcWidth / 2, arcWidth / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}
function castRays() {
    const rays = [];
    const angleStep = FOV / NUM_RAYS;
    
    for (let i = 0; i < NUM_RAYS; i++) {
        const rayAngle = player.angle - FOV/2 + angleStep * i;
        let dist = 0;
        let hit = false;
        let wallType = 0;
        let exactHitX, exactHitY;
        let floorHitX, floorHitY;
        let floorWallX, floorWallY;
        let floorDistance;
        let floorTextureX, floorTextureY;

        while (!hit && dist < MAX_DEPTH) {
            dist += 1; // Constant step is better for consistency
            
            exactHitX = player.x + Math.cos(rayAngle) * dist;
            exactHitY = player.y + Math.sin(rayAngle) * dist;
            
            const mapX = Math.floor(exactHitX / TILE_SIZE);
            const mapY = Math.floor(exactHitY / TILE_SIZE);

            // Store floor data before checking hit
            floorHitX = exactHitX;
            floorHitY = exactHitY;
            floorWallX = mapX;
            floorWallY = mapY;
            floorDistance = dist;

            if (mapY >= 0 && mapY < map.length && mapX >= 0 && mapX < map[mapY].length) {
                if (map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) {
                    hit = true;
                    wallType = map[mapY][mapX];
                    
                    // Snap to grid edges to reduce flicker
                    const relX = exactHitX % TILE_SIZE;
                    const relY = exactHitY % TILE_SIZE;
                    
                    if (relX < 1) exactHitX = mapX * TILE_SIZE;
                    else if (relX > TILE_SIZE-1) exactHitX = (mapX+1) * TILE_SIZE;
                    
                    if (relY < 1) exactHitY = mapY * TILE_SIZE;
                    else if (relY > TILE_SIZE-1) exactHitY = (mapY+1) * TILE_SIZE;
                }
            }
        }
        
        if (hit) {
            const wallX = exactHitX % TILE_SIZE;
            const wallY = exactHitY % TILE_SIZE;
            
            // Determine which wall we hit (north/south or east/west)
            if (exactHitX % TILE_SIZE < 1 || exactHitX % TILE_SIZE > TILE_SIZE - 1) {
                // East/west wall
                floorTextureX = wallY / TILE_SIZE;
            } else {
                // North/south wall
                floorTextureX = wallX / TILE_SIZE;
            }
            floorTextureY = 1 - (wallY / TILE_SIZE);
        }
        
        rays.push({
            angle: rayAngle,
            distance: dist,
            wallType,
            exactHitX,
            exactHitY,
            mapX: Math.floor(exactHitX / TILE_SIZE),
            mapY: Math.floor(exactHitY / TILE_SIZE),
            floorHitX,
            floorHitY,
            floorWallX,
            floorWallY,
            floorDistance,
            floorTextureX,
            floorTextureY
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
    const MAX_LIGHT_DISTANCE = 600; // Distance at which walls become darkest
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

        
    });

    // Second pass: Render wall objects (torches, paintings)
    const renderedWallObjects = new Set();
    
    rays.forEach((ray, i) => {
    const rayMapX = Math.floor((player.x + Math.cos(ray.angle) * ray.distance) / TILE_SIZE);
    const rayMapY = Math.floor((player.y + Math.sin(ray.angle) * ray.distance) / TILE_SIZE);

    for (const objPos of wallObjects) {
        const objKey = `${objPos.mapX},${objPos.mapY},${objPos.type},${objPos.wallFace}`;

        if (rayMapX === objPos.mapX &&
            rayMapY === objPos.mapY &&
            !renderedWallObjects.has(objKey)) {

            const objectType = WALL_OBJECTS[objPos.type || "torch"];
            if (!objectType.image.complete) continue;

            const wallHeight = Math.min(30000 / ray.distance, canvas.height);
            const objectSize = wallHeight * objectType.size;
            const yPos = (canvas.height - wallHeight) / 2 + wallHeight * objectType.yPos;

            // Center object based on wall face
            let xOffset = 0;
            switch (objPos.wallFace) {
                case 'east':
                case 'west':
                    xOffset = 0; // Center in ray
                    break;
                case 'north':
                case 'south':
                    xOffset = 0;
                    break;
            }

            ctx.drawImage(
                objectType.image,
                i * columnWidth + xOffset - objectSize / 2 + columnWidth / 2,
                yPos - objectSize,
                objectSize,
                objectSize
            );

            // Optional: torch glow effect
            if (objectType.glow && ray.distance < 250) {
                ctx.fillStyle = `rgba(255, 200, 100, ${0.3 - (ray.distance / 250 * 0.1)})`;
                ctx.fillRect(
                    i * columnWidth - columnWidth,
                    yPos - objectSize * 1.5,
                    columnWidth * 3,
                    objectSize * 2
                );
            }

            renderedWallObjects.add(objKey);
        }
    }
});
}

function renderFloorAndCeilingFast() {
    const textures = levelTextures[currentLevel];
    
    // Skip rendering if textures aren't loaded yet
    if (!textures || !textures.loaded) return;
    
    const floorTex = textures.floor;
    const ceilTex = textures.ceiling;
    const textureSize = floorTex.width; // Assume square textures

    const halfHeight = canvas.height / 2;
    const cosAngle = Math.cos(player.angle);
    const sinAngle = Math.sin(player.angle);

    const blockSize = player.speed > 0 ? 8 : 4;

    for (let y = halfHeight + 1; y < canvas.height; y += blockSize) {
        const cameraY = y - halfHeight;
        const rowDistance = player.height / (cameraY / canvas.height);
    
        const floorStepX = rowDistance * (Math.cos(player.angle + FOV / 2) - Math.cos(player.angle - FOV / 2)) / canvas.width;
        const floorStepY = rowDistance * (Math.sin(player.angle + FOV / 2) - Math.sin(player.angle - FOV / 2)) / canvas.width;
    
        let floorX = player.x + rowDistance * Math.cos(player.angle - FOV / 2);
        let floorY = player.y + rowDistance * Math.sin(player.angle - FOV / 2);
    
        for (let x = 0; x < canvas.width; x += blockSize) {
            const texX = Math.floor((floorX % TILE_SIZE) / TILE_SIZE * textureSize);
            const texY = Math.floor((floorY % TILE_SIZE) / TILE_SIZE * textureSize);
    
            ctx.drawImage(floorTex, texX, texY, 1, 1, x, y, blockSize, blockSize);
            const ceilingY = canvas.height - y;
            ctx.drawImage(ceilTex, texX, texY, 1, 1, x, ceilingY, blockSize, blockSize);
    
            floorX += floorStepX * blockSize;
            floorY += floorStepY * blockSize;
        }
    }
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

        // Calculate angle to object
        const angleToObj = Math.atan2(dy, dx);
        let angleDiff = angleToObj - player.angle;

        // Normalize angle difference
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Check if object is within field of view
        if (Math.abs(angleDiff) > FOV / 2) return;

        // Cast a ray to check if there's a wall between player and object
        let isVisible = true;
        let checkDistance = 0;
        const stepSize = 2; // Smaller steps for more accurate checking
        
        while (isVisible && checkDistance < distance) {
            const checkX = player.x + Math.cos(angleToObj) * checkDistance;
            const checkY = player.y + Math.sin(angleToObj) * checkDistance;
            
            const mapX = Math.floor(checkX / TILE_SIZE);
            const mapY = Math.floor(checkY / TILE_SIZE);
            
            if (mapY >= 0 && mapY < map.length && 
                mapX >= 0 && mapX < map[mapY].length && 
                map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) {
                isVisible = false;
            }
            
            checkDistance += stepSize;
        }

        if (!isVisible || distance < 5) return;

        const screenX = (canvas.width / 2) + Math.tan(angleDiff) * (canvas.width / 2);
        const baseSize = 10000;
        const size = Math.max(10, (baseSize / distance) * (obj.sizeMultiplier || 1));
        
        // Uniform lighting (0.8 brightness for all objects)
        ctx.globalAlpha = 0.8;
        
        const npcSprite = npcImages[obj.image] || npcImages.default;
        const yOffset = obj.yOffset || 0;
        ctx.drawImage(
            npcSprite, 
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
    const handImage = player.handImage; // Should be preloaded
    if (!handImage || !handImage.complete) return;

    const handWidth = canvas.width * 0.3;
    const handHeight = handWidth * (handImage.height / handImage.width);

    const x = (canvas.width - handWidth) / 2;
    const y = canvas.height - handHeight * 0.95;

    ctx.globalAlpha = 1.0; // Fully opaque
    ctx.drawImage(handImage, x, y, handWidth, handHeight);
    ctx.globalAlpha = 1.0; // Reset alpha
}

function renderEnemies() {
    currentEnemies.forEach(enemy => {
        if (enemy.health <= 0) return;

        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 5) return;

        const angleToEnemy = Math.atan2(dy, dx);
        let angleDiff = angleToEnemy - player.angle;

        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) > FOV / 2) return;

        // Cast a ray to check if there's a wall between player and enemy
        let isVisible = true;
        let checkDistance = 0;
        const stepSize = 2; // Smaller steps for more accurate checking
        
        while (isVisible && checkDistance < distance) {
            const checkX = player.x + Math.cos(angleToEnemy) * checkDistance;
            const checkY = player.y + Math.sin(angleToEnemy) * checkDistance;
            
            const mapX = Math.floor(checkX / TILE_SIZE);
            const mapY = Math.floor(checkY / TILE_SIZE);
            
            if (mapY >= 0 && mapY < map.length && 
                mapX >= 0 && mapX < map[mapY].length && 
                map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) {
                isVisible = false;
            }
            
            checkDistance += stepSize;
        }

        if (!isVisible) return;

        const screenX = (canvas.width / 2) + Math.tan(angleDiff) * (canvas.width / 2);
        const size = 10000 / distance;

        ctx.globalAlpha = 0.8;

        if (enemyImage.complete) { // make sure image is loaded
            ctx.drawImage(enemyImage, screenX - size / 2, canvas.height / 2 - size / 1.5, size, size);
        } else {
            // fallback in case image not loaded yet
            ctx.fillStyle = "red";
            ctx.fillRect(screenX - size / 2, canvas.height / 2 - size / 1.5, size, size);
        }
        ctx.globalAlpha = 1.0;

        
    });
}

function checkNPCInteraction() {
    let closestNPC = null;
    let minDistance = Infinity;
    showInteractionText = false; // Reset this every frame

    objects.forEach(obj => {
        if (obj.type !== "npc") return;

        const dx = obj.x - player.x;
        const dy = obj.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50 && distance < minDistance) {
            minDistance = distance;
            closestNPC = obj;
            showInteractionText = true; // Show prompt for closest NPC
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

function updateEnemies() {
    currentEnemies.forEach(enemy => {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
        const angleToPlayer = Math.atan2(dy, dx);
        const angleDiff = angleToPlayer - player.angle;

        // Detection logic
        if (distToPlayer < enemy.visionRange) {
            // Optional: simple line of sight check
            const lineOfSightClear = isLineOfSightClear(enemy.x, enemy.y, player.x, player.y);

            if (lineOfSightClear) {
                if (enemy.state !== "chasing") {
                    enemy.state = "chasing";
                }
                enemy.cooldown = 300; // reset cooldown every time player is visible
            }
        }

        if (enemy.state === "chasing") {
            if (enemy.cooldown <= 0) {
                enemy.state = "patrolling";
                return;
            }

            enemy.cooldown--;

            const angle = Math.atan2(dy, dx);
            const moveX = Math.cos(angle) * enemy.speed;
            const moveY = Math.sin(angle) * enemy.speed;
            moveEnemyWithCollision(enemy, moveX, moveY); 

        } else if (enemy.state === "patrolling") {
            const target = enemy.patrolPoints[enemy.patrolIndex];
            const dx = target.x - enemy.x;
            const dy = target.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 5) {
                enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
            } else {
                const angle = Math.atan2(dy, dx);
                const moveX = Math.cos(angle) * enemy.speed * 0.5; // slower patrol
                const moveY = Math.sin(angle) * enemy.speed * 0.5;
                moveEnemyWithCollision(enemy, moveX, moveY);
            }
        }
    });
}

function moveEnemyWithCollision(enemy, dx, dy) {
    const newX = enemy.x + dx;
    const newY = enemy.y + dy;

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
}
function moveEnemy(enemy, targetX, targetY) {
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1) {
        const moveX = (dx / dist) * enemy.speed;
        const moveY = (dy / dist) * enemy.speed;

        moveEnemyWithCollision(enemy, moveX, moveY);
    }
}

function isLineOfSightClear(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.floor(distance / 5);
    
    for (let i = 0; i < steps; i++) {
        const checkX = x1 + dx * (i / steps);
        const checkY = y1 + dy * (i / steps);

        const mapX = Math.floor(checkX / TILE_SIZE);
        const mapY = Math.floor(checkY / TILE_SIZE);

        const blockingTiles = [1, 2, 4, 5]; // walls, rocks, pillars, etc.

        if (blockingTiles.includes(map[mapY]?.[mapX])) {
           return false;
        }
    }

    return true;
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


function update(deltaTime) {
    switch(gameState) {
        case GAME_STATES.PLAYING:
            if (!isTransitioning) {
                movePlayer(deltaTime);
                checkLevelTransitions();
            }
            updateEnemies(deltaTime);
            updateProjectiles();
            if (sword.swingCooldown > 0) {
                sword.swingCooldown -= deltaTime;
            }
            
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

    update(deltaTime);
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
    ctx.font = "16px 'Press Start 2P'";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("Press F to talk", canvas.width/2, canvas.height - 50);
}
loadLevel("ENTRANCE");
gameState = GAME_STATES.MENU;
gameLoop();

