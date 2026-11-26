import Phaser from 'phaser';
import type { MoverData } from '../levels/types';
import { TILE_SIZE } from '../logic/levelParser';

/**
 * Plataforma que vai e volta suavemente entre dois pontos.
 * O movimento é feito por velocidade (não por tween) para que o Arcade
 * Physics carregue o jogador junto.
 */
export class MovingPlatform extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  private readonly startX: number;
  private readonly startY: number;
  private readonly distX: number;
  private readonly distY: number;
  private readonly period: number;

  constructor(scene: Phaser.Scene, data: MoverData, texture: string) {
    const w = data.width * TILE_SIZE;
    const x = data.x * TILE_SIZE + w / 2;
    const y = data.y * TILE_SIZE + 5;
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.startX = x;
    this.startY = y;
    this.distX = data.dx * TILE_SIZE;
    this.distY = data.dy * TILE_SIZE;
    this.period = data.period;
    this.setDepth(4);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    // Atravessável por baixo e pelos lados: só colide em cima.
    this.body.checkCollision.down = false;
    this.body.checkCollision.left = false;
    this.body.checkCollision.right = false;
  }

  private positionAt(seconds: number): { x: number; y: number } {
    const k = 0.5 - 0.5 * Math.cos((seconds / this.period) * Math.PI * 2);
    return { x: this.startX + this.distX * k, y: this.startY + this.distY * k };
  }

  /**
   * Chamado a cada passo fixo da física: velocidade para chegar exatamente ao ponto
   * da trajetória no fim do próximo passo (h em segundos). Usar o tempo do quadro
   * desenhado fazia a plataforma passar do ponto e "teleportar".
   */
  physicsStep(seconds: number, h: number): void {
    const target = this.positionAt(seconds + h);
    this.body.setVelocity((target.x - this.body.center.x) / h, (target.y - this.body.center.y) / h);
  }
}
