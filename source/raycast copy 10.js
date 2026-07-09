const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const lightSources = [
    { x: 200, y: 200, intensity: 500 }, // 🔥 Light #1
    { x: 500, y: 300, intensity: 120 }, // 🔥 Light #2
    { x: 700, y: 150, intensity: 180 },  // 🔥 Light #3
    { x:600,  y:600,  intensity: 200 }
];

const wallColors = {
    1: "rgb(150, 0, 255)",  // Neon Purple for type 1 walls
    2: "rgb(0, 0, 139)",    // Dark Blue for type 2 walls
    3: "rgb(0, 0, 200)",   // Blue for NPC-related walls (ignored in raycasting)
    4: "rgb(200, 200, 0)"  // Yellow for other types (if needed)
};

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

let showInteractionText = false;
let nearbyNPC = null;
let showDialogue = false;

let dialogueIndex = 0;
const npcDialogue = ["Hi", "How are you?", "Good luck!"];

const TILE_SIZE = 64;
const FOV = Math.PI / 3;
const NUM_RAYS = 120;
const MAX_DEPTH = 600;

const map = [
    [2, 1, 1, 1, 1, 1, 1, 2],
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

    rays.forEach((ray, i) => {
        const wallHeight = Math.min(30000 / ray.distance, canvas.height);

        // 🔹 Depth-based brightness (far walls get darker)
        let brightness = Math.max(0.2, 1 - ray.distance / MAX_DEPTH);

        // 🔥 Loop through all light sources and find the brightest effect
        let maxLightEffect = 0;
        lightSources.forEach(light => {
            const wallX = player.x + Math.cos(ray.angle) * ray.distance;
            const wallY = player.y + Math.sin(ray.angle) * ray.distance;
            const lightDist = Math.sqrt((wallX - light.x) ** 2 + (wallY - light.y) ** 2);

            let lightEffect = Math.max(0.2, 1 - lightDist / light.intensity); // Light effect from this source
            maxLightEffect = Math.max(maxLightEffect, lightEffect); // Keep the strongest light
        });

        // 🔆 Combine depth shading & strongest light effect
        brightness = Math.max(0.2, brightness * maxLightEffect);

        // Get the base wall color
        let baseColor = wallColors[ray.wallType] || "rgb(255, 255, 255)"; 

        // Extract RGB values and apply brightness effect
        let [r, g, b] = baseColor.match(/\d+/g).map(Number);
        r = Math.floor(r * brightness);
        g = Math.floor(g * brightness);
        b = Math.floor(b * brightness);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`; // Apply final shading

        ctx.fillRect(i * columnWidth, (canvas.height - wallHeight) / 2, columnWidth, wallHeight);
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
        // Cast a ray from player to NPC to check if a wall blocks it
let isBlocked = false;
let checkX = player.x, checkY = player.y;
const stepSize = 5; // Small steps along the ray

while (!isBlocked && Math.sqrt((checkX - player.x) ** 2 + (checkY - player.y) ** 2) < distance) {
    checkX += (dx / distance) * stepSize;
    checkY += (dy / distance) * stepSize;

    let mapX = Math.floor(checkX / TILE_SIZE);
    let mapY = Math.floor(checkY / TILE_SIZE);

    if (map[mapY] && map[mapY][mapX] > 0 && map[mapY][mapX] !== 3) { // If a wall is hit
        isBlocked = true;
    }
}

// If NPC is behind a wall, don't render it
if (isBlocked) return;

        if (distance < 5) return; // Prevent rendering glitches

        const baseSize = 10000;  // Controls NPC size
        const size = Math.max(10, (baseSize / distance) * (obj.sizeMultiplier || 1));

        // 🔆 Calculate lighting from all sources
        let maxLightEffect = 0;
        lightSources.forEach(light => {
            const lightDist = Math.sqrt((obj.x - light.x) ** 2 + (obj.y - light.y) ** 2);
            let lightEffect = Math.max(0.2, 1 - lightDist / light.intensity);
            maxLightEffect = Math.max(maxLightEffect, lightEffect);
        });

        ctx.globalAlpha = maxLightEffect; // Apply lighting

        const angleToObj = Math.atan2(dy, dx);
        let angleDiff = angleToObj - player.angle;

        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) > FOV / 2) return; // Ignore objects outside view

        const screenX = (canvas.width / 2) + Math.tan(angleDiff) * (canvas.width / 2);

        const npcSprite = npcImages[obj.image] || npcImages.default;
        const yOffset = obj.yOffset || 0;
        ctx.drawImage(npcSprite, screenX - size / 2, (canvas.height / 2) - size / 1.5 + yOffset, size, size);
    });
}const objects = [];

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

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    movePlayer();
    const rays = castRays();
    render3D(rays);
    renderObjects();
    checkNPCInteraction();
    renderDialogue();
    requestAnimationFrame(gameLoop);
}

gameLoop();
