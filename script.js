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
      this.canvas = null;                    //Canvas
      this.paused = false;                   //Paused variable (Not functional)
      this.win_height = 300;                 //Window height
      this.win_width = 400;                  //Window width
      this.debug = false;                    //Global Debug flag
      this.boids = new Array(BOID_NUM);      //Boid Objects
      this.pos_array = new Array(BOID_NUM);  //Position Components
      this.vel_array = new Array(BOID_NUM);  //Velocity Components
      this.population = BOID_NUM;

      this.groups = [];                      //Offical Groups
      this.dirty_groups = [];                //Dirty Group storage for later parsing
      this.group_queue = [];
      this.used_colors = ['rgb(0, 0, 0)'];   //Contains colors used for groups

      this.coh = COH_MULTIPLIER * COHESION;  //Global Cohesion Value
      this.rep = REP_MULTIPLIER * REPULSION; //Global Repulsion Value
      this.adh = ADH_MULTIPLIER * ADHESION;  //Global Adhesion Value
      this.fov = FOV;
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
      this.group_dirty = false; //May not be needed?
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

// Reserved Group ID's: 0
// 0: Wanderer group.
//       - for single boids.
//       - Group size is irrelevant
//       - Must be Colorless 
class Group
{
   constructor(id = 0)
   {
      this.id = id;
      this.members = [];
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
   cfg.canvas.addEventListener('click', function(event)
   {
      summonBoid(cfg, event.offsetX, event.offsetY)
   }, false);
   console.log(cfg.canvas);
   if (cfg.canvas.getContext)
   {
      generateBoids(cfg);
      generateGroups(cfg);
      updateWorld();
      //cfg.canvas.addEventListener("mousedown", function(e){ UpdateWorld(cfg, ctx); });


   }
   else
   {
      //Canvas Broke Code
   }
}
//The main "game loop" of the program
function updateWorld()
{
   let ctx = cfg.canvas.getContext('2d');
   updateVariables(cfg);
   if(cfg.paused == false)
   {
      boidSystem(cfg);
   }
   draw(cfg, ctx);
   generate_tooltip(cfg.win_width / 2, 20, "Boids", 12, ctx);

   window.requestAnimationFrame(updateWorld);
}

//The system controlling boids
function boidSystem(cfg)
{
   for (let i = 0; i < cfg.population; i++)
   {
      handleMovement(cfg.boids[i], cfg);
   }
   inefficientGrouping(cfg);
   //handleColor(cfg);
}

//Subsystem that handles the boid movement rules
function handleMovement(boid, cfg)
{
   let margin = 40;
   //let boids = cfg.boids;
   let pos = cfg.pos_array[boid.pos];
   let vel = cfg.vel_array[boid.vel];

   let net_vel = new Vel(0, 0);

   let center_percieved = new Pos(0, 0);
   let coh_contributors = 0;

   let repulsion_vel = new Vel(0, 0);

   let adh_vel = new Vel(0, 0);
   let adh_contributors = 0;

   // 

   for (let j = 0; j < cfg.population; j++)
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
      repulsion_vel.x -= (other_pos.x - pos.x) * (!same && rep_dist_bool);
      repulsion_vel.y -= (other_pos.y - pos.y) * (!same && rep_dist_bool);

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
//Subsystem that will color the boids based on the groups they are in
//function handleColor(cfg)
//{
//   for (let i = 0; i < BOID_NUM; i++)
//   {
//      let boid = cfg.boids[i];
//      if (boid.group_dirty) 
//      {
//         let pos = cfg.pos_array[boid.pos];
//         let boid_group = [];
//         boid_group.append(i);
//         boid.group_dirty = false;
//
//         for (let j = i + 1; j < BOID_NUM; j++) 
//         {
//            let same = (i == j);
//            let other = cfg.pos_array[j];
//            let dist = dits(other, pos);
//            let in_view = dist < boid.fov;
//
//            if (in_view)
//            {
//               boid_group.push(j);
//            }
//
//         }
//         let finished = false;
//         while (!finished)
//         {
//            for (let j = 1; j < boid_group.length; j++)
//            {
//               let iter_boid = cfg.pos_array[boid_group[j]];
//               for (let k = 1; k < BOID_NUM; k++)
//               {
//                  let other = cfg.pos_array[k];
//               }
//               let same = (k == iter_boid.pos);
//               let dist = dist(other, pos);
//               let in_view = dist < boid.fov;
//               if (in_view)
//               {
//
//               }
//            }
//         }
//
//         for (let j = 0; j < boid_group.length; j++) 
//         {
//
//         }
//      }
//   }
//
//}

function inefficientGrouping(cfg)
{
   let remaining_dirty = [...cfg.boids];
   let previous_groups = [...cfg.groups];
   cfg.groups = [new Group()];         //Initialized new group array with Wanderer's group

   //Iterates through each boid in the dirty array
   for (let i = 0; i < remaining_dirty.length; i++)
   {
      let new_group = [];                             // Create new_group for each iteration
      let root_boid = remaining_dirty[i];             // Get the root boid
      root_boid.group_dirty = false;                  // Clean root group boid
      new_group.push(root_boid);                      // Assign to new_group
      remaining_dirty.splice(i,1);                    // Remove boid from the dirty array (cleaning)
      i--;                                            // Decrement i to handle new array length
      let root_boid_pos = cfg.pos_array[root_boid.pos];   // Fetch boid Pos Component to reduce repetitious fetching

      // Iterates through the dirty boids a second time to calculate distance and form first group
      // Appends to group if within fov.
      {
         let finished = false;
         let j = 0;
         while(!finished)
         {
            let other_boid = remaining_dirty[j];
            if (other_boid != undefined)
            {
               let other_pos = cfg.pos_array[other_boid.pos];
               let distance = dist(other_pos, root_boid_pos);
               if (root_boid.fov > distance)
               {
                  // Appends other boid to new group if it is within fov
                  // Mark boid clean.
                  new_group.push(other_boid);
                  other_boid.group_dirty = false;
                  remaining_dirty.splice(j,1);
                  j--; // Correction for the reduction in length of the array
               }
            }
            if(remaining_dirty.length > j){
               j++
            } else {
               finished = true;
            }
         }
      }

      // If the group is greater than one, iterate through the children of the root boid
      // and add the new found boids to the group if they are not cleaned. Boids are cleaned
      // when appended to the new group.
      
      if (new_group.length != 1)
      {
         //Iterate through the new_group and append new boids
         let finished = false;
         let j = 1;
         while (!finished)
         {
            let next_boid = new_group[j];
            let next_pos = cfg.pos_array[next_boid.pos];
            for(let k = 0; k < remaining_dirty.length; k++)
            {
               let other_boid = remaining_dirty[k];
               let other_pos = cfg.pos_array[other_boid.pos];
               let distance = dist(other_pos, next_pos);
               if (distance < cfg.fov)
               {
                  new_group.push(other_boid);
                  remaining_dirty.splice(k,1);
                  k--;
               }
            }
            if (new_group.length > (j + 1))
            {
               j++;
            } else
            {
               finished = true;
            }
         }
         //TODO remove pop undefined edgecase error.

         // Handle Grouping
         // Fetch the group id from helper function
         // If the group id is not defined, throw an error
         // If the group id does not exist in the record, create a new instance.
         // If the group record in the cfg is larger than the found group,
         //    append the found group to the cfg.dirty_group for later handling.
         // Else update group memebers with the found group. 
         let final_group_id = groupVote(new_group);
         if (final_group_id == undefined) { console.error("Group id returned Undefined. This should not happen."); }
         else if(final_group_id == 0 || previous_groups[final_group_id] == undefined) {
            console.log("ID: " + final_group_id);
            console.log("New group: ");
            console.log(new_group);
            console.log("Group ID of 0 found: " + (final_group_id == 0).toString());
            console.log("Previous Group DNE: " + (previous_groups[final_group_id] == undefined).toString())
            //console.log(previous_groups)
            let new_id = new_group.find(element => element != 0);
            if (new_id == 0 || new_id == undefined || previous_groups[new_id] == undefined)
            {
               cfg.group_queue.push(new_group);
            } else {
               let new_final_group = new Group(new_id);
               new_final_group.members = new_group;
               new_final_group.color = previous_groups[new_id].color;
               cfg.dirty_groups.append(new_final_group);
            }
         }
         else
         {
            let new_final_group = new Group(final_group_id);
            new_final_group.members = new_group;
            new_final_group.color = previous_groups[final_group_id].color;
            // Check the boid group against the cfg to determine if group size is less than
            if (previous_groups[final_group_id].length > new_final_group.members.length)
            {
               cfg.dirty_groups.push(new_final_group);
            } else
            {
               // Update the cfg group with the new members.
               // Update each group memebers id to the new group.
               for (let j = 0; j < new_final_group.members.length; j++)
               {
                  new_final_group.members[j].group = final_group_id;
               }
               cfg.groups[final_group_id] = new_final_group;
            }
         }

      } else 
      {
         //Assign wanderer
         root_boid.group = 0;
      }
   }

   // Iterate through the dirty groups
   // Pop the boids from the dirty groups to clean
   //
   // Edge Cases:
   //    Initial Groups need to be assigned
   //       -Initial Grouping Function
   //    More than 2 groups with same id
   //       -Collect all groups
   //    One group with an id
   //       -Simple Assignement
   if(cfg.dirty_groups.length != 0)
   {
      let unique_ids = [];
      //Collects unique IDs
      for (let i = 0; i < cfg.dirty_groups.length; i++)
      {
         let group = cfg.dirty_groups[i];
         if (unique_ids.find(id => id == group.id) == undefined)
         {
            unique_ids.push(group.id);
         }
      }
      // Collect similar groups for operation.
      for (let i = 0; i < unique_ids.length; i++)
      {
         let op_id = unique_ids[i];
         let op_group = [];

         // Collects similar groups and puts them in op_group;
         for (let j = 0; j < cfg.dirty_groups.length; j++)
         {
            let group = cfg.dirty_groups[j];
            if (group.id == op_id)
            {
               op_group.push(group);
            }
         }
         //handle group assignments based on op_group size
         console.log("Boid id: " + op_group[0].pos + " Group Length: " + op_group.length);
         switch (op_group.length)
         {
            // All Negative cases are negligible as it returns a length
            // Case 0 is an error case. 
            case 0:
               console.error("Tried to operate dirty group assignment with no dirty groups.");
            // Case 1 is just a simple override of the group in the log.
            case 1:
               cfg.groups[op_id].members = op_group[0].members;
               array.forEach(element => { element.group = op_id; });
            // Case 2 is a simple comparison of groups size
            // The larger group gets a new group, the smaller group gets a new group
            case 2:
               {
                  let group1 = op_group[0];
                  let group2 = op_group[1];
                  let new_group = new Group(op_id);
                  new_group.color = previous_groups[op_id].color;
                  if(group1.length > group2.length)
                  {
                     new_group.members = group1;
                     cfg.group_queue.push(group2);
                  }
                  else
                  {
                     new_group.members = group2;
                     cfg.group_queue.push(group1);
                  }
                  cfg.groups[op_id] = new_group;
               }
            //default is for any case that is larger than 3
            //The largest group claims the group
            //The smaller groups are given new groups
            default:
               {
                  let pop_max = 0;
                  let max_ind = 0;
                  let new_group = new Group(op_id);
                  new_group.color = previous_groups[op_id].color;
                  for (let j = 0; j < op_group.length; j++)
                  {
                     let size = op_group[j].members.length;
                     pop_max = Math.max(pop_max, size);
                     if (pop_max == size) { max_ind = j; }
                  }
                  new_group.members = op_group[max_ind].members
                  cfg.groups[op_id] = new_group;
                  op_group.splice(max_ind,1);
                  for (let j = 0; j < op_group.length; j++)
                  {
                     cfg.group_queue.push(op_group[j]);
                  }
               }
         }

      }
   }
   appendGroupQueue(cfg);
   cfg.dirty_groups = [];
}

function groupVote(boids)
{
   let group_num = [];
   let group_vote = [];

   // Append the first boid group number to the list, and increment the same
   // index of the vote array.
   group_num.push(boids[0].group);
   group_vote.push(1);

   for (let a = 1; a < boids.length; a++)
   {
      let boid = boids[a];
      let index = group_num.findIndex(element => element == boid.group);
      if (index == undefined)
      {
         group_num.push(boid.group);
         group_vote.push(1);
      } else
      {
         group_vote[index]++;
      }
   }

   let max = arrayMax(group_vote);
   let max_index = group_vote.findIndex(element => element == max);
   if (max_index == undefined) 
   {
      return undefined;
   }
   //console.log("Voted for: " + group_num[max_index])
   //console.log("Number: ") 
   //console.log(group_num)
   //console.log(" Votes: ")
   //console.log(group_vote);
   return group_num[max_index];
}

// This function is supposed to find an unused group and replace its content
// This idea has proven very difficult, so I have just opted to append a new group
// This method should not cause an information overflow in the long run since the boids
// will theoretically stabilize, but it is a problem I can not solve currently. 
function occupyNewGroup(cfg, members)
{
   let new_group = new Group(cfg.groups.length);
   new_group.members = members;
   new_group.color = generateColor(cfg);
   let found = false;
   let i = 1;
   while(i < cfg.groups.length && !found)
   {
      if(cfg.groups[i] == undefined && !found)
      {
         cfg.groups[i] = new_group;
         cfg.groups[i].id = i;
         found = true;
      }
      i++;
   }
   if(found == false)
   {
      cfg.groups.push(new_group);
   }
   new_group.members.forEach(member => {
      member.group = new_group.id; 
   })
   console.log("New Color: " + new_group.color);
   //cfg.groups.push(new_group);
}

function appendGroupQueue(cfg)
{
   cfg.group_queue.forEach(group => {
      occupyNewGroup(cfg, group);
   })
   cfg.group_queue = [];
}


function generateBoids(cfg)
{
   for (let i = 0; i < cfg.population; i++)
   {
      cfg.pos_array[i] = new Pos(randRange(cfg.win_width - 20, 20), randRange(cfg.win_height - 20, 20));
      cfg.vel_array[i] = new Vel(Math.random() * 2 - 1, Math.random() * 2 - 1);
      cfg.boids[i] = new Boid(i, i);
   }
}

function summonBoid(cfg, x, y)
{
   
   cfg.pos_array.push(new Pos(x, y));
   cfg.vel_array.push(new Vel(Math.random() * 2 - 1, Math.random() * 2 - 1));
   cfg.boids.push(new Boid(cfg.pos_array.length - 1, cfg.vel_array.length - 1));

}

function generateGroups(cfg)
{
   let wander = new Group(0);
   wander.color = "#000000";
   cfg.groups[0] = wander;
   for (let i = 1; i < cfg.groups.length; i++)
   {
      let group = new Group(i);
      group.color = generateColor(cfg);
      cfg.groups[i] = group;
   }
}

function generateColor(cfg)
{
   let finished = false;
   let color_string = 'rgb(';
   while (!finished)
   {
      color_string += Math.floor(randRange(240, 20));
      color_string += ', ';
      color_string += Math.floor(randRange(240, 20));
      color_string += ', ';
      color_string += Math.floor(randRange(240, 20));
      color_string += ')';

      let not_found = cfg.used_colors.find(element => element == color_string) == undefined;
      if (not_found)
      {
         cfg.used_colors.push(color_string);
         finished = true;
      }
   }
   return color_string;
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
   cfg.boids.forEach(boid => 
   {
      let boid_pos = cfg.pos_array[boid.pos];
      let group = cfg.groups[boid.group];
      drawCircle(boid_pos.x, boid_pos.y, BOID_RAD, ctx, group.color);
   });
}

function loadInitialSettings()
{
   document.getElementById("coh").value = COHESION;
   document.getElementById("cohout").value = COHESION;
   document.getElementById("coh_mult").value = COH_MULTIPLIER;

   document.getElementById("rep").value = REPULSION;
   document.getElementById("repout").value = REPULSION;
   document.getElementById("rep_mult").value = REP_MULTIPLIER;

   document.getElementById("adh").value = ADHESION;
   document.getElementById("adhout").value = ADHESION;
   document.getElementById("adh_mult").value = ADH_MULTIPLIER;
}

function updateVariables(cfg)
{
   cfg.population = cfg.boids.length;

   let coh = document.getElementById("coh").value;
   let coh_mult = document.getElementById("coh_mult").value;
   cfg.coh = coh * coh_mult;

   let rep = document.getElementById("rep").value;
   let rep_mult = document.getElementById("rep_mult").value;
   cfg.rep = rep * rep_mult;

   let adh = document.getElementById("adh").value;
   let adh_mult = document.getElementById("adh_mult").value;
   cfg.adh = adh * adh_mult;

   cfg.paused = document.getElementById("pause").checked;
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

// x,y = position of the center of the text
// text = text to be printed
// size = size of the text in CSS px
// color = color of the text and bounding box
// padding =  width of the text padding
function generate_tooltip(x, y, text, size, ctx, color = "#000000", padding = 2)
{
   ctx.font = "" + size + "px mono";
   ctx.fillStyle = color;
   ctx.strokeStyle = color;
   ctx.direction = "ltr";
   ctx.textAlign = "center";
   let text_eval = ctx.measureText(text);
   ctx.strokeRect(x - (text_eval.width / 2) - padding, y - size - padding, text_eval.width + (padding * 2), size + (padding * 2));
   ctx.fillText(text, x, y);
}

function arrayMax(array)
{
   let length = array.length;
   let max = -Infinity;
   while (length > -1)
   {
      if (array[length] > max) 
      {
         max = array[length];
      }
      length--;
   }
   return max;
}



window.onload = function ()
{
   window.addEventListener("resize", resizeCanvas, false);
   //window.requestAnimationFrame(UpdateWorld);
   loadInitialSettings();
   resizeCanvas();
   main(cfg);
};
