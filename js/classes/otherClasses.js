class Card {
    constructor(suit, rank, value) {
        this.suit = suit;
        this.rank = rank;
        this.value = value;
    }
};

class CardAnimation {
    constructor(card, startX, startY, endX, endY, duration, onComplete=null) {
        this.card = card;
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
        this.duration = duration;
        this.startTime = performance.now();
        this.onComplete = onComplete;
        this.done = false;
    }

    easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    getPosition(now) {
        let t = (now - this.startTime) / this.duration;
        if (t >= 1) {
            this.done = true;
            t = 1;
        }
        const e = this.easeOut(t);
        return {
            x: this.startX + (this.endX - this.startX) * e,
            y: this.startY + (this.endY - this.startY) * e
        };
    }
};

class Deck {
    constructor() {
        this.cards = [];
        const suits = ["♠", "♥", "♦", "♣"];
        const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
        ranks.forEach((r,i)=>{
            suits.forEach(s=>{
                this.cards.push(new Card(s, r, i+1));
            });
        });
        this.shuffle();
    }

    draw() {
        return this.cards.pop() || null;
    }

    shuffle() {
        //vars.playShuffleSoundEffect();

        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        };
    }
};

class Player {
    constructor(name, isComputer=false) {
        this.name = name;
        this.hand = [];
        this.isComputer = isComputer;
        this.melds = [];
        this.leftoverCards = [];
        this.leftoverPoints = 0;

        this.scoreCard = new ScoreCard(name);
    }

    discardCard(index) {
        vars.playCardTurnSoundEffect();
        return this.hand.splice(index, 1)[0];
    }
    
    drawCard(card, delayDraw=0) {
        vars.playCardTurnSoundEffect(this.isComputer ? 5 : 3);
        if (card) {
            setTimeout(() => {
                this.hand.push(card);
            }, delayDraw);
        };
    }
};

class ScoreCard {
    constructor(playerName) {
        this.playerName = playerName;
        this.totalPoints = 0;
        this.pointForWin = 100;
        this.rounds = [];
    }
    addRound(points) {
        this.rounds.push(points);
        this.totalPoints += points;
        return this.totalPoints;
    }
    checkForWin() {
        return this.totalPoints >= this.pointForWin;
    }
    reset() {
        this.totalPoints = 0;
        this.rounds = [];
    }
};