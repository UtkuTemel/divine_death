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
let hasStudiedInLibrary = false;
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
    speed: 0,        // Use speed for smoother acceleration
    maxSpeed: 1,     // Maximum movement speed
    acceleration: 0.1, // How fast player speeds up
    friction: 0.05   // How fast player slows down
};
const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);
window.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (e.code === "KeyF") {
        if (nearbyNPC && !showDialogue) {
            // Start dialogue
            showDialogue = true;
            dialogueIndex = 0;
        } 
        else if (showDialogue) {
            // Advance dialogue
            const dialogueSet = hasStudiedInLibrary 
                ? nearbyNPC.dialogue.postLibrary 
                : nearbyNPC.dialogue.normal;
            
            dialogueIndex++;
            if (dialogueIndex >= dialogueSet.length) {
                showDialogue = false;
            }
        }
        else if (nearLibrary && !inLibraryCutscene && !hasStudiedInLibrary) {
            inLibraryCutscene = true;
        }
        else if (inLibraryCutscene) {
            inLibraryCutscene = false;
            player.age += libraryYears;
            hasStudiedInLibrary = true;
        }
    }
});;

window.addEventListener("keyup", e => keys[e.code] = false);

function movePlayer() {
    if (keys["ArrowUp"] || keys["KeyW"]) {
        player.speed += player.acceleration;
        if (player.speed > player.maxSpeed) player.speed = player.maxSpeed;
    } else if (keys["ArrowDown"] || keys["KeyS"]) {
        player.speed -= player.acceleration;
        if (player.speed < -player.maxSpeed / 2) player.speed = -player.maxSpeed / 2; 
    } else {
        // Apply friction (smooth stop)
        if (player.speed > 0) {
            player.speed -= player.friction;
            if (player.speed < 0) player.speed = 0;
        } else if (player.speed < 0) {
            player.speed += player.friction;
            if (player.speed > 0) player.speed = 0;
        }
    }

    // Calculate next position
    let nextX = player.x + Math.cos(player.angle) * player.speed;
    let nextY = player.y + Math.sin(player.angle) * player.speed;

    // Collision detection (same as before)
    let mapX = Math.floor(nextX / TILE_SIZE);
    let mapY = Math.floor(nextY / TILE_SIZE);
    if (map[mapY] && map[mapY][mapX] === 0) {
        player.x = nextX;
        player.y = nextY;
    }

    // Smooth rotation
    if (keys["ArrowLeft"] || keys["KeyA"]) player.angle -= 0.05;
    if (keys["ArrowRight"] || keys["KeyD"]) player.angle += 0.05;
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

        
    });
}

// Add this function to render torches

const objects = [];

// Replace your entire NPC creation loop (the for loop where you push to objects array) with this:
for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === 3) {
            if (x === 2 && y === 2) {  // Default NPC
                objects.push({
                    x: x * TILE_SIZE + TILE_SIZE / 2,
                    y: y * TILE_SIZE + TILE_SIZE / 2,
                    type: "npc",
                    image: "default",
                    dialogue: {
                        normal: ["Hello, Welcome to the prison of the mind", "Here, knowledge comes before all!"],
                        postLibrary: ["Long time no see", "Have you learned the dark arts yet?"]
                    },
                    yOffset: npcHeights["default"] || 0,
                    sizeMultiplier: 1.0
                });
            }
            else if (x === 1 && y === 5) {  // Guard NPC
                objects.push({
                    x: x * TILE_SIZE + TILE_SIZE / 2,
                    y: y * TILE_SIZE + TILE_SIZE / 2,
                    type: "npc",
                    image: "guard",
                    dialogue: {
                        normal: ["The secrets of magic...", "Take years to master."],
                        postLibrary: ["As now you know the secrets", "Years will pass like an instance"]
                    },
                    yOffset: npcHeights["guard"] || 0,
                    sizeMultiplier: 2
                });
            }
            else {  // Old Man NPC (catch-all)
                objects.push({
                    x: x * TILE_SIZE + TILE_SIZE / 2,
                    y: y * TILE_SIZE + TILE_SIZE / 2,
                    type: "npc",
                    image: "oldMan",
                    dialogue: {
                        normal: ["You look lost, traveler.", "Be careful down here."],
                        postLibrary: ["", ""]  // Add post-library dialogue here
                    },
                    yOffset: npcHeights["oldMan"] || 0,
                    sizeMultiplier: 1.5
                });
            }
        }
    }
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
        const dialogueSet = hasStudiedInLibrary 
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
    
    if (inLibraryCutscene || hasStudiedInLibrary) return;

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
        hasStudiedInLibrary = false;
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

    // Game rendering
    movePlayer();
    const rays = castRays();
    render3D(rays);
    renderObjects();
    
    // Check interactions
    checkLibraryProximity();
    checkNPCInteraction();
    
    // UI elements (on top of everything)
    if (nearLibrary && !hasStudiedInLibrary && !inLibraryCutscene) {
        showLibraryPrompt();
    }
    
    if (showInteractionText && !showDialogue) {
        showNPCPrompt();
    }
    
    renderDialogue();
    
    if (inLibraryCutscene) {
        renderLibraryCutscene();
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
gameLoop();
