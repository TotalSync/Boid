//Global Constants for tinkering
const STEERINGSTRENGTH = .5;

//Boid Controls
const BOID_RAD = 8;
const BOID_NUM = 50;
const SPEED = 1;
const FOV = BOID_RAD * 10;

//System Constants
const COHESION = .01;
const REPULSION = .05; 
const ADHESION = 1;

const ADHESION_DIST = FOV;
const REPULSION_DIST = BOID_RAD * 3;



// Global environment variable to hold configuration info
class Config {
    constructor() {
        this.canvas = null;
        this.paused = false;
        this.win_height = 300;
        this.win_width = 400;
        this.debug = false;
        this.boids = new Array(BOID_NUM);
        this.pos_array = new Array(BOID_NUM);
        this.vel_array = new Array(BOID_NUM);
    }
}

let randRange = function (max, min = 1) { return Math.round(Math.random() * (max - min)) + min };

class Boid {
    constructor(pos, vel) {
        this.pos = pos;
        this.vel = vel;
        this.fov = 
        this.group = 0;
    }
}
class Pos {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}
class Vel {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

var cfg = new Config();





//  Boids:
//
//  Position
//  Velocity
//  Group
//  

function main(cfg) {
    cfg.canvas = document.getElementById("world");
    console.log(cfg.canvas);
    if (cfg.canvas.getContext) {
        var ctx = cfg.canvas.getContext('2d');
        generateBoids(cfg);
        updateWorld();
        //cfg.canvas.addEventListener("mousedown", function(e){ UpdateWorld(cfg, ctx); });


    }
    else {
        //Canvas Broke Code
    }
}

function updateWorld() {
    let ctx = cfg.canvas.getContext('2d');
    draw(cfg, ctx);
    boidSystem(cfg);

    window.requestAnimationFrame(updateWorld);
}


function boidSystem(cfg) {
    for (let i = 0; i < BOID_NUM; i++) {
        handleMovement(cfg.boids[i], cfg);
    }
}

function handleMovement(boid, cfg) {
    let margin = 40;
    let boids = cfg.boids;
    let pos = cfg.pos_array[boid.pos];
    let vel = cfg.vel_array[boid.vel];

    let net_vel = new Vel(0, 0);
    let center_percieved = new Pos(0, 0);
    let coh_contributors = 1;
    let repulsion_vel = new Vel(0, 0);
    let adh_vel = new Vel(0, 0);
    let adh_contributors = 1;


    for (let j = 0; j < BOID_NUM; j++) {
        let same = (j == boid.pos);
        let other_pos = cfg.pos_array[j];
        let dist = Math.sqrt((other_pos.x - pos.x) ** 2) + Math.sqrt((other_pos.y - pos.y) ** 2);
        let coh_dist_bool = (dist < boid.fov);
        let rep_dist_bool = (dist < REPULSION_DIST);
        let adh_dist_bool = (dist < ADHESION_DIST);//&& dist > 1);
        //let adh_new_nearest = (dist > min_dist); 

        //Clustering
        center_percieved.x += (cfg.pos_array[j].x * (!same && coh_dist_bool));
        center_percieved.y += (cfg.pos_array[j].y * (!same && coh_dist_bool));
        coh_contributors += (!same && coh_dist_bool);

        //Repulsion (Collision)
        repulsion_vel.x -= (other_pos.x - pos.x) * (!same && rep_dist_bool);
        repulsion_vel.y -= (other_pos.y - pos.y) * (!same && rep_dist_bool);

        //Adhesion
        //min_dist = adh_new_nearest * dist + !adh_new_nearest * min_dist; //updates newest min 
        adh_vel.x += (cfg.vel_array[j].x * (dist/boid.fov) * (!same && adh_dist_bool));
        adh_vel.y += (cfg.vel_array[j].y * (dist/boid.fov) * (!same && adh_dist_bool));
        adh_contributors += (!same && adh_dist_bool);
    }
    //center_percieved.x /= (BOID_NUM - 1);
    //center_percieved.y /= (BOID_NUM - 1);
    coh_contributors = bif(coh_contributors, 0);
    adh_contributors = bif(adh_contributors, 0);

    net_vel.x += ((center_percieved.x / (coh_contributors)) - pos.x) * COHESION;
    net_vel.y += ((center_percieved.y / (coh_contributors)) - pos.y) * COHESION;

    net_vel.x += repulsion_vel.x * REPULSION;
    net_vel.y += repulsion_vel.y * REPULSION;

    net_vel.x += ((adh_vel.x / adh_contributors) - vel.x) * ADHESION;
    net_vel.y += ((adh_vel.y / adh_contributors) - vel.y) * ADHESION;
   
   // Velocity Increment
   vel.x += net_vel.x;
   vel.y += net_vel.y;
   
   //Wall Avoidance
   if (pos.x < margin) {
       vel.x += STEERINGSTRENGTH;
   }
   else if (pos.x > cfg.win_width - margin) {
       vel.x -= STEERINGSTRENGTH;
   }
   if (pos.y < margin) {
       vel.y += STEERINGSTRENGTH;
   }
   else if (pos.y > cfg.win_height - margin) {
       vel.y -= STEERINGSTRENGTH;
   }
   //Speed Cap
   //1.4142 ~ sqrt(2)
   if (Math.sqrt(vel.x ** 2 + vel.y ** 2) > (Math.SQRT2 * SPEED)) {
       if (vel.x > 0) { vel.x = (SPEED); }
       else { vel.x = ((-1) * SPEED); }
       if (vel.y > 0) { vel.y = (SPEED); }
       else { vel.y = ((-1) * SPEED); }
    }
    
    // Positional Increment
    pos.x = (pos.x + vel.x) % cfg.win_width;
    pos.y = (pos.y + vel.y) % cfg.win_height;

}


function generateBoids(cfg) {
    for (let i = 0; i < BOID_NUM; i++) {
        cfg.pos_array[i] = new Pos(randRange(cfg.win_width - 20, 20), randRange(cfg.win_height - 20, 20));
        cfg.vel_array[i] = new Vel(Math.random() * 2 - 1, Math.random() * 2 - 1);
        cfg.boids[i] = new Boid(i, i);
    }
}

function resizeCanvas() {
    cfg.canvas = document.getElementById("world");
    // Set the dimensions of the window. 30, and 20 are window scalars since window does not fit in box.
    cfg.win_width = cfg.canvas.width = window.innerWidth - 30;
    cfg.win_height = cfg.canvas.height = window.innerHeight - 20;
}

function draw(cfg, ctx) {
    ctx.clearRect(0, 0, cfg.win_width, cfg.win_height);
    cfg.pos_array.forEach(element => drawCircle(element.x, element.y, BOID_RAD, ctx));
}

//  x, y = position of the center of the circle
//  rad = radius of the circle
//  ctx = canvas context
//  color = color in hex, default black
//  filled = boolean for filled or border, default true
function drawCircle(x, y, rad, ctx, color = '#000000', filled = true) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    //Since circle is starting at angle = 0; x must be
    //increased by radius to allow circle to be drawn properly
    ctx.arc(x + rad, y, rad, 0, Math.PI * 2, true);
    ctx.fillStyle = color;
    if (filled == true) {
        ctx.fill();
    }
    else {
        ctx.stroke();
    }
}

//Branchless if statement for variable assignment.
//Primary use is to correct 0 division issues.
//value: value to be checked
//check: value to compare to
//set_value: value to return if check is true
function bif(value, check, set_value = 1) {
   return (set_value * (value == check)) + (value * (value != check)) 
}

window.onload = function () {
    window.addEventListener("resize", resizeCanvas, false);
    //window.requestAnimationFrame(UpdateWorld);
    resizeCanvas();
    main(cfg);
}