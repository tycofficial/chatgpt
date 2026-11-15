export const __rspack_esm_ids=[11894];export const __webpack_modules__={ZtF1(e,t,a){a.d(t,{LifeSciencesHelixBackground:()=>V});var i=a("ABep"),o=a("IjbW"),r=a("zd8w"),n=a("PVZC"),s=a("STXV");let l={height:10.2,width:14.2},h=.04-1.9,u=2*Math.PI,c={backbones:64e3,bonds:2e4,motes:7600},d={backbones:44e3,bonds:14200,motes:5e3},p={backbones:38e3,bonds:12200,motes:4200},m=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,a=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1;return Math.min(a,Math.max(t,e))};function f(e){return 2*e()-1}function v(e){return Math.sqrt(-2*Math.log(Math.max(e(),Number.EPSILON)))*Math.cos(u*e())}function g(e,t){let a=43758.5453123*Math.sin(127.1*e+311.7*t);return(a-Math.floor(a))*2-1}function y(e,t){let a=Math.floor(e),i=e-a,o=g(a,t)*i;return(o+(g(a+1,t)*(i-1)-o)*(i*i*i*(i*(6*i-15)+10)))*2}function b(e,t){return m(.68*y(e,t)+.23*y(2.07*e,t+17)+.09*y(4.11*e,t+43),-1,1)}let w=[{angleOffset:-4.99,depth:-5.8,depthEnd:7.2,helixTurns:42,motionPhase:.42,offsetX:.08,offsetY:-.04,opacity:.82,particleWeight:5,radiusScale:.64,radiusScaleEnd:1.48,sampleMultiplier:4.15,tunnelTurns:-6.4}],M=[{angleOffset:0,depth:.83,depthEnd:.38,helixTurns:1.05,mobilePath:{curvature:.045,rotation:-(27*Math.PI)/180,slope:-.075,y:.3},motionPhase:.36,offsetX:-2.03,offsetY:.27,opacity:1,particleWeight:6,railDepthScale:1.7,railRadiusScale:2.65,radiusScale:1,sampleMultiplier:1.65},{angleOffset:0,depth:.45,depthEnd:0,helixTurns:.92,mobilePath:{curvature:-.045,rotation:-(13*Math.PI)/180,slope:.065,y:-.3},motionPhase:.36,offsetX:0,offsetY:0,opacity:1,particleWeight:6,railDepthScale:1.65,railRadiusScale:2.35,radiusScale:.98,sampleMultiplier:1.65}];function x(e){return null==e?l:{height:Math.max(1,e.height+.84),width:Math.max(1,e.width+.84)}}function S(e){let[t,a,i]=e,o=Math.max(Math.hypot(t,a,i),1e-4);return[t/o,a/o,i/o]}function A(e,t){let[a,i,o]=e,[r,n,s]=t;return[a+r,i+n,o+s]}function P(e,t){let[a,i,o]=e;return[a*t,i*t,o*t]}function R(e,t,a){let i=m((a-e)/(t-e));return i*i*(3-2*i)}function F(e,t,a){return[e[0]+(t[0]-e[0])*a,e[1]+(t[1]-e[1])*a,e[2]+(t[2]-e[2])*a]}function C(e,t,a){if(a.mobilePath){let i=2*e-1,o=i*t.width*.95,r=t.height*(a.mobilePath.y+i*a.mobilePath.slope+(1-i*i)*a.mobilePath.curvature),n=a.mobilePath.rotation??0,s=Math.cos(n),l=Math.sin(n);return[a.offsetX+o*s-r*l,a.offsetY+o*l+r*s,a.depth+((a.depthEnd??a.depth)-a.depth)*e]}let i=a.tunnelTurns??1,o=Math.sign(i),r=function(e,t){let a=(t.depthEnd??t.depth)-t.depth;if(t.aperture||0===a)return e;let i=m((.68-t.depth)/a);if(e<=i)return e;let o=(e-i)/(1-i);return i+(.91*o+(1-.91)*(1-Math.pow(1-o,3))/3)*(1-i)}(e,a),n=a.aperture?0:R(2.75,3.3,t.width/t.height),s=R(.82,1,e),l=a.depth+((a.depthEnd??a.depth)-a.depth)*e,c=r*u*i-Math.PI/2+a.angleOffset+n*s*u*1*o,d=R(0,1,e),p=a.radiusScale+((a.radiusScaleEnd??a.radiusScale)-a.radiusScale)*d,f=(a.depthEnd??a.depth)-a.depth,v=R(0===f?1:m((.04-a.depth)/f),1,e),g=R(.6,1,e),y=a.aperture?0:R(h,-1.06,l)*(1-R(4.1,4.8,l))*.25,w=a.aperture?0:b(7.2*e,a.motionPhase+23)*v*(.14+.42*g),M=c+(a.aperture?0:b(7.2*e*.83+3.4,a.motionPhase+13)*v*(.07+.28*g)),x=a.aperture?1:(1-.54*v)*(1+1.76*g),S=a.aperture?1:1-Math.max(0,Math.cos(M))*g*.32,A=a.aperture?1:1-Math.max(0,Math.cos(M))*R(.7,.78,e)*(1-R(.82,.9,e))*.13,P=a.aperture?1:1+Math.max(0,Math.cos(M))*R(.9,1,e)*.16,F=a.aperture?0:R(h,-1.06,l)*(1-R(4.1,4.8,l)),C=a.aperture?1:1-Math.cos(M)*F*.1,k=Math.min(.39*t.height,.5*t.width)*p*x*S*A*P*C*(1+y)*(1+n*s*.48)*(1+w);return[a.offsetX+Math.cos(M)*k,a.offsetY+Math.sin(M)*k,l]}function k(e,t,a,i,o){let r=arguments.length>5&&void 0!==arguments[5]?arguments[5]:{};e.push({aperture:o.aperture??!1,end:a,kind:i,layerOpacity:o.opacity,particleWeight:r.particleWeight??o.particleWeight,start:t,thicknessScale:r.thicknessScale??1})}function T(e,t){if(e.aperture)return e.particleWeight;let a=1-R(0,1.35,Math.abs(t- -1.06));return Math.round(e.particleWeight*(1+1.65*a))}let O=[{bokehScale:32,cameraFov:43.2,dialRotation:-0,elapsedSeconds:0},{bokehScale:30,cameraFov:42.8,dialRotation:-((1.62-1.55)*.018),elapsedSeconds:.22},{bokehScale:24,cameraFov:42,dialRotation:-1.03*.018,elapsedSeconds:.56},{bokehScale:6.7,cameraFov:39.4,dialRotation:-((13.96-1.45-1.55)*.018),elapsedSeconds:1.22},{bokehScale:2.66,cameraFov:38.32,dialRotation:-((13.96+.38-1.55)*.018),elapsedSeconds:1.62},{bokehScale:1.8,cameraFov:39.08,dialRotation:-((13.96-.1-1.55)*.018),elapsedSeconds:2.22},{bokehScale:1.56,cameraFov:38.98,dialRotation:-((13.96+.025-1.55)*.018),elapsedSeconds:2.5},{bokehScale:1.5,cameraFov:39,dialRotation:-.22338,elapsedSeconds:2.72}];function W(e,t,a,i,o){let r=o*o,n=r*o;return(2*n-3*r+1)*t+(a-e)/2*.38*(n-2*r+o)+(-2*n+3*r)*a+(i-t)/2*.38*(n-r)}let D=`
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
`,z=`
  varying float vAngle;
  varying float vRadius;

  void main() {
    vAngle = atan(position.y, position.x);
    vRadius = length(position.xy);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,B=`
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
`,E=`
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
`,G=`
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
`,L=1e3/30;function V(e){let{className:t,disableAnimation:a=!1,disableRendering:n=!1}=e,s=(0,r.useRef)(null),l=!0===(0,o.a)();return(0,r.useEffect)(()=>{if(n)return;let e=s.current;if(null==e)return;let t=e.getContext("webgl2",{alpha:!0,antialias:!0,powerPreference:"low-power"});if(null==t)return;let i=new H(e,t);return i.start(!l&&!a),()=>i.dispose()},[a,n,l]),(0,i.jsx)("canvas",{ref:s,"aria-hidden":"true",className:t})}class H{canvas;animationFrame=null;camera=new n.Kc(39,1,.1,100);elapsedSeconds=0;geometryIsCompact=null;geometryResizeTimeout=null;geometryViewport=new n.Wd;lastFrameTime=0;notch=null;particleMaterial;particles=null;pointer=new n.Wd;renderer;resizeObserver=null;scene=new n.id;targetPointer=new n.Wd;themeObserver=null;viewport=new n.Wd;aperture=null;constructor(e,t){this.canvas=e,this.renderer=new s.WebGLRenderer({alpha:!0,antialias:!0,canvas:e,context:t,powerPreference:"low-power"}),this.renderer.setClearColor(0,0),this.camera.position.z=10,this.particleMaterial=new n.jd({blending:1,depthWrite:!1,fragmentShader:I,transparent:!0,uniforms:{uApertureRadius:{value:0},uContrast:{value:2},uFocusBokeh:{value:1.5},uForeground:{value:new n.K},uIntroOpacity:{value:1},uMotion:{value:1},uPixelRatio:{value:1},uPointSize:{value:2.92},uPointer:{value:this.pointer},uTime:{value:0},uViewport:{value:this.viewport}},vertexShader:D})}start(e){this.particleMaterial.uniforms.uMotion.value=+!!e,this.resize(),this.applyFocusState(0,!e),"u">typeof ResizeObserver&&(this.resizeObserver=new ResizeObserver(this.resize),this.resizeObserver.observe(this.canvas)),"u">typeof MutationObserver&&(this.themeObserver=new MutationObserver(this.refreshForeground),this.themeObserver.observe(document.documentElement,{attributeFilter:["class","data-theme","style"],attributes:!0}),this.themeObserver.observe(this.canvas,{attributeFilter:["class","style"],attributes:!0})),e&&(window.addEventListener("pointermove",this.handlePointerMove,{passive:!0}),window.addEventListener("pointerleave",this.handlePointerLeave),document.addEventListener("visibilitychange",this.handleVisibility),this.animationFrame=window.requestAnimationFrame(this.animate))}dispose(){null!=this.animationFrame&&window.cancelAnimationFrame(this.animationFrame),null!=this.geometryResizeTimeout&&window.clearTimeout(this.geometryResizeTimeout),this.resizeObserver?.disconnect(),this.themeObserver?.disconnect(),window.removeEventListener("pointermove",this.handlePointerMove),window.removeEventListener("pointerleave",this.handlePointerLeave),document.removeEventListener("visibilitychange",this.handleVisibility),this.particles?.geometry.dispose(),this.particleMaterial.dispose(),this.disposeAperture(),this.renderer.dispose()}resize=()=>{let e=this.canvas.clientWidth,t=this.canvas.clientHeight;if(0===e||0===t)return;let a=Math.min(window.devicePixelRatio||1,1.75);this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),this.renderer.setPixelRatio(a),this.renderer.setSize(e,t,!1);let i=2*Math.tan(n.pc.degToRad(19.5))*10,o=i*this.camera.aspect;this.viewport.set(o,i),this.particleMaterial.uniforms.uPixelRatio.value=a;let r={height:i,width:o},s=e<920;if(this.geometryIsCompact===s&&this.geometryViewport.x===r.width&&this.geometryViewport.y===r.height){null!=this.geometryResizeTimeout&&(window.clearTimeout(this.geometryResizeTimeout),this.geometryResizeTimeout=null),this.renderer.render(this.scene,this.camera);return}null==this.particles?this.rebuildGeometry(s,r):(null!=this.geometryResizeTimeout&&window.clearTimeout(this.geometryResizeTimeout),this.geometryResizeTimeout=window.setTimeout(()=>{this.geometryResizeTimeout=null,this.rebuildGeometry(s,r)},150),this.renderer.render(this.scene,this.camera))};rebuildGeometry(e,t){let a=function(e,t){let a=arguments.length>2&&void 0!==arguments[2]&&arguments[2],i=c;a?i=p:e&&(i=d);let o=x(t),r=o.width*o.height/(l.width*l.height);return{backbones:Math.round(i.backbones*r),bonds:Math.round(i.bonds*r),motes:Math.round(i.motes*r)}}(e,t),i=Math.min(1,56e3/(a.backbones+a.bonds+a.motes)),o=function(){let e,t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:c,a=arguments.length>1?arguments[1]:void 0,i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:a,o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:{},r=x(a),n=x(i),s=t.backbones+t.bonds+t.motes,l=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,a=x(e),i=.5*Math.max(0,t)*(9.96/10);return Math.max(.9122*Math.min(.39*a.height,.5*a.width),i)}(i,o.minimumApertureDiameter),h=new Float32Array(3*s),d=new Float32Array(2*s),p=new Float32Array(s),g=new Float32Array(s),y=new Float32Array(3*s),b=new Float32Array(s),O=new Float32Array(s),W=new Float32Array(s),D=new Float32Array(3*s),I=(e=1952,()=>(e=(1664525*e+0x3c6ef35f)%0x100000000)/0x100000000),z=Array.from({length:15},()=>{let e=(.5>I()?-1:1)*(.9+4.2*Math.pow(I(),.72)),t=.48+1.42*I(),a=.42+1.22*I();return{depth:e,radiusX:t,radiusY:a,radiusZ:.72+.16*Math.abs(e)+.24*a,x:f(I)*r.width*.5,y:f(I)*r.height*.5}}),B=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"default",a=arguments.length>2?arguments[2]:void 0,i={edges:[],nodes:[]},o="mobile"===t?204:178;return("mobile"===t?M.map((e,t)=>{let i=a?.[t];if(null==i)return e;let o=i.z-e.depth;return{...e,depth:i.z,depthEnd:(e.depthEnd??e.depth)+o,mobilePath:e.mobilePath?{...e.mobilePath,rotation:i.rotationDegrees*Math.PI/180}:void 0,offsetX:i.x,offsetY:i.y}}):w).forEach(t=>{!function(e,t,a,i){let o=[],r=[],n=Math.round((i.helixTurns??10.25)*10),s=new Set(Array.from({length:n},(e,t)=>Math.round((t+.5)/n*(a-1)))),l=.36*Math.min(1.12,i.radiusScale)*(i.railRadiusScale??1),h=.48*Math.min(1.08,i.radiusScale)*(i.railDepthScale??1);for(let n=0;n<a;n+=1){let c=n/(a-1),{position:d,tangent:p}=function(e,t,a){let i=C(e,t,a),o=1/534,r=C(Math.max(0,e-1/534),t,a),n=C(Math.min(1,e+o),t,a);return{position:i,tangent:S([n[0]-r[0],n[1]-r[1],n[2]-r[2]])}}(c,t,i),m=S([-p[1],p[0],0]),f=S([p[1]*m[2]-p[2]*m[1],p[2]*m[0]-p[0]*m[2],p[0]*m[1]-p[1]*m[0]]),v=1+(1.34-1)*Math.pow(i.aperture?0:R(.68,7.7,d[2]),1.08),g=c*u*(i.helixTurns??10.25)+i.motionPhase,y=A(P(m,Math.cos(g)*l*v),P(f,Math.sin(g)*h*v)),b=e.nodes.length;e.nodes.push({centerline:d,layerOpacity:i.opacity,position:A(d,y),strandPhase:g,tangent:p});let w=e.nodes.length;if(e.nodes.push({centerline:d,layerOpacity:i.opacity,position:A(d,P(y,-1)),strandPhase:g,tangent:p}),r.push([b,w]),i.aperture){let t=e.nodes.length;e.nodes.push({centerline:d,layerOpacity:i.opacity,position:d,strandPhase:g,tangent:p}),o.push(t)}if(n>0){let t=r[n-1],a=T(i,d[2]);k(e.edges,t[0],b,"backbone",i,{particleWeight:a}),k(e.edges,t[1],w,"backbone",i,{particleWeight:a}),i.aperture&&k(e.edges,o[n-1],o[n],"backbone",i,{particleWeight:i.rimParticleWeight,thicknessScale:.24})}s.has(n)&&k(e.edges,b,w,"bond",i,{particleWeight:T(i,d[2])})}}(i,e,Math.round(o*(t.sampleMultiplier??1)),t)}),i}(n,o.layout,o.mobileSpecimens),E=e=>B.edges.flatMap((t,a)=>t.kind===e?Array.from({length:t.particleWeight},()=>({edge:t,edgeIndex:a})):[]),G=E("backbone"),L=E("bond"),V=(e,t,a)=>e["mobile"===o.layout?Math.floor(t/a*e.length):t%e.length],H=0,_=(e,t,a,i)=>{let o=B.edges[e],r=B.nodes[o.start],n=B.nodes[o.end],s=I(),l=F(r.position,n.position,s),u=F(r.centerline,n.centerline,s),c=S(F(r.tangent,n.tangent,s)),m=S([-c[1],c[0],0]),f=S([c[1]*m[2]-c[2]*m[1],c[2]*m[0]-c[0]*m[2],c[0]*m[1]-c[1]*m[0]]),w=o.aperture?.76:1,M=v(I)*a*o.thicknessScale*w,x=v(I)*a*o.thicknessScale*w,A=3*H;y[A]=l[0]+m[0]*M+f[0]*x,y[A+1]=l[1]+m[1]*M+f[1]*x,y[A+2]=l[2]+m[2]*M+f[2]*x,h[A]=u[0],h[A+1]=u[1],h[A+2]=u[2],D[A]=c[0],D[A+1]=c[1],D[A+2]=c[2],d[2*H]=+!!o.aperture,d[2*H+1]=o.aperture&&o.thicknessScale>.5?1:0,p[H]=t,g[H]=o.layerOpacity,b[H]=i,O[H]=I(),W[H]=r.strandPhase+(n.strandPhase-r.strandPhase)*s,H+=1};for(let e=0;e<t.backbones;e+=1)_(V(G,e,t.backbones).edgeIndex,0,.026,.14+.76*Math.pow(I(),2.4)+(.045>I()?.4+.52*I():0));for(let e=0;e<t.bonds;e+=1)_(V(L,e,t.bonds).edgeIndex,1,.018,.1+.5*Math.pow(I(),2.5)+(.025>I()?.22+.3*I():0));for(let e=0;e<t.motes;e+=1){let e,t=3*H,a=I()*u,i="mobile"===o.layout?.32:.022,n="mobile"===o.layout?1.08:.78,s=I()<i,c=I(),w="mobile"===o.layout&&!s&&c<.1,M="mobile"===o.layout&&s,x=c<.2,S=z[Math.floor(I()*z.length)],A=I()*u,P=Math.sqrt(I())*l*n;e=w?[r.width*(.16+.38*I()),r.height*(.12+.36*I()),-1.8+3.6*I()]:s?[Math.cos(A)*P,Math.sin(A)*P,.04+.14+.34*I()]:x?[f(I)*r.width*.5,f(I)*r.height*.5,4.8*f(I)]:[m(S.x+v(I)*S.radiusX,-(.54*r.width),.54*r.width),m(S.y+v(I)*S.radiusY,-(.54*r.height),.54*r.height),S.depth+Math.tanh(.68*v(I))*S.radiusZ*1.65],y[t]=e[0],y[t+1]=e[1],y[t+2]=e[2],h[t]=y[t],h[t+1]=y[t+1],h[t+2]=y[t+2],D[t+2]=1,d[2*H]=Math.cos(a),d[2*H+1]=Math.sin(a),p[H]=2;let R=.34+.4*I(),F=m((y[t+2]-.8)/2.8),C=.16+1.18*Math.pow(I(),2.05)+F*(.46+1.16*I())+(.04>I()?1.34+2.24*I():0);g[H]=M?Math.min(1,R+.22):R,b[H]=M?.12+.42*Math.min(C,1.6):C,O[H]=I(),W[H]=I()*u,H+=1}return{apertureRadius:l,centerlinePositions:h,flowDirections:d,kinds:p,layerOpacities:g,positions:y,scales:b,seeds:O,strandPhases:W,tangentDirections:D}}({backbones:Math.floor(a.backbones*i),bonds:Math.floor(a.bonds*i),motes:Math.floor(a.motes*i)},t),r=new n.A;r.setAttribute("position",new n.ub(o.positions,3)),r.setAttribute("aCenterlinePosition",new n.ub(o.centerlinePositions,3)),r.setAttribute("aKind",new n.ub(o.kinds,1)),r.setAttribute("aLayerOpacity",new n.ub(o.layerOpacities,1)),r.setAttribute("aScale",new n.ub(o.scales,1)),r.setAttribute("aSeed",new n.ub(o.seeds,1)),r.setAttribute("aStrandPhase",new n.ub(o.strandPhases,1)),r.setAttribute("aTangentDirection",new n.ub(o.tangentDirections,3)),r.setAttribute("aFlowDirection",new n.ub(o.flowDirections,2)),null!=this.particles&&(this.scene.remove(this.particles),this.particles.geometry.dispose()),this.particles=new n.Qc(r,this.particleMaterial),this.particles.frustumCulled=!1,this.scene.add(this.particles),this.particleMaterial.uniforms.uApertureRadius.value=o.apertureRadius,this.createAperture(o.apertureRadius),this.applyFocusState(this.elapsedSeconds,0===this.particleMaterial.uniforms.uMotion.value),this.refreshForeground(),this.geometryIsCompact=e,this.geometryViewport.set(t.width,t.height)}createAperture(e){this.disposeAperture();let t={uApertureContrast:{value:1.85},uApertureRadius:{value:e},uForeground:{value:new n.K},uOpacity:{value:1},uTime:{value:0}};this.aperture=new n.tc(new n.hd(Math.max(.01,e-.72),e+.72,192),new n.jd({blending:1,depthWrite:!1,fragmentShader:B,transparent:!0,uniforms:{...t,uCoronaIntensityScale:{value:1.18},uCoronaSizeScale:{value:1}},vertexShader:z})),this.aperture.position.z=.04,this.aperture.renderOrder=1,this.scene.add(this.aperture),this.notch=new n.tc(new n.hd(Math.max(.01,e-.385),Math.max(.02,e-.068),288),new n.jd({blending:1,depthWrite:!1,fragmentShader:G,transparent:!0,uniforms:{...t,uFlareRotation:{value:0}},vertexShader:E})),this.notch.position.z=.045,this.notch.renderOrder=2,this.scene.add(this.notch)}disposeAperture(){for(let e of[this.aperture,this.notch])null!=e&&(this.scene.remove(e),e.geometry.dispose(),e.material instanceof n.nc&&e.material.dispose());this.aperture=null,this.notch=null}refreshForeground=()=>{let e=new n.K(window.getComputedStyle(this.canvas).color),t=this.particleMaterial.uniforms.uForeground.value;t instanceof n.K&&t.copy(e);let a=(e.r+e.g+e.b)/3>.5,i=a?2:1;for(let t of(this.particleMaterial.uniforms.uContrast.value=a?2:1.65,this.particleMaterial.blending!==i&&(this.particleMaterial.blending=i,this.particleMaterial.needsUpdate=!0),[this.aperture,this.notch]))if(t?.material instanceof n.jd){let o=t.material.uniforms.uForeground.value;o instanceof n.K&&o.copy(e),t.material.uniforms.uApertureContrast.value=a?1.85:1.25,t.material.blending!==i&&(t.material.blending=i,t.material.needsUpdate=!0)}this.renderer.render(this.scene,this.camera)};animate=e=>{if("hidden"===document.visibilityState){this.animationFrame=null,this.lastFrameTime=0;return}if(e-this.lastFrameTime>=L){0!==this.lastFrameTime&&(this.elapsedSeconds+=Math.min((e-this.lastFrameTime)/1e3,.1)),this.lastFrameTime=e,this.pointer.lerp(this.targetPointer,.065);let t=this.elapsedSeconds;for(let e of(this.particleMaterial.uniforms.uTime.value=t,this.applyFocusState(t,!1),[this.aperture,this.notch]))e?.material instanceof n.jd&&(e.material.uniforms.uTime.value=t);this.renderer.render(this.scene,this.camera)}this.animationFrame=window.requestAnimationFrame(this.animate)};applyFocusState(e,t){let a=function(e){let t=arguments.length>1&&void 0!==arguments[1]&&arguments[1];if(t)return{bokehScale:1.5,cameraFov:39,dialRotation:0,opacity:1};let a=Math.min(2.72,Math.max(0,e)),i=O.findIndex(e=>e.elapsedSeconds>=a),o=Math.min(1,Math.max(0,e/.8)),r=o*o*(3-2*o);if(i<=0)return{...i<0?O[O.length-1]:O[0],opacity:r};let n=O[i-1],s=O[i],l=O[Math.max(i-2,0)],h=O[Math.min(i+1,O.length-1)],u=(a-n.elapsedSeconds)/(s.elapsedSeconds-n.elapsedSeconds);return{bokehScale:W(l.bokehScale,n.bokehScale,s.bokehScale,h.bokehScale,u),cameraFov:W(l.cameraFov,n.cameraFov,s.cameraFov,h.cameraFov,u),dialRotation:W(l.dialRotation,n.dialRotation,s.dialRotation,h.dialRotation,u),opacity:r}}(e,t);if(this.particleMaterial.uniforms.uIntroOpacity.value=a.opacity,this.particleMaterial.uniforms.uFocusBokeh.value=a.bokehScale,this.camera.fov!==a.cameraFov&&(this.camera.fov=a.cameraFov,this.camera.updateProjectionMatrix()),null!=this.aperture&&(this.aperture.rotation.z=a.dialRotation),null!=this.notch){let t=-.1*Math.max(0,e-2.72);this.notch.rotation.z=18*a.dialRotation+t}for(let e of[this.aperture,this.notch])e?.material instanceof n.jd&&(e.material.uniforms.uOpacity.value=a.opacity);this.notch?.material instanceof n.jd&&(this.notch.material.uniforms.uFlareRotation.value=a.dialRotation)}handlePointerMove=e=>{let t=this.canvas.getBoundingClientRect();this.targetPointer.set((e.clientX-t.left)/Math.max(t.width,1)*2-1,1-(e.clientY-t.top)/Math.max(t.height,1)*2)};handlePointerLeave=()=>{this.targetPointer.set(0,0)};handleVisibility=()=>{"hidden"!==document.visibilityState&&null==this.animationFrame&&(this.animationFrame=window.requestAnimationFrame(this.animate))}}}};