export const __rspack_esm_ids=[969647];export const __webpack_modules__={Ipng(e,t,r){let n,i;r.d(t,{a:()=>N});var a=r("unhp"),o=r("zd8w"),s=r("PVZC"),l=r("hPwS");let d=new s.v,c=new s.Xd;class u extends s.Kb{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new s.ub([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new s.ub([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,r=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),r.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let r=new s.Lb(t,6,1);return this.setAttribute("instanceStart",new s.Rb(r,3,0)),this.setAttribute("instanceEnd",new s.Rb(r,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let r;e instanceof Float32Array?r=e:Array.isArray(e)&&(r=new Float32Array(e));let n=new s.Lb(r,2*t,1);return this.setAttribute("instanceColorStart",new s.Rb(n,t,0)),this.setAttribute("instanceColorEnd",new s.Rb(n,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new s.fe(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new s.v);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),d.setFromBufferAttribute(t),this.boundingBox.union(d))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new s.td),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let r=this.boundingSphere.center;this.boundingBox.getCenter(r);let n=0;for(let i=0,a=e.count;i<a;i++)c.fromBufferAttribute(e,i),n=Math.max(n,r.distanceToSquared(c)),c.fromBufferAttribute(t,i),n=Math.max(n,r.distanceToSquared(c));this.boundingSphere.radius=Math.sqrt(n),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var p=r("STXV");let f=parseInt("179".replace(/\D+/g,""));class m extends s.jd{constructor(e){super({type:"LineMaterial",uniforms:s.Vd.clone(s.Vd.merge([p.UniformsLib.common,p.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new s.Wd(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${f>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let h=f>=125?"uv1":"uv2",v=new s.Yd,x=new s.Xd,g=new s.Xd,b=new s.Yd,y=new s.Yd,w=new s.Yd,S=new s.Xd,E=new s.sc,j=new s.ac,k=new s.Xd,M=new s.v,L=new s.td,A=new s.Yd;function P(e,t,r){return A.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),A.multiplyScalar(1/A.w),A.x=i/r.width,A.y=i/r.height,A.applyMatrix4(e.projectionMatrixInverse),A.multiplyScalar(1/A.w),Math.abs(Math.max(A.x,A.y))}class _ extends s.tc{constructor(e=new u,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,r=e.attributes.instanceEnd,n=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)x.fromBufferAttribute(t,e),g.fromBufferAttribute(r,e),n[i]=0===i?0:n[i-1],n[i+1]=n[i]+x.distanceTo(g);let i=new s.Lb(n,2,1);return e.setAttribute("instanceDistanceStart",new s.Rb(i,1,0)),e.setAttribute("instanceDistanceEnd",new s.Rb(i,1,1)),this}raycast(e,t){let r,a,o=this.material.worldUnits,l=e.camera;null!==l||o||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let d=void 0!==e.params.Line2&&e.params.Line2.threshold||0;n=e.ray;let c=this.matrixWorld,u=this.geometry,p=this.material;if(i=p.linewidth+d,null===u.boundingSphere&&u.computeBoundingSphere(),L.copy(u.boundingSphere).applyMatrix4(c),o)r=.5*i;else{let e=Math.max(l.near,L.distanceToPoint(n.origin));r=P(l,e,p.resolution)}if(L.radius+=r,!1!==n.intersectsSphere(L)){if(null===u.boundingBox&&u.computeBoundingBox(),M.copy(u.boundingBox).applyMatrix4(c),o)a=.5*i;else{let e=Math.max(l.near,M.distanceToPoint(n.origin));a=P(l,e,p.resolution)}M.expandByScalar(a),!1!==n.intersectsBox(M)&&(o?function(e,t){let r=e.matrixWorld,a=e.geometry,o=a.attributes.instanceStart,l=a.attributes.instanceEnd,d=Math.min(a.instanceCount,o.count);for(let a=0;a<d;a++){j.start.fromBufferAttribute(o,a),j.end.fromBufferAttribute(l,a),j.applyMatrix4(r);let d=new s.Xd,c=new s.Xd;n.distanceSqToSegment(j.start,j.end,c,d),c.distanceTo(d)<.5*i&&t.push({point:c,pointOnLine:d,distance:n.origin.distanceTo(c),object:e,face:null,faceIndex:a,uv:null,[h]:null})}}(this,t):function(e,t,r){let a=t.projectionMatrix,o=e.material.resolution,l=e.matrixWorld,d=e.geometry,c=d.attributes.instanceStart,u=d.attributes.instanceEnd,p=Math.min(d.instanceCount,c.count),f=-t.near;n.at(1,w),w.w=1,w.applyMatrix4(t.matrixWorldInverse),w.applyMatrix4(a),w.multiplyScalar(1/w.w),w.x*=o.x/2,w.y*=o.y/2,w.z=0,S.copy(w),E.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<p;t++){if(b.fromBufferAttribute(c,t),y.fromBufferAttribute(u,t),b.w=1,y.w=1,b.applyMatrix4(E),y.applyMatrix4(E),b.z>f&&y.z>f)continue;if(b.z>f){let e=b.z-y.z,t=(b.z-f)/e;b.lerp(y,t)}else if(y.z>f){let e=y.z-b.z,t=(y.z-f)/e;y.lerp(b,t)}b.applyMatrix4(a),y.applyMatrix4(a),b.multiplyScalar(1/b.w),y.multiplyScalar(1/y.w),b.x*=o.x/2,b.y*=o.y/2,y.x*=o.x/2,y.y*=o.y/2,j.start.copy(b),j.start.z=0,j.end.copy(y),j.end.z=0;let d=j.closestPointToPointParameter(S,!0);j.at(d,k);let p=s.pc.lerp(b.z,y.z,d),m=p>=-1&&p<=1,v=S.distanceTo(k)<.5*i;if(m&&v){j.start.fromBufferAttribute(c,t),j.end.fromBufferAttribute(u,t),j.start.applyMatrix4(l),j.end.applyMatrix4(l);let i=new s.Xd,a=new s.Xd;n.distanceSqToSegment(j.start,j.end,a,i),r.push({point:a,pointOnLine:i,distance:n.origin.distanceTo(a),object:e,face:null,faceIndex:t,uv:null,[h]:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(v),this.material.uniforms.resolution.value.set(v.z,v.w))}}class z extends u{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,r=new Float32Array(2*t);for(let n=0;n<t;n+=3)r[2*n]=e[n],r[2*n+1]=e[n+1],r[2*n+2]=e[n+2],r[2*n+3]=e[n+3],r[2*n+4]=e[n+4],r[2*n+5]=e[n+5];return super.setPositions(r),this}setColors(e,t=3){let r=e.length-t,n=new Float32Array(2*r);if(3===t)for(let i=0;i<r;i+=t)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];else for(let i=0;i<r;i+=t)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5],n[2*i+6]=e[i+6],n[2*i+7]=e[i+7];return super.setColors(n,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class C extends _{constructor(e=new z,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let N=o.forwardRef(function({points:e,color:t=0xffffff,vertexColors:r,linewidth:n,lineWidth:i,segments:d,dashed:c,...p},f){var h,v;let x=(0,l.C)(e=>e.size),g=o.useMemo(()=>d?new _:new C,[d]),[b]=o.useState(()=>new m),y=(null==r||null==(h=r[0])?void 0:h.length)===4?4:3,w=o.useMemo(()=>{let n=d?new u:new z,i=e.map(e=>{let t=Array.isArray(e);return e instanceof s.Xd||e instanceof s.Yd?[e.x,e.y,e.z]:e instanceof s.Wd?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(n.setPositions(i.flat()),r){t=0xffffff;let e=r.map(e=>e instanceof s.K?e.toArray():e);n.setColors(e.flat(),y)}return n},[e,d,r,y]);return o.useLayoutEffect(()=>{g.computeLineDistances()},[e,g]),o.useLayoutEffect(()=>{c?b.defines.USE_DASH="":delete b.defines.USE_DASH,b.needsUpdate=!0},[c,b]),o.useEffect(()=>()=>{w.dispose(),b.dispose()},[w]),o.createElement("primitive",(0,a.a)({object:g,ref:f},p),o.createElement("primitive",{object:w,attach:"geometry"}),o.createElement("primitive",(0,a.a)({object:b,attach:"material",color:t,vertexColors:!!r,resolution:[x.width,x.height],linewidth:null!=(v=null!=n?n:i)?v:1,dashed:c,transparent:4===y},p)))})},mevF(e,t,r){let n,i;var a=r("unhp"),o=r("zd8w"),s=r("CE87"),l=r("PVZC"),d=r("hPwS");let c=new l.Xd,u=new l.Xd,p=new l.Xd,f=new l.Wd;function m(e,t,r){let n=c.setFromMatrixPosition(e.matrixWorld);n.project(t);let i=r.width/2,a=r.height/2;return[n.x*i+i,-(n.y*a)+a]}let h=e=>1e-10>Math.abs(e)?0:e;function v(e,t,r=""){let n="matrix3d(";for(let r=0;16!==r;r++)n+=h(t[r]*e.elements[r])+(15!==r?",":")");return r+n}let x=(n=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>v(e,n)),g=(i=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>v(e,i(t),"translate(-50%,-50%)")),b=o.forwardRef(({children:e,eps:t=.001,style:r,className:n,prepend:i,center:v,fullscreen:b,portal:y,distanceFactor:w,sprite:S=!1,transform:E=!1,occlude:j,onOcclude:k,castShadow:M,receiveShadow:L,material:A,geometry:P,zIndexRange:_=[0x1000037,0],calculatePosition:z=m,as:C="div",wrapperClass:N,pointerEvents:R="auto",...U},D)=>{let{gl:W,camera:O,scene:T,size:B,raycaster:I,events:F,viewport:H}=(0,d.C)(),[$]=o.useState(()=>document.createElement(C)),V=o.useRef(null),X=o.useRef(null),G=o.useRef(0),Y=o.useRef([0,0]),K=o.useRef(null),Z=o.useRef(null),q=(null==y?void 0:y.current)||F.connected||W.domElement.parentNode,J=o.useRef(null),Q=o.useRef(!1),ee=o.useMemo(()=>{var e;return j&&"blending"!==j||Array.isArray(j)&&j.length&&(e=j[0])&&"object"==typeof e&&"current"in e},[j]);o.useLayoutEffect(()=>{let e=W.domElement;j&&"blending"===j?(e.style.zIndex=`${Math.floor(_[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[j]),o.useLayoutEffect(()=>{if(X.current){let e=V.current=s.createRoot($);if(T.updateMatrixWorld(),E)$.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=z(X.current,O,B);$.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return q&&(i?q.prepend($):q.appendChild($)),()=>{q&&q.removeChild($),e.unmount()}}},[q,E]),o.useLayoutEffect(()=>{N&&($.className=N)},[N]);let et=o.useMemo(()=>E?{position:"absolute",top:0,left:0,width:B.width,height:B.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:v?"translate3d(-50%,-50%,0)":"none",...b&&{top:-B.height/2,left:-B.width/2,width:B.width,height:B.height},...r},[r,v,b,B,E]),er=o.useMemo(()=>({position:"absolute",pointerEvents:R}),[R]);o.useLayoutEffect(()=>{var t,i;Q.current=!1,E?null==(t=V.current)||t.render(o.createElement("div",{ref:K,style:et},o.createElement("div",{ref:Z,style:er},o.createElement("div",{ref:D,className:n,style:r,children:e})))):null==(i=V.current)||i.render(o.createElement("div",{ref:D,style:et,className:n,children:e}))});let en=o.useRef(!0);(0,d.D)(e=>{if(X.current){O.updateMatrixWorld(),X.current.updateWorldMatrix(!0,!1);let e=E?Y.current:z(X.current,O,B);if(E||Math.abs(G.current-O.zoom)>t||Math.abs(Y.current[0]-e[0])>t||Math.abs(Y.current[1]-e[1])>t){var r;let t,n,i,a,o=(r=X.current,t=c.setFromMatrixPosition(r.matrixWorld),n=u.setFromMatrixPosition(O.matrixWorld),i=t.sub(n),a=O.getWorldDirection(p),i.angleTo(a)>Math.PI/2),s=!1;ee&&(Array.isArray(j)?s=j.map(e=>e.current):"blending"!==j&&(s=[T]));let d=en.current;s?en.current=function(e,t,r,n){let i=c.setFromMatrixPosition(e.matrixWorld),a=i.clone();a.project(t),f.set(a.x,a.y),r.setFromCamera(f,t);let o=r.intersectObjects(n,!0);if(o.length){let e=o[0].distance;return i.distanceTo(r.ray.origin)<e}return!0}(X.current,O,I,s)&&!o:en.current=!o,d!==en.current&&(k?k(!en.current):$.style.display=en.current?"block":"none");let m=Math.floor(_[0]/2),v=j?ee?[_[0],m]:[m-1,0]:_;if($.style.zIndex=`${function(e,t,r){if(t instanceof l.Kc||t instanceof l.Ic){let n=c.setFromMatrixPosition(e.matrixWorld),i=u.setFromMatrixPosition(t.matrixWorld),a=n.distanceTo(i),o=(r[1]-r[0])/(t.far-t.near),s=r[1]-o*t.far;return Math.round(o*a+s)}}(X.current,O,v)}`,E){let[e,t]=[B.width/2,B.height/2],r=O.projectionMatrix.elements[5]*t,{isOrthographicCamera:n,top:i,left:a,bottom:o,right:s}=O,l=x(O.matrixWorldInverse),d=n?`scale(${r})translate(${h(-(s+a)/2)}px,${h((i+o)/2)}px)`:`translateZ(${r}px)`,c=X.current.matrixWorld;S&&((c=O.matrixWorldInverse.clone().transpose().copyPosition(c).scale(X.current.scale)).elements[3]=c.elements[7]=c.elements[11]=0,c.elements[15]=1),$.style.width=B.width+"px",$.style.height=B.height+"px",$.style.perspective=n?"":`${r}px`,K.current&&Z.current&&(K.current.style.transform=`${d}${l}translate(${e}px,${t}px)`,Z.current.style.transform=g(c,1/((w||10)/400)))}else{let t=void 0===w?1:function(e,t){if(t instanceof l.Ic)return t.zoom;if(!(t instanceof l.Kc))return 1;{let r=c.setFromMatrixPosition(e.matrixWorld),n=u.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*r.distanceTo(n))}}(X.current,O)*w;$.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}Y.current=e,G.current=O.zoom}}if(!ee&&J.current&&!Q.current)if(E){if(K.current){let e=K.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=O;if(t||P)U.scale&&(Array.isArray(U.scale)?U.scale instanceof l.Xd?J.current.scale.copy(U.scale.clone().divideScalar(1)):J.current.scale.set(1/U.scale[0],1/U.scale[1],1/U.scale[2]):J.current.scale.setScalar(1/U.scale));else{let t=(w||10)/400,r=e.clientWidth*t,n=e.clientHeight*t;J.current.scale.set(r,n,1)}Q.current=!0}}}else{let t=$.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/H.factor,r=t.clientWidth*e,n=t.clientHeight*e;J.current.scale.set(r,n,1),Q.current=!0}J.current.lookAt(e.camera.position)}});let ei=o.useMemo(()=>({vertexShader:E?void 0:`
          /*
            This shader is from the THREE's SpriteMaterial.
            We need to turn the backing plane into a Sprite
            (make it always face the camera) if "transfrom"
            is false.
          */
          #include <common>

          void main() {
            vec2 center = vec2(0., 1.);
            float rotation = 0.0;

            // This is somewhat arbitrary, but it seems to work well
            // Need to figure out how to derive this dynamically if it even matters
            float size = 0.03;

            vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
            vec2 scale;
            scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
            scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );

            bool isPerspective = isPerspectiveMatrix( projectionMatrix );
            if ( isPerspective ) scale *= - mvPosition.z;

            vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
            vec2 rotatedPosition;
            rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
            rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
            mvPosition.xy += rotatedPosition;

            gl_Position = projectionMatrix * mvPosition;
          }
      `,fragmentShader:`
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
        }
      `}),[E]);return o.createElement("group",(0,a.a)({},U,{ref:X}),j&&!ee&&o.createElement("mesh",{castShadow:M,receiveShadow:L,ref:J},P||o.createElement("planeGeometry",null),A||o.createElement("shaderMaterial",{side:2,vertexShader:ei.vertexShader,fragmentShader:ei.fragmentShader})))});r.d(t,{},{a:b})},sKwe(e,t,r){var n=r("ABep"),i=r("on57"),a=r("zd8w"),o=r("iLdV");let s=e=>e?e.replace(/\\mid/g,"|").replace(/\\neg/g,"¬").replace(/\\cap/g,"∩").replace(/\\cup/g,"∪").replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\mathrm\{([^}]*)\}/g,"$1").replace(/\\[a-zA-Z]+/g,"").replace(/[{}_^]/g,"").replace(/\s+/g," ").trim().length:0,l=e=>{let t=e.formatValueForInput??o.c,r=Math.max((0,o.d)(e.min,e.step,t).length,(0,o.d)(e.max,e.step,t).length),n=e.inlineUnit?e.unit?.length??0:0;return e.range?2*r+2:r+n};r.d(t,{},{a:e=>{let{inputs:t}=e,r=(0,a.useRef)(null),[d,c]=(0,a.useState)(),u=t.some(e=>e.before),p=t.filter(e=>!e.options&&!1!==e.showValueInput),f=Math.max(0,...t.map(e=>s(e.variable))),m=Math.max(0,...p.map(l)),h=Math.max(0,...p.map(e=>s(e.inlineUnit?void 0:e.unit))),v=t.map(e=>e.variable??"").join("\0");return(0,a.useLayoutEffect)(()=>{let e=r.current;if(!e)return;let t=Array.from(e.querySelectorAll("[data-input-selector-variable]"));if(0===t.length)return;let n=()=>{let r=t.filter(e=>"stacked"!==e.dataset.inputSelectorLabelLayout),n=r.length?Math.max(...r.map(t=>{let r=t.cloneNode(!0);r.removeAttribute("data-input-selector-variable"),Object.assign(r.style,{inset:"0 auto auto 0",maxWidth:"none",position:"absolute",visibility:"hidden",whiteSpace:"nowrap",width:"max-content"}),e.appendChild(r);let n=r.getBoundingClientRect().width;return r.remove(),n})):void 0;c(e=>e===n?e:n)};if(n(),"u"<typeof ResizeObserver)return;let i=new ResizeObserver(n);t.forEach(e=>i.observe(e));let a=new MutationObserver(n);return t.forEach(e=>a.observe(e,{attributeFilter:["data-input-selector-label-layout"]})),()=>{i.disconnect(),a.disconnect()}},[v]),(0,n.jsx)("div",{ref:r,"data-input-selector-group":!0,className:"grid min-h-fit min-w-0 shrink grow-0 gap-y-3",children:t.map((e,t)=>(0,n.jsxs)("div",{className:(0,i.b)("grid h-full min-w-0 items-center gap-x-2",u?"grid-cols-[auto_minmax(0,1fr)]":"grid-cols-[minmax(0,1fr)]"),children:[u?e.before??(0,n.jsx)("div",{"aria-hidden":!0}):null,(0,n.jsx)(o.a,{...e,groupVariableWidthCh:f,groupVariableWidthPx:d,groupUnitWidthCh:h,groupValueWidthCh:m})]},t))})},b:function(e,t,r,n){var i;let{before:a,disabled:o,displayValue:s,editType:l="CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE",formatValueForInput:d,inlineUnit:c,parseInputValue:u,mapValue:p,options:f,optionLabelFormat:m,showValueInput:h,sliderStyle:v,ariaLabel:x,ariaValueText:g,onActiveChange:b,value:y,variable:w,variableBold:S,variableFormat:E,unit:j}=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{};return{before:a,disabled:o,displayValue:s,options:f,optionLabelFormat:m,showValueInput:h,sliderStyle:v,inlineUnit:c,ariaLabel:x,ariaValueText:g,variable:w??t.variable??(i=String(e),i.match(/[A-Za-z]/)?.[0]??i),variableBold:S??t.variableBold,variableFormat:E??t.variableFormat,unit:j??t.unit,formatValueForInput:d,parseInputValue:u,max:t.max,min:t.min,step:t.step,value:y??Number(r[e]),onActiveChange:b,onChange:(t,r)=>{let i=p?p(t):t;n(t=>({...t,[e]:i}),"function"==typeof l?l(r):l)}}}})},iLdV(e,t,r){var n=r("ABep"),i=r("YAOF"),a=r("on57"),o=r("zd8w"),s=r("Wf1j"),l=r("l7Go"),d=r("jYuH"),c=r("evpU");let u=(e,t,r)=>Math.min(Math.max(e,t),r),p=/[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?/i,f=(e,t,r,n)=>{if(!Number.isFinite(e))return t;let i=Math.round((u(e,t,r)-t)/n),a=(0,d.c)(n);return u((0,d.h)(t+i*n,Math.max(1,a)),t,r)},m=(e,t)=>Number.isFinite(e)?e.toFixed(Math.max(1,(0,d.c)(t))):"",h=(e,t,r)=>{let n=r(e,t);return n.match(p)?.[0]??n},v=e=>{let t=[],r=e.parentElement;for(;r;)"visible"!==window.getComputedStyle(r).overflowY&&t.push(r),r=r.parentElement;return t},x=(0,o.createContext)({isNativeSlider:!1}),g=()=>(0,n.jsx)("svg",{"aria-hidden":!0,className:"h-4 w-4 flex-none",fill:"none",viewBox:"0 0 16 16",children:(0,n.jsx)("path",{d:"m5 6 3-3 3 3M5 10l3 3 3-3",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"1.5"})});r.d(t,{},{a:e=>{let t,{min:r,max:d,step:u,value:b,displayValue:y,onChange:w,onActiveChange:S,disabled:E,options:j,optionLabelFormat:k="text",sliderStyle:M="continuous",ariaLabel:L,ariaValueText:A,variable:P,variableBold:_,variableFormat:z,inlineUnit:C,unit:N,formatValueForInput:R=m,parseInputValue:U,normalizeCommittedValue:D,minSliderWidthPx:W,showValueInput:O=!0,range:T,valueClassName:B,groupVariableWidthCh:I,groupVariableWidthPx:F,groupUnitWidthCh:H,groupValueWidthCh:$}=e,{isNativeSlider:V,onSliderInteractionEnd:X,onSliderInteractionStart:G}=(0,o.useContext)(x),Y=(0,s.a)(),K=U??Number.parseFloat,Z=f(b,r,d,u),q=Number.isFinite(y)?y:Z,[J,Q]=(0,o.useState)(()=>h(q,u,R)),[ee,et]=(0,o.useState)(!1),er=(0,o.useRef)(!1),en=(0,o.useRef)(!1),ei=(0,o.useRef)(!1),ea=(0,o.useRef)(null),eo=(0,o.useRef)(null),es=(0,o.useRef)(null),el=(0,o.useRef)(null),ed=(0,o.useRef)(null),ec=(0,o.useRef)(null),eu=(0,o.useRef)(null),ep=(0,o.useRef)(null),ef=(0,o.useRef)(!1),[em,eh]=(0,o.useState)(!1),[ev,ex]=(0,o.useState)(!1),[eg,eb]=(0,o.useState)(!1),[ey,ew]=(0,o.useState)(V?"above":"below"),eS=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"blur";"blur"===e&&ei.current||en.current&&(en.current=!1,S?.(!1),X?.())},eE=()=>{en.current||(en.current=!0,S?.(!0),G?.(P))},ej=()=>{ei.current=!0,eE()};(0,o.useEffect)(()=>{let e=()=>{ei.current=!1,eS("pointer-end")};return window.addEventListener("pointerup",e),window.addEventListener("pointercancel",e),()=>{window.removeEventListener("pointerup",e),window.removeEventListener("pointercancel",e)}},[S,X]),(0,o.useLayoutEffect)(()=>{let e=ed.current,t=ec.current;if(!j||!e||!t)return void eh(!1);let r=()=>{let r=e.clientWidth,n=t.scrollWidth>r+1;eh(e=>e===n?e:n)};r();let n="u"<typeof document?void 0:document.fonts;if(n?.addEventListener("loadingdone",r),"u"<typeof ResizeObserver)return()=>n?.removeEventListener("loadingdone",r);let i=new ResizeObserver(r);return i.observe(e),i.observe(t),()=>{n?.removeEventListener("loadingdone",r),i.disconnect()}},[j,k]),(0,o.useEffect)(()=>{let e=e=>{"Escape"===e.key&&ef.current&&(ef.current=!1,e.preventDefault(),e.stopPropagation())};return document.addEventListener("keyup",e,!0),()=>document.removeEventListener("keyup",e,!0)},[]),(0,o.useEffect)(()=>{if(!eg)return;ef.current=!1;let e=e=>{let t=e.target;!(t instanceof Node)||eu.current?.contains(t)||ep.current?.contains(t)||eb(!1)},t=e=>{"Escape"===e.key&&(ef.current=!0,e.preventDefault(),e.stopPropagation(),eb(!1),ep.current?.focus())};return document.addEventListener("pointerdown",e),document.addEventListener("keydown",t,!0),()=>{document.removeEventListener("pointerdown",e),document.removeEventListener("keydown",t,!0)}},[eg]),(0,o.useEffect)(()=>{(!em||E)&&eb(!1)},[E,em]),(0,o.useLayoutEffect)(()=>{if(!eg)return void ew(V?"above":"below");let e=eu.current,t=ep.current;if(!e||!t)return;let r=()=>{ew((e=>{let{boundary:t,menuHeight:r,trigger:n}=e,i=t.bottom-n.bottom-4;if(r<=i)return"below";let a=n.top-t.top-4;return r<=a||a>i?"above":"below"})({boundary:(e=>{let{clippingAncestors:t,viewport:r}=e;return t.reduce((e,t)=>({bottom:Math.min(e.bottom,t.bottom),top:Math.max(e.top,t.top)}),r)})({clippingAncestors:v(t).map(e=>e.getBoundingClientRect()),viewport:{bottom:window.innerHeight,top:0}}),menuHeight:e.getBoundingClientRect().height,trigger:t.getBoundingClientRect()}))};if(r(),window.addEventListener("resize",r),"u"<typeof ResizeObserver)return()=>window.removeEventListener("resize",r);let n=new ResizeObserver(r);return n.observe(e),n.observe(t),v(t).forEach(e=>n.observe(e)),()=>{window.removeEventListener("resize",r),n.disconnect()}},[eg,V]);let ek=ee?J:h(q,u,R),eM=Math.max(h(r,u,R).length,h(d,u,R).length),eL=T?(t=T.displayValues??T.ariaValueTexts??[h(T.values[0],u,R),h(T.values[1],u,R)],`(${t[0]}, ${t[1]})`):void 0,eA=T?2*eM+2:eM,eP=$??eA,e_=W??96,ez=_??!1,eC=P?P.replace(/[^\w-]+/g,"_"):"input-selector-value",eN=L??(P?Y.formatMessage({id:"learningBlock.inputSelector.valueAriaLabel",defaultMessage:"{label} value"},{label:P}):void 0),eR=!!P&&"text"!==z&&(!!("katex"===z||/\\/.test(P))||/^[A-Za-zθμσλπΔ](?:[_^][A-Za-z0-9{}]+)?$/.test(P)),eU=j?.find(e=>f(e.value,r,d,u)===Z)??j?.[0],eD=em?Y.formatMessage({id:"learningBlock.inputSelector.overflowMenuAriaLabel",defaultMessage:"{value}. Show all {label} options"},{label:eN??Y.formatMessage({id:"learningBlock.inputSelector.selectorAriaLabel",defaultMessage:"selector"}),value:eU?.ariaLabel??eU?.label??""}):void 0,eW=(0,o.useId)(),eO=(e,t)=>"katex"!==t?e:(0,n.jsx)(l.a,{className:"katex",latex:e}),eT=e=>f(e.value,r,d,u),eB=j?.find(e=>eT(e)===Z)??j?.[0],eI=e=>{let t=K(e);if(!Number.isFinite(t))return void Q(h(q,u,R));let n=((e,t)=>{let{max:r,min:n,normalizeCommittedValue:i,step:a}=t;return i?i(e):f(e,n,r,a)})(t,{min:r,max:d,step:u,normalizeCommittedValue:D});w(n,"input"),Q(h(n,u,R))},eF=P?(0,n.jsx)("div",{"data-input-selector-variable":!0,"data-input-selector-label-layout":ev?"stacked":"inline",className:(0,a.b)("text-token-text-primary min-w-0 max-w-full justify-self-start text-sm leading-5 whitespace-normal hyphens-auto [overflow-wrap:anywhere] [&_.katex]:!text-[1em]",ez&&"font-medium"),children:eR?(0,n.jsx)(l.a,{className:"katex",latex:P??""}):P}):null,eH=!!(C&&N&&!T),e$=N&&!eH?(0,n.jsx)("div",{ref:el,className:"text-token-text-secondary shrink-0 text-xs leading-4 whitespace-nowrap [&_.katex]:text-inherit",children:N}):null,eV=!!$,eX=`minmax(max(${eP}ch,2rem), max(${eP}ch,2rem))`,eG=!!H,eY=`minmax(${H??0}ch, ${H??0}ch)`,eK=!j&&eG?e$??(0,n.jsx)("div",{ref:el,"aria-hidden":!0}):null,eZ=F?`${F}px`:I?`${I}ch`:null,eq=eZ?`minmax(0, min(${eZ}, 40%))`:"fit-content(40%)";(0,o.useLayoutEffect)(()=>{let e=ea.current,t=eo.current;if(j||!e||!t)return void ex(!1);let r=()=>{let r=e.clientWidth;if(0===r)return;let n=(e=>{let{availableWidth:t,labelWidth:r,minSliderWidthPx:n=96,unitWidth:i,valueWidth:a}=e,o=2+Number(a>0)+Number(i>0);return r+a+i+(o-1)*12+n>t+1})({availableWidth:r,labelWidth:Math.max(t.scrollWidth,F??0),minSliderWidthPx:e_,unitWidth:el.current?.clientWidth??0,valueWidth:es.current?.clientWidth??0});ex(e=>e===n?e:n)};r();let n="u"<typeof document?void 0:document.fonts;if(n?.addEventListener("loadingdone",r),"u"<typeof ResizeObserver)return()=>n?.removeEventListener("loadingdone",r);let i=new ResizeObserver(r);return i.observe(e),i.observe(t),es.current&&i.observe(es.current),el.current&&i.observe(el.current),()=>{n?.removeEventListener("loadingdone",r),i.disconnect()}},[H,$,F,j,e_,P,O,N]);let eJ=e=>eu.current?.querySelectorAll("[data-input-selector-discrete-menu-option]").item(e).focus();(0,o.useEffect)(()=>{eg&&j&&eJ(Math.max(j.findIndex(e=>eT(e)===Z),0))},[eg,j,Z]);let eQ=j?(0,n.jsx)("div",{role:"radiogroup","aria-label":eN,className:(0,a.b)("flex h-6 w-full min-w-0 flex-nowrap gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-black/7 p-0.5 dark:bg-white/6",E&&"opacity-40"),children:j.map(e=>{let t=eT(e),r=t===Z;return(0,n.jsx)("button",{type:"button",role:"radio","aria-checked":r,"aria-label":e.ariaLabel,disabled:E,className:(0,a.b)("text-token-text-secondary flex h-5 min-w-max flex-1 items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",r&&"bg-token-bg-primary !text-token-text-primary shadow-sm dark:bg-white dark:!text-black",!r&&!E&&"hover:text-token-text-primary focus-visible:text-token-text-primary",!E&&"focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"),onClick:()=>w(t,"input"),children:(0,n.jsx)("span",{className:"min-w-6",children:eO(e.label,k)})},e.value)})}):null,e0=j?(0,n.jsxs)("div",{"data-input-selector-discrete-rail":!0,className:(0,a.b)("relative h-6 w-full min-w-0",em&&"flex justify-end"),children:[em&&eB?(0,n.jsxs)(n.Fragment,{children:[(0,n.jsxs)("button",{type:"button","aria-controls":eW,"aria-expanded":eg,"aria-haspopup":"listbox","aria-label":eD,disabled:E,"data-input-selector-discrete-menu-trigger":!0,ref:ep,className:(0,a.b)("text-token-text-primary flex h-6 max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-full px-2 text-[15px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",!E&&"hover:bg-black/5 focus-visible:bg-black/7 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/7 dark:focus-visible:bg-white/10"),onClick:()=>eb(e=>!e),children:[(0,n.jsx)("span",{className:"min-w-0 truncate",children:eO(eB.label,k)}),(0,n.jsx)(g,{})]}),eg?(0,n.jsx)("div",{ref:eu,"aria-label":eN,className:(0,a.b)("border-token-border-default bg-token-bg-primary text-token-text-primary absolute end-0 z-50 flex min-w-max flex-col gap-0.5 overflow-hidden rounded-lg border p-1 shadow-lg","above"===ey?"bottom-full mb-1":"top-full mt-1"),id:eW,role:"listbox",children:j.map((e,t)=>{let r=eT(e),i=r===Z;return(0,n.jsx)("button",{type:"button","aria-selected":i,"data-input-selector-discrete-menu-option":!0,role:"option",className:(0,a.b)("flex min-w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-start text-[15px] leading-5 whitespace-nowrap outline-none [&_.katex]:!text-[1em]",i&&"bg-black/7 font-medium dark:bg-white/10",!i&&"hover:bg-black/7 focus-visible:bg-black/7 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"),onClick:()=>{w(r,"input"),eb(!1),ep.current?.focus()},onKeyDown:e=>((e,t)=>{if(j)switch(e.key){case"ArrowDown":e.preventDefault(),eJ((t+1)%j.length);break;case"ArrowUp":e.preventDefault(),eJ((t-1+j.length)%j.length);break;case"Home":e.preventDefault(),eJ(0);break;case"End":e.preventDefault(),eJ(j.length-1)}})(e,t),children:eO(e.label,k)},e.value)})}):null]}):eQ,(0,n.jsx)("div",{ref:ec,"aria-hidden":!0,"data-input-selector-overflow-measure":!0,className:"pointer-events-none absolute inset-x-0 top-0 h-6 overflow-hidden opacity-0",children:(0,n.jsx)("div",{className:"flex h-6 w-max min-w-max gap-0.5 p-0.5",children:j.map(e=>(0,n.jsx)("span",{className:"flex h-5 min-w-max flex-none items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap [&_.katex]:!text-[1em]",children:(0,n.jsx)("span",{className:"min-w-6",children:eO(e.label,k)})},e.value))})})]}):null,e1=P&&!j&&O&&(0,n.jsxs)("div",{ref:es,className:(0,a.b)("text-token-text-primary grid h-5 min-w-8 grid-rows-1 rounded-md px-1.5 text-end text-[11px] leading-none whitespace-nowrap after:invisible after:font-mono after:whitespace-pre after:content-[attr(data-value)] after:[grid-area:1/1]",eH?"grid-cols-[minmax(0,1fr)_auto] gap-x-0.5":"grid-cols-1",T&&(ev?"text-end":"text-start"),B,!E&&!T&&"transition-colors focus-within:bg-black/7 hover:bg-black/5 dark:focus-within:bg-white/10 dark:hover:bg-white/7"),"data-value":"0".repeat(eP),children:[T?(0,n.jsx)("span",{"data-input-selector-range-value":!0,className:(0,a.b)("relative flex h-full items-center tabular-nums [grid-area:1/1]",ev?"justify-end":"justify-start"),children:eL}):(0,n.jsx)("input",{"aria-label":eN,className:"relative h-full min-w-[4ch] border-none bg-transparent p-0 text-end text-[11px] leading-none whitespace-nowrap shadow-[none] outline-none [grid-area:1/1] focus:outline-none",disabled:E,inputMode:"decimal",name:eC,size:1,type:"text",value:ek,onBlur:()=>{if(er.current){er.current=!1;return}et(!1),eI(J)},onChange:e=>{var t;let r;return Q(U?e.currentTarget.value:""===(r=(t=e.currentTarget.value).trim())||"-"===r||"."===r?t:r.match(p)?.[0]??t)},onFocus:()=>{et(!0),Q(h(q,u,R))},onKeyDown:e=>{if("Enter"===e.key){e.preventDefault(),er.current=!0,et(!1),eI(J),e.currentTarget.blur();return}"Escape"===e.key&&(e.preventDefault(),er.current=!0,et(!1),Q(h(Z,u,R)),e.currentTarget.blur())}}),eH?(0,n.jsx)("span",{"aria-hidden":!0,className:"text-token-text-secondary self-center text-xs leading-4",children:N}):null]}),e2=[];ev?(P&&e2.push("minmax(0, 1fr)"),e1&&e2.push(eX),eK&&e2.push(eY)):(P&&e2.push(eq),e1&&e2.push(eX),eK&&e2.push(eY),e2.push("minmax(0, 1fr)"));let e3=[],e4=eV&&!!P,e5=eG&&!!P;P&&e3.push(eq),e4&&e3.push(eX),e5&&e3.push(eY),e3.push("minmax(0, 1fr)");let e6=`${e3.length} / ${e3.length+1}`,e7=P?"2 / -1":"1 / -1",e8=Number.isFinite(r)&&Number.isFinite(d)&&Number.isFinite(u)&&u>0&&d>=r?Math.max(0,Math.round((d-r)/u)):0,e9=Math.min(e8+1,12),te="stepped"===M&&e8>0?Array.from({length:e9},(e,t)=>t):[],tt="stepped"===M?"h-6 w-6":"h-5 w-5",tr="relative flex h-6 w-full min-w-0 flex-1 items-center rounded-full bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.06)]",tn=te.length>0?(0,n.jsx)("div",{"aria-hidden":!0,"data-input-selector-rendered-marker-count":te.length,className:"pointer-events-none absolute inset-x-4 top-1/2 z-0 flex -translate-y-1/2 justify-between",children:te.map(e=>(0,n.jsx)("span",{"data-input-selector-step-marker":!0,className:"h-[3px] w-[3px] rounded-full bg-black/20 dark:bg-white/20"},e))}):null,ti=V&&!T?(0,n.jsxs)("div",{"data-input-selector-slider":!0,"data-input-selector-slider-style":M,className:(0,a.b)(tr,E&&"opacity-40"),children:[tn,(0,n.jsx)("input",{"aria-label":eN,"aria-valuetext":A,type:"range","data-learning-block-pan":E?void 0:"horizontal",className:(0,a.b)(c.a.inputSelector,"stepped"===M&&c.a.inputSelectorStepped,"text-token-text-primary relative z-10 flex w-full min-w-0 flex-1 items-center"),disabled:E,max:d,min:r,step:u,value:Z,onBlur:()=>eS("blur"),onChange:e=>{eE(),w(f(e.currentTarget.valueAsNumber,r,d,u),"slider")},onPointerDown:ej})]}):(0,n.jsxs)(i.b,{"data-input-selector-slider":!0,"data-input-selector-slider-style":M,"data-learning-block-pan":E?void 0:"horizontal",className:(0,a.b)(tr,"touch-pan-y",E&&"opacity-40"),disabled:E,max:d,min:r,onBlurCapture:()=>eS("blur"),onPointerDownCapture:ej,step:u,value:T?T.values.map(e=>f(e,r,d,u)):[Z],onValueChange:e=>{(eE(),T)?T.onChange([f(e[0],r,d,u),f(e[1],r,d,u)]):w(f(e[0],r,d,u),"slider")},children:[(0,n.jsx)(i.d,{className:"absolute inset-0 rounded-full",children:(0,n.jsx)(i.a,{className:"absolute inset-y-0 rounded-full bg-transparent"})}),tn,(0,n.jsx)(i.c,{"aria-label":T?.ariaLabels[0]??eN,"aria-valuetext":T?.ariaValueTexts?.[0]??A,className:(0,a.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative cursor-pointer rounded-full border shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt,T?"flex items-center justify-center text-black":"block"),children:T?.thumbLabels?.[0]&&(0,n.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:T.thumbLabels[0]})}),T&&(0,n.jsx)(i.c,{"aria-label":T.ariaLabels[1],"aria-valuetext":T.ariaValueTexts?.[1],className:(0,a.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative flex cursor-pointer items-center justify-center rounded-full border text-black shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt),children:T.thumbLabels?.[1]&&(0,n.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:T.thumbLabels[1]})})]});return j?(0,n.jsxs)("div",{className:"grid h-full min-w-0 items-center gap-x-3",style:{gridTemplateColumns:e3.join(" ")},children:[eF,!em&&e4?(0,n.jsx)("div",{"aria-hidden":!0}):null,!em&&e5?(0,n.jsx)("div",{"aria-hidden":!0}):null,(0,n.jsx)("div",{className:"h-full min-w-0",style:{gridColumn:em?e7:e6,gridRow:1},children:e0}),(0,n.jsx)("div",{ref:ed,"aria-hidden":!0,"data-input-selector-discrete-width-measure":!0,className:"pointer-events-none h-0 min-w-0 opacity-0",style:{gridColumn:e6,gridRow:1}})]}):(0,n.jsxs)("div",{ref:ea,className:(0,a.b)("relative grid min-w-0 items-center gap-x-3",T&&"text-[11px]",ev&&"gap-y-2"),style:{gridTemplateColumns:e2.join(" ")},children:[eF,e1,eK,(0,n.jsx)("div",{className:"min-w-0",style:ev?{gridColumn:"1 / -1"}:void 0,children:ti}),P?(0,n.jsx)("div",{ref:eo,"aria-hidden":!0,"data-input-selector-label-measure":!0,className:(0,a.b)("pointer-events-none absolute inset-0 h-0 w-max max-w-none overflow-hidden text-sm leading-5 whitespace-nowrap opacity-0 [&_.katex]:!text-[1em]",ez&&"font-medium"),children:eR?(0,n.jsx)(l.a,{className:"katex",latex:P??""}):P}):null]})},b:e=>e,c:m,d:h})},tkCL(e,t,r){var n=r("ABep"),i=r("mevF"),a=r("Ipng"),o=r("Njew"),s=r("oeGO"),l=r("hPwS"),d=r("zd8w"),c=r("Qgfj"),u=r("Wf1j"),p=r("PVZC"),f=r("l7Go"),m=r("sCEh"),h=r("ZKaa");let v=s.a,x=i.a,g=a.a,b="group",y="mesh",w="sphereGeometry",S="meshBasicMaterial",E="meshStandardMaterial",j=Math.PI/12,k=(0,c.f)({cameraInstructions:{id:"learningBlock.multivariable.cameraInstructions",defaultMessage:"Use the arrow keys to rotate the three-dimensional scene"},pointInstructions:{id:"learningBlock.multivariable.pointInstructions",defaultMessage:"Use the arrow keys to move horizontally or vertically, and Page Up or Page Down to move in depth"},adjustPoint:{id:"learningBlock.multivariable.adjustPoint",defaultMessage:"Adjust point"}}),M={accent:"var(--learning-block-accent)",primary:"var(--learning-block-color-primary)",secondary:"var(--learning-block-color-secondary)",third:"var(--learning-block-color-third)",fourth:"var(--learning-block-color-fourth)",neutral:"var(--text-secondary)"},L=e=>{let{x:t,y:r,z:n}=e;return[t,r,n]},A=e=>{let{position:t}=e,r=(0,l.C)(e=>e.camera),n=(0,l.C)(e=>e.invalidate);return(0,d.useEffect)(()=>{r.position.set(t[0],t[1],t[2]),r.lookAt(0,0,0),r.updateMatrixWorld(),n()},[r,n,t[0],t[1],t[2]]),null},P=e=>{let{arrow:t,colors:r,showLabel:i}=e,a=t.from??(0,h.e)(0,0,0),o=(0,h.a)(t.to,(0,h.h)(a,-1)),s=(0,h.c)(o);if(s<1e-5)return null;let l=(0,h.d)(o),d=new p.Zc().setFromUnitVectors(new p.Xd(0,1,0),new p.Xd(l.x,l.y,l.z)),c=Math.min(t.headLength??(t.emphasis?.32:.24),.3*s),u=t.shaftRadius??(t.emphasis?.046:.034),m=t.headRadius??(t.emphasis?.13:.1),v=s-c,g=(0,h.a)(a,(0,h.h)(l,v/2)),w=(0,h.a)(a,(0,h.h)(l,v+c/2)),S=r[t.role??"primary"];return(0,n.jsxs)(b,{children:[(0,n.jsxs)(y,{position:L(g),quaternion:d.toArray(),children:[(0,n.jsx)("cylinderGeometry",{args:[u,u,v,16]}),(0,n.jsx)(E,{color:S,roughness:.45})]}),(0,n.jsxs)(y,{position:L(w),quaternion:d.toArray(),children:[(0,n.jsx)("coneGeometry",{args:[m,c,18]}),(0,n.jsx)(E,{color:S,roughness:.42})]}),i&&t.label?(0,n.jsx)(x,{center:!0,position:L((0,h.a)(t.to,(0,h.h)(l,.18))),children:(0,n.jsx)(f.a,{latex:t.label,className:"pointer-events-none text-xs font-semibold whitespace-nowrap",style:{color:S}})}):null]})},_=e=>{let{patch:t,colors:r}=e,i=(0,d.useMemo)(()=>{var e;let r;return e=t.corners,(r=new p.A).setAttribute("position",new p.ub([0,1,2,0,2,3].flatMap(t=>L(e[t])),3)),r.computeVertexNormals(),r},[t.corners]);return(0,n.jsx)(y,{geometry:i,renderOrder:1,children:(0,n.jsx)(S,{color:r[t.role??"secondary"],side:2,transparent:!0,opacity:t.opacity??.16,depthWrite:!1})})},z=(e,t)=>{if(!t)return e.length>1?[e]:[];let r=[],n=[];return e.forEach((e,i)=>{t[i]?n.push(e):(n.length>1&&r.push(n),n=[])}),n.length>1&&r.push(n),r},C=(0,d.memo)(function(e){let{surface:t,colors:r}=e,i=(0,d.useMemo)(()=>{let e=[];for(let r=0;r+1<t.grid.length;r+=1)for(let n=0;n+1<t.grid[r].length;n+=1){if(t.validity&&(!t.validity[r]?.[n]||!t.validity[r+1]?.[n]||!t.validity[r+1]?.[n+1]||!t.validity[r]?.[n+1]))continue;let i=t.grid[r][n],a=t.grid[r+1][n],o=t.grid[r+1][n+1],s=t.grid[r][n+1];e.push(...L(i),...L(a),...L(o)),e.push(...L(i),...L(o),...L(s))}let r=new p.A;return r.setAttribute("position",new p.ub(e,3)),r.computeVertexNormals(),r},[t.grid,t.validity]),a=r[t.role??"secondary"],o=t.grid[0]?.length??0,s=(0,d.useMemo)(()=>t.grid.flatMap((e,r)=>z(e,t.validity?.[r]).map((e,t)=>({key:`row-${r}-${t}`,points:e.map(L)}))),[t.grid,t.validity]),l=(0,d.useMemo)(()=>Array.from({length:o},(e,r)=>({points:t.grid.map(e=>e[r]),validity:t.validity?.map(e=>e[r])})).flatMap((e,t)=>{let{points:r,validity:n}=e;return z(r,n).map((e,r)=>({key:`column-${t}-${r}`,points:e.map(L)}))}),[o,t.grid,t.validity]);return(0,n.jsxs)(b,{children:[(0,n.jsx)(y,{geometry:i,renderOrder:1,children:(0,n.jsx)(S,{color:a,side:2,transparent:!0,opacity:t.opacity??.17,depthWrite:!1})}),s.map(e=>{let{key:r,points:i}=e;return(0,n.jsx)(g,{points:i,color:a,transparent:!0,opacity:t.wireOpacity??.5,lineWidth:.9},r)}),l.map(e=>{let{key:r,points:i}=e;return(0,n.jsx)(g,{points:i,color:a,transparent:!0,opacity:t.wireOpacity??.5,lineWidth:.9},r)})]})}),N=e=>{let{curtain:t,colors:r}=e,i=(0,d.useMemo)(()=>{let e=[],r=Math.min(t.upper.length,t.lower.length);for(let n=0;n+1<r;n+=1){let r=t.upper[n],i=t.upper[n+1],a=t.lower[n],o=t.lower[n+1];e.push(...L(r),...L(a),...L(o),...L(r),...L(o),...L(i))}let n=new p.A;return n.setAttribute("position",new p.ub(e,3)),n.computeVertexNormals(),n},[t.lower,t.upper]);return(0,n.jsx)(y,{geometry:i,renderOrder:1,children:(0,n.jsx)(S,{color:r[t.role??"primary"],side:2,transparent:!0,opacity:t.opacity??.22,depthWrite:!1})})},R=e=>{let{colors:t,extent:r,extents:i,labelScale:a=1,labels:o=["x","y","z"],showLabels:s}=e;return(0,n.jsx)(b,{children:[{endpoint:(0,h.e)(i?.[0]??r,0,0),label:o[0]},{endpoint:(0,h.e)(0,i?.[1]??r,0),label:o[1]},{endpoint:(0,h.e)(0,0,i?.[2]??r),label:o[2]}].map(e=>{let{endpoint:r,label:i}=e;return(0,n.jsxs)(b,{children:[(0,n.jsx)(g,{points:[L((0,h.h)(r,-1)),L(r)],color:t.neutral,transparent:!0,opacity:.32,lineWidth:.85}),s?(0,n.jsx)(x,{center:!0,position:L((0,h.h)(r,a)),children:(0,n.jsx)(f.a,{latex:i,className:"pointer-events-none text-xs whitespace-nowrap",style:{color:t.neutral}})}):null]},i)})})},U=e=>{let{colors:t,coordinateGroupRef:r,index:i,interactive:a,onDragActiveChange:o,onDragPoint:s,point:l,showLabel:c}=e,u=(0,d.useRef)(null),m=(0,d.useRef)(new p.Wd),v=(0,d.useRef)(null),g=a&&l.draggable&&void 0!==s,j=(e,t)=>{let r=e.nativeEvent.target;if(!(r instanceof HTMLElement))return e.ray;let n=t??r.getBoundingClientRect();return 0===n.width||0===n.height?e.ray:(m.current.set((e.nativeEvent.clientX-n.left)/n.width*2-1,-(2*((e.nativeEvent.clientY-n.top)/n.height))+1),v.current??=new p.dd,v.current.setFromCamera(m.current,e.camera),v.current.ray)},k=(e,t)=>{let r=e.nativeEvent.target;r instanceof HTMLElement&&(r.style.cursor=t)},M=e=>{if(void 0===l.hitTolerancePixels)return!0;let t=e.nativeEvent.target,n=r.current;if(!(t instanceof HTMLElement)||!n)return!0;let i=t.getBoundingClientRect();if(0===i.width||0===i.height)return!0;n.updateWorldMatrix(!0,!1);let a=t=>{let r=n.localToWorld(new p.Xd(t.x,t.y,t.z)).project(e.camera);return{x:i.left+(r.x+1)*i.width/2,y:i.top+(1-r.y)*i.height/2}},o=a(l.point),s=a(l.dragOrigin??l.point),d=o.x-s.x,c=o.y-s.y,u=d*d+c*c,f=u>0?Math.min(1,Math.max(0,((e.nativeEvent.clientX-s.x)*d+(e.nativeEvent.clientY-s.y)*c)/u)):1,m=s.x+f*d,h=s.y+f*c,v="touch"===e.nativeEvent.pointerType?Math.max(l.hitTolerancePixels,22):l.hitTolerancePixels;return Math.hypot(e.nativeEvent.clientX-m,e.nativeEvent.clientY-h)<=v},A=e=>{let t=u.current;if(t&&t.pointerId===e.pointerId){u.current=null,o(!1),k(e,"grab");try{e.target.releasePointerCapture?.(e.pointerId)}catch{}e.stopPropagation()}};return(0,n.jsxs)(b,{position:L(l.point),onPointerDown:g?e=>{if(!g||!M(e))return;let t=new p.Xd(l.point.x,l.point.y,l.point.z);r.current?.updateWorldMatrix(!0,!1),r.current?.localToWorld(t);let n=e.camera.getWorldDirection(new p.Xd),i=new p.Lc().setFromNormalAndCoplanarPoint(n,t),a=j(e).intersectPlane(i,new p.Xd);if(!a)return;let s=e.nativeEvent.target;if(!(s instanceof HTMLElement))return;let d=s.getBoundingClientRect();u.current={bounds:{height:d.height,left:d.left,top:d.top,width:d.width},offset:t.sub(a),plane:i,pointerId:e.pointerId},o(!0),k(e,"grabbing");try{e.target.setPointerCapture?.(e.pointerId)}catch{}e.stopPropagation()}:void 0,onPointerMove:g?e=>{let t=u.current;if(!g)return;if(!t)return void k(e,M(e)?"grab":"auto");if(t.pointerId!==e.pointerId)return;if(0===e.buttons)return void A(e);let n=j(e,t.bounds).intersectPlane(t.plane,new p.Xd);if(!n)return;let a=n.add(t.offset);r.current?.worldToLocal(a),s(i,(0,h.e)(a.x,a.y,a.z)),e.stopPropagation()}:void 0,onPointerUp:g?A:void 0,onPointerCancel:g?A:void 0,onLostPointerCapture:g?A:void 0,onPointerOver:g?e=>k(e,M(e)?"grab":"auto"):void 0,onPointerOut:g?e=>k(e,u.current?"grabbing":"auto"):void 0,children:[g?(0,n.jsxs)(y,{children:[(0,n.jsx)(w,{args:[l.hitRadius??.36,16,12]}),(0,n.jsx)(S,{transparent:!0,opacity:0,depthWrite:!1})]}):null,(0,n.jsxs)(y,{children:[(0,n.jsx)(w,{args:[l.radius??.085,20,16]}),(0,n.jsx)(E,{color:t[l.role??"accent"]})]}),c&&l.label?(0,n.jsx)(x,{center:!0,position:[.18,.14,0],children:(0,n.jsx)(f.a,{latex:l.label,className:"pointer-events-none text-xs font-semibold whitespace-nowrap",style:{color:t[l.role??"accent"]}})}):null]})},D=e=>{let{scene:t,ariaLabel:r,presentationMode:i,onDragPoint:a}=e,s=(0,u.a)(),l=(0,d.useRef)(null),c=(0,d.useRef)(null),p=(0,d.useRef)(null),f=(e=>{let[t,r]=(0,d.useState)(null);return(0,d.useEffect)(()=>{let t=e.current;if(!t)return;let n=()=>{let e=window.getComputedStyle(t),n=t=>e.getPropertyValue(t).trim()||e.color,i={accent:n("--learning-block-accent"),primary:n("--learning-block-color-primary"),secondary:n("--learning-block-color-secondary"),third:n("--learning-block-color-third"),fourth:n("--learning-block-color-fourth"),neutral:n("--text-secondary")};r(e=>e&&Object.keys(i).every(t=>e[t]===i[t])?e:i)};n();let i=new MutationObserver(n);return i.observe(document.documentElement,{attributes:!0,attributeFilter:["class","data-theme","style"]}),i.observe(t,{attributes:!0,attributeFilter:["class","style"]}),()=>i.disconnect()},[e]),t})(l),m=(e=>{let[t,r]=(0,d.useState)(()=>"u"<typeof IntersectionObserver);return(0,d.useEffect)(()=>{let t=e.current;if(!t||"u"<typeof IntersectionObserver)return;let n=new IntersectionObserver(e=>{let[t]=e;r(t?.isIntersecting??!1)});return n.observe(t),()=>n.disconnect()},[e]),t})(l),x="thumbnail"===i,E=!x&&"fixed"!==t.cameraControls,[M,z]=(0,d.useState)(!1),D=t.extent??2.8,W=t.camera??[2.5*D,-(1.9*D),2.7*D];return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)("div",{ref:l,role:"img","aria-label":r,"aria-description":E?s.formatMessage(k.cameraInstructions):void 0,className:x?"text-token-text-primary relative h-full w-full overflow-hidden":"text-token-text-primary relative h-[246px] max-h-[270px] w-full overflow-hidden sm:h-[270px]",onKeyDown:E?e=>{let t=p.current;if(t){switch(e.key){case"ArrowLeft":t.setAzimuthalAngle(t.getAzimuthalAngle()+j);break;case"ArrowRight":t.setAzimuthalAngle(t.getAzimuthalAngle()-j);break;case"ArrowUp":t.setPolarAngle(t.getPolarAngle()-j);break;case"ArrowDown":t.setPolarAngle(t.getPolarAngle()+j);break;default:return}e.preventDefault()}}:void 0,tabIndex:E?0:void 0,children:f&&m?(0,n.jsxs)(v,{"data-learning-block-pan":E||!x&&a&&t.points?.some(e=>e.draggable)?"both":void 0,"aria-hidden":"true",camera:{position:W,fov:38},dpr:[1,1.5],frameloop:"demand",gl:{alpha:!0,antialias:!0,powerPreference:"low-power"},style:{height:"100%",touchAction:x?"auto":"none",width:"100%"},children:[(0,n.jsx)(A,{position:W}),(0,n.jsx)("ambientLight",{intensity:1.5}),(0,n.jsx)("directionalLight",{position:[5,6,8],intensity:1.5}),(0,n.jsxs)(b,{ref:c,rotation:"y"===t.upAxis?void 0:[-Math.PI/2,0,0],children:[t.hideAxes?null:(0,n.jsx)(R,{colors:f,extent:D,extents:t.axisExtents,labelScale:t.axisLabelScale,labels:t.axisLabels,showLabels:!x}),t.surfaces?.map((e,t)=>(0,n.jsx)(C,{surface:e,colors:f},`surface-${t}`)),t.patches?.map((e,t)=>(0,n.jsx)(_,{patch:e,colors:f},`patch-${t}`)),t.curtains?.map((e,t)=>(0,n.jsx)(N,{curtain:e,colors:f},`curtain-${t}`)),t.lines?.map((e,t)=>(0,n.jsx)(g,{points:e.points.map(L),color:f[e.role??"primary"],lineWidth:e.width??1.7,transparent:!0,opacity:e.opacity??.9},`line-${t}`)),t.spheres?.map((e,t)=>(0,n.jsxs)(b,{position:L(e.center??(0,h.e)(0,0,0)),children:[(0,n.jsxs)(y,{children:[(0,n.jsx)(w,{args:[e.radius,32,24]}),(0,n.jsx)(S,{color:f[e.role??"secondary"],transparent:!0,opacity:e.opacity??.15,depthWrite:!1,side:2})]}),(0,n.jsxs)(y,{children:[(0,n.jsx)(w,{args:[e.radius,18,12]}),(0,n.jsx)(S,{color:f[e.role??"secondary"],transparent:!0,opacity:.28,wireframe:!0})]})]},`sphere-${t}`)),t.arrows?.map((e,t)=>(0,n.jsx)(P,{arrow:e,colors:f,showLabel:!x},`arrow-${t}`)),t.points?.map((e,t)=>(0,n.jsx)(U,{point:e,index:t,colors:f,coordinateGroupRef:c,interactive:!x,onDragActiveChange:z,onDragPoint:a,showLabel:!x},`point-${t}`))]}),E?(0,n.jsx)(o.a,{ref:p,enabled:!M,enableDamping:!1,enablePan:!1,enableZoom:!1,minPolarAngle:.18,maxPolarAngle:Math.PI-.18}):null]}):null}),!x&&a?t.points?.map((e,t)=>e.draggable?(0,n.jsx)("button",{type:"button","aria-label":e.ariaLabel,"aria-description":s.formatMessage(k.pointInstructions),className:"bg-token-main-surface-primary sr-only start-3 bottom-3 z-10 rounded-md text-xs focus:not-sr-only",style:{paddingBlock:"calc(var(--spacing) * 2)",paddingInline:"calc(var(--spacing) * 3)",position:"absolute"},onKeyDown:r=>{let n=e.keyboardStep??.1,i="ArrowLeft"===r.key?(0,h.e)(-n,0,0):"ArrowRight"===r.key?(0,h.e)(n,0,0):"ArrowDown"===r.key?(0,h.e)(0,-n,0):"ArrowUp"===r.key?(0,h.e)(0,n,0):"PageDown"===r.key?(0,h.e)(0,0,-n):"PageUp"===r.key?(0,h.e)(0,0,n):null;i&&(r.preventDefault(),r.stopPropagation(),a(t,(0,h.a)(e.point,i)))},children:s.formatMessage(k.adjustPoint)},`point-control-${t}`):null):null]})},W=e=>{let{scene:t,ariaLabel:r,presentationMode:i,onDragPoint:a}=e,o=t.segments?.map(e=>({from:e.from,to:e.to,stroke:M[e.role??"primary"],strokeWidth:e.width??2,opacity:e.opacity,strokeDasharray:e.dashed?"5 4":void 0,endMarker:e.arrow?"arrow":void 0})),s=t.polygons?.map(e=>({points:e.points,fill:M[e.role??"secondary"],opacity:e.opacity??.18})),l=t.circles?.map(e=>({center:e.center,radius:e.radius,stroke:M[e.role??"secondary"],strokeWidth:1.6,opacity:e.opacity})),d=t.points?.map(e=>({x:e.point.x,y:e.point.y,label:"thumbnail"===i?void 0:e.label,labelStyle:"derived_pill",draggable:"thumbnail"!==i&&e.draggable,ariaLabel:e.ariaLabel,keyboardStep:e.keyboardStep,appearance:{fill:M[e.role??"accent"],stroke:"var(--learning-block-visualization-surface, var(--bg-primary))",strokeWidth:2,radius:4}})),c=t.curves?.map(e=>({kind:"polyline",points:e.points,closed:e.closed,stroke:M[e.role??"primary"],strokeWidth:e.width??2,opacity:e.opacity}));return(0,n.jsx)(m.a,{ariaLabel:r,presentationMode:i,canvasSize:{width:360,height:265,padding:22},viewport:{mode:"bounds",bounds:t.bounds,paddingUnits:.18},segments:o,polygons:s,circles:l,points:d,onDragPoint:"thumbnail"!==i&&a?(e,t,r)=>a(e,(0,h.e)(r.x,r.y,0)):void 0,series:c,xAxisLabel:"x",yAxisLabel:"y",showAxisLabels:"thumbnail"!==i,showCoordinateTooltip:t.showCoordinateTooltip})};r.d(t,{},{a:e=>{let{scene:t,ariaLabel:r,presentationMode:i,onDragPoint:a}=e;return"three"===t.kind?(0,n.jsx)(D,{scene:t,ariaLabel:r,presentationMode:i,onDragPoint:a}):(0,n.jsx)(W,{scene:t,ariaLabel:r,presentationMode:i,onDragPoint:a})}})}};