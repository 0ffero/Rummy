const vars = {
    version: '1.0.4',
    DEBUG: false,

    continueButton: null,

    loadingScreen: document.getElementById('loadingScreenContainer'),
    game: null,
    audioContext: null, // single audio context for all sounds
    soundEffects: [], // will hold decoded audio buffers for sound effects
    textures: {
        ground: [],
        table: [],
        currentGroundIndex: 0,
        currentTableIndex: 0
    },
    init: async ()=> {
        // Wait for textures and sound effects to load before starting game
        await vars.loadSoundEffects();
        await vars.loadTextures();

        const canvas = document.getElementById("game");
        vars.initEventListeners();
        vars.initEventListenersKeyboard();
        vars.animateLoadingText();
        
        // Animate welcome text (continuously)
        const welcomeText = document.getElementById('welcomeText');
        vars.animateText(welcomeText);

        vars.popup04 = new popup04();

        vars.initSaveIcon();
        vars.initScoreContainer();
        vars.initContinueButton();
        vars.initVolumeControl();

        

        
        // -----------------------------
        // Start Game
        // -----------------------------
        // start game with saved or first table texture
        const firstTableTexture = vars.textures.table.length > 0 ? vars.textures.table[vars.textures.currentTableIndex] : null;
        vars.game = new RummyGame(canvas, firstTableTexture);
    },

    // Initialisation Functions
    initEventListeners: ()=> {
        window.addEventListener('resize', ()=> {
            vars.initScoreContainer();
            vars.updateContinueButtonPosition();
        });

        document.addEventListener('selectstart', function(e) {
            e.preventDefault();
            return false;
        });
        // initialise buttons
        document.getElementById("newGameButton").addEventListener("click", ()=>{
            if (vars.game.gameOver) {
                vars.game.newGame();
                return;
            };
            
            vars.showConfirmNewGame(true);
        });
        // make sure the user cant accidentally highlight the text on the New Game button
        document.getElementById("newGameButton").addEventListener("mousedown", (e)=>{
            e.preventDefault();
        });

        document.getElementById("newGameNo").addEventListener("click", ()=>{
            vars.showConfirmNewGame(false);
        });
        document.getElementById("newGameYes").addEventListener("click", ()=>{
            vars.showConfirmNewGame(false);
            vars.game.newGame();
        });

        document.getElementById("playerStatsButton").addEventListener("click", ()=>{
            vars.showPlayerStats(true);
        });
        document.getElementById("closeStatsButton").addEventListener("click", ()=>{
            vars.showPlayerStats(false);
        });

        document.getElementById("infoButton").addEventListener("click", ()=>{
            vars.playSoundEffect('pageFlip.ogg');
            document.getElementById('infoContainer').classList.add('active');
        });
        document.getElementById("closeInfoButton").addEventListener("click", ()=>{
            vars.playSoundEffect('pageFlip.ogg');
            document.getElementById('infoContainer').classList.remove('active');
        });

        document.getElementById("resetStatsButton").addEventListener("click", ()=>{
            if (confirm("Are you sure you want to reset your statistics?\nThis cannot be undone.\n\nAny current game will also be reset.")) {
                vars.localStorageResetStats();
                vars.game.newGame(true);
            };
        });
    },
    initEventListenersKeyboard: ()=> {
        // Keyboard events for texture cycling
        document.addEventListener('keydown', (e) => {
            let showSaveIcon = false;
            let textureName = '';
            switch (e.key) {
                case '1': textureName = vars.cycleGroundTexture(); showSaveIcon = true; break;
                case '2': textureName = vars.cycleTableTexture(); showSaveIcon = true; break;
                // changes the deal speed from Fast 200ms, Medium 250ms, Slow 333ms
                case '3': vars.changeDealSpeed(); showSaveIcon = true; break;
                case 'ArrowRight': textureName = vars.getNextGroundTexture(); showSaveIcon = true; break;
                case 'ArrowLeft': textureName = vars.getPreviousGroundTexture(); showSaveIcon = true; break;
                case 'ArrowUp': textureName = vars.getNextTableTexture(); showSaveIcon = true; break;
                case 'ArrowDown': textureName = vars.getPreviousTableTexture(); showSaveIcon = true; break;
                default:
                    //console.log(e.key);
                break;
            };

            showSaveIcon && vars.saveIcon.show();
            textureName && vars.popup04.showMessage(`Texture changed: ${textureName.split('/').pop()}`); // show just the filename in the message
        });
    },

    initContinueButton: ()=> {
        vars.updateContinueButtonPosition();

        vars.continueButton.addEventListener('click', () => {
            if (vars.game && vars.game.gameOver) {
                vars.game.newGame(false); // start new game but dont reset scores
                vars.continueButton.classList.remove('active');
                vars.playSoundEffect('pageFlip.ogg');
            };
        });

        vars.continueButton.show = () => {
            vars.continueButton.classList.add('active');
        };
    },

    initSaveIcon: ()=> {
        const saveIcon = vars.saveIcon = document.getElementById('saveIcon');
        saveIcon.timeout = null;
        saveIcon.show = (duration=2000) => {
            saveIcon.classList.add('active');
            if (saveIcon.timeout) {
                clearTimeout(saveIcon.timeout);
            };
            saveIcon.timeout = setTimeout(() => {
                saveIcon.classList.remove('active');
            }, duration);
        };
    },

    initScoreContainer: ()=> {
        let gameDiv = document.getElementById('game');
        let gameDivPos = vars.gameCanvasPosition = gameDiv.getBoundingClientRect();
        let scoreContainer = document.getElementById('scoreContainer');
        scoreContainer.style.left = `${gameDivPos.x+gameDivPos.width-83}px`;
        scoreContainer.style.top = `${gameDivPos.y+gameDivPos.height/2-20}px`;
    },

    initVolumeControl: ()=> {
        // position the volume pop up just above the New Game confirmation pop up
        let volButton = document.getElementById('volumeButton');
        let pos = volButton.getBoundingClientRect();
        let x = pos.x + pos.width / 2;
        let y = pos.y - 10; // 10px above the button
        let div = document.getElementById('volumePopUpContainer');
        div.style.top = `${y}px`;
        div.style.left = `${x}px`;
        volButton.addEventListener('click', () => {
            div.classList.toggle('active');
        });

        // get the volume slider
        let slider = vars.volumeSlider = document.getElementById('volumeSlider');
        let volumeValue = document.getElementById('volumeValue');
        // load saved volume from localStorage or default to 1
        let savedVolume = parseFloat(localStorage.getItem('rmy_volume')) || 1;
        slider.value = savedVolume;
        volumeValue.textContent = `${Math.round(savedVolume * 100)}%`;
        // update volume in localStorage when slider changes
        slider.addEventListener('change', () => {
            let volume = parseFloat(slider.value);
            localStorage.setItem('rmy_volume', volume);
            // show the save icon
            vars.saveIcon.show();
        });
        slider.addEventListener('input', () => {
            let volume = parseFloat(slider.value);
            volumeValue.textContent = `${Math.round(volume * 100)}%`;
        });
    },

    loadSoundEffects: async () => {
        // Create a single AudioContext for all sounds
        vars.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        let soundFiles = [
            'applause.ogg', // used when a player wins the game
            'applause_short.ogg', // used in between rounds
            'cardTurn1.ogg',
            'cardTurn2.ogg',
            'cardTurn3.ogg',
            'cardTurn4.ogg',
            'cardTurn5.ogg',
            'cardTurn6.ogg',
            'lockClick.ogg',
            'pageFlip.ogg',
            'shuffle1.ogg',
            'shuffle2.ogg'
        ];

        for (let file of soundFiles) {
            const response = await fetch(`audio/${file}`);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await vars.audioContext.decodeAudioData(arrayBuffer);
            vars.soundEffects[file] = audioBuffer;
        };
    },

    loadTextures: async () => {
        try {
            const response = await fetch('getTextures.php');
            const data = await response.json();
            vars.textures.ground = data.ground;
            vars.textures.table = data.table;
            
            // Restore saved texture indices from localStorage
            const savedGroundIndex = localStorage.getItem('rmy_groundTextureIndex');
            const savedTableIndex = localStorage.getItem('rmy_tableTextureIndex');
            
            if (savedGroundIndex !== null) {
                const index = parseInt(savedGroundIndex);
                if (index >= 0 && index < data.ground.length) {
                    vars.textures.currentGroundIndex = index;
                };
            };
            
            if (savedTableIndex !== null) {
                const index = parseInt(savedTableIndex);
                if (index >= 0 && index < data.table.length) {
                    vars.textures.currentTableIndex = index;
                };
            };
            
            // Set ground texture (either saved or first one)
            if (data.ground.length > 0) {
                document.getElementById('gameContainer').style.backgroundImage = `url(${data.ground[vars.textures.currentGroundIndex]})`;
            };
        } catch (error) {
            console.error('Error loading textures:', error);
        };
    },





    animateLoadingText: () => {
        const loadingText = document.getElementById('loadingScreenText');
        vars.animateText(loadingText, 3500); // Stop animation after loading screen fades out (2500ms delay + 1000ms fade)
    },

    animateText: (element, duration = null) => {
        const html = element.innerHTML;
        
        // Clear existing content
        element.innerHTML = '';
        const letters = [];
        
        // Split by <br/> or <br> tags to handle line breaks
        const lines = html.split(/<br\s*\/?>/i);
        
        lines.forEach((line, lineIndex) => {
            // Split each line into characters
            line.split('').forEach((char) => {
                const span = document.createElement('span');
                span.textContent = char;
                span.className = 'loadingScreenLetter';
                element.appendChild(span);
                letters.push(span);
            });
            
            // Add line break after each line except the last
            if (lineIndex < lines.length - 1) {
                element.appendChild(document.createElement('br'));
            }
        });
        
        let startTime = Date.now();
        let animating = true;
        
        const animate = () => {
            if (!animating) return;
            
            const elapsed = (Date.now() - startTime) / 1000; // time in seconds
            
            letters.forEach((letter, index) => {
                const offset = index * 0.1 * -1; // offset each letter by 0.1 seconds
                const y = Math.sin((elapsed + offset) * 3) * 20; // sine wave with an amplitude of 20px
                letter.style.transform = `translateY(${y}px)`;
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
        
        // Stop animation after specified duration if provided
        if (duration !== null) {
            setTimeout(() => {
                animating = false;
            }, duration);
        }
    },

    changeDealSpeed: () => {
        const dealSpeed = vars.getDealSpeed();
        let newSpeed;
        let speedText;
        switch (dealSpeed) {
            case 100: newSpeed = 200; speedText = 'Fast'; break;
            case 200: newSpeed = 333; speedText = 'Medium'; break;
            case 333: newSpeed = 500; speedText = 'Slow'; break;
            case 500: default: newSpeed = 100; speedText = 'Fastest'; break;
        };
        localStorage.setItem('rmy_dealSpeed', newSpeed);
        vars.popup04.showMessage(`Deal speed set to ${speedText}`);
    },

    getNextGroundTexture: () => {
        if (vars.textures.ground.length === 0) return null;
        const nextIndex = (vars.textures.currentGroundIndex + 1) % vars.textures.ground.length;
        vars.textures.currentGroundIndex = nextIndex;
        // save to localStorage so that it persists on page reload
        localStorage.setItem('rmy_groundTextureIndex', nextIndex);
        const texture = vars.textures.ground[vars.textures.currentGroundIndex];
        document.getElementById('gameContainer').style.backgroundImage = `url(${texture})`;
        return texture;
    },

    getPreviousGroundTexture: () => {
        if (vars.textures.ground.length === 0) return null;
        const prevIndex = (vars.textures.currentGroundIndex - 1 + vars.textures.ground.length) % vars.textures.ground.length;
        vars.textures.currentGroundIndex = prevIndex;
        // save to localStorage so that it persists on page reload
        localStorage.setItem('rmy_groundTextureIndex', prevIndex);
        const texture = vars.textures.ground[vars.textures.currentGroundIndex];
        document.getElementById('gameContainer').style.backgroundImage = `url(${texture})`;
        return texture;
    },

    cycleGroundTexture: () => {
        if (vars.textures.ground.length === 0) return;
        vars.textures.currentGroundIndex = (vars.textures.currentGroundIndex + 1) % vars.textures.ground.length;
        const texture = vars.textures.ground[vars.textures.currentGroundIndex];
        document.getElementById('gameContainer').style.backgroundImage = `url(${texture})`;
        localStorage.setItem('rmy_groundTextureIndex', vars.textures.currentGroundIndex);
        return texture;
    },

    cycleTableTexture: () => {
        if (vars.textures.table.length === 0) return;
        vars.textures.currentTableIndex = (vars.textures.currentTableIndex + 1) % vars.textures.table.length;
        const texture = vars.textures.table[vars.textures.currentTableIndex];
        if (vars.game && vars.game.loadTableTexture) {
            vars.game.loadTableTexture(texture);
        };
        localStorage.setItem('rmy_tableTextureIndex', vars.textures.currentTableIndex);
        return texture;
    },

    getNextTableTexture: () => {
        if (vars.textures.table.length === 0) return null;
        const nextIndex = (vars.textures.currentTableIndex + 1) % vars.textures.table.length;
        vars.textures.currentTableIndex = nextIndex;
        // save to localStorage so that it persists on page reload
        localStorage.setItem('rmy_tableTextureIndex', nextIndex);
        if (vars.game && vars.game.loadTableTexture) {
            vars.game.loadTableTexture(vars.textures.table[nextIndex]);
        };
        return vars.textures.table[nextIndex];
    },
    getPreviousTableTexture: () => {
        if (vars.textures.table.length === 0) return null;
        const prevIndex = (vars.textures.currentTableIndex - 1 + vars.textures.table.length) % vars.textures.table.length;
        vars.textures.currentTableIndex = prevIndex;
        // save to localStorage so that it persists on page reload
        localStorage.setItem('rmy_tableTextureIndex', prevIndex);
        if (vars.game && vars.game.loadTableTexture) {
            vars.game.loadTableTexture(vars.textures.table[prevIndex]);
        };
        return vars.textures.table[prevIndex];
    },

    getDealSpeed: () => {
        return parseInt(localStorage.getItem('rmy_dealSpeed') || 333);
    },

    hideLoadingScreen: ()=> {
        vars.loadingScreen.classList.add('fadeOut');
    },

    localStorageResetStats: ()=> {
        localStorage.removeItem('rmy_gamesPlayed');
        localStorage.removeItem('rmy_gamesWon');
        vars.updatePlayerStats(); // the reset button is on the stats screen, so update stats after reset
    },

    playCardTurnSoundEffect: (which=null) => {
        const cardTurnSound = !which ? `cardTurn${Math.floor(Math.random() * 6) + 1}.ogg` : `cardTurn${which}.ogg`;
        vars.playSoundEffect(cardTurnSound);
    },

    playShuffleSoundEffect: () => {
        const shuffleSound = `shuffle${Math.floor(Math.random() * 2) + 1}.ogg`;
        let delay = vars.playSoundEffect(shuffleSound);
        return delay;
    },

    playSoundEffect: (name) => {
        //console.log(`%cPlaying sound effect: ${name}`, "color: #17b6c2;");
        !name.endsWith('.ogg') && (name += '.ogg');
        const audioBuffer = vars.soundEffects[name];
        if (audioBuffer) {
            const source = vars.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            // set to the saved volume
            const savedVolume = parseFloat(localStorage.getItem('rmy_volume')) || 1;
            const gainNode = vars.audioContext.createGain();
            gainNode.gain.value = savedVolume;
            source.connect(gainNode);
            gainNode.connect(vars.audioContext.destination);

            source.start(0);

            return audioBuffer.duration * 1000; // return duration in milliseconds
        } else {
            console.warn(`Sound effect "${name}" not found.`);
        };
    },

    showConfirmNewGame: (show=true)=> {
        let div = document.getElementById('newGameYesNoContainer');
        show ? div.classList.add('active') : div.classList.remove('active');
    },

    updateContinueButtonPosition: ()=> {
        let canvasPosition = vars.gameCanvasPosition;
        let button = vars.continueButton = document.getElementById('continueButton');
        button.style.left = `${canvasPosition.x + canvasPosition.width / 2}px`;
        button.style.top = `${canvasPosition.y + canvasPosition.height-80}px`;
    },




    /* 
        ***********************
        * STATISTICS TRACKING *
        ***********************
    */
    getStatistics: () => {
        return {
            gamesPlayed: parseInt(localStorage.getItem('rmy_gamesPlayed') || '0'),
            gamesWon: parseInt(localStorage.getItem('rmy_gamesWon') || '0')
        };
    },

    incrementGamesPlayed: () => {
        const gamesPlayed = parseInt(localStorage.getItem('rmy_gamesPlayed') || '0');
        localStorage.setItem('rmy_gamesPlayed', gamesPlayed + 1);
    },

    incrementGamesWon: () => {
        const gamesWon = parseInt(localStorage.getItem('rmy_gamesWon') || '0');
        localStorage.setItem('rmy_gamesWon', gamesWon + 1);
    },

    showPlayerStats: (show=true) => {
        vars.playSoundEffect('pageFlip.ogg');
        let div = document.getElementById('playerStatsContainer');
        if (!show) {
            div.classList.remove('active');
            return;
        };
        
        vars.updatePlayerStats();
        div.classList.add('active');
    },

    updatePlayerStats: () => {
        const stats = vars.getStatistics();
        document.getElementById('gamesPlayedValue').textContent = stats.gamesPlayed;
        document.getElementById('gamesWonValue').textContent = stats.gamesWon;
        const winPercentage = stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(2) + '%' : '0%';
        document.getElementById('winPercentageValue').textContent = winPercentage;
    }
};

vars.init();














function doTests() {
    console.log(`%cStarting tests for Rummy detection`, "color: #17b6c2; font-weight: bold; font-size: 20px;");
    
    let passCount = 0;
    let failCount = 0;
    
    let rs;
    
    // examples that SHOULD pass
    let hand1 = [
        { "suit": "♠", "rank": "4", "value": 4 },
        { "suit": "♦", "rank": "4", "value": 4 },
        { "suit": "♥", "rank": "4", "value": 4 },
        { "suit": "♣", "rank": "4", "value": 4 },
        { "suit": "♥", "rank": "3", "value": 3 },
        { "suit": "♥", "rank": "6", "value": 6 },
        { "suit": "♥", "rank": "5", "value": 5 },
        { "suit": "♠", "rank": "5", "value": 5 },
        { "suit": "♣", "rank": "5", "value": 5 },
        { "suit": "♦", "rank": "5", "value": 5 }
    ];
    console.log(`%c  >> Testing hand1 for Rummy - Should PASS.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand1);
    if (rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected Rummy but got no Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    let hand2 = [
        {"suit": "♠","rank": "5","value": 5 },
        {"suit": "♦","rank": "5","value": 5 },
        {"suit": "♥","rank": "5","value": 5 },
        {"suit": "♣","rank": "5","value": 5 },
        {"suit": "♦","rank": "A","value": 1 },
        {"suit": "♣","rank": "A","value": 1 },
        {"suit": "♠","rank": "A","value": 1 },
        {"suit": "♠","rank": "2","value": 2 },
        {"suit": "♠","rank": "3","value": 3 },
        {"suit": "♠","rank": "4","value": 4 }
    ];
    console.log(`%c  >> Testing hand2 for Rummy - Should PASS.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand2);
    if (rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected Rummy but got no Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    let hand3 = [
        { "suit": "♥", "rank": "2", "value": 2 },
        { "suit": "♥", "rank": "3", "value": 3 },
        { "suit": "♥", "rank": "4", "value": 4 },
        { "suit": "♥", "rank": "5", "value": 5 },
        { "suit": "♦", "rank": "J", "value": 11 },
        { "suit": "♠", "rank": "J", "value": 11 },
        { "suit": "♣", "rank": "J", "value": 11 },
        { "suit": "♣", "rank": "4", "value": 4 },
        { "suit": "♠", "rank": "4", "value": 4 },
        { "suit": "♦", "rank": "4", "value": 4 }
    ];
    console.log(`%c  >> Testing hand3 for Rummy - Should PASS.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand3);
    if (rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected Rummy but got no Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    let hand4 = [
        { "suit": "♥", "rank": "2", "value": 2 },
        { "suit": "♣", "rank": "2", "value": 2 },
        { "suit": "♠", "rank": "2", "value": 2 },
        { "suit": "♦", "rank": "2", "value": 2 },
        { "suit": "♦", "rank": "3", "value": 3 },
        { "suit": "♦", "rank": "4", "value": 4 },
        { "suit": "♦", "rank": "5", "value": 5 },
        { "suit": "♦", "rank": "6", "value": 6 },
        { "suit": "♣", "rank": "6", "value": 6 },
        { "suit": "♥", "rank": "6", "value": 6 }
    ];
    console.log(`%c  >> Testing hand4 for Rummy - Should PASS.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand4);
    if (rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected Rummy but got no Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    // this hand is much more difficult to decode when doing groups first
    // initially it will be in the following groups:
    // groups: [2h,2d,2c], [3h,3d,3c], [4d,4c,4h]
    // straights: [5h]
    // However we can borrow from the groups to make straights
    // resulting in:
    // straights: [2h,3h,4h,5h], [2d,3d,4d], [2c,3c,4c]
    //
    // the quickest and easiest way to do this would be to create
    // the straights first then see what is left over in the groups
    // if there are 0 cards left over, we have Rummy

    let hand5 = [
        { "suit": "♥", "rank": "2", "value": 2 },
        { "suit": "♥", "rank": "3", "value": 3 },
        { "suit": "♥", "rank": "5", "value": 5 },
        { "suit": "♦", "rank": "2", "value": 2 },
        { "suit": "♦", "rank": "3", "value": 3 },
        { "suit": "♣", "rank": "2", "value": 2 },
        { "suit": "♣", "rank": "3", "value": 3 },
        { "suit": "♦", "rank": "4", "value": 4 },
        { "suit": "♣", "rank": "4", "value": 4 },
        { "suit": "♥", "rank": "4", "value": 4 }
    ];
    console.log(`%c  >> Testing hand5 for Rummy - Should PASS.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand5);
    if (rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected Rummy but got no Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    let hand6 = [
        { "suit": "♥", "rank": "A", "value": 1 },
        { "suit": "♣", "rank": "A", "value": 1 },
        { "suit": "♠", "rank": "A", "value": 1 },
        { "suit": "♦", "rank": "A", "value": 1 },
        { "suit": "♦", "rank": "2", "value": 2 },
        { "suit": "♦", "rank": "3", "value": 3 },
        { "suit": "♦", "rank": "4", "value": 4 },
        { "suit": "♥", "rank": "2", "value": 2 },
        { "suit": "♥", "rank": "3", "value": 3 },
        { "suit": "♥", "rank": "4", "value": 4 }
    ];
    console.log(`%c  >> Testing hand6 for Rummy - Should PASS.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand6);
    if (rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected Rummy but got no Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }


    // examples that should NOT pass
    let hand7 = [
        { "suit": "♥", "rank": "3", "value": 3 },
        { "suit": "♥", "rank": "4", "value": 4 },
        { "suit": "♥", "rank": "5", "value": 5 },

        { "suit": "♦", "rank": "6", "value": 6 },
        { "suit": "♦", "rank": "7", "value": 7 },
        { "suit": "♦", "rank": "8", "value": 8 },
        { "suit": "♦", "rank": "J", "value": 11 }, // missing 9,10 to make straight

        { "suit": "♠", "rank": "J", "value": 11 },
        { "suit": "♠", "rank": "Q", "value": 12 },
        { "suit": "♠", "rank": "K", "value": 13 }
    ];
    console.log(`%c  >> Testing hand7 for Rummy - Should FAIL.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand7);
    if (!rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected no Rummy but got Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    let hand8 = [
        { "suit": "♠", "rank": "5", "value": 5 },
        { "suit": "♠", "rank": "6", "value": 6 },
        { "suit": "♠", "rank": "Q", "value": 12 },
        { "suit": "♣", "rank": "10", "value": 10 },
        { "suit": "♣", "rank": "Q", "value": 12 },
        { "suit": "♠", "rank": "K", "value": 13 },
        { "suit": "♠", "rank": "4", "value": 4 },
        { "suit": "♦", "rank": "10", "value": 10 },
        { "suit": "♥", "rank": "10", "value": 10 },
        { "suit": "♦", "rank": "Q", "value": 12 }
    ];
    console.log(`%c  >> Testing hand8 for Rummy - Should FAIL.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand8);
    if (!rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected no Rummy but got Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    let hand9 = [
        { "suit": "♥", "rank": "10", "value": 10 },
        { "suit": "♠", "rank": "10", "value": 10 },
        { "suit": "♦", "rank": "10", "value": 10 },
        { "suit": "♣", "rank": "10", "value": 10 },
        { "suit": "♣", "rank": "J", "value": 11 },
        { "suit": "♥", "rank": "J", "value": 11 },
        { "suit": "♠", "rank": "4", "value": 4 },
        { "suit": "♣", "rank": "4", "value": 4 },
        { "suit": "♦", "rank": "4", "value": 4 },
        { "suit": "♥", "rank": "4", "value": 4 }
    ];
    console.log(`%c  >> Testing hand9 for Rummy - Should FAIL.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand9);
    if (!rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected no Rummy but got Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    let hand10 = [
        { "suit": "♥", "rank": "A", "value": 1 },
        { "suit": "♦", "rank": "A", "value": 1 },
        { "suit": "♠", "rank": "A", "value": 1 },
        { "suit": "♠", "rank": "2", "value": 2 },
        { "suit": "♠", "rank": "3", "value": 3 },
        { "suit": "♠", "rank": "4", "value": 4 },
        { "suit": "♥", "rank": "2", "value": 2 },
        { "suit": "♥", "rank": "3", "value": 3 },
        { "suit": "♥", "rank": "4", "value": 4 },
        { "suit": "♣", "rank": "8", "value": 8 }
    ];
    console.log(`%c  >> Testing hand10 for Rummy - Should FAIL.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand10);
    if (!rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected no Rummy but got Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    // Test the problematic hand (should be Rummy)
    let hand11 = [
        { "suit": "♠", "rank": "7", "value": 7 },
        { "suit": "♠", "rank": "8", "value": 8 },
        { "suit": "♠", "rank": "9", "value": 9 },
        { "suit": "♥", "rank": "5", "value": 5 },
        { "suit": "♦", "rank": "5", "value": 5 },
        { "suit": "♣", "rank": "5", "value": 5 },
        { "suit": "♠", "rank": "5", "value": 5 },
        { "suit": "♦", "rank": "7", "value": 7 },
        { "suit": "♥", "rank": "7", "value": 7 },
        { "suit": "♣", "rank": "7", "value": 7 }
    ];
    console.log(`%c  >> Testing hand11 (problematic hand) for Rummy - Should PASS.`, "color: #888; font-weight: bold;");
    console.log(`     Solution: [♠7,♠8,♠9] + [♥5,♦5,♣5,♠5] + [♦7,♥7,♣7]`);
    rs = vars.game.reallyCheckForRummy(hand11);
    if (rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected Rummy but got no Rummy`, "color: red; font-weight: bold;");
        failCount++;
    }

    // Test Q-K-A straight
    let hand12 = [
        { "suit": "♥", "rank": "Q", "value": 12 },
        { "suit": "♥", "rank": "K", "value": 13 },
        { "suit": "♥", "rank": "A", "value": 1 },
        { "suit": "♦", "rank": "2", "value": 2 },
        { "suit": "♦", "rank": "3", "value": 3 },
        { "suit": "♦", "rank": "4", "value": 4 },
        { "suit": "♣", "rank": "5", "value": 5 },
        { "suit": "♠", "rank": "5", "value": 5 },
        { "suit": "♥", "rank": "5", "value": 5 },
        { "suit": "♦", "rank": "5", "value": 5 }
    ];
    console.log(`%c  >> Testing hand12 (Q-K-A straight) for Rummy - Should PASS.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand12);
    if (rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected Rummy but got no Rummy`, "color: red; font-weight: bold;");
        failCount++;
    };

    let hand13 = [
        { "suit": "♣", "rank": "8", "value": 8 },
        { "suit": "♣", "rank": "10", "value": 10 },
        { "suit": "♣", "rank": "J", "value": 11 },
        { "suit": "♠", "rank": "3", "value": 3 },
        { "suit": "♠", "rank": "4", "value": 4 },
        { "suit": "♠", "rank": "5", "value": 5 },
        { "suit": "♠", "rank": "6", "value": 6 },
        { "suit": "♦", "rank": "9", "value": 9 },
        { "suit": "♠", "rank": "9", "value": 9 },
        { "suit": "♣", "rank": "9", "value": 9 }
    ];
    console.log(`%c  >> Testing hand13 (complex hand) for Rummy - Should FAIL.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand13);
    if (!rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected no Rummy but got Rummy`, "color: red; font-weight: bold;");
        failCount++;
    };

    let hand14 = [
        { "suit": "♣", "rank": "J", "value": 11 },
        { "suit": "♣", "rank": "Q", "value": 12 },
        { "suit": "♣", "rank": "K", "value": 13 },
        { "suit": "♣", "rank": "A", "value": 1 },
        { "suit": "♦", "rank": "10", "value": 10 },
        { "suit": "♦", "rank": "J", "value": 11 },
        { "suit": "♦", "rank": "Q", "value": 12 },
        { "suit": "♦", "rank": "5", "value": 5 },
        { "suit": "♥", "rank": "5", "value": 5 },
        { "suit": "♠", "rank": "5", "value": 5 }
    ];
    console.log(`%c  >> Testing hand14 (J-Q-K-A straight) for Rummy - Should PASS.`, "color: #888; font-weight: bold;");
    rs = vars.game.reallyCheckForRummy(hand14);
    if (rs.rummy) {
        console.log(`%c     ✓ PASSED`, "color: green;");
        passCount++;
    } else {
        console.log(`%c     ✗ FAILED - Expected Rummy but got no Rummy`, "color: red; font-weight: bold;");
        failCount++;
    };



    console.log(`%cTests completed. Passed: ${passCount}, Failed: ${failCount}`, "color: #17b6c2; font-weight: bold; font-size: 16px;");
}