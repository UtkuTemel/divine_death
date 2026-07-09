import { Player } from '../game/Player.js';
import { Renderer } from './Renderer.js';
import { InputHandler } from './InputHandler.js';
import { MapManager } from '../game/MapManager.js';
import { NPCManager } from '../game/NPCManager.js';
import { DialogueSystem } from '../game/DialogueSystem.js';

export class GameEngine {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
        document.body.appendChild(this.canvas);
        this.resizeCanvas();
        
        this.player = new Player();
        this.renderer = new Renderer(this.canvas, this.ctx);
        this.inputHandler = new InputHandler(this.player);
        this.mapManager = new MapManager();
        this.npcManager = new NPCManager();
        this.dialogueSystem = new DialogueSystem(this.canvas, this.ctx);
        
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    start() {
        const gameLoop = () => {
            // Update game state
            this.player.move(this.inputHandler.keys, this.mapManager.map);
            this.npcManager.checkNPCInteraction(this.player);
            this.mapManager.checkLibraryProximity(this.player);
            
            // Render
            this.renderer.render(
                this.player,
                this.mapManager,
                this.npcManager,
                this.dialogueSystem
            );
            
            requestAnimationFrame(gameLoop);
        };
        
        gameLoop();
    }
}