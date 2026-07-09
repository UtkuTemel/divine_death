const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


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
        let shade = Math.max(50, 255 - ray.distance / 2); // Darkens with distance

        // Assign different colors based on wall type
        if (ray.wallType === 1) {
            ctx.fillStyle = `rgb(${shade}, 0, ${shade})`; // Neon purple walls
        } else if (ray.wallType === 2) {
            ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`; // Gray walls
        } 

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

        // Cast a ray from player to NPC and check if it hits a wall first
    let isBlocked = false;
    let checkX = player.x, checkY = player.y;
    const stepSize = 5; // Small step to move along the ray

    while (!isBlocked && Math.sqrt((checkX - player.x) ** 2 + (checkY - player.y) ** 2) < distance) {
        checkX += (dx / distance) * stepSize;
        checkY += (dy / distance) * stepSize;

        let mapX = Math.floor(checkX / TILE_SIZE);
        let mapY = Math.floor(checkY / TILE_SIZE);

        if (map[mapY] && map[mapY][mapX] === 1) { // If a wall is hit
        isBlocked = true;
        }
    }

    // If NPC is blocked by a wall, don't draw it
    if (isBlocked) return;

        if (distance < 5) return; // Prevents rendering glitches

        const baseSize = 20000;  // Controls NPC size
        const size = Math.max(10, baseSize / distance); // Ensures proper scaling

        const angleToObj = Math.atan2(dy, dx);
        let angleDiff = angleToObj - player.angle;

        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) > FOV / 2) return; // Ignore objects outside view

        const screenX = (canvas.width / 2) + Math.tan(angleDiff) * (canvas.width / 2);

        

        
        const npcSprite = npcImages[obj.image] || npcImages.default; // Use correct NPC image
        const yOffset = obj.yOffset || 0;  // Ensure default is 0 if undefined
        ctx.drawImage(npcSprite, screenX - size / 2, (canvas.height / 2) - size / 1.5 + yOffset, size, size);
        if (showInteractionText) {
            ctx.font = "16px 'Press Start 2P'"; // Pixelated font
            ctx.fillStyle = "white";
            ctx.fillText("Press F to say hi", canvas.width / 2 - 80, canvas.height / 2 + 100);
        }
    });
}const objects = [];

for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] === 3) {
            let npcType, npcDialogue;
        
            if (x === 2 && y === 2) {  //This is where you add the npcs
                npcType = "default";  // Use guard image
                npcDialogue = ["Halt!", "No one passes without permission."];
            } else if (x === 1 && y === 5) {
                npcType = "guard";  // Use guard image
                npcDialogue = ["The secrets of magic...", "Take years to master."];
            } else {
                npcType = "oldMan";  // Use old man image
                npcDialogue = ["You look lost, traveler.", "Be careful down here."];
            }
        
            objects.push({ 
                x: x * TILE_SIZE + TILE_SIZE / 2, 
                y: y * TILE_SIZE + TILE_SIZE / 2, 
                type: "npc",
                image: npcType,  
                dialogue: npcDialogue,
                yOffset: npcHeights[npcType] || 0  // Default to 0 if not found
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
