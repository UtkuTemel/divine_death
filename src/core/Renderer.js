import { wallColors, wallTextures, npcImages } from '../assets/textures.js';
import { TILE_SIZE, FOV, NUM_RAYS, MAX_DEPTH } from '../utils/constants.js';

export class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }
    
    render(player, mapManager, npcManager, dialogueSystem) {
        // Clear screen
        this.ctx.fillStyle = "rgb(20, 20, 30)";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Render 3D view
        const rays = this.castRays(player, mapManager.map);
        this.render3D(rays, player);
        this.renderObjects(npcManager.objects, player, mapManager.map);
        
        // Render UI
        if (mapManager.nearLibrary && !mapManager.hasStudiedInLibrary && !mapManager.inLibraryCutscene) {
            this.showLibraryPrompt();
        }
        
        if (npcManager.showInteractionText && !dialogueSystem.showDialogue) {
            this.showNPCPrompt();
        }
        
        dialogueSystem.render();
        
        if (mapManager.inLibraryCutscene) {
            this.renderLibraryCutscene(mapManager.libraryCutsceneText, mapManager.libraryYears);
        }
    }
    
    // Include all your rendering methods here (castRays, render3D, renderObjects, etc.)
    // Move them from your original code to here
}
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

