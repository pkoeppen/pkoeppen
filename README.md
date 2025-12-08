Texel Thing plan

1. Generate AI images of each beat
2. Generate AI video interpolating between beats
3. Take generated video and:
   - shrink it
   - reduce framerate
   - convert frames to array of pixel color RGBA tuples (key alpha by background color)
   - create index of beats/breakpoints
4. Take frame array and draw texels with Three.js
