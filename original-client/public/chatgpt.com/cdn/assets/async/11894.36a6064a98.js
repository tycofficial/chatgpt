export const __rspack_esm_ids=[11894];export const __webpack_modules__={ZtF1(a,b,c){c.d(b,{LifeSciencesHelixBackground:()=>O});var d=c("ABep"),e=c("IjbW"),f=c("zd8w"),g=c("PVZC"),h=c("STXV");let i={height:10.2,width:14.2},j=.04-1.9,k=2*Math.PI,l={backbones:64e3,bonds:2e4,motes:7600},m={backbones:44e3,bonds:14200,motes:5e3},n={backbones:38e3,bonds:12200,motes:4200},o=function(a){let b=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,c=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1;return Math.min(c,Math.max(b,a))};function p(a){return 2*a()-1}function q(a){return Math.sqrt(-2*Math.log(Math.max(a(),Number.EPSILON)))*Math.cos(k*a())}function r(a,b){let c=43758.5453123*Math.sin(127.1*a+311.7*b);return(c-Math.floor(c))*2-1}function s(a,b){let c=Math.floor(a),d=a-c,e=r(c,b)*d;return(e+(r(c+1,b)*(d-1)-e)*(d*d*d*(d*(6*d-15)+10)))*2}function t(a,b){return o(.68*s(a,b)+.23*s(2.07*a,b+17)+.09*s(4.11*a,b+43),-1,1)}let u=[{angleOffset:-4.99,depth:-5.8,depthEnd:7.2,helixTurns:42,motionPhase:.42,offsetX:.08,offsetY:-.04,opacity:.82,particleWeight:5,radiusScale:.64,radiusScaleEnd:1.48,sampleMultiplier:4.15,tunnelTurns:-6.4}],v=[{angleOffset:0,depth:.83,depthEnd:.38,helixTurns:1.05,mobilePath:{curvature:.045,rotation:-(27*Math.PI)/180,slope:-.075,y:.3},motionPhase:.36,offsetX:-2.03,offsetY:.27,opacity:1,particleWeight:6,railDepthScale:1.7,railRadiusScale:2.65,radiusScale:1,sampleMultiplier:1.65},{angleOffset:0,depth:.45,depthEnd:0,helixTurns:.92,mobilePath:{curvature:-.045,rotation:-(13*Math.PI)/180,slope:.065,y:-.3},motionPhase:.36,offsetX:0,offsetY:0,opacity:1,particleWeight:6,railDepthScale:1.65,railRadiusScale:2.35,radiusScale:.98,sampleMultiplier:1.65}];function w(a){return null==a?i:{height:Math.max(1,a.height+.84),width:Math.max(1,a.width+.84)}}function x(a){let[b,c,d]=a,e=Math.max(Math.hypot(b,c,d),1e-4);return[b/e,c/e,d/e]}function y(a,b){let[c,d,e]=a,[f,g,h]=b;return[c+f,d+g,e+h]}function z(a,b){let[c,d,e]=a;return[c*b,d*b,e*b]}function A(a,b,c){let d=o((c-a)/(b-a));return d*d*(3-2*d)}function B(a,b,c){return[a[0]+(b[0]-a[0])*c,a[1]+(b[1]-a[1])*c,a[2]+(b[2]-a[2])*c]}function C(a,b,c){if(c.mobilePath){let d=2*a-1,e=d*b.width*.95,f=b.height*(c.mobilePath.y+d*c.mobilePath.slope+(1-d*d)*c.mobilePath.curvature),g=c.mobilePath.rotation??0,h=Math.cos(g),i=Math.sin(g);return[c.offsetX+e*h-f*i,c.offsetY+e*i+f*h,c.depth+((c.depthEnd??c.depth)-c.depth)*a]}let d=c.tunnelTurns??1,e=Math.sign(d),f=function(a,b){let c=(b.depthEnd??b.depth)-b.depth;if(b.aperture||0===c)return a;let d=o((.68-b.depth)/c);if(a<=d)return a;let e=(a-d)/(1-d);return d+(.91*e+(1-.91)*(1-Math.pow(1-e,3))/3)*(1-d)}(a,c),g=c.aperture?0:A(2.75,3.3,b.width/b.height),h=A(.82,1,a),i=c.depth+((c.depthEnd??c.depth)-c.depth)*a,l=f*k*d-Math.PI/2+c.angleOffset+g*h*k*1*e,m=A(0,1,a),n=c.radiusScale+((c.radiusScaleEnd??c.radiusScale)-c.radiusScale)*m,p=(c.depthEnd??c.depth)-c.depth,q=A(0===p?1:o((.04-c.depth)/p),1,a),r=A(.6,1,a),s=c.aperture?0:A(j,-1.06,i)*(1-A(4.1,4.8,i))*.25,u=c.aperture?0:t(7.2*a,c.motionPhase+23)*q*(.14+.42*r),v=l+(c.aperture?0:t(7.2*a*.83+3.4,c.motionPhase+13)*q*(.07+.28*r)),w=c.aperture?1:(1-.54*q)*(1+1.76*r),x=c.aperture?1:1-Math.max(0,Math.cos(v))*r*.32,y=c.aperture?1:1-Math.max(0,Math.cos(v))*A(.7,.78,a)*(1-A(.82,.9,a))*.13,z=c.aperture?1:1+Math.max(0,Math.cos(v))*A(.9,1,a)*.16,B=c.aperture?0:A(j,-1.06,i)*(1-A(4.1,4.8,i)),C=c.aperture?1:1-Math.cos(v)*B*.1,D=Math.min(.39*b.height,.5*b.width)*n*w*x*y*z*C*(1+s)*(1+g*h*.48)*(1+u);return[c.offsetX+Math.cos(v)*D,c.offsetY+Math.sin(v)*D,i]}function D(a,b,c,d,e){let f=arguments.length>5&&void 0!==arguments[5]?arguments[5]:{};a.push({aperture:e.aperture??!1,end:c,kind:d,layerOpacity:e.opacity,particleWeight:f.particleWeight??e.particleWeight,start:b,thicknessScale:f.thicknessScale??1})}function E(a,b){if(a.aperture)return a.particleWeight;let c=1-A(0,1.35,Math.abs(b- -1.06));return Math.round(a.particleWeight*(1+1.65*c))}let F=[{bokehScale:32,cameraFov:43.2,dialRotation:-0,elapsedSeconds:0},{bokehScale:30,cameraFov:42.8,dialRotation:-((1.62-1.55)*.018),elapsedSeconds:.22},{bokehScale:24,cameraFov:42,dialRotation:-1.03*.018,elapsedSeconds:.56},{bokehScale:6.7,cameraFov:39.4,dialRotation:-((13.96-1.45-1.55)*.018),elapsedSeconds:1.22},{bokehScale:2.66,cameraFov:38.32,dialRotation:-((13.96+.38-1.55)*.018),elapsedSeconds:1.62},{bokehScale:1.8,cameraFov:39.08,dialRotation:-((13.96-.1-1.55)*.018),elapsedSeconds:2.22},{bokehScale:1.56,cameraFov:38.98,dialRotation:-((13.96+.025-1.55)*.018),elapsedSeconds:2.5},{bokehScale:1.5,cameraFov:39,dialRotation:-.22338,elapsedSeconds:2.72}];function G(a,b,c,d,e){let f=e*e,g=f*e;return(2*g-3*f+1)*b+(c-a)/2*.38*(g-2*f+e)+(-2*g+3*f)*c+(d-b)/2*.38*(g-f)}let H=`
  attribute vec3 aCenterlinePosition;
  attribute float aKind;
  attribute float aLayerOpacity;
  attribute float aScale;
  attribute float aSeed;
  attribute float aStrandPhase;
  attribute vec3 aTangentDirection;
  attribute vec2 aFlowDirection;

  uniform float uApertureRadius;
  uniform float uFocusBokeh;
  uniform float uIntroOpacity;
  uniform float uMotion;
  uniform float uPixelRatio;
  uniform float uPointSize;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform vec2 uViewport;

  varying float vKind;
  varying float vGlow;
  varying float vApertureStrength;
  varying float vApertureWrapStrength;
  varying float vCenterAttenuation;
  varying float vDepthBlur;
  varying float vParticleBokeh;
  varying float vOpacity;
  varying float vPulse;
  varying float vSeed;

  vec3 rotateAroundAxis(vec3 value, vec3 axis, float angle) {
    return value * cos(angle) +
      cross(axis, value) * sin(angle) +
      axis * dot(axis, value) * (1.0 - cos(angle));
  }

  void main() {
    float isMote = step(1.5, aKind);
    float isStructure = 1.0 - isMote;
    float spinSpeed = mix(0.74, 1.0, aLayerOpacity);
    float spinAngle =
      (uTime * 0.24 * spinSpeed +
        sin(uTime * 0.1 + aStrandPhase) * 0.045) * uMotion;

    vec3 radialPosition = position - aCenterlinePosition;
    vec3 spunPosition =
      aCenterlinePosition +
      rotateAroundAxis(
        radialPosition,
        normalize(aTangentDirection),
        spinAngle
      );
    vec3 resolvedPosition = mix(position, spunPosition, isStructure);

    float depthDrift = mix(
      0.52,
      1.58,
      smoothstep(-1.2, 1.2, position.z)
    );
    float strandDriftPhase = uTime * 0.18 + aStrandPhase;
    resolvedPosition.x +=
      cos(strandDriftPhase) * 0.026 * depthDrift * isStructure * uMotion;
    resolvedPosition.y +=
      sin(strandDriftPhase * 0.83) *
      0.022 *
      depthDrift *
      isStructure *
      uMotion;

    float moteTravelPhase = uTime * (0.22 + aSeed * 0.16) + aSeed * 19.0;
    float moteTravel =
      sin(moteTravelPhase) *
      (0.09 + aSeed * 0.08) *
      depthDrift *
      isMote *
      uMotion;
    resolvedPosition.xy += aFlowDirection * moteTravel;

    vec2 pointerWorld = uPointer * uViewport * 0.5;
    float pointerDistance = distance(resolvedPosition.xy, pointerWorld);
    float pointerGlow = exp(-pointerDistance * pointerDistance * 2.4) * uMotion;
    vec2 pointerOffset = resolvedPosition.xy - pointerWorld;
    resolvedPosition.xy += pointerOffset * pointerGlow * 0.09;

    vec4 viewPosition = modelViewMatrix * vec4(resolvedPosition, 1.0);
    float focusBlur = smoothstep(0.72, 7.2, abs(resolvedPosition.z + 4.0));
    float particleBokeh = clamp(
      pow(focusBlur, 1.34) * mix(0.45, 2.8, clamp(uFocusBokeh / 32.0, 0.0, 1.0)),
      0.0,
      1.0
    );
    float depthParallax = clamp(1.0 + position.z * 0.38, 0.55, 1.9);

    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize =
      aScale *
      uPointSize *
      uPixelRatio *
      (8.2 / max(-viewPosition.z, 0.1)) *
      depthParallax *
      mix(1.0, 2.2, particleBokeh) *
      (1.0 + pointerGlow * 0.3);

    float pulse =
      pow(
        max(sin(uTime * (0.58 + aSeed * 0.52) + aSeed * 41.0), 0.0),
        14.0
      ) *
      (0.26 + aSeed * 0.34) *
      isStructure *
      uMotion;
    float apertureVisibility = mix(
      1.0,
      smoothstep(
        uApertureRadius * 0.84,
        uApertureRadius * 1.03,
        length(resolvedPosition.xy)
      ),
      isStructure
    );
    float copyContrast = smoothstep(
      uApertureRadius * 0.72,
      uApertureRadius * 1.1,
      length(resolvedPosition.xy)
    );

    vKind = aKind;
    vGlow = pointerGlow;
    vApertureStrength = 0.0;
    vApertureWrapStrength = 0.0;
    vCenterAttenuation = mix(0.14, 1.0, copyContrast);
    vDepthBlur = focusBlur * isStructure;
    vParticleBokeh = particleBokeh * 0.45;
    vOpacity =
      uIntroOpacity *
      aLayerOpacity *
      apertureVisibility *
      (0.45 + isStructure * 0.23 - isMote * 0.12 + pulse * 0.36);
    vPulse = pulse;
    vSeed = aSeed;
  }
`,I=`
  uniform float uContrast;
  uniform vec3 uForeground;

  varying float vKind;
  varying float vGlow;
  varying float vApertureStrength;
  varying float vApertureWrapStrength;
  varying float vCenterAttenuation;
  varying float vDepthBlur;
  varying float vParticleBokeh;
  varying float vOpacity;
  varying float vPulse;
  varying float vSeed;

  void main() {
    float isMote = step(1.5, vKind);
    vec2 centered = gl_PointCoord - vec2(0.5);
    float radius = length(centered);
    float dustCore = pow(max(1.0 - radius / 0.34, 0.0), 1.8);
    float dustHalo = pow(max(1.0 - radius / 0.52, 0.0), 2.65);
    float apertureCore = pow(max(1.0 - radius / 0.49, 0.0), 1.7);
    float apertureHalo = pow(max(1.0 - radius / 0.52, 0.0), 4.4) * 0.26;
    float core = mix(dustCore, apertureCore, vApertureStrength);
    float halo = mix(dustHalo, apertureHalo, vApertureStrength);
    float depthSoftCore = pow(max(1.0 - radius / 0.46, 0.0), 2.2) * 0.38;
    float depthSoftHalo = pow(max(1.0 - radius / 0.52, 0.0), 1.52);
    core = mix(core, depthSoftCore, vDepthBlur);
    halo = mix(halo, depthSoftHalo, vDepthBlur);
    core *= mix(1.0, 0.08, vParticleBokeh);
    halo = mix(
      halo,
      pow(max(1.0 - radius / 0.52, 0.0), 0.52),
      vParticleBokeh
    );

    if (halo <= 0.001) discard;

    vec3 structureColor = uForeground * 0.82;
    vec3 moteColor = uForeground * 0.46;
    vec3 color = mix(structureColor, moteColor, isMote);
    float particleVariation = mix(0.34, 1.52, pow(vSeed, 1.82));
    float bioGlow = smoothstep(0.015, 0.82, vGlow);
    float copyContrast = pow(vCenterAttenuation, 1.9);
    float interactionCopyContrast = mix(copyContrast, 1.0, bioGlow);
    vec3 baseLight = color * (0.93 + core * 0.5 + vPulse * 0.46) * copyContrast * mix(1.0, mix(1.2, 1.7, vApertureWrapStrength), vApertureStrength) * particleVariation * mix(1.0, 0.76, vDepthBlur) * mix(1.0, 0.52, vParticleBokeh);
    vec3 monochromeHalo = uForeground;
    vec3 interactionHalo = monochromeHalo * bioGlow * halo * 0.62 * interactionCopyContrast;
    float hotCore = bioGlow * pow(core, 1.55);
    vec3 monochromeCore = uForeground;
    vec3 activeCore = monochromeCore * hotCore * 1.28 * interactionCopyContrast;
    float restingCore = 0.84;
    float restingHalo = 0.16;
    float copyAlphaFloor = 0.14;
    float copyAlpha = mix(copyAlphaFloor, 1.0, copyContrast);
    float alpha = (core * (restingCore + vPulse * 0.45 + hotCore * 0.48) + halo * (restingHalo + vPulse * 0.21 + bioGlow * 0.28)) * vOpacity * mix(copyAlpha, 1.0, bioGlow) * mix(1.0, mix(1.04, 1.42, vApertureWrapStrength), vApertureStrength) * mix(0.36, 1.18, particleVariation) * mix(1.0, 0.48, vDepthBlur) * mix(1.0, 0.22, vParticleBokeh);

    gl_FragColor = vec4(
      min((baseLight + interactionHalo + activeCore) * uContrast, vec3(1.0)),
      min(alpha * uContrast, 1.0)
    );
  }
`,J=`
  varying float vAngle;
  varying float vRadius;

  void main() {
    vAngle = atan(position.y, position.x);
    vRadius = length(position.xy);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,K=`
  uniform float uApertureContrast;
  uniform vec3 uForeground;
  uniform float uApertureRadius;
  uniform float uCoronaIntensityScale;
  uniform float uCoronaSizeScale;
  uniform float uOpacity;
  uniform float uTime;

  varying float vAngle;
  varying float vRadius;

  void main() {
    float distanceFromRim = vRadius - uApertureRadius;
    float flareDistanceFromRim =
      distanceFromRim / max(uCoronaSizeScale, 0.001);
    float broadArc = 0.5 + 0.5 * sin(vAngle * 13.0 - uTime * 0.16);
    float fineArc = 0.5 + 0.5 * sin(vAngle * 29.0 + uTime * 0.11 + 1.7);
    float flareShape = pow(broadArc, 5.0) * 0.82 + pow(fineArc, 11.0) * 0.18;
    float glassArc =
      pow(max(cos(vAngle - 0.78), 0.0), 8.0) +
      pow(max(cos(vAngle + 2.18), 0.0), 12.0) * 0.82 +
      pow(max(cos(vAngle - 2.72), 0.0), 18.0) * 0.42;
    float glassGlint =
      pow(max(cos(vAngle * 3.0 + 0.64), 0.0), 22.0) *
      (0.6 + fineArc * 0.4);
    float outerReach = mix(0.034, 0.076, flareShape);
    float outerMask =
      smoothstep(-0.012, 0.018, flareDistanceFromRim) *
      (1.0 - smoothstep(0.02, outerReach, flareDistanceFromRim));
    float innerMask =
      smoothstep(-0.12, -0.012, distanceFromRim) *
      (1.0 - smoothstep(-0.012, 0.018, distanceFromRim));
    float innerGlow =
      smoothstep(-0.16, -0.02, flareDistanceFromRim) *
      (1.0 - smoothstep(-0.02, 0.018, flareDistanceFromRim));
    float hairline = 1.0 - smoothstep(0.0, 0.024, abs(distanceFromRim));
    float innerRefraction =
      1.0 - smoothstep(0.0, 0.014, abs(distanceFromRim + 0.022));
    float lensDepth = clamp(-distanceFromRim / max(uApertureRadius, 0.001), 0.0, 1.0);
    float convexEdge = pow(1.0 - lensDepth, 4.2);
    float convexMargin = 1.0 - smoothstep(0.08, 0.24, lensDepth);
    float convexHighlight =
      pow(max(cos(vAngle - 0.68), 0.0), 5.0) *
      convexEdge *
      convexMargin *
      smoothstep(0.08, 0.88, lensDepth);
    float convexCounterReflection =
      pow(max(cos(vAngle + 2.46), 0.0), 7.0) *
      convexEdge *
      convexMargin *
      smoothstep(0.06, 0.72, lensDepth);
    float wideHalo =
      smoothstep(-0.018, 0.032, flareDistanceFromRim) *
      (1.0 - smoothstep(0.028, 0.078, flareDistanceFromRim));
    float glassIntensity =
      hairline * (0.075 + glassArc * 0.22 + glassGlint * 0.11) +
      innerMask * (0.035 + glassArc * 0.13 + glassGlint * 0.055) +
      innerRefraction * (0.018 + glassArc * 0.035);
    float flareIntensity =
      outerMask * (0.045 + flareShape * 0.08) +
      innerGlow * (0.025 + glassArc * 0.09) +
      convexHighlight * 0.16 +
      convexCounterReflection * 0.055 +
      wideHalo * 0.025;
    float intensity = glassIntensity + flareIntensity * uCoronaIntensityScale;

    if (intensity <= 0.001) discard;

    gl_FragColor = vec4(
      uForeground,
      clamp(intensity * uApertureContrast, 0.0, 1.0) * uOpacity
    );
  }
`,L=`
  varying float vAngle;
  varying float vLensAngle;
  varying float vRadius;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    vAngle = atan(position.y, position.x);
    vLensAngle = atan(worldPosition.y, worldPosition.x);
    vRadius = length(position.xy);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,M=`
  uniform float uApertureContrast;
  uniform vec3 uForeground;
  uniform float uApertureRadius;
  uniform float uFlareRotation;
  uniform float uOpacity;
  uniform float uTime;

  varying float vAngle;
  varying float vLensAngle;
  varying float vRadius;

  float getComplementaryBase(float base) {
    return mod(base + 2.0, 4.0);
  }

  void main() {
    const float notchCount = 48.0;
    const float pairedNotchCount = notchCount * 0.5;
    float notchProgress =
      (vAngle + 3.14159265359) / 6.28318530718 * notchCount;
    float notchIndex = floor(notchProgress);
    float notchOffset =
      (fract(notchProgress) - 0.5) *
      6.28318530718 /
      notchCount *
      vRadius;
    float distanceInsideRim = uApertureRadius - vRadius;
    float pairedNotchIndex = mod(notchIndex, pairedNotchCount);
    float base = mod(
      pairedNotchIndex * 3.0 + floor(pairedNotchIndex / 3.0) * 2.0,
      4.0
    );

    // The second half mirrors the first with valid DNA mates: A-T and C-G.
    if (notchIndex >= pairedNotchCount) {
      base = getComplementaryBase(base);
    }

    float halfWidth = 0.044;
    float outerGap = 0.074;
    float roundedOuterCap =
      1.0 - smoothstep(
        halfWidth,
        halfWidth + 0.014,
        length(vec2(notchOffset, distanceInsideRim - outerGap - 0.042))
      );
    float pillBody =
      (1.0 - smoothstep(halfWidth, halfWidth + 0.012, abs(notchOffset))) *
      smoothstep(outerGap, outerGap + 0.012, distanceInsideRim) *
      (1.0 - smoothstep(0.27, 0.282, distanceInsideRim));
    float tipEnvelope =
      smoothstep(0.26, 0.272, distanceInsideRim) *
      (1.0 - smoothstep(0.362, 0.374, distanceInsideRim));
    float flatTipMask =
      tipEnvelope *
      (1.0 - smoothstep(halfWidth, halfWidth + 0.012, abs(notchOffset)));
    float roundedTipMask =
      smoothstep(0.26, 0.272, distanceInsideRim) *
      (
        1.0 -
        smoothstep(
          halfWidth,
          halfWidth + 0.012,
          length(vec2(notchOffset, max(distanceInsideRim - 0.322, 0.0)))
        )
      );
    float pointedTipMask =
      tipEnvelope *
      (
        1.0 -
        smoothstep(
          0.0,
          0.018,
          abs(notchOffset) -
            mix(halfWidth, 0.0, smoothstep(0.27, 0.374, distanceInsideRim))
        )
      );
    float notchedTipMask =
      tipEnvelope *
      (1.0 - smoothstep(halfWidth, halfWidth + 0.012, abs(notchOffset))) *
      smoothstep(
        0.0,
        0.015,
        abs(notchOffset) -
          mix(0.0, halfWidth, smoothstep(0.27, 0.374, distanceInsideRim))
      );
    float concaveTipMask =
      flatTipMask *
      smoothstep(
        0.0,
        0.015,
        length(
          vec2(
            notchOffset,
            distanceInsideRim - 0.374
          )
        ) -
          halfWidth
      );
    float tipMask = mix(
      mix(notchedTipMask, roundedTipMask, step(0.5, base)),
      mix(pointedTipMask, concaveTipMask, step(2.5, base)),
      step(1.5, base)
    );
    float lensAngle = vLensAngle - uFlareRotation;
    float broadArc = 0.5 + 0.5 * sin(lensAngle * 13.0 - uTime * 0.16);
    float fineArc = 0.5 + 0.5 * sin(lensAngle * 29.0 + uTime * 0.11 + 1.7);
    float flareShape = pow(broadArc, 5.0) * 0.82 + pow(fineArc, 11.0) * 0.18;
    float lensLighting =
      pow(max(cos(lensAngle - 0.78), 0.0), 8.0) +
      pow(max(cos(lensAngle + 2.18), 0.0), 12.0) * 0.82 +
      pow(max(cos(lensAngle - 2.72), 0.0), 18.0) * 0.42 +
      pow(max(cos(lensAngle * 3.0 + 0.64), 0.0), 22.0) *
        (0.6 + fineArc * 0.4) *
        0.46 +
      flareShape * 0.08;
    float toothMask = min(roundedOuterCap + pillBody + tipMask, 1.0);
    float intensity =
      toothMask *
      (0.012 + lensLighting * 0.19);

    if (intensity <= 0.001) discard;

    gl_FragColor = vec4(
      uForeground,
      clamp(intensity * uApertureContrast, 0.0, 1.0) * uOpacity
    );
  }
`,N=1e3/30;function O(a){let{className:b,disableAnimation:c=!1,disableRendering:g=!1}=a,h=(0,f.useRef)(null),i=!0===(0,e.a)();return(0,f.useEffect)(()=>{if(g)return;let a=h.current;if(null==a)return;let b=a.getContext("webgl2",{alpha:!0,antialias:!0,powerPreference:"low-power"});if(null==b)return;let d=new P(a,b);return d.start(!i&&!c),()=>d.dispose()},[c,g,i]),(0,d.jsx)("canvas",{ref:h,"aria-hidden":"true",className:b})}class P{canvas;animationFrame=null;camera=new g.Kc(39,1,.1,100);elapsedSeconds=0;geometryIsCompact=null;geometryResizeTimeout=null;geometryViewport=new g.Wd;lastFrameTime=0;notch=null;particleMaterial;particles=null;pointer=new g.Wd;renderer;resizeObserver=null;scene=new g.id;targetPointer=new g.Wd;themeObserver=null;viewport=new g.Wd;aperture=null;constructor(a,b){this.canvas=a,this.renderer=new h.WebGLRenderer({alpha:!0,antialias:!0,canvas:a,context:b,powerPreference:"low-power"}),this.renderer.setClearColor(0,0),this.camera.position.z=10,this.particleMaterial=new g.jd({blending:1,depthWrite:!1,fragmentShader:I,transparent:!0,uniforms:{uApertureRadius:{value:0},uContrast:{value:2},uFocusBokeh:{value:1.5},uForeground:{value:new g.K},uIntroOpacity:{value:1},uMotion:{value:1},uPixelRatio:{value:1},uPointSize:{value:2.92},uPointer:{value:this.pointer},uTime:{value:0},uViewport:{value:this.viewport}},vertexShader:H})}start(a){this.particleMaterial.uniforms.uMotion.value=+!!a,this.resize(),this.applyFocusState(0,!a),"u">typeof ResizeObserver&&(this.resizeObserver=new ResizeObserver(this.resize),this.resizeObserver.observe(this.canvas)),"u">typeof MutationObserver&&(this.themeObserver=new MutationObserver(this.refreshForeground),this.themeObserver.observe(document.documentElement,{attributeFilter:["class","data-theme","style"],attributes:!0}),this.themeObserver.observe(this.canvas,{attributeFilter:["class","style"],attributes:!0})),a&&(window.addEventListener("pointermove",this.handlePointerMove,{passive:!0}),window.addEventListener("pointerleave",this.handlePointerLeave),document.addEventListener("visibilitychange",this.handleVisibility),this.animationFrame=window.requestAnimationFrame(this.animate))}dispose(){null!=this.animationFrame&&window.cancelAnimationFrame(this.animationFrame),null!=this.geometryResizeTimeout&&window.clearTimeout(this.geometryResizeTimeout),this.resizeObserver?.disconnect(),this.themeObserver?.disconnect(),window.removeEventListener("pointermove",this.handlePointerMove),window.removeEventListener("pointerleave",this.handlePointerLeave),document.removeEventListener("visibilitychange",this.handleVisibility),this.particles?.geometry.dispose(),this.particleMaterial.dispose(),this.disposeAperture(),this.renderer.dispose()}resize=()=>{let a=this.canvas.clientWidth,b=this.canvas.clientHeight;if(0===a||0===b)return;let c=Math.min(window.devicePixelRatio||1,1.75);this.camera.aspect=a/b,this.camera.updateProjectionMatrix(),this.renderer.setPixelRatio(c),this.renderer.setSize(a,b,!1);let d=2*Math.tan(g.pc.degToRad(19.5))*10,e=d*this.camera.aspect;this.viewport.set(e,d),this.particleMaterial.uniforms.uPixelRatio.value=c;let f={height:d,width:e},h=a<920;if(this.geometryIsCompact===h&&this.geometryViewport.x===f.width&&this.geometryViewport.y===f.height){null!=this.geometryResizeTimeout&&(window.clearTimeout(this.geometryResizeTimeout),this.geometryResizeTimeout=null),this.renderer.render(this.scene,this.camera);return}null==this.particles?this.rebuildGeometry(h,f):(null!=this.geometryResizeTimeout&&window.clearTimeout(this.geometryResizeTimeout),this.geometryResizeTimeout=window.setTimeout(()=>{this.geometryResizeTimeout=null,this.rebuildGeometry(h,f)},150),this.renderer.render(this.scene,this.camera))};rebuildGeometry(a,b){let c=function(a,b){let c=arguments.length>2&&void 0!==arguments[2]&&arguments[2],d=l;c?d=n:a&&(d=m);let e=w(b),f=e.width*e.height/(i.width*i.height);return{backbones:Math.round(d.backbones*f),bonds:Math.round(d.bonds*f),motes:Math.round(d.motes*f)}}(a,b),d=Math.min(1,56e3/(c.backbones+c.bonds+c.motes)),e=function(){let a,b=arguments.length>0&&void 0!==arguments[0]?arguments[0]:l,c=arguments.length>1?arguments[1]:void 0,d=arguments.length>2&&void 0!==arguments[2]?arguments[2]:c,e=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{},f=w(c),g=w(d),h=b.backbones+b.bonds+b.motes,i=function(a){let b=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,c=w(a),d=.5*Math.max(0,b)*(9.96/10);return Math.max(.9122*Math.min(.39*c.height,.5*c.width),d)}(d,e.minimumApertureDiameter),j=new Float32Array(3*h),m=new Float32Array(2*h),n=new Float32Array(h),r=new Float32Array(h),s=new Float32Array(3*h),t=new Float32Array(h),F=new Float32Array(h),G=new Float32Array(h),H=new Float32Array(3*h),I=(a=1952,()=>(a=(1664525*a+0x3c6ef35f)%0x100000000)/0x100000000),J=Array.from({length:15},()=>{let a=(.5>I()?-1:1)*(.9+4.2*Math.pow(I(),.72)),b=.48+1.42*I(),c=.42+1.22*I();return{depth:a,radiusX:b,radiusY:c,radiusZ:.72+.16*Math.abs(a)+.24*c,x:p(I)*f.width*.5,y:p(I)*f.height*.5}}),K=function(a){let b=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"default",c=arguments.length>2?arguments[2]:void 0,d={edges:[],nodes:[]},e="mobile"===b?204:178;return("mobile"===b?v.map((a,b)=>{let d=c?.[b];if(null==d)return a;let e=d.z-a.depth;return{...a,depth:d.z,depthEnd:(a.depthEnd??a.depth)+e,mobilePath:a.mobilePath?{...a.mobilePath,rotation:d.rotationDegrees*Math.PI/180}:void 0,offsetX:d.x,offsetY:d.y}}):u).forEach(b=>{!function(a,b,c,d){let e=[],f=[],g=Math.round((d.helixTurns??10.25)*10),h=new Set(Array.from({length:g},(a,b)=>Math.round((b+.5)/g*(c-1)))),i=.36*Math.min(1.12,d.radiusScale)*(d.railRadiusScale??1),j=.48*Math.min(1.08,d.radiusScale)*(d.railDepthScale??1);for(let g=0;g<c;g+=1){let l=g/(c-1),{position:m,tangent:n}=function(a,b,c){let d=C(a,b,c),e=1/534,f=C(Math.max(0,a-1/534),b,c),g=C(Math.min(1,a+e),b,c);return{position:d,tangent:x([g[0]-f[0],g[1]-f[1],g[2]-f[2]])}}(l,b,d),o=x([-n[1],n[0],0]),p=x([n[1]*o[2]-n[2]*o[1],n[2]*o[0]-n[0]*o[2],n[0]*o[1]-n[1]*o[0]]),q=1+(1.34-1)*Math.pow(d.aperture?0:A(.68,7.7,m[2]),1.08),r=l*k*(d.helixTurns??10.25)+d.motionPhase,s=y(z(o,Math.cos(r)*i*q),z(p,Math.sin(r)*j*q)),t=a.nodes.length;a.nodes.push({centerline:m,layerOpacity:d.opacity,position:y(m,s),strandPhase:r,tangent:n});let u=a.nodes.length;if(a.nodes.push({centerline:m,layerOpacity:d.opacity,position:y(m,z(s,-1)),strandPhase:r,tangent:n}),f.push([t,u]),d.aperture){let b=a.nodes.length;a.nodes.push({centerline:m,layerOpacity:d.opacity,position:m,strandPhase:r,tangent:n}),e.push(b)}if(g>0){let b=f[g-1],c=E(d,m[2]);D(a.edges,b[0],t,"backbone",d,{particleWeight:c}),D(a.edges,b[1],u,"backbone",d,{particleWeight:c}),d.aperture&&D(a.edges,e[g-1],e[g],"backbone",d,{particleWeight:d.rimParticleWeight,thicknessScale:.24})}h.has(g)&&D(a.edges,t,u,"bond",d,{particleWeight:E(d,m[2])})}}(d,a,Math.round(e*(b.sampleMultiplier??1)),b)}),d}(g,e.layout,e.mobileSpecimens),L=a=>K.edges.flatMap((b,c)=>b.kind===a?Array.from({length:b.particleWeight},()=>({edge:b,edgeIndex:c})):[]),M=L("backbone"),N=L("bond"),O=(a,b,c)=>a["mobile"===e.layout?Math.floor(b/c*a.length):b%a.length],P=0,Q=(a,b,c,d)=>{let e=K.edges[a],f=K.nodes[e.start],g=K.nodes[e.end],h=I(),i=B(f.position,g.position,h),k=B(f.centerline,g.centerline,h),l=x(B(f.tangent,g.tangent,h)),o=x([-l[1],l[0],0]),p=x([l[1]*o[2]-l[2]*o[1],l[2]*o[0]-l[0]*o[2],l[0]*o[1]-l[1]*o[0]]),u=e.aperture?.76:1,v=q(I)*c*e.thicknessScale*u,w=q(I)*c*e.thicknessScale*u,y=3*P;s[y]=i[0]+o[0]*v+p[0]*w,s[y+1]=i[1]+o[1]*v+p[1]*w,s[y+2]=i[2]+o[2]*v+p[2]*w,j[y]=k[0],j[y+1]=k[1],j[y+2]=k[2],H[y]=l[0],H[y+1]=l[1],H[y+2]=l[2],m[2*P]=+!!e.aperture,m[2*P+1]=e.aperture&&e.thicknessScale>.5?1:0,n[P]=b,r[P]=e.layerOpacity,t[P]=d,F[P]=I(),G[P]=f.strandPhase+(g.strandPhase-f.strandPhase)*h,P+=1};for(let a=0;a<b.backbones;a+=1)Q(O(M,a,b.backbones).edgeIndex,0,.026,.14+.76*Math.pow(I(),2.4)+(.045>I()?.4+.52*I():0));for(let a=0;a<b.bonds;a+=1)Q(O(N,a,b.bonds).edgeIndex,1,.018,.1+.5*Math.pow(I(),2.5)+(.025>I()?.22+.3*I():0));for(let a=0;a<b.motes;a+=1){let a,b=3*P,c=I()*k,d="mobile"===e.layout?.32:.022,g="mobile"===e.layout?1.08:.78,h=I()<d,l=I(),u="mobile"===e.layout&&!h&&l<.1,v="mobile"===e.layout&&h,w=l<.2,x=J[Math.floor(I()*J.length)],y=I()*k,z=Math.sqrt(I())*i*g;a=u?[f.width*(.16+.38*I()),f.height*(.12+.36*I()),-1.8+3.6*I()]:h?[Math.cos(y)*z,Math.sin(y)*z,.04+.14+.34*I()]:w?[p(I)*f.width*.5,p(I)*f.height*.5,4.8*p(I)]:[o(x.x+q(I)*x.radiusX,-(.54*f.width),.54*f.width),o(x.y+q(I)*x.radiusY,-(.54*f.height),.54*f.height),x.depth+Math.tanh(.68*q(I))*x.radiusZ*1.65],s[b]=a[0],s[b+1]=a[1],s[b+2]=a[2],j[b]=s[b],j[b+1]=s[b+1],j[b+2]=s[b+2],H[b+2]=1,m[2*P]=Math.cos(c),m[2*P+1]=Math.sin(c),n[P]=2;let A=.34+.4*I(),B=o((s[b+2]-.8)/2.8),C=.16+1.18*Math.pow(I(),2.05)+B*(.46+1.16*I())+(.04>I()?1.34+2.24*I():0);r[P]=v?Math.min(1,A+.22):A,t[P]=v?.12+.42*Math.min(C,1.6):C,F[P]=I(),G[P]=I()*k,P+=1}return{apertureRadius:i,centerlinePositions:j,flowDirections:m,kinds:n,layerOpacities:r,positions:s,scales:t,seeds:F,strandPhases:G,tangentDirections:H}}({backbones:Math.floor(c.backbones*d),bonds:Math.floor(c.bonds*d),motes:Math.floor(c.motes*d)},b),f=new g.A;f.setAttribute("position",new g.ub(e.positions,3)),f.setAttribute("aCenterlinePosition",new g.ub(e.centerlinePositions,3)),f.setAttribute("aKind",new g.ub(e.kinds,1)),f.setAttribute("aLayerOpacity",new g.ub(e.layerOpacities,1)),f.setAttribute("aScale",new g.ub(e.scales,1)),f.setAttribute("aSeed",new g.ub(e.seeds,1)),f.setAttribute("aStrandPhase",new g.ub(e.strandPhases,1)),f.setAttribute("aTangentDirection",new g.ub(e.tangentDirections,3)),f.setAttribute("aFlowDirection",new g.ub(e.flowDirections,2)),null!=this.particles&&(this.scene.remove(this.particles),this.particles.geometry.dispose()),this.particles=new g.Qc(f,this.particleMaterial),this.particles.frustumCulled=!1,this.scene.add(this.particles),this.particleMaterial.uniforms.uApertureRadius.value=e.apertureRadius,this.createAperture(e.apertureRadius),this.applyFocusState(this.elapsedSeconds,0===this.particleMaterial.uniforms.uMotion.value),this.refreshForeground(),this.geometryIsCompact=a,this.geometryViewport.set(b.width,b.height)}createAperture(a){this.disposeAperture();let b={uApertureContrast:{value:1.85},uApertureRadius:{value:a},uForeground:{value:new g.K},uOpacity:{value:1},uTime:{value:0}};this.aperture=new g.tc(new g.hd(Math.max(.01,a-.72),a+.72,192),new g.jd({blending:1,depthWrite:!1,fragmentShader:K,transparent:!0,uniforms:{...b,uCoronaIntensityScale:{value:1.18},uCoronaSizeScale:{value:1}},vertexShader:J})),this.aperture.position.z=.04,this.aperture.renderOrder=1,this.scene.add(this.aperture),this.notch=new g.tc(new g.hd(Math.max(.01,a-.385),Math.max(.02,a-.068),288),new g.jd({blending:1,depthWrite:!1,fragmentShader:M,transparent:!0,uniforms:{...b,uFlareRotation:{value:0}},vertexShader:L})),this.notch.position.z=.045,this.notch.renderOrder=2,this.scene.add(this.notch)}disposeAperture(){for(let a of[this.aperture,this.notch])null!=a&&(this.scene.remove(a),a.geometry.dispose(),a.material instanceof g.nc&&a.material.dispose());this.aperture=null,this.notch=null}refreshForeground=()=>{let a=new g.K(window.getComputedStyle(this.canvas).color),b=this.particleMaterial.uniforms.uForeground.value;b instanceof g.K&&b.copy(a);let c=(a.r+a.g+a.b)/3>.5,d=c?2:1;for(let b of(this.particleMaterial.uniforms.uContrast.value=c?2:1.65,this.particleMaterial.blending!==d&&(this.particleMaterial.blending=d,this.particleMaterial.needsUpdate=!0),[this.aperture,this.notch]))if(b?.material instanceof g.jd){let e=b.material.uniforms.uForeground.value;e instanceof g.K&&e.copy(a),b.material.uniforms.uApertureContrast.value=c?1.85:1.25,b.material.blending!==d&&(b.material.blending=d,b.material.needsUpdate=!0)}this.renderer.render(this.scene,this.camera)};animate=a=>{if("hidden"===document.visibilityState){this.animationFrame=null,this.lastFrameTime=0;return}if(a-this.lastFrameTime>=N){0!==this.lastFrameTime&&(this.elapsedSeconds+=Math.min((a-this.lastFrameTime)/1e3,.1)),this.lastFrameTime=a,this.pointer.lerp(this.targetPointer,.065);let b=this.elapsedSeconds;for(let a of(this.particleMaterial.uniforms.uTime.value=b,this.applyFocusState(b,!1),[this.aperture,this.notch]))a?.material instanceof g.jd&&(a.material.uniforms.uTime.value=b);this.renderer.render(this.scene,this.camera)}this.animationFrame=window.requestAnimationFrame(this.animate)};applyFocusState(a,b){let c=function(a){let b=arguments.length>1&&void 0!==arguments[1]&&arguments[1];if(b)return{bokehScale:1.5,cameraFov:39,dialRotation:0,opacity:1};let c=Math.min(2.72,Math.max(0,a)),d=F.findIndex(a=>a.elapsedSeconds>=c),e=Math.min(1,Math.max(0,a/.8)),f=e*e*(3-2*e);if(d<=0)return{...d<0?F[F.length-1]:F[0],opacity:f};let g=F[d-1],h=F[d],i=F[Math.max(d-2,0)],j=F[Math.min(d+1,F.length-1)],k=(c-g.elapsedSeconds)/(h.elapsedSeconds-g.elapsedSeconds);return{bokehScale:G(i.bokehScale,g.bokehScale,h.bokehScale,j.bokehScale,k),cameraFov:G(i.cameraFov,g.cameraFov,h.cameraFov,j.cameraFov,k),dialRotation:G(i.dialRotation,g.dialRotation,h.dialRotation,j.dialRotation,k),opacity:f}}(a,b);if(this.particleMaterial.uniforms.uIntroOpacity.value=c.opacity,this.particleMaterial.uniforms.uFocusBokeh.value=c.bokehScale,this.camera.fov!==c.cameraFov&&(this.camera.fov=c.cameraFov,this.camera.updateProjectionMatrix()),null!=this.aperture&&(this.aperture.rotation.z=c.dialRotation),null!=this.notch){let b=-.1*Math.max(0,a-2.72);this.notch.rotation.z=18*c.dialRotation+b}for(let a of[this.aperture,this.notch])a?.material instanceof g.jd&&(a.material.uniforms.uOpacity.value=c.opacity);this.notch?.material instanceof g.jd&&(this.notch.material.uniforms.uFlareRotation.value=c.dialRotation)}handlePointerMove=a=>{let b=this.canvas.getBoundingClientRect();this.targetPointer.set((a.clientX-b.left)/Math.max(b.width,1)*2-1,1-(a.clientY-b.top)/Math.max(b.height,1)*2)};handlePointerLeave=()=>{this.targetPointer.set(0,0)};handleVisibility=()=>{"hidden"!==document.visibilityState&&null==this.animationFrame&&(this.animationFrame=window.requestAnimationFrame(this.animate))}}}};