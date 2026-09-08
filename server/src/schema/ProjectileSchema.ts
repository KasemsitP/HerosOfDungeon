import { Schema, type } from "@colyseus/schema";

export class ProjectileSchema extends Schema {
  @type("string") ownerId = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") damage = 0;
  @type("string") projectileType: "kunai" | "arrow" | "bolt" = "bolt";
}
