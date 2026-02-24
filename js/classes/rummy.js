class RummyGame {
    constructor(canvas, initialTableTexture = null) {
        this.DEBUG = false;

        this.egoHue = 0;
        this.egoHueInc = 0.5;
        this.egoColour = 'hsl(0, 100%, 50%)';


        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.deck = new Deck();
        this.discardPile = [];

        this.playerNames = ["Steven", "Computer"];

        this.players = [
            new Player(this.playerNames[0], false),
            new Player(this.playerNames[1], true)
        ];

        // card dimensions
        this.cardw = 84;
        this.cardh = 120;

        this.currentPlayer = 0;
        this.dealSpeed = vars.getDealSpeed(); // ms between each card dealt at the start of the game
        this.selectedCardIndex = null;
        this.phase = "draw"; // draw -> discard
        this.gameOver = false;
        this.winner = null;

        // Drag & drop
        this.isDragging = false;
        this.dragIndex = null;
        this.dragCard = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragStartTime = 0;
        this.dragHoldTimeout = null;
        this.dragTargetIndex = null;

        // gradients
        this.grad_winner = this.ctx.createLinearGradient(700, 90, 800, 250);
        this.grad_winner.addColorStop(0, 'rgba(253, 255, 114, 1)');
        this.grad_winner.addColorStop(0.45, 'rgba(135, 126, 46, 1)');
        this.grad_winner.addColorStop(0.55, 'rgba(135, 126, 46, 1)');
        this.grad_winner.addColorStop(1, 'rgba(253, 255, 114, 1)');

        this.grad_backofcard = this.ctx.createLinearGradient(0, 0, this.cardw, this.cardh);
        this.grad_backofcard.addColorStop(0, 'rgba(169, 16, 16, 1)');
        this.grad_backofcard.addColorStop(1, 'rgba(30, 0, 0, 1)');

        this.grad_frontofcard = this.ctx.createLinearGradient(0, 0, this.cardw, this.cardh);
        this.grad_frontofcard.addColorStop(0, 'rgba(255, 255, 255, 1)');
        this.grad_frontofcard.addColorStop(0.5, 'rgba(220, 220, 220, 1)');
        this.grad_frontofcard.addColorStop(1, 'rgba(255, 255, 255, 1)');

        // Animations
        this.animations = [];
        this.drawTimeouts = [];
        this.countTimer = null;
        this.welcomeText = document.getElementById('welcomeText');

        // Frame timing
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;

        // Turn indicator animation
        this.indicatorOpacity = 1;
        this.indicatorDirection = -1; // -1 for fading out, 1 for fading in
        this.indicatorFadeSpeed = 0.02;

        // Background texture
        this.bgTexture = new Image();
        this.bgTexture.src = initialTableTexture || './textures/table/stained_pine_1k.jpg';
        this.bgPattern = null;
        this.bgTexture.onload = () => {
            this.bgPattern = this.ctx.createPattern(this.bgTexture, 'repeat');
        };

        this.maxPoints = 100; // change this to set game length. Normal values are 100 or 500, but ill be adding 300 and 400 too

        this.initGame();
        this.attachEvents();
        this.loop();

        this.gameStarted = false; // this only flips to true when the player makes their first move
    }

    initGame(init=true) {
        let loadingScreenDelay = 0;
        if (init) { 
            vars.hideLoadingScreen();
            loadingScreenDelay = 1000;
            setTimeout(()=> {
                document.getElementById('gameButtons').classList.add('active');
            }, loadingScreenDelay/2);
        };

        // wait for the loading screen to fade out and deal the 2 players hands
        this.initTimeout = setTimeout(()=> {
            this.deal_hands();
        }, loadingScreenDelay);
    }

    attachEvents() {
        this.canvas.addEventListener("mousedown", e => this.handleMouseDown(e));
        this.canvas.addEventListener("mouseup", e => this.handleMouseUp(e));
        this.canvas.addEventListener("mousemove", e => this.handleMouseMove(e));
        this.canvas.addEventListener("click", e => this.handleClick(e));
    }

    loadTableTexture(texturePath) {
        this.bgTexture = new Image();
        this.bgTexture.src = texturePath;
        this.bgPattern = null;
        this.bgTexture.onload = () => {
            this.bgPattern = this.ctx.createPattern(this.bgTexture, 'repeat');
        };
    }

    deal_hands() {
        let delay = vars.playShuffleSoundEffect();
        this.shuffleTimeout = setTimeout(()=> {
            // Deal 10 cards each
            for (let i = 0; i < 10; i++) {
                for (let p of this.players) {
                    let tO = setTimeout(()=> {
                        p.drawCard(this.deck.draw(), 250); // draw card, but delay adding it to the players hand until the animation is done
                        // animate the card being dealt from the deck to the player's hand
                        const card = p.hand[p.hand.length - 1];
                        const startPos = this.getStockPosition();
                        const destPos = p.name==='Steven' ? this.getPlayerCardPosition(p.hand.length - 1) : { x: -4 + (p.hand.length - 1) * 40, y: 80 };
                        const anim = new CardAnimation(
                            null,
                            startPos.x, startPos.y,
                            destPos.x+this.cardw+10, destPos.y,
                            250
                            );
                        this.animations.push(anim);
                    }, this.dealSpeed * (i * this.players.length + this.players.indexOf(p)));
                    this.drawTimeouts.push(tO);
                };
            };
            this.discardPile.push(this.deck.draw());
        }, delay+200);
    }

    newGame(reset=true) {
        // stop any timers
        if (this.initTimeout) clearTimeout(this.initTimeout);
        if (this.shuffleTimeout) clearTimeout(this.shuffleTimeout);
        if (this.countTimer) clearInterval(this.countTimer);
        this.drawTimeouts.forEach(tO => clearTimeout(tO));
        this.drawTimeouts = [];
        this.animations = [];
        this.discardPile = [];
        this.currentPlayer = 0;
        this.selectedCardIndex = null;
        this.phase = "draw";
        this.gameOver = false;
        this.winner = null;

        this.players.forEach((p,i) => {
            p.hand = [];
            p.melds = [];
            if (reset) { // reset the players score cards if this is a new game, otherwise keep the scores
                p.scoreCard.reset();
                document.getElementById(`player${i}Scores`).innerHTML = '<div class="scoreValue">0</div>';
            };
        });
        
        this.deck = new Deck();
        this.deal_hands();
        reset && (this.gameStarted = false); // we only want to reset the gameStarted flag if this is a full new game, not a continuation after a round win
    }

    // -----------------------------
    // Utility: positions
    // -----------------------------
    getDiscardPosition() {
        return { x: 490, y: 295 };
    }

    getPlayerCardPosition(index) {
        const x = 50 + index * (this.cardw+10);
        const y = 480;
        return { x, y };
    }

    getStockPosition() {
        return { x: 350, y: 295 };
    }

    // -----------------------------
    // Rendering
    // -----------------------------
    addScoreToTable(player, value, win=false) {
        let container = document.getElementById(`player${player}Scores`);
        if (!container) return;
        let startAt = document.getElementById(`player0Scores`).children[0].innerText*1 || 0;
        container.innerHTML = `<div class="scoreValue" data-to="${value}">${startAt}</div>\n${container.innerHTML}`

        this.addScoreIncrement();
    }
    addScoreIncrement() {
        let div = document.querySelector('[data-to]');
        let to = div.dataset['to']*1;
        let current = div.innerText*1;
        let dist = to-current;
        let mseconds = dist>20 ? 2000 : 1000; // this dist is based on 2 face cards worth 10 points each, so if the score increment is larger than that, we give it more time to animate
        let delay = mseconds/dist;

        this.countTimer = setInterval(()=> {
            div = document.querySelector('[data-to]');
            if (!div) {
                clearInterval(this.countTimer);
                this.countTimer = null;
                return;
            };
            let to = div.dataset['to']*1;
            let current = div.innerText*1;
            current++;
            if (current>=to) {
                current = to;
                div.removeAttribute('data-to');
                clearInterval(this.countTimer);
                this.countTimer = null;
            };

            if (current===100) { div.style.color = 'var(--no) !important'; }
            div.innerText = current;
        }, delay);
    }

    render() {        
        this.render_background();
        this.render_labels();
        this.render_turn_indicator();
        
        // Draw hands
        this.render_hand_player();
        this.render_hand_computer();

        // Draw stock + discard
        this.render_stock_and_discard();

        // If gameOver: Draw game over + winner text
        if (this.gameOver && this.winner) {
            this.render_winner_text();
        };

        this.render_animated_cards();
    }

    render_animated_cards() {
        // Draw animations on top
        const now = performance.now();
        for (let anim of this.animations) {
            const pos = anim.getPosition(now);
            // if the current player is the computer, hide the card face
            const faceUp = this.currentPlayer === 0 || this.phase === "discard" ? true : this.gameOver;
            this.render_card(anim.card, pos.x, pos.y, faceUp);
        };

        // Clean up finished animations
        this.animations = this.animations.filter(anim => {
            if (anim.done) {
                if (anim.onComplete) anim.onComplete();
                return false;
            };
            return true;
        });
    }

    render_background() {
        const ctx = this.ctx;
        // Fill background with texture
        if (this.bgPattern) {
            ctx.fillStyle = this.bgPattern;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        };
    }

    render_card(card, x, y, faceUp=true, scale=1, highlight=false, dim=false) {
        const ctx = this.ctx;
        const w = this.cardw * scale;
        const h = this.cardh * scale;
        const cx = x;
        const cy = y;

        let sPY = this.getStockPosition().y;

        ctx.save();
        if (dim) ctx.globalAlpha = 0.5;

        ctx.translate(cx + (this.cardw - w)/2, cy + (this.cardh - h)/2);
        
        let moving = false;
        if ((y>sPY && y!==480) || (y<sPY && y!==80)) { moving = true; };
        if (moving) { // draw a shadow underneath the moving card to make it clearer that its moving
            ctx.save();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = "black";
            ctx.beginPath();
            ctx.roundRect(5, 5, w, h, 8 * scale);
            ctx.fill();
            ctx.restore();
        };
        if (!card || !faceUp) {
            let grad = this.grad_backofcard;
            ctx.fillStyle = grad;
            ctx.strokeStyle = "#111111";
            ctx.beginPath();
            ctx.roundRect(0, 0, w, h, 8 * scale);
            ctx.fill();
            ctx.stroke();

            // add a black heart on the back of the cards with a white outline offset by a few pixels for visibility
            ctx.font = `${74 * scale}px Arial`;
            ctx.fillStyle = "black";
            ctx.fillText("♥", 20 * scale, 80 * scale);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.strokeText("♥", 20 * scale, 80 * scale);
            ctx.restore();
            return;
        };


        let grad = this.grad_frontofcard;
        ctx.fillStyle = faceUp ? grad : "darkred";
        ctx.strokeStyle = "#444444";
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 8 * scale);
        ctx.fill();
        ctx.stroke();

        if (faceUp) {
            ctx.font = `${82 * scale}px Arial`;
            ctx.fillStyle = "rgba(255,255,255,1)";
            ctx.fillText("♦", 20 * scale, 82 * scale);
            ctx.font = `${74 * scale}px Arial`;
            ctx.fillStyle = "rgba(232,232,232,1)";
            ctx.fillText("♦", 22 * scale, 80 * scale);
            ctx.fillStyle = (card.suit === "♥" || card.suit === "♦") ? "red" : "black";
            ctx.font = `${16 * scale}px Arial`;
            ctx.fillText(card.rank + card.suit, 8 * scale, 24 * scale);
            // opposite corner
            ctx.save();
            ctx.translate(w, h);
            ctx.rotate(Math.PI);
            ctx.fillText(card.rank + card.suit, 8 * scale, 24 * scale);
            ctx.restore();
        };

        if (highlight) {
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(-2, -2, w+4, h+4, 10 * scale);
            ctx.stroke();
        };

        ctx.restore();
    }

    render_hand_computer() {
        let player = this.players[1];
        if (this.gameOver) { // render the computers melds and single cards
            let x = 50; let y = 80;
            player.melds.forEach((meld, i) => {
                meld.forEach(card => {
                    this.render_card(card, x, y, true);
                    x+=35;
                });
                x+=55;
            });

            player.leftoverCards.forEach(card => {
                this.render_card(card, x, y, true);
                x+=35;
            });

            return;
        };

        // Draw computer hand (face down unless game is over)
        player.hand.forEach((c, i)=>{
            let x = 50 + i * 40; let y = 80;
            this.render_card(null, x, y, false);
        });
    }

    render_hand_player() {
        const isYourTurn = (this.currentPlayer === 0 && !this.gameOver);

        // Draw player hand
        this.players[0].hand.forEach((card, i)=>{
            const pos = this.getPlayerCardPosition(i);
            const isSelected = (this.selectedCardIndex === i && !this.isDragging);
            const isTarget = (this.dragTargetIndex === i && this.isDragging);
            const dim = this.gameOver || isYourTurn ? false : true;
            if (this.isDragging && this.dragIndex === i) {
                return;
            };
            this.render_card(card, pos.x, pos.y, true, 1, isSelected || isTarget, dim);
        });

        // Draw dragged card on top
        if (this.isDragging && this.dragCard) {
            const dim = !isYourTurn;
            this.render_card(this.dragCard, this.dragX - this.dragOffsetX, this.dragY - this.dragOffsetY, true, 1.1, false, dim);
        };
    }

    render_labels() {
        const ctx = this.ctx;

        ctx.font = "bold 28px Roboto";
        ctx.fillStyle = "white";
        ctx.strokeStyle = 'black';
        ctx.letterSpacing = "2px";
        ctx.lineWidth = 3;

        let x = 50;

        // Draw labels
        ctx.strokeText("Your Hand", x, 650);
        ctx.fillText("Your Hand", x, 650);

        ctx.strokeText("Computer", x, 50);
        ctx.fillText("Computer", x, 50);

        x = 339;
        ctx.strokeText("STOCK", x, 270);
        ctx.fillText("STOCK", x, 270);

        x = 468;
        ctx.strokeText("DISCARD", x, 270);
        ctx.fillText("DISCARD", x, 270);

        // Draw turn/phase info
        let playerName = this.players[this.currentPlayer].name;
        let phase = this.phase.capitalise();

        x = 50;
        ctx.strokeText("TURN:", x, 350);
        ctx.strokeText("PHASE:", x, 390);
        ctx.fillText("PHASE:", x, 390);
        ctx.fillText("TURN:", x, 350);

        x = 170;
        ctx.strokeText(playerName, x, 350);
        ctx.fillStyle = this.currentPlayer === 0 ? "#52d152" : "orange";
        ctx.fillText(playerName, x, 350);
        ctx.fillStyle = "white";
        ctx.strokeText(phase, x, 390);
        ctx.fillStyle = this.phase === "draw" && this.currentPlayer === 0 ? "#52d152" : "#FF3030";
        ctx.fillText(phase, x, 390);

        
        ctx.fillStyle = "white";
        ctx.letterSpacing = "0px";
        ctx.lineWidth = 2;
    }

    render_stock_and_discard() {
        this.render_card(null, this.getStockPosition().x, this.getStockPosition().y, false);
        this.render_card(this.discardPile[this.discardPile.length-1] || null, this.getDiscardPosition().x, this.getDiscardPosition().y, true);
    }

    render_turn_indicator() {
        const ctx = this.ctx;
        // Draw turn indicator
        let y = this.currentPlayer === 0 ? 640 : 40;
        ctx.save();
        ctx.globalAlpha = this.indicatorOpacity;
        ctx.fillStyle = "green";
        ctx.beginPath();
        ctx.arc(30, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#30ff30";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = "white";
    }

    render_winner_text() {
        const ctx = this.ctx;
        let x = this.winner === this.players[0].name ? 650 : 600;
        let y = 90;
        let yOff = 88;
        ctx.lineWidth = 5;
        ctx.font = "72px Roboto";
        ctx.strokeText(`Rummy!`, 720, y); // Rummy! Shadow
        ctx.strokeText(`${this.winner} wins!`, x, y+yOff); // Winner Shadow
        ctx.lineWidth = 2;
        ctx.fillStyle = this.grad_winner;
        ctx.fillText(`Rummy!`, 720, y); // Rummy! Main
        ctx.fillText(`${this.winner} wins!`, x, y+yOff); // Winner Main
    }

    // -----------------------------
    // Mouse / Input
    // -----------------------------
    cardIndexAtPosition(mx, my) {
        for (let i = 0; i < this.players[0].hand.length; i++) {
            const pos = this.getPlayerCardPosition(i);
            if (mx > pos.x && mx < pos.x + this.cardw && my > pos.y && my < pos.y + this.cardh) {
                return i;
            };
        };
        return null;
    }

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleClick(e) {
        if (this.currentPlayer !== 0 || this.gameOver) return;
        if (this.animations.length > 0) return;
        if (this.isDragging) return;

        const { x: mx, y: my } = this.getMousePos(e);
        
        const dPos = this.getDiscardPosition();
        if (mx > dPos.x && mx < dPos.x + this.cardw && my > dPos.y && my < dPos.y + this.cardh) {
            vars.playCardTurnSoundEffect();
            if (this.phase === "draw" && this.discardPile.length > 0) {
                this.animateDrawFromDiscard();
            } else if (this.phase === "discard" && this.selectedCardIndex !== null) {
                this.animateDiscardFromHand();
                // the game has begun, increment games played for stats tracking
                if (this.gameStarted) return;

                vars.incrementGamesPlayed();
                this.gameStarted = true;
            };
            return;
        };

        const sPos = this.getStockPosition();
        if (mx > sPos.x && mx < sPos.x + this.cardw && my > sPos.y && my < sPos.y + this.cardh) {
            if (this.phase === "draw") {
                vars.playCardTurnSoundEffect();
                this.animateDrawFromStock();
            };
            return;
        };
    }

    handleMouseDown(e) {
        if (this.currentPlayer !== 0 || this.gameOver) return;
        if (this.animations.length > 0) return;

        const { x: mx, y: my } = this.getMousePos(e);
        const index = this.cardIndexAtPosition(mx, my);
        if (index === null) return;

        this.dragIndex = index;
        this.dragCard = this.players[0].hand[index];
        this.dragStartTime = performance.now();
        this.dragX = mx;
        this.dragY = my;

        const pos = this.getPlayerCardPosition(index);
        this.dragOffsetX = mx - pos.x;
        this.dragOffsetY = my - pos.y;

        this.dragHoldTimeout = setTimeout(() => {
            this.isDragging = true;
            this.selectedCardIndex = null;
        }, 150);
    }

    handleMouseMove(e) {
        if (this.currentPlayer !== 0 || this.gameOver) return;
        if (!this.dragCard) return;

        const { x: mx, y: my } = this.getMousePos(e);
        this.dragX = mx;
        this.dragY = my;

        if (this.isDragging) {
            let target = null;
            for (let i = 0; i < this.players[0].hand.length; i++) {
                if (i === this.dragIndex) continue;
                const pos = this.getPlayerCardPosition(i);
                if (mx > pos.x && mx < pos.x + this.cardw) {
                    target = i;
                    break;
                };
            };
            this.dragTargetIndex = target;
        };
    }

    handleMouseUp(e) {
        if (this.dragHoldTimeout) {
            clearTimeout(this.dragHoldTimeout);
            this.dragHoldTimeout = null;
        };

        if (this.isDragging) {
            if (this.dragTargetIndex !== null && this.dragIndex !== null) {
                const hand = this.players[0].hand;
                const card = hand.splice(this.dragIndex, 1)[0];
                let insertIndex = this.dragTargetIndex;
                if (this.dragTargetIndex > this.dragIndex) {
                    insertIndex--;
                };
                hand.splice(insertIndex, 0, card);
            };
            this.isDragging = false;
            this.dragIndex = null;
            this.dragCard = null;
            this.dragTargetIndex = null;
        } else { // highlight players card
            if (this.currentPlayer === 0 && this.phase === "discard" && !this.gameOver) {
                const { x: mx, y: my } = this.getMousePos(e);
                const index = this.cardIndexAtPosition(mx, my);
                if (index !== null) {
                    this.selectedCardIndex = index;
                };
            };
        };
    }

    // -----------------------------
    // Animations for draw/discard
    // -----------------------------
    animateDrawFromStock() {
        const card = this.deck.draw();
        if (!card) return;

        const player = this.players[0];
        const destIndex = player.hand.length - 1;
        const destPos = this.getPlayerCardPosition(destIndex);
        const startPos = this.getStockPosition();
        
        const anim = new CardAnimation(
            card,
            startPos.x,
            startPos.y,
            destPos.x+this.cardw+10,
            destPos.y,
            250,
            () => {
                player.hand.push(card);
                this.phase = "discard";
            }
        );
        this.animations.push(anim);
    }

    animateDrawFromDiscard() {
        if (this.discardPile.length === 0) return;
        const card = this.discardPile.pop();
        const player = this.players[0];
        const destIndex = player.hand.length - 1;
        const destPos = this.getPlayerCardPosition(destIndex);
        const startPos = this.getDiscardPosition();

        const anim = new CardAnimation(
            card,
            startPos.x,
            startPos.y,
            destPos.x+this.cardw+10,
            destPos.y,
            250,
            () => {
                player.hand.push(card);
                this.phase = "discard";
            }
        );
        this.animations.push(anim);
    }

    animateDiscardFromHand() {
        const index = this.selectedCardIndex;
        if (index === null) return;

        const player = this.players[0];
        const card = player.hand[index];
        const startPos = this.getPlayerCardPosition(index);
        const endPos = this.getDiscardPosition();

        const anim = new CardAnimation(
            card,
            startPos.x,
            startPos.y,
            endPos.x,
            endPos.y,
            250,
            () => {
                const discarded = player.discardCard(index);
                this.discardPile.push(discarded);
                this.selectedCardIndex = null;
                this.phase = "draw";
                this.checkRummy(player);
                if (!this.gameOver) this.endTurn();
            }
        );
        this.animations.push(anim);
    }

    // -----------------------------
    // Meld / Rummy Logic
    // -----------------------------

    calculateHandValue(cards) {
        return cards.reduce((sum, card) => {
            // 10, J, Q, K all count as 10 points
            if (card.value >= 10) return sum + 10;
            // All other cards count as their face value (Ace = 1, 2-9 = face value)
            return sum + card.value;
        }, 0);
    }

    canCoverAllWithMelds(hand) {
        const n = hand.length;
        if (n === 0) return true;

        const melds = this.getAllMelds(hand);
        if (melds.length === 0) return false;

        const used = new Array(n).fill(false);

        const backtrack = () => {
            let firstFree = -1;
            for (let i = 0; i < n; i++) { if (!used[i]) { firstFree = i; break; }; };
            if (firstFree === -1) return true;

            for (let m of melds) {
                if (!m.includes(firstFree)) continue;
                let ok = true;
                for (let idx of m) { if (used[idx]) { ok = false; break; } };
                if (!ok) continue;
                for (let idx of m) used[idx] = true;
                if (backtrack()) return true;
                for (let idx of m) used[idx] = false;
            }
            return false;
        };

        return backtrack();
    }

    checkRummy(player) {
        // Use the comprehensive rummy checker
        let rs = this.reallyCheckForRummy(player.hand);
        if (rs.rummy) {
            this.gameOver = true;
            this.winner = player.name;
            player.melds = rs.finalMelds;
            let playerId = this.players.indexOf(player);
            
            // Calculate and draw the loser's hand arrangement
            const loser = this.players.find(p => p.name !== player.name);
            const loserResult = this.reallyCheckForRummy(loser.hand);
            loser.melds = loserResult.finalMelds;
            arraySortByKey(loserResult.leftoverCards,'value');
            loser.leftoverCards = loserResult.leftoverCards;
            loser.leftoverPoints = loserResult.leftoverPoints;
            this.sortMeldsByFirstValue(loser.melds);

            // update the score card and (UI) table
            let totalPoints = player.scoreCard.addRound(loser.leftoverPoints);
            let win = player.scoreCard.checkForWin();
            this.addScoreToTable(playerId, totalPoints, win);
            
            
            // Track statistics
            let showContinueButton = true;
            if (win) { // one of the players have won.
                //console.log(`${player.name} has won the game with ${player.scoreCard.totalPoints} points!`);
                vars.incrementGamesWon();
                // To start a new game now, the player MUST click the new game button.
                showContinueButton = false;
            };
            
            // and show the continue button
            if (showContinueButton) {
                vars.continueButton.show();
                vars.playSoundEffect('applause_short.ogg'); // play short applause sound effect
            } else {
                vars.playSoundEffect('applause.ogg'); // play applause sound effect
            };
            
            return rs.finalMelds;
        };
    }

    findBestMeldCombination(hand) {
        // Get all possible melds (groups and straights, including Aces as high)
        const allMelds = this.getAllPossibleMelds(hand);
        
        // Try all combinations of non-overlapping melds
        let bestResult = {
            melds: [],
            leftoverCards: [...hand],
            leftoverPoints: this.calculateHandValue(hand)
        };
        
        // Use backtracking to find the best combination
        const usedIndices = new Set();
        const currentMelds = [];
        
        const backtrack = (meldIndex) => {
            // Calculate current leftover
            const usedCards = new Set();
            for (let meld of currentMelds) {
                for (let cardIdx of meld.indices) {
                    usedCards.add(cardIdx);
                }
            }
            
            const leftoverCards = hand.filter((_, idx) => !usedCards.has(idx));
            const leftoverPoints = this.calculateHandValue(leftoverCards);
            
            // Update best if this is better
            if (leftoverPoints < bestResult.leftoverPoints) {
                bestResult = {
                    melds: currentMelds.map(m => m.cards),
                    leftoverCards: leftoverCards,
                    leftoverPoints: leftoverPoints
                };
            }
            
            // Try adding more melds
            for (let i = meldIndex; i < allMelds.length; i++) {
                const meld = allMelds[i];
                
                // Check if this meld overlaps with already used cards
                const overlaps = meld.indices.some(idx => usedCards.has(idx));
                if (overlaps) continue;
                
                // Add this meld and recurse
                currentMelds.push(meld);
                backtrack(i + 1);
                currentMelds.pop();
            }
        };
        
        backtrack(0);
        return bestResult;
    }

    findStraightsInSuit(cardsWithIndices, aceAsHigh) {
        const straights = [];
        
        // Adjust Ace values if needed
        const cards = cardsWithIndices.map(c => ({
            card: c.card,
            idx: c.idx,
            value: (aceAsHigh && c.card.value === 1) ? 14 : c.card.value
        }));
        
        cards.sort((a, b) => a.value - b.value);
        
        // Find all possible straights of length 3+
        for (let startIdx = 0; startIdx < cards.length; startIdx++) {
            for (let length = 3; length <= cards.length - startIdx; length++) {
                const candidateCards = cards.slice(startIdx, startIdx + length);
                
                // Check if consecutive
                let isConsecutive = true;
                for (let i = 1; i < candidateCards.length; i++) {
                    if (candidateCards[i].value !== candidateCards[i-1].value + 1) {
                        isConsecutive = false;
                        break;
                    }
                }
                
                if (isConsecutive) {
                    straights.push({
                        cards: candidateCards.map(c => c.card),
                        indices: candidateCards.map(c => c.idx),
                        type: 'straight'
                    });
                }
            }
        }
        
        return straights;
    }

    getAllMelds(hand) {
        const melds = [];
        const n = hand.length;

        // Sets (same rank, 3+)
        const rankMap = {};
        hand.forEach((c, i) => {
            rankMap[c.rank] = rankMap[c.rank] || [];
            rankMap[c.rank].push(i);
        });
        for (let r in rankMap) {
            const idxs = rankMap[r];
            if (idxs.length >= 3) {
                melds.push(idxs.slice());
            }
        }

        // Runs (same suit, consecutive, 3+)
        const suitMap = {};
        hand.forEach((c, i) => {
            suitMap[c.suit] = suitMap[c.suit] || [];
            suitMap[c.suit].push({ idx: i, value: c.value });
        });
        for (let s in suitMap) {
            const arr = suitMap[s].sort((a,b)=>a.value-b.value);
            let start = 0;
            for (let i = 1; i <= arr.length; i++) {
                if (i === arr.length || arr[i].value !== arr[i-1].value + 1) {
                    const len = i - start;
                    if (len >= 3) {
                        const runIdxs = arr.slice(start, i).map(o=>o.idx);
                        melds.push(runIdxs);
                    }
                    start = i;
                }
            }
        }

        return melds;
    }

    getAllPossibleMelds(hand) {
        const melds = [];
        
        // 1. Find all possible groups (3 or 4 of same rank)
        const rankMap = {};
        hand.forEach((card, idx) => {
            if (!rankMap[card.rank]) rankMap[card.rank] = [];
            rankMap[card.rank].push({ card, idx });
        });
        
        for (let rank in rankMap) {
            const cards = rankMap[rank];
            if (cards.length >= 3) {
                // Add group of 3
                for (let i = 0; i < cards.length - 2; i++) {
                    for (let j = i + 1; j < cards.length - 1; j++) {
                        for (let k = j + 1; k < cards.length; k++) {
                            melds.push({
                                cards: [cards[i].card, cards[j].card, cards[k].card],
                                indices: [cards[i].idx, cards[j].idx, cards[k].idx],
                                type: 'group'
                            });
                        }
                    }
                }
            }
            if (cards.length === 4) {
                // Add group of 4
                melds.push({
                    cards: cards.map(c => c.card),
                    indices: cards.map(c => c.idx),
                    type: 'group'
                });
            }
        }
        
        // 2. Find all possible straights (3+ consecutive cards of same suit)
        // Try both Aces as low (value 1) and high (value 14)
        const suits = ["♥", "♦", "♣", "♠"];
        
        for (let suit of suits) {
            const cardsInSuit = hand
                .map((card, idx) => ({ card, idx }))
                .filter(c => c.card.suit === suit);
            
            if (cardsInSuit.length < 3) continue;
            
            // Try with Aces as low (normal)
            this.findStraightsInSuit(cardsInSuit, false).forEach(meld => melds.push(meld));
            
            // Try with Aces as high (for Q-K-A)
            this.findStraightsInSuit(cardsInSuit, true).forEach(meld => melds.push(meld));
        }
        
        return melds;
    }

    isValidStraight(cards) {
        // Check if cards form a valid consecutive sequence
        if (cards.length < 3) return false;
        
        const sorted = [...cards].sort((a, b) => a.value - b.value);
        const suit = sorted[0].suit;
        
        // All cards must be same suit
        if (!sorted.every(c => c.suit === suit)) return false;
        
        // All cards must be consecutive
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].value !== sorted[i - 1].value + 1) {
                return false;
            };
        };
        
        return true;
    }

    reallyCheckForRummy(hand) {
        // Find the best possible meld combination (lowest leftover points)
        const result = this.findBestMeldCombination(hand);
        
        // If leftover points are 0, it's rummy
        if (result.leftoverPoints === 0) {
            return { rummy: true, finalMelds: result.melds, leftoverCards: [], leftoverPoints: 0 };
        };
        
        // Otherwise return the best grouping found
        return { rummy: false, finalMelds: result.melds, leftoverCards: result.leftoverCards, leftoverPoints: result.leftoverPoints };
    }

    reorderCardsIntoMelds(player, melds) {
        // Flatten melds into a new hand order
        let newHand = [];
        for (let meld of melds) {
            newHand.push(...meld);
        }
        player.hand = newHand;
    }

    sortMeldsByFirstValue(melds) {
        return melds.sort((a, b) => {
            const aValue = a[0]?.value ?? Infinity;
            const bValue = b[0]?.value ?? Infinity;
            return aValue - bValue;
        });
    }

    tryBorrowFromGroups(incompleteStraight, groups, suit) {
        // Try to complete a straight by borrowing cards from groups
        let result = [...incompleteStraight];
        result.sort((a, b) => a.value - b.value);
        
        let minVal = result[0].value;
        let maxVal = result[result.length - 1].value;
        let borrowedFrom = []; // Track which groups we borrowed from
        
        // Try to fill gaps
        for (let val = minVal; val <= maxVal; val++) {
            if (!result.find(c => c.value === val)) {
                // Need this value
                let groupIndex = groups.findIndex(g => g[0].value === val && g.length > 3);
                if (groupIndex !== -1) {
                    let cardIndex = groups[groupIndex].findIndex(c => c.suit === suit);
                    if (cardIndex !== -1) {
                        result.push(groups[groupIndex][cardIndex]);
                        groups[groupIndex].splice(cardIndex, 1);
                        borrowedFrom.push(groupIndex);
                    } else {
                        return null; // Can't complete the straight
                    }
                } else {
                    return null; // Can't complete the straight
                }
            }
        }
        
        // Check if all groups we borrowed from are still valid (length >= 3)
        for (let i of borrowedFrom) {
            if (groups[i].length < 3) {
                // We broke a group, fail
                return null;
            }
        }
        
        result.sort((a, b) => a.value - b.value);
        return result;
    }

    tryBorrowFromStraights(incompleteGroup, straights) {
        // Try to complete a group by borrowing cards from straights
        let result = [...incompleteGroup];
        let neededValue = result[0].value;
        let neededCount = 3 - result.length;
        let borrowedFrom = []; // Track which straights we borrowed from
        
        for (let i = 0; i < straights.length && neededCount > 0; i++) {
            let straight = straights[i];
            if (straight.length > 3) {
                let cardIndex = straight.findIndex(c => c.value === neededValue);
                if (cardIndex !== -1) {
                    result.push(straight[cardIndex]);
                    straight.splice(cardIndex, 1);
                    neededCount--;
                    borrowedFrom.push(i);
                };
            };
        };
        
        // Check if we successfully formed a group AND all straights we borrowed from are still valid
        if (result.length >= 3) {
            for (let i of borrowedFrom) {
                if (!this.isValidStraight(straights[i])) {
                    // We broke a straight, fail
                    return null;
                };
            };
            return result;
        };
        
        return null;
    }

    tryGroupsFirstThenStraights(hand) {
        const rs = { rummy: false, finalMelds: [] };
        
        // Group cards by rank
        let groups = [];
        let singles = [];
        
        for (let i = 1; i <= 13; i++) {
            let allI = hand.filter(h => h.value === i);
            if (allI.length >= 3) {
                groups.push(allI);
            } else if (allI.length > 0) {
                singles.push(...allI);
            }
        }
        
        // If no singles, we have all groups - that's rummy
        if (singles.length === 0) {
            rs.rummy = true;
            rs.finalMelds = groups;
            return rs;
        }
        
        // Try to make straights from singles
        let suits = ["♥", "♦", "♣", "♠"];
        let straights = [];
        
        for (let suit of suits) {
            let cardsInSuit = singles.filter(c => c.suit === suit);
            if (cardsInSuit.length === 0) continue;
            
            cardsInSuit.sort((a, b) => a.value - b.value);
            
            // Try to form straights of length 3+
            let i = 0;
            while (i < cardsInSuit.length) {
                let straight = [cardsInSuit[i]];
                let j = i + 1;
                
                while (j < cardsInSuit.length && cardsInSuit[j].value === cardsInSuit[j-1].value + 1) {
                    straight.push(cardsInSuit[j]);
                    j++;
                }
                
                if (straight.length >= 3) {
                    straights.push(straight);
                    i = j;
                } else {
                    // Not enough for a straight, try to borrow from groups
                    let borrowed = this.tryBorrowFromGroups(straight, groups, suit);
                    if (borrowed && borrowed.length >= 3) {
                        straights.push(borrowed);
                    } else {
                        // Can't make a straight
                        return rs;
                    }
                    i = j;
                }
            }
        }
        
        // Count total cards
        let totalCards = 0;
        for (let group of groups) {
            totalCards += group.length;
        }
        for (let straight of straights) {
            totalCards += straight.length;
        }
        
        if (totalCards === 10) {
            rs.rummy = true;
            rs.finalMelds = [...groups, ...straights];
        }
        
        return rs;
    }

    tryStraightsFirstThenGroups(hand) {
        const rs = { rummy: false, finalMelds: [] };
        
        // Group cards by suit and try to form straights
        let suits = ["♥", "♦", "♣", "♠"];
        let straights = [];
        let remainingCards = [];
        
        for (let suit of suits) {
            let cardsInSuit = hand.filter(c => c.suit === suit);
            if (cardsInSuit.length === 0) continue;
            
            cardsInSuit.sort((a, b) => a.value - b.value);
            
            let i = 0;
            while (i < cardsInSuit.length) {
                let straight = [cardsInSuit[i]];
                let j = i + 1;
                
                while (j < cardsInSuit.length && cardsInSuit[j].value === straight[straight.length - 1].value + 1) {
                    straight.push(cardsInSuit[j]);
                    j++;
                }
                
                if (straight.length >= 3) {
                    straights.push(straight);
                } else {
                    remainingCards.push(...straight);
                }
                i = j;
            }
        }
        
        // Try to form groups from remaining cards
        let groups = [];
        for (let i = 1; i <= 13; i++) {
            let allI = remainingCards.filter(h => h.value === i);
            if (allI.length >= 3) {
                groups.push(allI);
            } else if (allI.length > 0) {
                // Try to borrow from straights to complete the group
                let borrowed = this.tryBorrowFromStraights(allI, straights);
                if (borrowed && borrowed.length >= 3) {
                    groups.push(borrowed);
                } else {
                    // Can't form a group with these cards
                    return rs;
                }
            }
        }
        
        // Count total cards
        let totalCards = 0;
        for (let group of groups) {
            totalCards += group.length;
        }
        for (let straight of straights) {
            totalCards += straight.length;
        }
        
        if (totalCards === 10) {
            rs.rummy = true;
            rs.finalMelds = [...straights, ...groups];
        }
        
        return rs;
    }

    tryWithAcesHigh(hand) {
        // Create a modified hand where Aces can be high (value 14) for Q-K-A straights
        const rs = { rummy: false, finalMelds: [] };
        
        // Try creating straights with Aces as 14
        let suits = ["♥", "♦", "♣", "♠"];
        let straights = [];
        let remainingCards = [];
        
        for (let suit of suits) {
            let cardsInSuit = hand.filter(c => c.suit === suit);
            if (cardsInSuit.length === 0) continue;
            
            // Separate Aces from other cards
            let aceCard = cardsInSuit.find(c => c.value === 1);
            let nonAces = cardsInSuit.filter(c => c.value !== 1);
            nonAces.sort((a, b) => a.value - b.value);
            
            // Try to attach Ace as high (after King) to make a straight
            let usedAce = false;
            if (aceCard && nonAces.length > 0) {
                // Check if we have cards ending with King
                if (nonAces[nonAces.length - 1].value === 13) {
                    // Find the start of the sequence ending with King
                    let seqEnd = nonAces.length - 1;
                    let seqStart = seqEnd;
                    while (seqStart > 0 && nonAces[seqStart - 1].value === nonAces[seqStart].value - 1) {
                        seqStart--;
                    }
                    // If the sequence is at least 2 cards (will be 3+ with Ace), add the Ace as high
                    if (seqEnd - seqStart + 1 >= 2) {
                        let straight = nonAces.slice(seqStart, seqEnd + 1);
                        straight.push(aceCard); // Add Ace as high (after King)
                        straights.push(straight);
                        nonAces = nonAces.slice(0, seqStart);
                        usedAce = true;
                    }
                }
            }
            
            // Process remaining cards normally
            let i = 0;
            while (i < nonAces.length) {
                let straight = [nonAces[i]];
                let j = i + 1;
                
                while (j < nonAces.length && nonAces[j].value === straight[straight.length - 1].value + 1) {
                    straight.push(nonAces[j]);
                    j++;
                }
                
                if (straight.length >= 3) {
                    straights.push(straight);
                } else {
                    remainingCards.push(...straight);
                }
                i = j;
            }
            
            // Add unused Ace to remaining cards
            if (aceCard && !usedAce) {
                remainingCards.push(aceCard);
            }
        }
        
        // Try to form groups from remaining cards
        let groups = [];
        let unmatchedCards = [];
        
        for (let i = 1; i <= 13; i++) {
            let allI = remainingCards.filter(h => h.value === i);
            if (allI.length >= 3) {
                groups.push(allI);
            } else if (allI.length > 0) {
                unmatchedCards.push(...allI);
            }
        }
        
        // Check if we have unmatched cards
        if (unmatchedCards.length > 0) {
            return rs;
        }
        
        // Count total cards
        let totalCards = 0;
        for (let group of groups) {
            totalCards += group.length;
        }
        for (let straight of straights) {
            totalCards += straight.length;
        }
        
        if (totalCards === 10) {
            rs.rummy = true;
            rs.finalMelds = [...straights, ...groups];
        }
        
        return rs;
    }

    // -----------------------------
    // Turn Logic + Smarter AI
    // -----------------------------
    cardHelpsMelds(hand, card) {
        const temp = hand.slice();
        temp.push(card);
        const before = this.getAllMelds(hand).length;
        const after = this.getAllMelds(temp).length;
        return after > before;
    }

    chooseDiscardIndex(hand) {
        const melds = this.getAllMelds(hand);
        const inMeld = new Array(hand.length).fill(false);
        for (let m of melds) {
            for (let idx of m) inMeld[idx] = true;
        }

        let candidates = [];
        for (let i = 0; i < hand.length; i++) {
            if (!inMeld[i]) candidates.push(i);
        }
        if (candidates.length === 0) {
            candidates = [...Array(hand.length).keys()];
        }

        candidates.sort((a,b)=>hand[a].value - hand[b].value);
        return candidates[0];
    }

    computerTurn() {
        if (this.gameOver) return;
        const cpu = this.players[1];

        const top = this.discardPile[this.discardPile.length-1];
        if (top && this.cardHelpsMelds(cpu.hand, top)) {
            cpu.drawCard(this.discardPile.pop(), 500);
            // animate draw from discard
            const startPos = this.getDiscardPosition();
            const destPos = { x: 9 * 50, y: 80 };
            const anim = new CardAnimation(
                top,
                startPos.x,
                startPos.y,
                destPos.x,
                destPos.y,
                500
            );
            this.animations.push(anim);
        } else {
            cpu.drawCard(this.deck.draw(), 500);
            // animate draw from stock
            const drawnCard = cpu.hand[cpu.hand.length - 1];
            const startPos = this.getStockPosition();
            const destPos = { x: 9 * 50, y: 80 };
            const anim = new CardAnimation(
                drawnCard,
                startPos.x,
                startPos.y,
                destPos.x,
                destPos.y,
                500
            );
            this.animations.push(anim);
        };

        setTimeout(() => {
            const discardIndex = this.chooseDiscardIndex(cpu.hand);
            const discarded = cpu.discardCard(discardIndex);
            // animate discard
            this.phase = "discard";
            const startPos = { x: discardIndex * 40, y: 80 };
            const endPos = this.getDiscardPosition();
            const anim = new CardAnimation(
                discarded,
                startPos.x,
                startPos.y,
                endPos.x,
                endPos.y,
                500
            );
            this.animations.push(anim);
            
            setTimeout(()=> {
                this.discardPile.push(discarded);

                const finalMelds = this.checkRummy(cpu);
                if (this.gameOver) {
                    if (finalMelds) {
                        this.reorderCardsIntoMelds(cpu, finalMelds);
                    };
                    return;
                }

                this.nextPlayersTurn();
            }, 500);
        }, 600);
    }

    endTurn() {
        if (this.gameOver) return;
        this.nextPlayersTurn();
        setTimeout(()=>this.computerTurn(), 600);
    }

    findWorstCard(player) {
        return this.chooseDiscardIndex(player.hand);
    }

    isUseful(player, card) {
        return this.cardHelpsMelds(player.hand, card);
    }

    nextPlayersTurn() {
        // check if the deck has been emptied, if so move all but the last card from discard to deck
        let delay = 0;
        if (this.deck.cards.length === 0) {
            const lastDiscard = this.discardPile.pop();
            this.deck.cards = this.discardPile;
            this.deck.shuffle();
            this.discardPile = [lastDiscard];
            // pick a random shuffle sound effect
            delay = vars.playShuffleSoundEffect();
            console.log(`Moving discard pile back to deck. Deck Size: ${this.deck.cards.length}, Discard Size:${this.discardPile.length}`);
        };
        
        setTimeout(() => {
            this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
            this.phase = "draw";
        }, delay);
    }



    // -----------------------------
    // Main Loop
    // -----------------------------
    loop(currentTime = 0) {
        const deltaTime = currentTime - this.lastFrameTime;
        
        // Only render if enough time has passed (60fps)
        if (deltaTime >= this.frameInterval) {
            this.egoHue+=this.egoHueInc; this.egoHue %= 360;
            this.egoColour = `hsl(${this.egoHue}, 100%, 50%)`;
            this.welcomeText.style.color = this.egoColour;

            this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
            
            // Animate turn indicator
            this.indicatorOpacity += this.indicatorDirection * this.indicatorFadeSpeed;
            if (this.indicatorOpacity <= 0.2) {
                this.indicatorOpacity = 0.2;
                this.indicatorDirection = 1;
            } else if (this.indicatorOpacity >= 1) {
                this.indicatorOpacity = 1;
                this.indicatorDirection = -1;
            };
            
            this.render();
        };
        
        requestAnimationFrame((time)=>this.loop(time));
    }
};