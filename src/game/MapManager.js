import { TILE_SIZE } from '../utils/constants.js';

export class MapManager {
    constructor() {
        this.map = [
            [2, 6, 6, 6, 6, 6, 6, 6],
            [2, 0, 0, 0, 0, 0, 0, 5],
            [2, 0, 3, 0, 0, 0, 0, 6],
            [2, 0, 0, 0, 1, 0, 0, 2],
            [2, 0, 0, 0, 0, 1, 0, 2],
            [2, 3, 0, 0, 0, 0, 0, 2],
            [2, 1, 1, 1, 1, 1, 1, 2]
        ];
        
        this.nearLibrary = false;
        this.inLibraryCutscene = false;
        this.hasStudiedInLibrary = false;
        this.libraryCutsceneText = "You have practiced the art of dark and mysterious for 5 years, which felt like a moment...";
        this.libraryYears = 5;
    }
    
    checkLibraryProximity(player) {
        // Move your checkLibraryProximity() logic here
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
}