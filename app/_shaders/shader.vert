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

    // base pixel position
    vec3 pos = position;

    // diagonal coordinate
    float s = instanceOffset.x + instanceOffset.y;

    // vec2 center = instanceOffset;
    // float t = clamp(uTime / 0.5, 0.0, 1.0);
    // float ease = smoothstep(0.0, 1.0, t);
    // float distance = length(center);
    // vec2 startCenter = instanceOffset * 10.0;

    // // interpolate from the circle → actual position
    // vec2 animatedCenter = mix(startCenter, center, ease);

    // pos.xy = animatedCenter + pos.xy;

    pos.xy += instanceOffset;

    // wave along diagonal
    float spatialPhase = (s / uWaveLength) * 6.2831853; // 2π
    float phase = spatialPhase + uTime * 0.5;
    float scale = sin(phase) * uAmplitude + uBaseScale;
    pos.xy += scale;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}