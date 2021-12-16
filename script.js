//Global Constants for tinkering
const STEERINGSTRENGTH = .5;

//Boid Controls
const BOID_RAD = 8;
const BOID_NUM = 50;
const SPEED = 1.5;
const FOV = BOID_RAD * 10;

//System Constants
const COHESION = 5;
const COH_MULTIPLIER = .001;
const REPULSION = 2;
const REP_MULTIPLIER = .01;
const ADHESION = 1;
const ADH_MULTIPLIER = .1;

const ADHESION_DIST = FOV;
const REPULSION_DIST = BOID_RAD * 3;



// Global environment variable to hold configuration info
class Config
{
   constructor()
   {
      this.canvas = null;
      this.paused = false;
      this.win_height = 300;
      this.win_width = 400;
      this.debug = false;
      this.boids = new Array(BOID_NUM);
      this.pos_array = new Array(BOID_NUM);
      this.vel_array = new Array(BOID_NUM);
      this.groups = new Array(BOID_NUM/50);

      this.coh = COH_MULTIPLIER * COHESION;
      this.rep = REP_MULTIPLIER * REPULSION;
      this.adh = ADH_MULTIPLIER * ADHESION;
   }
}

let randRange = function (max, min = 1) { return Math.round(Math.random() * (max - min)) + min; };

class Boid
{
   constructor(pos, vel)
   {
      this.pos = pos;
      this.vel = vel;
      this.fov = FOV;
      this.group = 0;
      this.group_dirty = false;
   }
}
class Pos
{
   constructor(x = 0, y = 0)
   {
      this.x = x;
      this.y = y;
   }
}
class Vel
{
   constructor(x, y)
   {
      this.x = x;
      this.y = y;
   }
}

class Group
{
   constructor(id = 0)
   {
      this.id = id;
      this.members = [];
      this.size = 0;
      this.color = "#000000";
   }
}

var cfg = new Config();

//  Boids:
//
//  Position
//  Velocity
//  Group
//  

function main(cfg)
{
   cfg.canvas = document.getElementById("world");
   console.log(cfg.canvas);
   if (cfg.canvas.getContext)
   {
      var ctx = cfg.canvas.getContext('2d');
      generateBoids(cfg);
      updateWorld();
      //cfg.canvas.addEventListener("mousedown", function(e){ UpdateWorld(cfg, ctx); });


   }
   else
   {
      //Canvas Broke Code
   }
}

function updateWorld()
{
   let ctx = cfg.canvas.getContext('2d');
   updateVariables(cfg);
   boidSystem(cfg);
   draw(cfg, ctx);
   generate_tooltip(cfg.win_width/2, 20, "Boids", 12, ctx);

   window.requestAnimationFrame(updateWorld);
}


function boidSystem(cfg)
{
   for (let i = 0; i < BOID_NUM; i++)
   {
      handleMovement(cfg.boids[i], cfg);
   }
   //handleColor(cfg);
}

function handleMovement(boid, cfg)
{
   let margin = 40;
   let boids = cfg.boids;
   let pos = cfg.pos_array[boid.pos];
   let vel = cfg.vel_array[boid.vel];

   let net_vel = new Vel(0, 0);

   let center_percieved = new Pos(0, 0);
   let coh_contributors = 0;

   let repulsion_vel = new Vel(0, 0);

   let adh_vel = new Vel(0, 0);
   let adh_contributors = 0;

   // 

   for (let j = 0; j < BOID_NUM; j++)
   {
      let same = (j == boid.pos);
      let other_pos = cfg.pos_array[j];
      let dist = Math.sqrt((other_pos.x - pos.x) ** 2) + Math.sqrt((other_pos.y - pos.y) ** 2);
      let coh_dist_bool = (dist < boid.fov);
      let rep_dist_bool = (dist < REPULSION_DIST);
      let adh_dist_bool = (dist < ADHESION_DIST);
      //let adh_new_nearest = (dist > min_dist); 

      //Clustering
      center_percieved.x += (cfg.pos_array[j].x * (!same && coh_dist_bool));
      center_percieved.y += (cfg.pos_array[j].y * (!same && coh_dist_bool));
      coh_contributors += (!same && coh_dist_bool);

      //Repulsion (Collision)
      repulsion_vel.x -= (other_pos.x - pos.x)  * (!same && rep_dist_bool);
      repulsion_vel.y -= (other_pos.y - pos.y)  * (!same && rep_dist_bool);

      //Adhesion
      adh_vel.x += (cfg.vel_array[j].x * (dist / boid.fov) * (!same && adh_dist_bool));
      adh_vel.y += (cfg.vel_array[j].y * (dist / boid.fov) * (!same && adh_dist_bool));
      adh_contributors += (!same && adh_dist_bool);

   }
   //center_percieved.x /= (BOID_NUM - 1);
   //center_percieved.y /= (BOID_NUM - 1);
   let coh_check = (coh_contributors != 0);
   coh_contributors = bif(coh_contributors, 0);
   adh_contributors = bif(adh_contributors, 0);

   net_vel.x += (((center_percieved.x / coh_contributors) - pos.x)) * cfg.coh * coh_check;
   net_vel.y += (((center_percieved.y / coh_contributors) - pos.y)) * cfg.coh * coh_check;

   net_vel.x += repulsion_vel.x * cfg.rep;
   net_vel.y += repulsion_vel.y * cfg.rep;

   net_vel.x += ((adh_vel.x / adh_contributors) - vel.x) * cfg.adh;
   net_vel.y += ((adh_vel.y / adh_contributors) - vel.y) * cfg.adh;

   // Velocity Increment
   vel.x += net_vel.x * (coh_check);
   vel.y += net_vel.y * (coh_check);

   //Wall Avoidance
   if (pos.x < margin)
   {
      vel.x += STEERINGSTRENGTH;
   }
   else if (pos.x > cfg.win_width - margin)
   {
      vel.x -= STEERINGSTRENGTH;
   }
   if (pos.y < margin)
   {
      vel.y += STEERINGSTRENGTH;
   }
   else if (pos.y > cfg.win_height - margin)
   {
      vel.y -= STEERINGSTRENGTH;
   }

   //Speed Cap
   if (Math.sqrt(vel.x ** 2 + vel.y ** 2) > SPEED)
   {
      vel.x *= .9;
      vel.y *= .9;
   }

   // Positional Increment
   pos.x = (pos.x + vel.x) % cfg.win_width;
   pos.y = (pos.y + vel.y) % cfg.win_height;
   boid.group_dirty = true; // Set dirty bool to allow for group coloring

}

function handleColor(cfg)
{
   for (let i = 0; i < BOID_NUM; i++)
   {
      let boid = cfg.boids[i];
      if (boid.group_dirty) 
      {
         let pos = cfg.pos_array[boid.pos];
         let boid_group = [];
         boid_group.append(i);
         boid.group_dirty = false;
          
         for (let j = i+1; j < BOID_NUM; j++) 
         {
            let same = (i == j);
            let other = cfg.pos_array[j];
            let dist = dits(other, pos);
            let in_view = dist < boid.fov;
            
            if(in_view)
            {
               boid_group.append(j);
            }

         }
         let finished = false;
         while (!finished)
         {
            for(let j = 1; j < boid_group.length; j++)
            {
               let iter_boid = cfg.pos_array[boid_group[j]];
               for(let k = 1; k < BOID_NUM; k++)
               {
                  let other = cfg.pos_array[k];
               }
               let same = (k == iter_boid.pos);
               let dist = dist(other, pos);
               let in_view = dist < boid.fov
               if(in_view)
               {
                  
               }
            }
         }

         for (let j = 0; j < boid_group.length; j++) 
         {

         }
      }
   }

}


function generateBoids(cfg)
{
   for (let i = 0; i < BOID_NUM; i++)
   {
      cfg.pos_array[i] = new Pos(randRange(cfg.win_width - 20, 20), randRange(cfg.win_height - 20, 20));
      cfg.vel_array[i] = new Vel(Math.random() * 2 - 1, Math.random() * 2 - 1);
      cfg.boids[i] = new Boid(i, i);
   }
}

function resizeCanvas()
{
   cfg.canvas = document.getElementById("world");
   let offset = document.getElementById("controls");
   // Set the dimensions of the window. 30, and 20 are window scalars since window does not fit in box.
   cfg.win_width = cfg.canvas.width = window.innerWidth - 30;
   cfg.win_height = cfg.canvas.height = window.innerHeight - 20 - offset.clientHeight;
}

function draw(cfg, ctx)
{
   ctx.clearRect(0, 0, cfg.win_width, cfg.win_height);
   cfg.pos_array.forEach(element => drawCircle(element.x, element.y, BOID_RAD, ctx));
}

function loadInitialSettings()
{
   document.getElementById("coh").value = COHESION;
   document.getElementById("coh_mult").value = COH_MULTIPLIER;

   document.getElementById("rep").value = REPULSION;
   document.getElementById("rep_mult").value = REP_MULTIPLIER;

   document.getElementById("adh").value = ADHESION;
   document.getElementById("adh_mult").value = ADH_MULTIPLIER;
}

function updateVariables(cfg)
{
   let coh = document.getElementById("coh").value;
   let coh_mult = document.getElementById("coh_mult").value;
   cfg.coh = coh * coh_mult; 

   let rep = document.getElementById("rep").value;
   let rep_mult = document.getElementById("rep_mult").value;
   cfg.rep = rep * rep_mult;

   let adh = document.getElementById("adh").value;
   let adh_mult = document.getElementById("adh_mult").value;
   cfg.adh = adh * adh_mult;
}

//=================================
//          Helper Functions
//=================================

//  x, y = position of the center of the circle
//  rad = radius of the circle
//  ctx = canvas context
//  color = color in hex, default black
//  filled = boolean for filled or border, default true
function drawCircle(x, y, rad, ctx, color = '#000000', filled = true)
{
   ctx.beginPath();
   ctx.moveTo(x, y);
   //Since circle is starting at angle = 0; x must be
   //increased by radius to allow circle to be drawn properly
   ctx.arc(x + rad, y, rad, 0, Math.PI * 2, true);
   ctx.fillStyle = color;
   if (filled == true)
   {
      ctx.fill();
   }
   else
   {
      ctx.stroke();
   }
}

//Branchless if statement for variable assignment.
//Primary use is to correct 0 division issues.
//value: value to be checked
//check: value to compare to
//set_value: value to return if check is true
function bif(value, check = 0, set_value = 1)
{
   return (set_value * (value == check)) + (value * (value != check));
}

function dist(pos2, pos1)
{
   return Math.sqrt((pos2.x - pos1.x) ** 2) + Math.sqrt((pos2.y - pos1.y) ** 2);
}


function generate_tooltip(x, y, text, size, ctx, color = "#000000", width = 0, height = 0, bounding = 2)
{
   ctx.font = "" + size + "px mono";
   ctx.fillStyle = color;
   ctx.strokeStyle = color;
   ctx.direction = "ltr"
   ctx.textAlign = "center";
   let text_eval = ctx.measureText(text);
   ctx.strokeRect(x - (text_eval.width/2) - bounding, y - size - bounding, text_eval.width + (bounding * 2), size + (bounding * 2));
   ctx.fillText(text, x, y); 
}


window.onload = function ()
{
   window.addEventListener("resize", resizeCanvas, false);
   //window.requestAnimationFrame(UpdateWorld);
   loadInitialSettings();
   resizeCanvas();
   main(cfg);
};