const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


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
wallTextures[5].onload = function() {
    console.log("Library texture loaded successfully!");
};
wallTextures[5].onerror = function() {
    console.error("Failed to load library texture!");
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

const npcHeights = {
    "default": 0,   // Normal NPCs
    "guard": 40,     // Guards stand on the ground
    "mage": -50,    // Floating NPC
    "oldMan": 10,   // Slightly above ground
    "bat": -80,     // Flying
    "chest": 20,    // Raised object
};

// Add this near your other image declarations
const torchImage = new Image();
torchImage.src = "torch.png";

// Define torch positions (map coordinates)
const torches = [
    { x: 1, y: 1 },  // Top-left corner
    { x: 6, y: 1 },  // Top-right corner
   // { x: 1, y: 6 },  // Bottom-left corner
   // { x: 6, y: 6 }   // Bottom-right corner
];

let showInteractionText = false;
let nearbyNPC = null;
let showDialogue = false;

let dialogueIndex = 0;

let nearLibrary = false;
let inLibraryCutscene = false;
let libraryCutsceneText = "You have practiced the art of dark and mysterious for 5 years, which felt like a moment...";
const libraryYears = 5; // Years spent in library


const TILE_SIZE = 64;
const FOV = Math.PI / 3;
const NUM_RAYS = 120;
const MAX_DEPTH = 600;

const map = [
    [2, 1, 1, 5, 6, 6, 6, 2],
    [2, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 3, 0, 1, 0, 1, 2],
    [2, 0, 0, 0, 1, 0, 0, 2],
    [2, 0, 0, 0, 0, 1, 0, 2],
    [2, 3, 0, 0, 0, 0, 0, 2],
    [2, 1, 1, 1, 1, 1, 1, 2]
];

const player = {
    x: 100,
    y: 100,
    angle: 0,
    speed: 2
};

const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);
window.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (e.code === "KeyF" && nearbyNPC) {
        if (showDialogue) {
            dialogueIndex++; // Move to the next dialogue line
            if (dialogueIndex >= nearbyNPC.dialogue.length) { 
                showDialogue = false;
                dialogueIndex = 0;
                nearbyNPC = null; // Stop interacting with NPC
                showInteractionText = false; // Remove "Press F" text
            }
        } else {
            showDialogue = true; // Start dialogue
        }
        if (nearLibrary && !inLibraryCutscene) {
            // Start library cutscene
            inLibraryCutscene = true;
        } 
        else if (inLibraryCutscene) {
            // End library cutscene
            inLibraryCutscene = false;
            player.age += libraryYears; // Increase player age
        }
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

    // Check if next position is inside a wall
    let mapX = Math.floor(nextX / TILE_SIZE);
    let mapY = Math.floor(nextY / TILE_SIZE);

    if (map[mapY] && map[mapY][mapX] === 0) { 
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

function castRays() {
    const rays = [];
    for (let i = 0; i < NUM_RAYS; i++) {
        const rayAngle = player.angle - FOV / 2 + (FOV / NUM_RAYS) * i;
        let dist = 0;
        let hit = false;
        let wallType = 0; // Track wall type

        while (dist < MAX_DEPTH && !hit) {
            const x = Math.floor((player.x + Math.cos(rayAngle) * dist) / TILE_SIZE);
            const y = Math.floor((player.y + Math.sin(rayAngle) * dist) / TILE_SIZE);

            if (map[y] && map[y][x] > 0 && map[y][x] !== 3) { // 🔹 Ignore NPC tiles
                hit = true;
                wallType = map[y][x]; // Store wall type
            } else {
                dist += 5;
            }
        }
        rays.push({ angle: rayAngle, distance: dist, wallType });
    }
    return rays;
}
function render3D(rays) {
    const columnWidth = canvas.width / NUM_RAYS;
    const brightness = 0.8;
    
    rays.forEach((ray, i) => {
        const wallHeight = Math.min(30000 / ray.distance, canvas.height);
        const wallTop = (canvas.height - wallHeight) / 2;
        
        // For library walls (type 5)
        if (ray.wallType === 5) {
            // Fallback color if texture not loaded
            if (!wallTextures[5].complete) {
                ctx.fillStyle = wallColors[5];
                ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
                return;
            }
            
            // Calculate exact hit position on wall
            const hitX = player.x + Math.cos(ray.angle) * ray.distance;
            const hitY = player.y + Math.sin(ray.angle) * ray.distance;
            const wallX = hitX % TILE_SIZE / TILE_SIZE; // 0-1 position
            
            // Draw texture slice
            ctx.drawImage(
                wallTextures[5],
                wallX * wallTextures[5].width, 0, 1, wallTextures[5].height,
                i * columnWidth, wallTop, columnWidth, wallHeight
            );
            
            // Apply brightness
            ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
            ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
        }
        else if (ray.wallType === 6) {
            // Brick wall rendering
            if (!wallTextures[6].complete) {
                ctx.fillStyle = wallColors[6];
                ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
                return;
            }
            
            const hitX = player.x + Math.cos(ray.angle) * ray.distance;
            const hitY = player.y + Math.sin(ray.angle) * ray.distance;
            const wallX = hitX % TILE_SIZE / TILE_SIZE;
            
            ctx.drawImage(
                wallTextures[6],
                wallX * wallTextures[6].width, 0, 1, wallTextures[6].height,
                i * columnWidth, wallTop, columnWidth, wallHeight
            );
            
            ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
            ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
        } 
        else {
            // Original rendering for other walls
            let baseColor = wallColors[ray.wallType] || "rgb(255, 255, 255)";
            let [r, g, b] = baseColor.match(/\d+/g).map(Number);
            r = Math.floor(r * brightness);
            g = Math.floor(g * brightness);
            b = Math.floor(b * brightness);
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(i * columnWidth, wallTop, columnWidth, wallHeight);
        }
    });
    
    // 2. Improved torch rendering
    const TORCH_POSITIONS = [
        { mapX: 1, mapY: 1, wallFace: 'east' },  // Positions in map coordinates
        { mapX: 6, mapY: 1, wallFace: 'west' },
        { mapX: 1, mapY: 6, wallFace: 'north' },
        { mapX: 6, mapY: 6, wallFace: 'south' }
    ];

    // Track which torches we've rendered to prevent duplicates
    const renderedTorches = new Set();

    rays.forEach((ray, i) => {
        const rayMapX = Math.floor((player.x + Math.cos(ray.angle) * ray.distance) / TILE_SIZE);
        const rayMapY = Math.floor((player.y + Math.sin(ray.angle) * ray.distance) / TILE_SIZE);
        
        // Check if this ray hit a wall with a torch
        for (const torchPos of TORCH_POSITIONS) {
            const torchKey = `${torchPos.mapX},${torchPos.mapY}`;
            
            if (rayMapX === torchPos.mapX && rayMapY === torchPos.mapY && !renderedTorches.has(torchKey)) {
                const wallHeight = Math.min(30000 / ray.distance, canvas.height);
                const wallTop = (canvas.height - wallHeight) / 2;
                
                // Only render if reasonably close
                if (ray.distance > 500) continue;
                
                // Calculate torch size (scales with distance)
                const torchSize = wallHeight * 0.35; // 35% of wall height
                
                // Position adjustment
                let xOffset = 0;
                let yPos = wallTop + wallHeight * 0.65; // 65% up the wall
                
                // Slight horizontal offset based on wall facing
                if (torchPos.wallFace === 'east') xOffset = columnWidth * -0.3;
                if (torchPos.wallFace === 'west') xOffset = columnWidth * 0.3;
                
                // Draw single torch per wall
                ctx.drawImage(
                    torchImage,
                    i * columnWidth + xOffset,
                    yPos - torchSize,
                    torchSize,
                    torchSize
                );
                
                // Mark this torch as rendered
                renderedTorches.add(torchKey);
                
                // Simple "glow" using a semi-transparent overlay
                if (ray.distance < 250) {
                    ctx.fillStyle = `rgba(255, 200, 100, ${0.3 - (ray.distance/250 * 0.1)})`;
                    ctx.fillRect(
                        i * columnWidth - columnWidth,
                        yPos - torchSize * 1.5,
                        columnWidth * 3,
                        torchSize * 2
                    );
                }
                break; // Move to next ray after finding a torch
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

        if (showInteractionText && distance < 50) {
            ctx.font = "16px 'Press Start 2P'";
            ctx.fillStyle = "white";
            ctx.fillText("Press F to say hi", canvas.width / 2 - 80, canvas.height / 2 + 100);
        }
    });
}

// Add this function to render torches

const objects = [];

for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === 3) {
            let npcType, npcDialogue, sizeMultiplier;
        
            if (x === 2 && y === 2) {  //This is where you add the npcs
                npcType = "default";  // Use guard image
                npcDialogue = ["Halt!", "No one passes without permission."];
                sizeMultiplier = 1.0;
            } else if (x === 1 && y === 5) {
                npcType = "guard";  // Use guard image
                npcDialogue = ["The secrets of magic...", "Take years to master."];
                sizeMultiplier = 2;
            } else {
                npcType = "oldMan";  // Use old man image
                npcDialogue = ["You look lost, traveler.", "Be careful down here."];
                sizeMultiplier = 1.5;
            }
        
            objects.push({ 
                x: x * TILE_SIZE + TILE_SIZE / 2, 
                y: y * TILE_SIZE + TILE_SIZE / 2, 
                type: "npc",
                image: npcType,  
                dialogue: npcDialogue,
                yOffset: npcHeights[npcType] || 0,  // Default to 0 if not found
                sizeMultiplier: sizeMultiplier // Default size (modify per NPC if needed)
            });
        }
    }
}
function checkNPCInteraction() {
    let closestNPC = null;
    let minDistance = Infinity;

    objects.forEach(obj => {
        if (obj.type !== "npc") return; // Ignore non-NPC objects

        const dx = obj.x - player.x;
        const dy = obj.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50 && distance < minDistance) {  
            minDistance = distance;
            closestNPC = obj;  
        }
    });

    if (closestNPC) {
        showInteractionText = true;
        nearbyNPC = closestNPC;
    } else {
        showInteractionText = false;
        nearbyNPC = null;
    }
}

function renderDialogue() {
    if (showDialogue) {
        ctx.fillStyle = "black";
        ctx.fillRect(50, canvas.height - 100, canvas.width - 100, 50); // Box
        ctx.strokeStyle = "white";
        ctx.strokeRect(50, canvas.height - 100, canvas.width - 100, 50); // Border

        ctx.font = "16px 'Press Start 2P'"; // Pixelated font
        ctx.fillStyle = "white";
        if (showDialogue && nearbyNPC && dialogueIndex < nearbyNPC.dialogue.length) {
            ctx.fillText(nearbyNPC.dialogue[dialogueIndex], 70, canvas.height - 70);
        }
    }
}

function checkLibraryProximity() {
    nearLibrary = false;
    if (inLibraryCutscene) return;

    // Check 3 tiles ahead of player
    const checkDistance = 3 * TILE_SIZE;
    const checkX = player.x + Math.cos(player.angle) * checkDistance;
    const checkY = player.y + Math.sin(player.angle) * checkDistance;
    const mapX = Math.floor(checkX / TILE_SIZE);
    const mapY = Math.floor(checkY / TILE_SIZE);

    if (map[mapY] && map[mapY][mapX] === 5) { // 5 is library wall
        nearLibrary = true;
    }
}

function renderLibraryCutscene() {
    // Fullscreen black overlay
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Main text
    ctx.font = "24px 'Press Start 2P'";
    ctx.textAlign = "center";
    
    // Split text to highlight the years
    const parts = libraryCutsceneText.split(libraryYears);
    
    // Draw first part
    ctx.fillStyle = "white";
    ctx.fillText(parts[0], canvas.width/2, canvas.height/2 - 20);
    
    // Draw years in red
    ctx.fillStyle = "red";
    ctx.fillText(libraryYears.toString(), 
                canvas.width/2 + ctx.measureText(parts[0]).width, 
                canvas.height/2 - 20);
    
    // Draw remaining text
    ctx.fillStyle = "white";
    ctx.fillText(parts[1], 
                canvas.width/2 + ctx.measureText(parts[0] + libraryYears).width, 
                canvas.height/2 - 20);
    
    // "Press F to proceed" hint
    ctx.font = "16px 'Press Start 2P'";
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.fillText("Press F to proceed", canvas.width - 20, canvas.height - 20);
}

function gameLoop() {
    // Add a dark background for contrast
    ctx.fillStyle = "rgb(20, 20, 30)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //only check librarty proximity
    if (!inLibraryCutscene) {
        checkLibraryProximity();
        renderLibraryCutscene();
    }
    
    // Rest of your game loop...
    movePlayer();
    const rays = castRays();
    render3D(rays);
    renderObjects();

    if (nearLibrary) {
        ctx.font = "16px 'Press Start 2P'";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("Press F to browse library", canvas.width/2, canvas.height - 50);
    }
    
    checkNPCInteraction();
    renderDialogue();
    requestAnimationFrame(gameLoop);
}
gameLoop();
