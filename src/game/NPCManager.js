import { npcHeights } from '../assets/sprites.js';
import { TILE_SIZE } from '../utils/constants.js';

export class NPCManager {
    constructor() {
        this.objects = [];
        this.nearbyNPC = null;
        this.showInteractionText = false;
        
        this.initializeNPCs();
    }
    
    initializeNPCs() {
        
        // Move your NPC creation logic here
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
    }
    
    checkNPCInteraction(player) {
        // Move your checkNPCInteraction() logic here
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
}