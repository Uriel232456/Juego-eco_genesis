// Configuración global del juego de Phaser
const config = {
    type: Phaser.AUTO,
    width: 900,
    height: 600,
    parent: 'game-container', // El ID del contenedor en el HTML
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 }, // Gravedad para que los átomos caigan
            debug: false // Cambiar a true para ver los cuerpos de las físicas
        }
    },
    scene: [BootScene, PlayScene] // Las escenas del juego
};

// Clase para la escena de carga de activos (BootScene)
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // En esta versión, no cargamos imágenes, sino que las generamos
        // programáticamente para crear los placeholders.
    }

    create() {
        // Generamos texturas para los placeholders
        const graphics = this.add.graphics();

        // Textura para el jugador (cuadrado verde)
        graphics.fillStyle(0x00ff00);
        graphics.fillRect(0, 0, 32, 32);
        graphics.generateTexture('player', 32, 32);
        graphics.clear();

        // Textura para los átomos (círculos de colores)
        graphics.fillStyle(0xff0000); // Rojo para átomos de Oxígeno
        graphics.fillCircle(16, 16, 16);
        graphics.generateTexture('oxygen', 32, 32);
        graphics.clear();

        graphics.fillStyle(0x0000ff); // Azul para átomos de Hidrógeno
        graphics.fillCircle(16, 16, 16);
        graphics.generateTexture('hydrogen', 32, 32);
        graphics.clear();

        // Textura para los enemigos (cuadrado más grande, gris)
        graphics.fillStyle(0x808080);
        graphics.fillRect(0, 0, 64, 64);
        graphics.generateTexture('enemy', 64, 64);
        graphics.clear();
        
        // Pasamos a la siguiente escena
        this.scene.start('PlayScene');
    }
}

// Clase para la escena principal del juego (PlayScene)
class PlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayScene' });
    }

    create() {
        // Lógica de la escena
        this.cameras.main.setBackgroundColor('#282c34');

        // Referencia a los elementos del DOM (HTML)
        this.atomCountText = document.getElementById('atom-count');
        this.createBtn = document.getElementById('create-molecule-btn');
        this.messageBox = document.getElementById('message-box');
        this.messageText = document.getElementById('message-text');

        // Propiedades del juego
        this.atomsCollected = 0;
        this.totalAtomsNeeded = 3; // Para crear 1 molécula de H2O (2H, 1O, pero aquí solo contamos el total)

        // Creación del jugador
        this.player = this.physics.add.sprite(450, 500, 'player');
        this.player.setCollideWorldBounds(true);
        this.player.body.allowGravity = false; // El jugador no es afectado por la gravedad

        // Creación de grupos para los enemigos y átomos
        this.enemies = this.physics.add.group();
        this.atoms = this.physics.add.group();
        this.particles = this.physics.add.group(); // Grupo para las partículas que caen

        // Input del teclado
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        // Evento para generar enemigos periódicamente
        this.time.addEvent({
            delay: 3000,
            callback: this.spawnEnemy,
            callbackScope: this,
            loop: true
        });

        // Colisiones y superposiciones
        // El jugador colisiona con los átomos para recolectarlos
        this.physics.add.overlap(this.player, this.atoms, this.collectAtom, null, this);
        // Colisión entre el jugador y los enemigos
        this.physics.add.collider(this.player, this.enemies, this.handleEnemyCollision, null, this);
        // Colisión entre enemigos y partículas (para destruirlas si tocan un enemigo)
        this.physics.add.overlap(this.enemies, this.particles, (enemy, particle) => particle.destroy());

        // Manejador del botón de crear molécula
        this.createBtn.addEventListener('click', () => this.createMolecule());

        this.updateHUD(); // Actualizar el HUD al inicio
        this.createBtn.disabled = true; // Deshabilitar el botón al inicio
    }

    // Función para crear un enemigo
    spawnEnemy() {
        const x = Phaser.Math.Between(100, 800);
        const y = Phaser.Math.Between(100, 300);
        const enemy = this.enemies.create(x, y, 'enemy');
        enemy.body.allowGravity = false; // Los enemigos no son afectados por la gravedad
        enemy.setCollideWorldBounds(true);
        enemy.setBounce(1); // Rebotan al colisionar con los límites del mundo
        enemy.setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-150, 150));
    }

    // Función para manejar la colisión con los enemigos
    handleEnemyCollision(player, enemy) {
        // En esta versión simple, la colisión destruye al enemigo y genera átomos.
        // Se puede expandir para que el jugador también pierda vida o reinicie.
        
        // El enemigo desaparece
        enemy.destroy();

        // Generamos átomos en la posición del enemigo
        const atomCount = Phaser.Math.Between(2, 4);
        for (let i = 0; i < atomCount; i++) {
            const atomType = Phaser.Math.Between(0, 1);
            const atomTexture = atomType === 0 ? 'oxygen' : 'hydrogen';
            const atom = this.atoms.create(enemy.x, enemy.y, atomTexture);
            // Aplicamos un impulso aleatorio para que los átomos salgan disparados
            atom.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-200, -50));
            atom.setBounce(0.5); // Rebotan al chocar con el suelo
            atom.setCollideWorldBounds(true);
        }
    }

    // Función para recolectar un átomo
    collectAtom(player, atom) {
        atom.disableBody(true, true); // Deshabilita y oculta el átomo
        this.atomsCollected += 1;
        this.updateHUD();
        this.showMessage(`¡Átomo recolectado! Átomos: ${this.atomsCollected}`, 1500);

        if (this.atomsCollected >= this.totalAtomsNeeded) {
            this.createBtn.disabled = false;
        }
    }

    // Función para simular la creación de una molécula
    createMolecule() {
        if (this.atomsCollected >= this.totalAtomsNeeded) {
            this.atomsCollected -= this.totalAtomsNeeded;
            this.updateHUD();
            this.createBtn.disabled = true;
            this.showMessage(`¡Se ha creado la molécula de H₂O!`, 3000);
        } else {
            this.showMessage("¡Necesitas más átomos!", 1500);
        }
    }

    // Actualiza el texto del HUD
    updateHUD() {
        this.atomCountText.textContent = `Átomos recolectados: ${this.atomsCollected}`;
    }

    // Muestra un mensaje temporal en pantalla
    showMessage(text, duration) {
        this.messageText.textContent = text;
        this.messageBox.style.display = 'block';
        this.time.delayedCall(duration, () => {
            this.messageBox.style.display = 'none';
        }, [], this);
    }

    update() {
        // Lógica de movimiento del jugador
        const speed = 200;
        this.player.body.setVelocity(0);

        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            this.player.body.setVelocityX(-speed);
        } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
            this.player.body.setVelocityX(speed);
        }

        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            this.player.body.setVelocityY(-speed);
        } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
            this.player.body.setVelocityY(speed);
        }
    }
}

// Inicia el juego
new Phaser.Game(config);