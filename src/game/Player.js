import { TILE_SIZE } from '../utils/constants.js';

export class Player {
    constructor() {
        this.x = 100;
        this.y = 100;
        this.angle = 0;
        this.speed = 2;
        this.age = 0;
    }
    
    move(keys, map) {
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
        // Move player based on input
        // Move your movePlayer() logic here
    }
