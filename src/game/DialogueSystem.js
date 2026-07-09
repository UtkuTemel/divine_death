export class DialogueSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.showDialogue = false;
        this.dialogueIndex = 0;
    }
    
    render() {
        if (this.showDialogue) {
            // Move your renderDialogue() logic here
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
    }
    
    wrapText(text, maxWidth) {
        // Move your wrapText() helper here
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
}