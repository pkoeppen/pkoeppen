attribute vec2 instanceOffset;
attribute vec3 instanceColor;
attribute float instanceAlpha;

uniform float uTime;
uniform float uScroll;
uniform float uWaveLength;
uniform float uAmplitude;
uniform float uBaseScale;

varying vec3 vColor;
varying float vAlpha;

void main() {
    vColor = instanceColor;
    vAlpha = instanceAlpha;

    vec3 pos = position;

    // put this pixel at its instance position first
    pos.xy += instanceOffset;

    // ---- GRADIENT STRETCH FROM BOTTOM ----
    float uBottomY = -34.0;
    float uTopY = 10.0;
    float uStretch = 1.3;
    float t = clamp((pos.y - uBottomY) / (uTopY - uBottomY), 0.0, 1.0); // 0 = bottom, 1 = top

    // 1 at top, uStretch at bottom
    float stretch = mix(uStretch, 1.0, t);
    float m = stretch * stretch * stretch * stretch;

    // float b = -34.0;
    // if (pos.y < b) {
    //     pos.y = b;
    // }

    // float t = 30.0;
    // if (pos.y > t) {
    //     pos.y = t;
    // }

    // pos.z = 50.0;
    // pos.z *= m;

    // --------------------------------------

    // frayed effect along bottom
    float frayed = sin(pos.y * 10.0 + uTime * 0.5) * 0.1;
    //pos.xy += frayed;

    //pos.y = abs(pos.y) * 0.1;

    float s = instanceOffset.x + instanceOffset.y;
    float spatialPhase = (s / uWaveLength) * 6.2831853; // 2π
    float phase = spatialPhase + uTime * 0.5;
    float scale = sin(phase) * uAmplitude + uBaseScale;
    pos.xy += scale;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}