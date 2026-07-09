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
const NUM_RAYS = 600
;
const MAX_DEPTH = 600;

// Add this near your other constants
const LEVELS = {
    ENTRANCE: {
        name: "Prison Entrance",
        map: [
            [2, 6, 6, 6, 6, 6, 6, 6],
            [2, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 3, 0, 0, 0, 0, 6],
            [2, 0, 0, 0, 6, 0, 0, 2],
            [2, 0, 0, 0, 0, 6, 0, 2],
            [6, 3, 0, 0, 0, 0, 0, 2],
            [6, 6, 6, 6, 6, 6, 6, 2]
        ],//TODO: putting a wall at (5,3) crashes the game(freezes) since the first frame.
        playerStart: { x: 100, y: 100, angle: 0 },
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
            { mapX: 3, mapY: 6, wallFace: 'east', type: "torch" },
            { mapX: 2, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 1, mapY: 6, wallFace: 'west', type: "torch" },
            { mapX: 6, mapY: 6, wallFace: 'south', type: "torch" },
            { mapX: 5, mapY: 3, wallFace: 'north', type: "painting" }
        ],//TODO:torches appear to the right of the walls, make sure to put them in center
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
    LIBRARY: {
        name: "Ancient Library",
        map: [
            [2, 5, 5, 5, 5, 5, 5, 5],
            [0, 0, 0, 0, 0, 0, 0, 2],
            [2, 0, 3, 0, 0, 0, 0, 2],
            [2, 0, 0, 0, 1, 0, 0, 2],
            [2, 0, 0, 0, 0, 1, 0, 2],
            [2, 0, 0, 0, 0, 0, 0, 2],
            [2, 1, 1, 1, 1, 1, 1, 2]
        ],
        playerStart: { x: 100, y: 100, angle: 0 },
        background: "background.jpg",
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
    },
    TEST: {
        name: "Test Level",
        map: [
            
                [2, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
                [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 1, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 6],
                [2, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 6],
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
        exits: [
            {
                x: 0 * TILE_SIZE,
                y: 2 * TILE_SIZE,
                width: TILE_SIZE,
                height: TILE_SIZE,
                targetLevel: "LIBRARY",
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
    speed: 0.8
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



function movePlayer() {
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
    
    // Load background image
    backgroundImage.src = level.background;
    
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

function castRays() {
    const rays = [];
    const angleStep = FOV / NUM_RAYS;
    
    for (let i = 0; i < NUM_RAYS; i++) {
        const rayAngle = player.angle - FOV/2 + angleStep * i;
        let dist = 0;
        let hit = false;
        let wallType = 0;
        let exactHitX, exactHitY;

        while (!hit && dist < MAX_DEPTH) {
            dist += 1; // Constant step is better for consistency
            
            exactHitX = player.x + Math.cos(rayAngle) * dist;
            exactHitY = player.y + Math.sin(rayAngle) * dist;
            
            const mapX = Math.floor(exactHitX / TILE_SIZE);
            const mapY = Math.floor(exactHitY / TILE_SIZE);

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
        
        rays.push({
            angle: rayAngle,
            distance: dist,
            wallType,
            exactHitX,
            exactHitY,
            mapX: Math.floor(exactHitX / TILE_SIZE),
            mapY: Math.floor(exactHitY / TILE_SIZE)
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

    // First pass: Render all walls
    rays.forEach((ray, i) => {
        if (ray.distance >= MAX_DEPTH || ray.wallType === 0) return;

        const wallHeight = Math.min(30000 / ray.distance, canvas.height);
        const wallTop = (canvas.height - wallHeight) / 2;
        const hitX = player.x + Math.cos(ray.angle) * ray.distance;
        const hitY = player.y + Math.sin(ray.angle) * ray.distance;
        const mapX = Math.floor(hitX / TILE_SIZE);
        const mapY = Math.floor(hitY / TILE_SIZE);
        

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
            const objKey = `${objPos.mapX},${objPos.mapY},${objPos.type}`;

            if (rayMapX === objPos.mapX && 
                rayMapY === objPos.mapY && 
                !renderedWallObjects.has(objKey)) {
                
                const objectType = WALL_OBJECTS[objPos.type || "torch"];
                
                if (objectType.image.complete) {
                    const wallHeight = Math.min(30000 / ray.distance, canvas.height);
                    const objectSize = wallHeight * objectType.size;
                    const yPos = (canvas.height - wallHeight)/2 + wallHeight * objectType.yPos;

                    let xOffset = 0;
                    if (objPos.wallFace === 'east') xOffset = columnWidth * -0.3;
                    if (objPos.wallFace === 'west') xOffset = columnWidth * 0.3;

                    ctx.drawImage(
                        objectType.image,
                        i * columnWidth + xOffset,
                        yPos - objectSize,
                        objectSize,
                        objectSize
                    );

                    // Glow effect for torches
                    if (objectType.glow && ray.distance < 250) {
                        ctx.fillStyle = `rgba(255, 200, 100, ${0.3 - (ray.distance/250 * 0.1)})`;
                        ctx.fillRect(
                            i * columnWidth - columnWidth,
                            yPos - objectSize * 1.5,
                            columnWidth * 3,
                            objectSize * 2
                        );
                    }

                    renderedWallObjects.add(objKey);
                }
                break;
            }
        }
    });
}
function renderObjects() {
    const sortedObjects = [...objects].sort((a, b) => {
        let distA = Math.sqrt((a.x - player.x) ** 2 + (a.y - player.y) ** 2);
        let distB = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
        return distB - distA; // Sort from farthest to closest
    });
    
    sortedObjects.forEach(obj => {
        const dx = obj.x - player.x;
        const dy = obj.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Cast a ray from player to object to check if it's blocked by a wall
        let isBlocked = false;
        let checkX = player.x, checkY = player.y;
        const stepSize = 5;

        while (!isBlocked && Math.sqrt((checkX - player.x) ** 2 + (checkY - player.y) ** 2) < distance) {
            checkX += (dx / distance) * stepSize;
            checkY += (dy / distance) * stepSize;

            let mapX = Math.floor(checkX / TILE_SIZE);
            let mapY = Math.floor(checkY / TILE_SIZE);

            if (map[mapY] && map[mapY][mapX] === 1) {
                isBlocked = true;
            }
        }

        if (isBlocked || distance < 5) return;

        const angleToObj = Math.atan2(dy, dx);
        let angleDiff = angleToObj - player.angle;

        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) > FOV / 2) return;

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

// Add this function to render torches

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


function gameLoop() {
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
            if (!isTransitioning) {
                movePlayer();
                checkLevelTransitions();
            }
            
            const rays = castRays();
            render3D(rays);
            renderObjects();
            
            // Check interactions
            checkLibraryProximity();
            checkNPCInteraction();
            
            // UI elements
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
            
            // Render transition overlay if transitioning
            if (isTransitioning) {
                ctx.fillStyle = `rgba(0, 0, 0, ${transitionAlpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            break;
            
        case GAME_STATES.PAUSED:
            // Pause menu rendering
            break;
    }

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
