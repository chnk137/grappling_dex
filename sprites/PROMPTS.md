# Grappling Dex sprite prompts (for ChatGPT)

One image per position. Make them in ChatGPT, save each with the file name shown, and put it in `sprites/originals/`. Then run `npm run sprites` in the `app` folder (or ask Claude to) and they show up in the web dex and the app.

You don't need all 40. Start with the positions you train; the rest keep their current icon until they have a picture.

## How to work in ChatGPT

1. Start a new chat and paste the **style guide** below once.
2. Paste one position prompt at a time.
3. Check the pose against the "Must show" line. If something is off, say exactly what: *"His right shin should be across the partner's right shin, not his knee."* A photo from class works well as a reference: *"Use this photo for the pose, keep the style."*
4. When you get one you like, keep using it for consistency: *"Same characters and style as the closed guard image."*
5. Download it as PNG and rename it to the file name given.

## Style guide (paste this first)

```text
You'll draw a series of sprites for a Brazilian jiu-jitsu "dex" app, one grappling position per image. Every image must follow this style:

- Clean 16-bit-era pixel art with crisp, visible pixels and a limited palette. Original art; not in the style of any existing game.
- Square 1:1 image. Transparent background. A short, thin dark mat line under the figures. No scenery, no frame, no text, no logos.
- Two adult grapplers, the same two characters in every image:
  - Player A (the "you" player): gold gi, dark belt, short dark hair.
  - Player B (the partner): cool grey gi, dark belt, shaved head.
- Side view by default; turn slightly (3/4) only when it makes the legs and grips easier to read.
- The figures fill about 80% of the width, centered.
- Technical accuracy matters more than style: limbs, hooks and grips must be exactly where the description says, and both bodies must be anatomically possible.

Reply "Ready" and wait for the first position.
```

## Positions

Player A (gold) is the person whose position it is: the guard player in guards, the attacker in leg entanglements, the top player in pins, passing and dominant positions.

### Standing and guards (gold on bottom)

**standing.png** · Standing
> Both players standing face to face in a grappling stance, knees bent, hands up. Gold has a collar tie on grey's neck with one hand and grips grey's wrist with the other.
> Must show: both on their feet, square to each other, one collar tie.

**closed.png** · Closed guard
> Gold lies on his back. Grey kneels upright between gold's legs, posture tall, hands on gold's hips. Gold's legs wrap around grey's waist with ankles crossed behind grey's lower back. Gold holds grey's collar and sleeve.
> Must show: gold's ankles locked behind grey's back; grey on both knees.

**collar.png** · Collar-sleeve guard
> Gold sits on his back/hip on the mat. Grey stands. Gold grips grey's collar with one hand and grey's sleeve with the other. Gold's foot on the sleeve side pushes into grey's bicep; gold's other foot hooks behind grey's knee.
> Must show: one foot on the bicep, one foot hooked behind the knee, collar and sleeve grips.

**spider.png** · Spider guard
> Gold on his back. Grey kneels or crouches over him. Gold grips both of grey's sleeves and puts the soles of both feet on grey's biceps, pushing grey's arms out and back.
> Must show: both feet on both biceps, both sleeve grips, gold's legs bent like springs.

**lasso.png** · Lasso guard
> Gold on his back, grey crouching. Gold's left leg wraps around the outside of grey's right arm and the shin lies across the back of grey's arm, foot near grey's armpit, while gold grips that same sleeve. Gold's other foot pushes on grey's hip or other bicep.
> Must show: one leg wrapped around the outside of grey's arm (the lasso) with the sleeve grip on that arm.

**dlr.png** · De La Riva
> Gold on his back. Grey stands. Gold's left leg hooks from the outside around grey's right leg, the foot curling in behind grey's thigh. Gold's left hand holds grey's right ankle. Gold's right foot pushes on grey's left hip.
> Must show: the outside hook wrapped around grey's lead leg with the ankle grip.

**rdlr.png** · Reverse De La Riva
> Gold on his back, grey standing with weight forward. Gold's left leg goes between grey's legs and hooks from the inside around grey's right leg, the foot hooking outside grey's knee. Gold grips grey's right pant leg or ankle.
> Must show: the hook entering from the inside of grey's lead leg (the reverse of De La Riva).

**butterfly.png** · Butterfly guard
> Gold sits up on his butt, chest upright, facing grey who kneels/sits in front of him. Both of gold's feet are hooked under grey's thighs (insteps under the inner thighs). Gold has an underhook on one side and an overhook on the other.
> Must show: gold seated, both feet hooked under grey's thighs.

**xguard.png** · X-guard
> Gold on his back underneath grey, who stands. Gold's legs make an X around one of grey's legs: one foot hooks behind grey's knee, the other foot pushes on grey's hip/thigh from the front. Gold hugs grey's other leg with both arms.
> Must show: gold directly under grey, legs crossed in an X around one leg.

**half.png** · Half guard
> Gold on his side on the bottom. Grey is on top, chest to chest. Gold's legs trap one of grey's legs between them, ankles crossed (lockdown style). Gold has an underhook on grey's back.
> Must show: exactly one of grey's legs trapped between gold's legs.

**kneeShield.png** · Knee shield (Z-guard)
> Gold on his side on the bottom, grey on top in half guard. Gold's top knee and shin are wedged across grey's chest/belly as a frame. Gold's bottom leg still traps grey's leg. Gold's hand frames on grey's collar or shoulder.
> Must show: the knee pressed across grey's torso as a shield while one leg is trapped.

**deepHalf.png** · Deep half
> Gold is underneath grey, his body fully under grey's hips, hugging grey's trapped leg like a backpack. Gold's legs wrap that same leg. Grey is on top on his knees, trying to stay balanced.
> Must show: gold's head and body under grey's hips, gold hugging one of grey's legs.

**shin.png** · Shin-to-shin
> Gold sits on the mat leaning back on his left hand. Grey stands in a staggered stance. Gold's right shin presses across the front of grey's right (lead) shin, gold's foot hooking around the outside of grey's calf. Gold's right hand holds grey's right ankle or pant leg.
> Must show: gold's shin crossing in front of grey's shin, gold seated, grey standing.

**waiterGuard.png** · Waiter guard
> Gold is underneath grey from deep half, lying on his back with one leg lifted. Gold's leg is between grey's legs, foot hooking under grey's near thigh and lifting it up, while gold holds grey's leg like a waiter carrying a tray.
> Must show: gold under grey's hips lifting one of grey's legs up with his foot/shin.

**octopus.png** · Octopus guard
> Gold sits up on his hip beside grey from bottom half guard, reaching his far arm over grey's back to grab around grey's far side, head tight to grey's body. Grey is on top, hips trapped.
> Must show: gold sitting up behind grey's shoulder with his arm wrapped over grey's back.

**worm.png** · Worm guard
> Gold on his back. Grey stands. Grey's lapel has been pulled out and fed around the back of grey's lead leg; gold holds the lapel end tightly and has the same-side leg hooked around grey's leg, the lapel wrapping and trapping it.
> Must show: grey's own lapel wrapped around grey's lead leg and held by gold.

### Leg entanglements (gold is the attacker)

**kguard.png** · K-guard
> Gold on his back/side under grey, who kneels or crouches. Gold's inside leg goes between grey's legs and hooks across grey's hips from underneath; gold's other leg goes behind grey's far leg, so gold's legs form a "K" shape around one leg and the hips.
> Must show: gold underneath, one shin threaded across grey's hips, the other leg behind grey's far leg.

**slx.png** · Single leg X (straight ashi)
> Gold on his back. Grey stands on one leg. Gold's outside foot is on grey's near hip, gold's inside leg hooks behind grey's knee, and gold hugs grey's ankle against his chest.
> Must show: grey's foot clamped at gold's armpit/chest, one foot on grey's hip, one leg behind the knee.

**outsideAshi.png** · Outside ashi
> Gold on his side. Grey sits back. Gold's legs wrap grey's leg with gold's top foot crossing over to the outside of grey's hip, legs locked. Gold's arms wrap grey's heel.
> Must show: gold's legs clamped around grey's leg with the top foot on the outside of grey's hip.

**saddle.png** · Saddle (inside sankaku)
> Both sit on the mat, legs tangled. Gold has grey's right leg trapped between his thighs. Gold's left leg goes across grey's hips/groin and his right leg wraps behind grey's knee, and gold's ankles lock in a triangle on the outside of grey's left hip. Gold's arms wrap grey's right heel. Grey sits back on his hands.
> Must show: gold's legs locked in a triangle across grey's hips with grey's leg trapped between gold's thighs.

**crossAshi.png** · Cross ashi
> Both on the mat. Gold traps grey's leg between his legs, gold's legs crossing on the outside of grey's opposite hip (diagonal across grey's body). Gold holds grey's heel.
> Must show: gold's legs crossed diagonally across grey's hips, one of grey's legs trapped.

**fifty.png** · 50-50
> Both sit on the mat facing each other, mirror images. Each player's right leg is wrapped around the other's right leg (legs interlaced in a figure-four). Gold holds grey's heel.
> Must show: perfectly symmetrical leg entanglement with both players' legs mirrored.

**backside50.png** · Back-side 50-50
> Like 50-50, but grey has turned away onto his belly/side, showing his back. Gold keeps his legs wrapped around grey's same-side leg from behind and holds grey's heel.
> Must show: grey facing away from gold while the 50-50 leg wrap stays locked.

### Passing and top positions (gold on top)

**hq.png** · Headquarters (HQ)
> Grey on his back with one leg up. Gold is in a low kneeling stance with one knee wedged between grey's legs and his other foot posted out wide, hands pressing grey's knee and hip down.
> Must show: gold's knee between grey's legs, the other foot posted wide (one knee down, one foot up).

**bodyLockTop.png** · Body lock (passing)
> Grey on his back in butterfly or half guard. Gold is over him, chest on grey's belly, both arms locked around grey's lower back (hands clasped), hips low and heavy.
> Must show: gold's hands locked around grey's waist, chest on grey's body.

**legDragTop.png** · Leg drag (top)
> Grey on his back, twisted to his side. Gold drags grey's legs across his own body so grey's knees point away; gold's hip and knee pin grey's legs to the mat on the far side while gold's chest moves up toward grey's hip.
> Must show: grey's legs pushed across to one side, gold beside grey's hips pinning them.

**topHalf.png** · Top half guard
> Gold on top, chest to chest. Grey's legs trap one of gold's legs. Gold has a crossface (forearm across grey's face) and an underhook, his free leg posted.
> Must show: one of gold's legs trapped by grey's legs, gold heavy on grey's chest.

**side.png** · Side control
> Grey flat on his back. Gold lies across grey perpendicular, chest on chest, knees on the mat next to grey's hips and head side, one arm under grey's head.
> Must show: gold perpendicular across grey's chest, grey flat.

**kesa.png** · Kesa gatame (scarf hold)
> Grey on his back. Gold sits on his hip beside grey's chest, facing toward grey's head, legs sprawled wide (one forward, one back), one arm wrapped around grey's head and the other clamping grey's arm under gold's armpit.
> Must show: gold sitting sideways at grey's shoulder, holding grey's head and arm.

**kob.png** · Knee on belly
> Grey on his back. Gold's right knee is on grey's belly, gold's left leg posted out wide, gold's upper body upright, gripping grey's collar and belt/pants.
> Must show: one knee on grey's stomach, the other leg posted, gold upright.

**ns.png** · North-south
> Grey on his back. Gold lies on top facing the opposite direction, chest on grey's chest, gold's head over grey's belly and gold's knees by grey's head.
> Must show: head-to-toe chest-to-chest, gold's hips by grey's head.

**truck.png** · Truck
> Grey is on his side/knees, partly turtled. Gold sits behind grey's hip with one leg triangled around grey's far leg (like a lockdown) and his body to the side of grey's back, controlling grey's hips.
> Must show: gold's legs locking one of grey's legs while gold sits behind grey's hip.

**turtle.png** · Turtle
> Grey is turtled: on knees and elbows, back rounded, head tucked. Gold is on top on the side of grey, chest on grey's back, one arm hooking around grey's waist.
> Must show: grey curled on knees and elbows with gold on top of his back.

**frontHeadlock.png** · Front headlock
> Grey is on his knees or bent forward. Gold is in front of grey, sprawled with his chest on grey's upper back, one arm around grey's head and neck and the other gripping grey's arm.
> Must show: gold facing grey from the front, chest on grey's back, grey's head under gold's armpit.

**crucifix.png** · Crucifix
> Grey is on his side or back. Gold lies perpendicular across grey's upper back/chest; grey's near arm is trapped between gold's legs and grey's far arm is held by gold's arms, so both of grey's arms are pinned out like a cross.
> Must show: one of grey's arms trapped between gold's legs and the other held by gold's arms.

### Dominant positions (gold on top or behind)

**mount.png** · Mount
> Grey flat on his back. Gold sits astride grey's belly, knees on the mat on both sides of grey's torso, posture upright, hands on grey's chest.
> Must show: gold straddling grey with both knees on the mat.

**sMount.png** · High / S-mount
> Grey on his back. Gold is in mount but shifted high: one knee up by grey's head, the other leg tucked under so gold's foot is by grey's hip, forming an "S" shape; gold holds grey's arm.
> Must show: gold's legs in an S shape high on grey's chest with grey's arm isolated.

**techMount.png** · Technical mount
> Grey on his side. Gold is on top behind grey's back, one knee tucked tight into grey's back and the other leg posted over grey's front, gold's hands controlling grey's head and arm.
> Must show: gold's knee in grey's back, other leg posted, grey on his side.

**back.png** · Back control
> Both sit on the mat. Gold sits behind grey, chest to grey's back, both of gold's heels hooked inside grey's thighs, gold's arms in a seatbelt grip (one over the shoulder, one under the arm).
> Must show: both hooks in, seatbelt grip, gold's chest to grey's back.

**crabRide.png** · Crab ride
> Grey sits or kneels facing away. Gold is sitting behind grey's hips, both of gold's feet hooked inside grey's thighs from behind (like back hooks but lower, at the hips), holding grey's belt or far leg.
> Must show: gold sitting behind grey's hips with both hooks in at hip level, not at the chest.
