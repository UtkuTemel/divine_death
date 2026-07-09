export class InputHandler {
    constructor(player) {
        this.keys = {};
        this.player = player;
        
        window.addEventListener("keydown", e => {
            this.keys[e.code] = true;
            this.handleSpecialKeys(e);
        });
        window.addEventListener("keyup", e => this.keys[e.code] = false);
    }

    handleSpecialKeys(e) {
        if (e.code === "KeyF") {
            // Handle interaction logic
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
    }
}