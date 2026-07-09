const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.appendChild(canvas);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE_SIZE = 64;
const FOV = Math.PI / 3;
const NUM_RAYS = 120;
const MAX_DEPTH = 600;

const map = [
    [2, 1, 1, 1, 1, 1, 1, 2],
    [2, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 1, 0, 1, 0, 1, 2],
    [2, 0, 1, 0, 1, 0, 0, 2],
    [2, 0, 1, 0, 0, 1, 0, 2],
    [2, 0, 0, 0, 1, 0, 0, 2],
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
        let hitWallType = 0; // New variable to track wall type

        while (dist < MAX_DEPTH && !hit) {
            const x = Math.floor((player.x + Math.cos(rayAngle) * dist) / TILE_SIZE);
            const y = Math.floor((player.y + Math.sin(rayAngle) * dist) / TILE_SIZE);
            
            if (map[y] && map[y][x] > 0) { // Any wall type (not just 1)
                hit = true;
                hitWallType = map[y][x]; // Store the wall type
            } else {
                dist += 5;
            }
        }
        rays.push({ angle: rayAngle, distance: dist, wallType: hitWallType }); // Return wallType
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
        } else {
            ctx.fillStyle = "white"; // Default color (should never be visible)
        }

        ctx.fillRect(i * columnWidth, (canvas.height - wallHeight) / 2, columnWidth, wallHeight);
    });
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    movePlayer();
    const rays = castRays();
    render3D(rays);
    requestAnimationFrame(gameLoop);
}

gameLoop();
