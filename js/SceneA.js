// https://www.gameart2d.com/the-zombies-free-sprites.html
// https://www.gameart2d.com/free-graveyard-platformer-tileset.html
class SceneA extends Phaser.Scene {
  map;
  player;
  playerStartPoint;
  cursors;
  inPlay = false;
  hearts;
  bats;
  batColliders;
  introScreen;
  endScreen;
  score = 0;
  scoreText;

  constructor(config) {
    super(config);
  }
  preload() {
    // screens
    this.load.image('intro', 'assets/intro.png');
    this.load.image('rip', 'assets/rip.png');
    // images
    this.load.image('static', 'assets/static.jpg');
    this.load.image('tiles', 'assets/graveyard-tiles.png');
    this.load.image('heart', 'assets/heart-small.png');
    // tile data
    this.load.tilemapTiledJSON('graveyard-map', 'assets/graveyard-level1.json');
    // spritesheet
    this.load.spritesheet('player', 'assets/zombie-girl.png', {
      frameWidth: 130,
      frameHeight: 144
    })
    this.load.spritesheet('bat', 'assets/bat.png', {
      frameWidth: 64,
      frameHeight: 38
    })

  }
  create() {
    this.add.image(448, 448, 'static').setScrollFactor(0, 0);
    this.map = this.make.tilemap({ key: 'graveyard-map' });
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    let tiles = this.map.addTilesetImage('graveyard-tiles', 'tiles');
    this.map.createStaticLayer('midgroundLayer', [tiles], 0, 0).setScrollFactor(0.5, 0);
    let collisionLayer = this.map.createStaticLayer('collisionLayer', [tiles], 0, 0);
    collisionLayer.setCollisionBetween(1, 1000);
    this.map.createStaticLayer('decorationLayer', [tiles], 0, 0);
    // player stuff
    this.playerStartPoint = SceneA.FindPoint(this.map, 'objectLayer', 'player', 'playerSpawn');
    this.player = this.physics.add.sprite(this.playerStartPoint.x, this.playerStartPoint.y, 'player');
    this.player.jumpCount = 0;
    this.player.body.setSize(80, 120, true);
    this.player.body.setOffset(30, 20);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, collisionLayer);
    // enemies
    this.anims.create({
      key: 'fly',
      frames: this.anims.generateFrameNumbers('bat', { start: 0, end: 2 }),
      frameRate: 12,
      repeat: -1,
    })
    this.bats = this.physics.add.group();
    let batPoints = SceneA.FindPoints(this.map, 'objectLayer', 'bat');
    let len = batPoints.length / 2;
    // relies on matching pairs of data - will probably crash otherwise!
    for (var batSpawn, batDest, line, bat, i = 1; i < len + 1; i++) {
      batSpawn = SceneA.FindPoint(this.map, 'objectLayer', 'bat', 'batSpawn' + i);
      batDest = SceneA.FindPoint(this.map, 'objectLayer', 'bat', 'batDest' + i);
      line = new Phaser.Curves.Line(batSpawn, batDest);
      bat = this.add.follower(line, batSpawn.x, batSpawn.y, 'bat');
      bat.startFollow({
        duration: Phaser.Math.Between(1500, 2500),
        repeat: -1,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
      bat.anims.play('fly', true);
      this.bats.add(bat);
      bat.body.allowGravity = false;
    }
    this.batColliders = this.physics.add.collider(this.player, this.bats, this.batAttack, null, this);
    // collectibles
    let heartPoints = SceneA.FindPoints(this.map, 'objectLayer', 'heart');
    this.hearts = this.physics.add.staticGroup();
    for (var point, i = 0; i < heartPoints.length; i++) {
      point = heartPoints[i];
      this.hearts.create(point.x, point.y, 'heart');
    }
    this.physics.add.overlap(this.player, this.hearts, this.collectHeart, null, this);
    // anims
    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('player', {
        start: 1,
        end: 10
      }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'die',
      frames: this.anims.generateFrameNumbers('player', {
        start: 11,
        end: 14
      }),
      frameRate: 12,
      repeat: 0
    });
    this.player.on('animationcomplete-die', this.showEndScreen, this)
    this.anims.create({
      key: 'idle',
      frames: this.anims.generateFrameNumbers('player', {
        start: 0,
        end: 0
      }),
    });
    // controls
    this.cursors = this.input.keyboard.createCursorKeys();
    // camera
    let camera = this.cameras.getCamera("");
    camera.startFollow(this.player); // can add params if you want
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    // screens
    this.endScreen = this.add.image(448, 448, 'rip').setScrollFactor(0, 0).setAlpha(0);
    // text
    this.scoreText = this.add.text(16, 16, 'Score: 0', {
      fontSize: '44px',
      fill: '#FFFFFF',
      fontFamily: 'Century Gothic, sans-serif'
    }).setScrollFactor(0)
    this.introScreen = this.add.image(448, 448, 'intro').setScrollFactor(0, 0);
    this.input.on('pointerdown', this.startGame, this);
  }
  update() {
    if (this.inPlay) {
      if (this.cursors.left.isDown) {
        this.player.setVelocityX(-160);
        if (this.player.body.blocked.down) {
          this.player.anims.play('walk', true);
        } else {
          this.player.anims.play('idle', true);
        }
        this.player.flipX = true;
        this.player.body.setOffset(20, 20);
      } else if (this.cursors.right.isDown) {
        this.player.setVelocityX(160);
        if (this.player.body.blocked.down) {
          this.player.anims.play('walk', true);
        } else {
          this.player.anims.play('idle', true);
        }
        this.player.flipX = false;
        this.player.body.setOffset(30, 20);
      } else {
        this.player.setVelocityX(0);
        this.player.anims.play('idle', true);
      }
      if (Phaser.Input.Keyboard.JustDown(this.cursors.space) && this.player.jumpCount < 2) {
        this.player.jumpCount++;
        this.player.setVelocityY(-350);
      } else if (this.player.body.blocked.down) {
        this.player.jumpCount = 0;
      }
    }

  }
  collectHeart(player, heart) {
    heart.disableBody(true, true);
    this.score += 10;
    this.scoreText.setText('Score: ' + this.score);
  }
  batAttack(player, bat) {
    this.inPlay = false;
    this.player.setVelocityX(0);
    this.player.anims.play('die', true);
    this.physics.world.removeCollider(this.batColliders);

  }
  startGame() {
    this.input.removeListener('pointerdown');
    this.inPlay = true;
    this.tweens.add(
      {
        targets: this.introScreen,
        alpha: { value: 0, duration: 500, ease: 'Power1' }
      }
    )
  }
  showEndScreen() {
    this.tweens.add(
      {
        targets: this.endScreen,
        alpha: { value: 1, duration: 500, ease: 'Power1' }
      }
    )
    this.input.on('pointerdown', this.restartGame, this);
  }
  restartGame(){
    this.input.removeListener('pointerdown');
    this.tweens.add(
      {
        targets: this.endScreen,
        alpha: { value: 0, duration: 500, ease: 'Power1' }
      }
    )
    this.score = 0;
    this.scoreText.setText('Score: 0');
    this.player.x = this.playerStartPoint.x;
    this.player.y = this.playerStartPoint.y;
    this.inPlay = true;
    this.batColliders = this.physics.add.collider(this.player, this.bats, this.batAttack, null, this);
    this.hearts.children.iterate(function(child){
      child.enableBody(true, child.x, child.y, true, true);
    })

  }
  static FindPoint(map, layer, type, name) {
    var loc = map.findObject(layer, function (object) {
      if (object.type === type && object.name === name) {
        return object;
      }
    });
    return loc
  }
  static FindPoints(map, layer, type) {
    var locs = map.filterObjects(layer, function (object) {
      if (object.type === type) {
        return object
      }
    });
    return locs
  }
}
