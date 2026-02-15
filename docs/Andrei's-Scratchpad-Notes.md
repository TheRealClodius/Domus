This is the developer's scratchpad. 
He uses it to write down thought and as an agent you can use it as background context. 

# Scenarios
Rough sketches of the scenarios I am after, in no particular order. 
To discuss. 


## App loading
Andrei opens https://hellodomos.com and app loads. Visual elements load in layers, not all at once. Loading is choreographed and hierarchical. 
First the background, flat color. Then the Canvas fades-in with a ever so slight scale effect as well. 
We communicate the concept of "spaces" visually through a separation from the website background and we use a full-screen card with slight 4 insets from edges and rounded corners that tonally separates from the actual website background. This full screen insetted card with corner radii is the Canvas. 
The Canvas contain the various core entities that are the different surfaces: 
- the prompt input (bottom inset, middle-x aligned), where user rights prompts
- app dock: where this space's apps are stacked and accessible. it can hide .
- cards
- window 

Order of appearance in the loading Choreography: 
- Background
- Canvas
- app dock + prompt input
- cards and windows as they are ready. 

if information is not ready yet, surfaces appear with their loading state and smoothly transition into their refreshed state. 

## Proactivity
Agent nudges user by asking a question after X-ms of inactivity after website access. 

## Template
Guest has a bunch of apps opened by default: a note, an image, the chat app and a calendar

## Learnings

The agent service uses the Supabase service role key (not anon key) because the agent has no user JWT session. The anon key respects RLS, and RLS needs `auth.uid()` from a JWT — which the agent doesn't have. Service role bypasses RLS; the agent enforces isolation itself by scoping queries with `space_id`/`user_id` from the Vercel-validated payload.
