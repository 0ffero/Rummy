class popup04 {
    constructor(options = {}) {
        this.version = '1.3.2';
        // Defaults
        this.position = options.position || 'bottom-right';
        this.backgroundColor = options.backgroundColor || '#ffffff';
        this.textColor = options.textColor || '#000000';
        this.borderColor = options.borderColor || '#000000';
        this.borderStyle = options.borderStyle || 'solid'; // solid | dotted | dashed
        this.borderWidth = options.borderWidth || 1; // 1 | 2 | 3
        this.timeoutSeconds = Math.min(Math.max(options.timeoutSeconds || 3, 1), 30);
        this.width = options.width || 300; // in pixels
        this.animationDirection = options.animationDirection || 'auto'; // auto | top | bottom | left | right
        this.animationDuration = options.animationDuration || 500; // in ms

        this.containerId = 'popup04-container';
        this.hideTimer = null;
        this.isShown = false;

        this._ensureContainer();
    }

    _ensureContainer() {
        let container = document.getElementById(this.containerId);

        if (!container) {
            container = document.createElement('div');
            container.id = this.containerId;

            // Base styles
            container.style.position = 'fixed';
            container.style.zIndex = '99999';
            container.style.width = `${this.width}px`;
            container.style.boxShadow = '2px 2px 8px black';
            container.style.backgroundColor = this.backgroundColor;
            container.style.color = this.textColor;
            container.style.border = `${this.borderWidth}px ${this.borderStyle} ${this.borderColor}`;
            container.style.borderRadius = '4px';
            container.style.fontFamily = 'Arial, sans-serif';
            container.style.fontSize = '16px';
            container.style.overflow = 'hidden';
            container.style.pointerEvents = 'none';
            container.style.display = 'block';
            container.style.transition = `transform ${this.animationDuration}ms ease-in-out`;
            container.style.textAlign = 'left';

            this._applyPosition(container);
            
            document.body.appendChild(container);
        };
        
        this.container = container;
        this._hideImmediately(); // Set initial off-screen position
    }

    _getAnimationDirection() {
        if (this.animationDirection !== 'auto') {
            return this.animationDirection;
        };

        if (this.position.includes('left')) return 'left';
        if (this.position.includes('right')) return 'right';
        if (this.position.includes('top')) return 'top';
        if (this.position.includes('bottom')) return 'bottom';
        return 'right'; // default for bottom-right
    }

    _hideImmediately() {
        const direction = this._getAnimationDirection();
        let transform = '';
        switch (direction) {
            case 'left': transform = 'translateX(-150%)'; break;
            case 'right': transform = 'translateX(150%)'; break;
            case 'top': transform = 'translateY(-150%)'; break;
            case 'bottom': transform = 'translateY(150%)'; break;
        }

        if (this.position.includes('centre')) {
            this.container.style.transform = `translateX(-50%) ${transform}`;
        } else {
            this.container.style.transform = transform;
        }
        this.isShown = false;
    }

    _show() {
        if (this.position.includes('centre')) {
            this.container.style.transform = 'translateX(-50%)';
        } else {
            this.container.style.transform = 'translate(0, 0)';
        }
        this.isShown = true;
    }

    _applyPosition(container) {
        const offset = '20px';
        container.style.top = '';
        container.style.bottom = '';
        container.style.left = '';
        container.style.right = '';
        // container.style.transform is managed by _show and _hideImmediately

        switch (this.position) {
            case 'top-left':
                container.style.top = offset;
                container.style.left = offset;
            break;

            case 'top-right':
                container.style.top = offset;
                container.style.right = offset;
            break;

            case 'top-centre':
                container.style.top = offset;
                container.style.left = '50%';
            break;

            case 'bottom-left':
                container.style.bottom = offset;
                container.style.left = offset;
            break;

            case 'bottom-centre':
                container.style.bottom = offset;
                container.style.left = '50%';
            break;

            case 'bottom-right':
            default:
                container.style.bottom = offset;
                container.style.right = offset;
            break;

        }
    }

    showMessage(content) {
        // Clear previous timeouts
        if (this.hideTimer) {
            clearTimeout(this.hideTimer);
            this.hideTimer = null;
        };
        if (this.clearContentTimer) {
            clearTimeout(this.clearContentTimer);
            this.clearContentTimer = null;
        };

        // Create message item
        const msg = document.createElement('div');
        msg.style.padding = '10px';
        msg.style.borderBottom = '1px solid rgba(0,0,0,0.1)';

        msg.innerHTML = content;

        // limit the total number of messages to prevent overflow (e.g. max 5)
        while (this.container.children.length >= 5) {
            this.container.removeChild(this.container.firstChild);
        };

        // Add new messages below older ones
        this.container.appendChild(msg);
        this.container.style.display = 'block';

        // Remove bottom border on last message
        Array.from(this.container.children).forEach((child, idx, arr) => {
            child.style.borderBottom = idx === arr.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.1)';
        });

        if (!this.isShown) {
            // Use a short timeout to allow the browser to apply the initial (off-screen) style
            // before transitioning to the visible state, ensuring the slide-in animation plays.
            setTimeout(() => this._show(), 50);
        }

        // Auto-hide after timeout
        this.hideTimer = setTimeout(() => {
            this._hideImmediately();
            this.hideTimer = null;
            // Clear content after animation
            this.clearContentTimer = setTimeout(() => {
                this.container.innerHTML = '';
                this.clearContentTimer = null;
            }, this.animationDuration);
        }, this.timeoutSeconds * 1000);
    }
};