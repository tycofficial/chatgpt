export const __rspack_esm_ids=[927650];export const __webpack_modules__={Ipng(e,t,n){let r,i;n.d(t,{a:()=>N});var a=n("unhp"),o=n("zd8w"),s=n("PVZC"),l=n("hPwS");let d=new s.v,u=new s.Xd;class c extends s.Kb{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new s.ub([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new s.ub([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new s.Lb(t,6,1);return this.setAttribute("instanceStart",new s.Rb(n,3,0)),this.setAttribute("instanceEnd",new s.Rb(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let r=new s.Lb(n,2*t,1);return this.setAttribute("instanceColorStart",new s.Rb(r,t,0)),this.setAttribute("instanceColorEnd",new s.Rb(r,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new s.fe(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new s.v);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),d.setFromBufferAttribute(t),this.boundingBox.union(d))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new s.td),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)u.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(u)),u.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(u));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var f=n("STXV");let m=parseInt("179".replace(/\D+/g,""));class p extends s.jd{constructor(e){super({type:"LineMaterial",uniforms:s.Vd.clone(s.Vd.merge([f.UniformsLib.common,f.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new s.Wd(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
					#include <${m>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let h=m>=125?"uv1":"uv2",v=new s.Yd,x=new s.Xd,b=new s.Xd,g=new s.Yd,y=new s.Yd,w=new s.Yd,S=new s.Xd,E=new s.sc,M=new s.ac,j=new s.Xd,k=new s.v,A=new s.td,L=new s.Yd;function z(e,t,n){return L.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),L.multiplyScalar(1/L.w),L.x=i/n.width,L.y=i/n.height,L.applyMatrix4(e.projectionMatrixInverse),L.multiplyScalar(1/L.w),Math.abs(Math.max(L.x,L.y))}class _ extends s.tc{constructor(e=new c,t=new p({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)x.fromBufferAttribute(t,e),b.fromBufferAttribute(n,e),r[i]=0===i?0:r[i-1],r[i+1]=r[i]+x.distanceTo(b);let i=new s.Lb(r,2,1);return e.setAttribute("instanceDistanceStart",new s.Rb(i,1,0)),e.setAttribute("instanceDistanceEnd",new s.Rb(i,1,1)),this}raycast(e,t){let n,a,o=this.material.worldUnits,l=e.camera;null!==l||o||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let d=void 0!==e.params.Line2&&e.params.Line2.threshold||0;r=e.ray;let u=this.matrixWorld,c=this.geometry,f=this.material;if(i=f.linewidth+d,null===c.boundingSphere&&c.computeBoundingSphere(),A.copy(c.boundingSphere).applyMatrix4(u),o)n=.5*i;else{let e=Math.max(l.near,A.distanceToPoint(r.origin));n=z(l,e,f.resolution)}if(A.radius+=n,!1!==r.intersectsSphere(A)){if(null===c.boundingBox&&c.computeBoundingBox(),k.copy(c.boundingBox).applyMatrix4(u),o)a=.5*i;else{let e=Math.max(l.near,k.distanceToPoint(r.origin));a=z(l,e,f.resolution)}k.expandByScalar(a),!1!==r.intersectsBox(k)&&(o?function(e,t){let n=e.matrixWorld,a=e.geometry,o=a.attributes.instanceStart,l=a.attributes.instanceEnd,d=Math.min(a.instanceCount,o.count);for(let a=0;a<d;a++){M.start.fromBufferAttribute(o,a),M.end.fromBufferAttribute(l,a),M.applyMatrix4(n);let d=new s.Xd,u=new s.Xd;r.distanceSqToSegment(M.start,M.end,u,d),u.distanceTo(d)<.5*i&&t.push({point:u,pointOnLine:d,distance:r.origin.distanceTo(u),object:e,face:null,faceIndex:a,uv:null,[h]:null})}}(this,t):function(e,t,n){let a=t.projectionMatrix,o=e.material.resolution,l=e.matrixWorld,d=e.geometry,u=d.attributes.instanceStart,c=d.attributes.instanceEnd,f=Math.min(d.instanceCount,u.count),m=-t.near;r.at(1,w),w.w=1,w.applyMatrix4(t.matrixWorldInverse),w.applyMatrix4(a),w.multiplyScalar(1/w.w),w.x*=o.x/2,w.y*=o.y/2,w.z=0,S.copy(w),E.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<f;t++){if(g.fromBufferAttribute(u,t),y.fromBufferAttribute(c,t),g.w=1,y.w=1,g.applyMatrix4(E),y.applyMatrix4(E),g.z>m&&y.z>m)continue;if(g.z>m){let e=g.z-y.z,t=(g.z-m)/e;g.lerp(y,t)}else if(y.z>m){let e=y.z-g.z,t=(y.z-m)/e;y.lerp(g,t)}g.applyMatrix4(a),y.applyMatrix4(a),g.multiplyScalar(1/g.w),y.multiplyScalar(1/y.w),g.x*=o.x/2,g.y*=o.y/2,y.x*=o.x/2,y.y*=o.y/2,M.start.copy(g),M.start.z=0,M.end.copy(y),M.end.z=0;let d=M.closestPointToPointParameter(S,!0);M.at(d,j);let f=s.pc.lerp(g.z,y.z,d),p=f>=-1&&f<=1,v=S.distanceTo(j)<.5*i;if(p&&v){M.start.fromBufferAttribute(u,t),M.end.fromBufferAttribute(c,t),M.start.applyMatrix4(l),M.end.applyMatrix4(l);let i=new s.Xd,a=new s.Xd;r.distanceSqToSegment(M.start,M.end,a,i),n.push({point:a,pointOnLine:i,distance:r.origin.distanceTo(a),object:e,face:null,faceIndex:t,uv:null,[h]:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(v),this.material.uniforms.resolution.value.set(v.z,v.w))}}class P extends c{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,r=new Float32Array(2*n);if(3===t)for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5];else for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5],r[2*i+6]=e[i+6],r[2*i+7]=e[i+7];return super.setColors(r,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class C extends _{constructor(e=new P,t=new p({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let N=o.forwardRef(function({points:e,color:t=0xffffff,vertexColors:n,linewidth:r,lineWidth:i,segments:d,dashed:u,...f},m){var h,v;let x=(0,l.C)(e=>e.size),b=o.useMemo(()=>d?new _:new C,[d]),[g]=o.useState(()=>new p),y=(null==n||null==(h=n[0])?void 0:h.length)===4?4:3,w=o.useMemo(()=>{let r=d?new c:new P,i=e.map(e=>{let t=Array.isArray(e);return e instanceof s.Xd||e instanceof s.Yd?[e.x,e.y,e.z]:e instanceof s.Wd?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(r.setPositions(i.flat()),n){t=0xffffff;let e=n.map(e=>e instanceof s.K?e.toArray():e);r.setColors(e.flat(),y)}return r},[e,d,n,y]);return o.useLayoutEffect(()=>{b.computeLineDistances()},[e,b]),o.useLayoutEffect(()=>{u?g.defines.USE_DASH="":delete g.defines.USE_DASH,g.needsUpdate=!0},[u,g]),o.useEffect(()=>()=>{w.dispose(),g.dispose()},[w]),o.createElement("primitive",(0,a.a)({object:b,ref:m},f),o.createElement("primitive",{object:w,attach:"geometry"}),o.createElement("primitive",(0,a.a)({object:g,attach:"material",color:t,vertexColors:!!n,resolution:[x.width,x.height],linewidth:null!=(v=null!=r?r:i)?v:1,dashed:u,transparent:4===y},f)))})},mevF(e,t,n){let r,i;var a=n("unhp"),o=n("zd8w"),s=n("CE87"),l=n("PVZC"),d=n("hPwS");let u=new l.Xd,c=new l.Xd,f=new l.Xd,m=new l.Wd;function p(e,t,n){let r=u.setFromMatrixPosition(e.matrixWorld);r.project(t);let i=n.width/2,a=n.height/2;return[r.x*i+i,-(r.y*a)+a]}let h=e=>1e-10>Math.abs(e)?0:e;function v(e,t,n=""){let r="matrix3d(";for(let n=0;16!==n;n++)r+=h(t[n]*e.elements[n])+(15!==n?",":")");return n+r}let x=(r=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>v(e,r)),b=(i=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>v(e,i(t),"translate(-50%,-50%)")),g=o.forwardRef(({children:e,eps:t=.001,style:n,className:r,prepend:i,center:v,fullscreen:g,portal:y,distanceFactor:w,sprite:S=!1,transform:E=!1,occlude:M,onOcclude:j,castShadow:k,receiveShadow:A,material:L,geometry:z,zIndexRange:_=[0x1000037,0],calculatePosition:P=p,as:C="div",wrapperClass:N,pointerEvents:R="auto",...U},D)=>{let{gl:O,camera:T,scene:B,size:W,raycaster:I,events:F,viewport:$}=(0,d.C)(),[H]=o.useState(()=>document.createElement(C)),V=o.useRef(null),G=o.useRef(null),X=o.useRef(0),K=o.useRef([0,0]),Y=o.useRef(null),q=o.useRef(null),Z=(null==y?void 0:y.current)||F.connected||O.domElement.parentNode,J=o.useRef(null),Q=o.useRef(!1),ee=o.useMemo(()=>{var e;return M&&"blending"!==M||Array.isArray(M)&&M.length&&(e=M[0])&&"object"==typeof e&&"current"in e},[M]);o.useLayoutEffect(()=>{let e=O.domElement;M&&"blending"===M?(e.style.zIndex=`${Math.floor(_[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[M]),o.useLayoutEffect(()=>{if(G.current){let e=V.current=s.createRoot(H);if(B.updateMatrixWorld(),E)H.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=P(G.current,T,W);H.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return Z&&(i?Z.prepend(H):Z.appendChild(H)),()=>{Z&&Z.removeChild(H),e.unmount()}}},[Z,E]),o.useLayoutEffect(()=>{N&&(H.className=N)},[N]);let et=o.useMemo(()=>E?{position:"absolute",top:0,left:0,width:W.width,height:W.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:v?"translate3d(-50%,-50%,0)":"none",...g&&{top:-W.height/2,left:-W.width/2,width:W.width,height:W.height},...n},[n,v,g,W,E]),en=o.useMemo(()=>({position:"absolute",pointerEvents:R}),[R]);o.useLayoutEffect(()=>{var t,i;Q.current=!1,E?null==(t=V.current)||t.render(o.createElement("div",{ref:Y,style:et},o.createElement("div",{ref:q,style:en},o.createElement("div",{ref:D,className:r,style:n,children:e})))):null==(i=V.current)||i.render(o.createElement("div",{ref:D,style:et,className:r,children:e}))});let er=o.useRef(!0);(0,d.D)(e=>{if(G.current){T.updateMatrixWorld(),G.current.updateWorldMatrix(!0,!1);let e=E?K.current:P(G.current,T,W);if(E||Math.abs(X.current-T.zoom)>t||Math.abs(K.current[0]-e[0])>t||Math.abs(K.current[1]-e[1])>t){var n;let t,r,i,a,o=(n=G.current,t=u.setFromMatrixPosition(n.matrixWorld),r=c.setFromMatrixPosition(T.matrixWorld),i=t.sub(r),a=T.getWorldDirection(f),i.angleTo(a)>Math.PI/2),s=!1;ee&&(Array.isArray(M)?s=M.map(e=>e.current):"blending"!==M&&(s=[B]));let d=er.current;s?er.current=function(e,t,n,r){let i=u.setFromMatrixPosition(e.matrixWorld),a=i.clone();a.project(t),m.set(a.x,a.y),n.setFromCamera(m,t);let o=n.intersectObjects(r,!0);if(o.length){let e=o[0].distance;return i.distanceTo(n.ray.origin)<e}return!0}(G.current,T,I,s)&&!o:er.current=!o,d!==er.current&&(j?j(!er.current):H.style.display=er.current?"block":"none");let p=Math.floor(_[0]/2),v=M?ee?[_[0],p]:[p-1,0]:_;if(H.style.zIndex=`${function(e,t,n){if(t instanceof l.Kc||t instanceof l.Ic){let r=u.setFromMatrixPosition(e.matrixWorld),i=c.setFromMatrixPosition(t.matrixWorld),a=r.distanceTo(i),o=(n[1]-n[0])/(t.far-t.near),s=n[1]-o*t.far;return Math.round(o*a+s)}}(G.current,T,v)}`,E){let[e,t]=[W.width/2,W.height/2],n=T.projectionMatrix.elements[5]*t,{isOrthographicCamera:r,top:i,left:a,bottom:o,right:s}=T,l=x(T.matrixWorldInverse),d=r?`scale(${n})translate(${h(-(s+a)/2)}px,${h((i+o)/2)}px)`:`translateZ(${n}px)`,u=G.current.matrixWorld;S&&((u=T.matrixWorldInverse.clone().transpose().copyPosition(u).scale(G.current.scale)).elements[3]=u.elements[7]=u.elements[11]=0,u.elements[15]=1),H.style.width=W.width+"px",H.style.height=W.height+"px",H.style.perspective=r?"":`${n}px`,Y.current&&q.current&&(Y.current.style.transform=`${d}${l}translate(${e}px,${t}px)`,q.current.style.transform=b(u,1/((w||10)/400)))}else{let t=void 0===w?1:function(e,t){if(t instanceof l.Ic)return t.zoom;if(!(t instanceof l.Kc))return 1;{let n=u.setFromMatrixPosition(e.matrixWorld),r=c.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*n.distanceTo(r))}}(G.current,T)*w;H.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}K.current=e,X.current=T.zoom}}if(!ee&&J.current&&!Q.current)if(E){if(Y.current){let e=Y.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=T;if(t||z)U.scale&&(Array.isArray(U.scale)?U.scale instanceof l.Xd?J.current.scale.copy(U.scale.clone().divideScalar(1)):J.current.scale.set(1/U.scale[0],1/U.scale[1],1/U.scale[2]):J.current.scale.setScalar(1/U.scale));else{let t=(w||10)/400,n=e.clientWidth*t,r=e.clientHeight*t;J.current.scale.set(n,r,1)}Q.current=!0}}}else{let t=H.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/$.factor,n=t.clientWidth*e,r=t.clientHeight*e;J.current.scale.set(n,r,1),Q.current=!0}J.current.lookAt(e.camera.position)}});let ei=o.useMemo(()=>({vertexShader:E?void 0:`
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
      `}),[E]);return o.createElement("group",(0,a.a)({},U,{ref:G}),M&&!ee&&o.createElement("mesh",{castShadow:k,receiveShadow:A,ref:J},z||o.createElement("planeGeometry",null),L||o.createElement("shaderMaterial",{side:2,vertexShader:ei.vertexShader,fragmentShader:ei.fragmentShader})))});n.d(t,{},{a:g})},sKwe(e,t,n){var r=n("ABep"),i=n("on57"),a=n("zd8w"),o=n("iLdV");let s=e=>e?e.replace(/\\mid/g,"|").replace(/\\neg/g,"¬").replace(/\\cap/g,"∩").replace(/\\cup/g,"∪").replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\mathrm\{([^}]*)\}/g,"$1").replace(/\\[a-zA-Z]+/g,"").replace(/[{}_^]/g,"").replace(/\s+/g," ").trim().length:0,l=e=>{let t=e.formatValueForInput??o.c,n=Math.max((0,o.d)(e.min,e.step,t).length,(0,o.d)(e.max,e.step,t).length),r=e.inlineUnit?e.unit?.length??0:0;return e.range?2*n+2:n+r};n.d(t,{},{a:e=>{let{inputs:t}=e,n=(0,a.useRef)(null),[d,u]=(0,a.useState)(),c=t.some(e=>e.before),f=t.filter(e=>!e.options&&!1!==e.showValueInput),m=Math.max(0,...t.map(e=>s(e.variable))),p=Math.max(0,...f.map(l)),h=Math.max(0,...f.map(e=>s(e.inlineUnit?void 0:e.unit))),v=t.map(e=>e.variable??"").join("\0");return(0,a.useLayoutEffect)(()=>{let e=n.current;if(!e)return;let t=Array.from(e.querySelectorAll("[data-input-selector-variable]"));if(0===t.length)return;let r=()=>{let n=t.filter(e=>"stacked"!==e.dataset.inputSelectorLabelLayout),r=n.length?Math.max(...n.map(t=>{let n=t.cloneNode(!0);n.removeAttribute("data-input-selector-variable"),Object.assign(n.style,{inset:"0 auto auto 0",maxWidth:"none",position:"absolute",visibility:"hidden",whiteSpace:"nowrap",width:"max-content"}),e.appendChild(n);let r=n.getBoundingClientRect().width;return n.remove(),r})):void 0;u(e=>e===r?e:r)};if(r(),"u"<typeof ResizeObserver)return;let i=new ResizeObserver(r);t.forEach(e=>i.observe(e));let a=new MutationObserver(r);return t.forEach(e=>a.observe(e,{attributeFilter:["data-input-selector-label-layout"]})),()=>{i.disconnect(),a.disconnect()}},[v]),(0,r.jsx)("div",{ref:n,"data-input-selector-group":!0,className:"grid min-h-fit min-w-0 shrink grow-0 gap-y-3",children:t.map((e,t)=>(0,r.jsxs)("div",{className:(0,i.b)("grid h-full min-w-0 items-center gap-x-2",c?"grid-cols-[auto_minmax(0,1fr)]":"grid-cols-[minmax(0,1fr)]"),children:[c?e.before??(0,r.jsx)("div",{"aria-hidden":!0}):null,(0,r.jsx)(o.a,{...e,groupVariableWidthCh:m,groupVariableWidthPx:d,groupUnitWidthCh:h,groupValueWidthCh:p})]},t))})},b:function(e,t,n,r){var i;let{before:a,disabled:o,displayValue:s,editType:l="CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE",formatValueForInput:d,inlineUnit:u,parseInputValue:c,mapValue:f,options:m,optionLabelFormat:p,showValueInput:h,sliderStyle:v,ariaLabel:x,ariaValueText:b,onActiveChange:g,value:y,variable:w,variableBold:S,variableFormat:E,unit:M}=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{};return{before:a,disabled:o,displayValue:s,options:m,optionLabelFormat:p,showValueInput:h,sliderStyle:v,inlineUnit:u,ariaLabel:x,ariaValueText:b,variable:w??t.variable??(i=String(e),i.match(/[A-Za-z]/)?.[0]??i),variableBold:S??t.variableBold,variableFormat:E??t.variableFormat,unit:M??t.unit,formatValueForInput:d,parseInputValue:c,max:t.max,min:t.min,step:t.step,value:y??Number(n[e]),onActiveChange:g,onChange:(t,n)=>{let i=f?f(t):t;r(t=>({...t,[e]:i}),"function"==typeof l?l(n):l)}}}})},iLdV(e,t,n){var r=n("ABep"),i=n("YAOF"),a=n("on57"),o=n("zd8w"),s=n("Wf1j"),l=n("l7Go"),d=n("jYuH"),u=n("evpU");let c=(e,t,n)=>Math.min(Math.max(e,t),n),f=/[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?/i,m=(e,t,n,r)=>{if(!Number.isFinite(e))return t;let i=Math.round((c(e,t,n)-t)/r),a=(0,d.c)(r);return c((0,d.h)(t+i*r,Math.max(1,a)),t,n)},p=(e,t)=>Number.isFinite(e)?e.toFixed(Math.max(1,(0,d.c)(t))):"",h=(e,t,n)=>{let r=n(e,t);return r.match(f)?.[0]??r},v=e=>{let t=[],n=e.parentElement;for(;n;)"visible"!==window.getComputedStyle(n).overflowY&&t.push(n),n=n.parentElement;return t},x=(0,o.createContext)({isNativeSlider:!1}),b=()=>(0,r.jsx)("svg",{"aria-hidden":!0,className:"h-4 w-4 flex-none",fill:"none",viewBox:"0 0 16 16",children:(0,r.jsx)("path",{d:"m5 6 3-3 3 3M5 10l3 3 3-3",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"1.5"})});n.d(t,{},{a:e=>{let t,{min:n,max:d,step:c,value:g,displayValue:y,onChange:w,onActiveChange:S,disabled:E,options:M,optionLabelFormat:j="text",sliderStyle:k="continuous",ariaLabel:A,ariaValueText:L,variable:z,variableBold:_,variableFormat:P,inlineUnit:C,unit:N,formatValueForInput:R=p,parseInputValue:U,normalizeCommittedValue:D,minSliderWidthPx:O,showValueInput:T=!0,range:B,valueClassName:W,groupVariableWidthCh:I,groupVariableWidthPx:F,groupUnitWidthCh:$,groupValueWidthCh:H}=e,{isNativeSlider:V,onSliderInteractionEnd:G,onSliderInteractionStart:X}=(0,o.useContext)(x),K=(0,s.a)(),Y=U??Number.parseFloat,q=m(g,n,d,c),Z=Number.isFinite(y)?y:q,[J,Q]=(0,o.useState)(()=>h(Z,c,R)),[ee,et]=(0,o.useState)(!1),en=(0,o.useRef)(!1),er=(0,o.useRef)(!1),ei=(0,o.useRef)(!1),ea=(0,o.useRef)(null),eo=(0,o.useRef)(null),es=(0,o.useRef)(null),el=(0,o.useRef)(null),ed=(0,o.useRef)(null),eu=(0,o.useRef)(null),ec=(0,o.useRef)(null),ef=(0,o.useRef)(null),em=(0,o.useRef)(!1),[ep,eh]=(0,o.useState)(!1),[ev,ex]=(0,o.useState)(!1),[eb,eg]=(0,o.useState)(!1),[ey,ew]=(0,o.useState)(V?"above":"below"),eS=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"blur";"blur"===e&&ei.current||er.current&&(er.current=!1,S?.(!1),G?.())},eE=()=>{er.current||(er.current=!0,S?.(!0),X?.(z))},eM=()=>{ei.current=!0,eE()};(0,o.useEffect)(()=>{let e=()=>{ei.current=!1,eS("pointer-end")};return window.addEventListener("pointerup",e),window.addEventListener("pointercancel",e),()=>{window.removeEventListener("pointerup",e),window.removeEventListener("pointercancel",e)}},[S,G]),(0,o.useLayoutEffect)(()=>{let e=ed.current,t=eu.current;if(!M||!e||!t)return void eh(!1);let n=()=>{let n=e.clientWidth,r=t.scrollWidth>n+1;eh(e=>e===r?e:r)};n();let r="u"<typeof document?void 0:document.fonts;if(r?.addEventListener("loadingdone",n),"u"<typeof ResizeObserver)return()=>r?.removeEventListener("loadingdone",n);let i=new ResizeObserver(n);return i.observe(e),i.observe(t),()=>{r?.removeEventListener("loadingdone",n),i.disconnect()}},[M,j]),(0,o.useEffect)(()=>{let e=e=>{"Escape"===e.key&&em.current&&(em.current=!1,e.preventDefault(),e.stopPropagation())};return document.addEventListener("keyup",e,!0),()=>document.removeEventListener("keyup",e,!0)},[]),(0,o.useEffect)(()=>{if(!eb)return;em.current=!1;let e=e=>{let t=e.target;!(t instanceof Node)||ec.current?.contains(t)||ef.current?.contains(t)||eg(!1)},t=e=>{"Escape"===e.key&&(em.current=!0,e.preventDefault(),e.stopPropagation(),eg(!1),ef.current?.focus())};return document.addEventListener("pointerdown",e),document.addEventListener("keydown",t,!0),()=>{document.removeEventListener("pointerdown",e),document.removeEventListener("keydown",t,!0)}},[eb]),(0,o.useEffect)(()=>{(!ep||E)&&eg(!1)},[E,ep]),(0,o.useLayoutEffect)(()=>{if(!eb)return void ew(V?"above":"below");let e=ec.current,t=ef.current;if(!e||!t)return;let n=()=>{ew((e=>{let{boundary:t,menuHeight:n,trigger:r}=e,i=t.bottom-r.bottom-4;if(n<=i)return"below";let a=r.top-t.top-4;return n<=a||a>i?"above":"below"})({boundary:(e=>{let{clippingAncestors:t,viewport:n}=e;return t.reduce((e,t)=>({bottom:Math.min(e.bottom,t.bottom),top:Math.max(e.top,t.top)}),n)})({clippingAncestors:v(t).map(e=>e.getBoundingClientRect()),viewport:{bottom:window.innerHeight,top:0}}),menuHeight:e.getBoundingClientRect().height,trigger:t.getBoundingClientRect()}))};if(n(),window.addEventListener("resize",n),"u"<typeof ResizeObserver)return()=>window.removeEventListener("resize",n);let r=new ResizeObserver(n);return r.observe(e),r.observe(t),v(t).forEach(e=>r.observe(e)),()=>{window.removeEventListener("resize",n),r.disconnect()}},[eb,V]);let ej=ee?J:h(Z,c,R),ek=Math.max(h(n,c,R).length,h(d,c,R).length),eA=B?(t=B.displayValues??B.ariaValueTexts??[h(B.values[0],c,R),h(B.values[1],c,R)],`(${t[0]}, ${t[1]})`):void 0,eL=B?2*ek+2:ek,ez=H??eL,e_=O??96,eP=_??!1,eC=z?z.replace(/[^\w-]+/g,"_"):"input-selector-value",eN=A??(z?K.formatMessage({id:"learningBlock.inputSelector.valueAriaLabel",defaultMessage:"{label} value"},{label:z}):void 0),eR=!!z&&"text"!==P&&(!!("katex"===P||/\\/.test(z))||/^[A-Za-zθμσλπΔ](?:[_^][A-Za-z0-9{}]+)?$/.test(z)),eU=M?.find(e=>m(e.value,n,d,c)===q)??M?.[0],eD=ep?K.formatMessage({id:"learningBlock.inputSelector.overflowMenuAriaLabel",defaultMessage:"{value}. Show all {label} options"},{label:eN??K.formatMessage({id:"learningBlock.inputSelector.selectorAriaLabel",defaultMessage:"selector"}),value:eU?.ariaLabel??eU?.label??""}):void 0,eO=(0,o.useId)(),eT=(e,t)=>"katex"!==t?e:(0,r.jsx)(l.a,{className:"katex",latex:e}),eB=e=>m(e.value,n,d,c),eW=M?.find(e=>eB(e)===q)??M?.[0],eI=e=>{let t=Y(e);if(!Number.isFinite(t))return void Q(h(Z,c,R));let r=((e,t)=>{let{max:n,min:r,normalizeCommittedValue:i,step:a}=t;return i?i(e):m(e,r,n,a)})(t,{min:n,max:d,step:c,normalizeCommittedValue:D});w(r,"input"),Q(h(r,c,R))},eF=z?(0,r.jsx)("div",{"data-input-selector-variable":!0,"data-input-selector-label-layout":ev?"stacked":"inline",className:(0,a.b)("text-token-text-primary min-w-0 max-w-full justify-self-start text-sm leading-5 whitespace-normal hyphens-auto [overflow-wrap:anywhere] [&_.katex]:!text-[1em]",eP&&"font-medium"),children:eR?(0,r.jsx)(l.a,{className:"katex",latex:z??""}):z}):null,e$=!!(C&&N&&!B),eH=N&&!e$?(0,r.jsx)("div",{ref:el,className:"text-token-text-secondary shrink-0 text-xs leading-4 whitespace-nowrap [&_.katex]:text-inherit",children:N}):null,eV=!!H,eG=`minmax(max(${ez}ch,2rem), max(${ez}ch,2rem))`,eX=!!$,eK=`minmax(${$??0}ch, ${$??0}ch)`,eY=!M&&eX?eH??(0,r.jsx)("div",{ref:el,"aria-hidden":!0}):null,eq=F?`${F}px`:I?`${I}ch`:null,eZ=eq?`minmax(0, min(${eq}, 40%))`:"fit-content(40%)";(0,o.useLayoutEffect)(()=>{let e=ea.current,t=eo.current;if(M||!e||!t)return void ex(!1);let n=()=>{let n=e.clientWidth;if(0===n)return;let r=(e=>{let{availableWidth:t,labelWidth:n,minSliderWidthPx:r=96,unitWidth:i,valueWidth:a}=e,o=2+Number(a>0)+Number(i>0);return n+a+i+(o-1)*12+r>t+1})({availableWidth:n,labelWidth:Math.max(t.scrollWidth,F??0),minSliderWidthPx:e_,unitWidth:el.current?.clientWidth??0,valueWidth:es.current?.clientWidth??0});ex(e=>e===r?e:r)};n();let r="u"<typeof document?void 0:document.fonts;if(r?.addEventListener("loadingdone",n),"u"<typeof ResizeObserver)return()=>r?.removeEventListener("loadingdone",n);let i=new ResizeObserver(n);return i.observe(e),i.observe(t),es.current&&i.observe(es.current),el.current&&i.observe(el.current),()=>{r?.removeEventListener("loadingdone",n),i.disconnect()}},[$,H,F,M,e_,z,T,N]);let eJ=e=>ec.current?.querySelectorAll("[data-input-selector-discrete-menu-option]").item(e).focus();(0,o.useEffect)(()=>{eb&&M&&eJ(Math.max(M.findIndex(e=>eB(e)===q),0))},[eb,M,q]);let eQ=M?(0,r.jsx)("div",{role:"radiogroup","aria-label":eN,className:(0,a.b)("flex h-6 w-full min-w-0 flex-nowrap gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-black/7 p-0.5 dark:bg-white/6",E&&"opacity-40"),children:M.map(e=>{let t=eB(e),n=t===q;return(0,r.jsx)("button",{type:"button",role:"radio","aria-checked":n,"aria-label":e.ariaLabel,disabled:E,className:(0,a.b)("text-token-text-secondary flex h-5 min-w-max flex-1 items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",n&&"bg-token-bg-primary !text-token-text-primary shadow-sm dark:bg-white dark:!text-black",!n&&!E&&"hover:text-token-text-primary focus-visible:text-token-text-primary",!E&&"focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"),onClick:()=>w(t,"input"),children:(0,r.jsx)("span",{className:"min-w-6",children:eT(e.label,j)})},e.value)})}):null,e0=M?(0,r.jsxs)("div",{"data-input-selector-discrete-rail":!0,className:(0,a.b)("relative h-6 w-full min-w-0",ep&&"flex justify-end"),children:[ep&&eW?(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)("button",{type:"button","aria-controls":eO,"aria-expanded":eb,"aria-haspopup":"listbox","aria-label":eD,disabled:E,"data-input-selector-discrete-menu-trigger":!0,ref:ef,className:(0,a.b)("text-token-text-primary flex h-6 max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-full px-2 text-[15px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",!E&&"hover:bg-black/5 focus-visible:bg-black/7 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/7 dark:focus-visible:bg-white/10"),onClick:()=>eg(e=>!e),children:[(0,r.jsx)("span",{className:"min-w-0 truncate",children:eT(eW.label,j)}),(0,r.jsx)(b,{})]}),eb?(0,r.jsx)("div",{ref:ec,"aria-label":eN,className:(0,a.b)("border-token-border-default bg-token-bg-primary text-token-text-primary absolute end-0 z-50 flex min-w-max flex-col gap-0.5 overflow-hidden rounded-lg border p-1 shadow-lg","above"===ey?"bottom-full mb-1":"top-full mt-1"),id:eO,role:"listbox",children:M.map((e,t)=>{let n=eB(e),i=n===q;return(0,r.jsx)("button",{type:"button","aria-selected":i,"data-input-selector-discrete-menu-option":!0,role:"option",className:(0,a.b)("flex min-w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-start text-[15px] leading-5 whitespace-nowrap outline-none [&_.katex]:!text-[1em]",i&&"bg-black/7 font-medium dark:bg-white/10",!i&&"hover:bg-black/7 focus-visible:bg-black/7 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"),onClick:()=>{w(n,"input"),eg(!1),ef.current?.focus()},onKeyDown:e=>((e,t)=>{if(M)switch(e.key){case"ArrowDown":e.preventDefault(),eJ((t+1)%M.length);break;case"ArrowUp":e.preventDefault(),eJ((t-1+M.length)%M.length);break;case"Home":e.preventDefault(),eJ(0);break;case"End":e.preventDefault(),eJ(M.length-1)}})(e,t),children:eT(e.label,j)},e.value)})}):null]}):eQ,(0,r.jsx)("div",{ref:eu,"aria-hidden":!0,"data-input-selector-overflow-measure":!0,className:"pointer-events-none absolute inset-x-0 top-0 h-6 overflow-hidden opacity-0",children:(0,r.jsx)("div",{className:"flex h-6 w-max min-w-max gap-0.5 p-0.5",children:M.map(e=>(0,r.jsx)("span",{className:"flex h-5 min-w-max flex-none items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap [&_.katex]:!text-[1em]",children:(0,r.jsx)("span",{className:"min-w-6",children:eT(e.label,j)})},e.value))})})]}):null,e1=z&&!M&&T&&(0,r.jsxs)("div",{ref:es,className:(0,a.b)("text-token-text-primary grid h-5 min-w-8 grid-rows-1 rounded-md px-1.5 text-end text-[11px] leading-none whitespace-nowrap after:invisible after:font-mono after:whitespace-pre after:content-[attr(data-value)] after:[grid-area:1/1]",e$?"grid-cols-[minmax(0,1fr)_auto] gap-x-0.5":"grid-cols-1",B&&(ev?"text-end":"text-start"),W,!E&&!B&&"transition-colors focus-within:bg-black/7 hover:bg-black/5 dark:focus-within:bg-white/10 dark:hover:bg-white/7"),"data-value":"0".repeat(ez),children:[B?(0,r.jsx)("span",{"data-input-selector-range-value":!0,className:(0,a.b)("relative flex h-full items-center tabular-nums [grid-area:1/1]",ev?"justify-end":"justify-start"),children:eA}):(0,r.jsx)("input",{"aria-label":eN,className:"relative h-full min-w-[4ch] border-none bg-transparent p-0 text-end text-[11px] leading-none whitespace-nowrap shadow-[none] outline-none [grid-area:1/1] focus:outline-none",disabled:E,inputMode:"decimal",name:eC,size:1,type:"text",value:ej,onBlur:()=>{if(en.current){en.current=!1;return}et(!1),eI(J)},onChange:e=>{var t;let n;return Q(U?e.currentTarget.value:""===(n=(t=e.currentTarget.value).trim())||"-"===n||"."===n?t:n.match(f)?.[0]??t)},onFocus:()=>{et(!0),Q(h(Z,c,R))},onKeyDown:e=>{if("Enter"===e.key){e.preventDefault(),en.current=!0,et(!1),eI(J),e.currentTarget.blur();return}"Escape"===e.key&&(e.preventDefault(),en.current=!0,et(!1),Q(h(q,c,R)),e.currentTarget.blur())}}),e$?(0,r.jsx)("span",{"aria-hidden":!0,className:"text-token-text-secondary self-center text-xs leading-4",children:N}):null]}),e2=[];ev?(z&&e2.push("minmax(0, 1fr)"),e1&&e2.push(eG),eY&&e2.push(eK)):(z&&e2.push(eZ),e1&&e2.push(eG),eY&&e2.push(eK),e2.push("minmax(0, 1fr)"));let e3=[],e4=eV&&!!z,e5=eX&&!!z;z&&e3.push(eZ),e4&&e3.push(eG),e5&&e3.push(eK),e3.push("minmax(0, 1fr)");let e6=`${e3.length} / ${e3.length+1}`,e7=z?"2 / -1":"1 / -1",e8=Number.isFinite(n)&&Number.isFinite(d)&&Number.isFinite(c)&&c>0&&d>=n?Math.max(0,Math.round((d-n)/c)):0,e9=Math.min(e8+1,12),te="stepped"===k&&e8>0?Array.from({length:e9},(e,t)=>t):[],tt="stepped"===k?"h-6 w-6":"h-5 w-5",tn="relative flex h-6 w-full min-w-0 flex-1 items-center rounded-full bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.06)]",tr=te.length>0?(0,r.jsx)("div",{"aria-hidden":!0,"data-input-selector-rendered-marker-count":te.length,className:"pointer-events-none absolute inset-x-4 top-1/2 z-0 flex -translate-y-1/2 justify-between",children:te.map(e=>(0,r.jsx)("span",{"data-input-selector-step-marker":!0,className:"h-[3px] w-[3px] rounded-full bg-black/20 dark:bg-white/20"},e))}):null,ti=V&&!B?(0,r.jsxs)("div",{"data-input-selector-slider":!0,"data-input-selector-slider-style":k,className:(0,a.b)(tn,E&&"opacity-40"),children:[tr,(0,r.jsx)("input",{"aria-label":eN,"aria-valuetext":L,type:"range","data-learning-block-pan":E?void 0:"horizontal",className:(0,a.b)(u.a.inputSelector,"stepped"===k&&u.a.inputSelectorStepped,"text-token-text-primary relative z-10 flex w-full min-w-0 flex-1 items-center"),disabled:E,max:d,min:n,step:c,value:q,onBlur:()=>eS("blur"),onChange:e=>{eE(),w(m(e.currentTarget.valueAsNumber,n,d,c),"slider")},onPointerDown:eM})]}):(0,r.jsxs)(i.b,{"data-input-selector-slider":!0,"data-input-selector-slider-style":k,"data-learning-block-pan":E?void 0:"horizontal",className:(0,a.b)(tn,"touch-pan-y",E&&"opacity-40"),disabled:E,max:d,min:n,onBlurCapture:()=>eS("blur"),onPointerDownCapture:eM,step:c,value:B?B.values.map(e=>m(e,n,d,c)):[q],onValueChange:e=>{(eE(),B)?B.onChange([m(e[0],n,d,c),m(e[1],n,d,c)]):w(m(e[0],n,d,c),"slider")},children:[(0,r.jsx)(i.d,{className:"absolute inset-0 rounded-full",children:(0,r.jsx)(i.a,{className:"absolute inset-y-0 rounded-full bg-transparent"})}),tr,(0,r.jsx)(i.c,{"aria-label":B?.ariaLabels[0]??eN,"aria-valuetext":B?.ariaValueTexts?.[0]??L,className:(0,a.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative cursor-pointer rounded-full border shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt,B?"flex items-center justify-center text-black":"block"),children:B?.thumbLabels?.[0]&&(0,r.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:B.thumbLabels[0]})}),B&&(0,r.jsx)(i.c,{"aria-label":B.ariaLabels[1],"aria-valuetext":B.ariaValueTexts?.[1],className:(0,a.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative flex cursor-pointer items-center justify-center rounded-full border text-black shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt),children:B.thumbLabels?.[1]&&(0,r.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:B.thumbLabels[1]})})]});return M?(0,r.jsxs)("div",{className:"grid h-full min-w-0 items-center gap-x-3",style:{gridTemplateColumns:e3.join(" ")},children:[eF,!ep&&e4?(0,r.jsx)("div",{"aria-hidden":!0}):null,!ep&&e5?(0,r.jsx)("div",{"aria-hidden":!0}):null,(0,r.jsx)("div",{className:"h-full min-w-0",style:{gridColumn:ep?e7:e6,gridRow:1},children:e0}),(0,r.jsx)("div",{ref:ed,"aria-hidden":!0,"data-input-selector-discrete-width-measure":!0,className:"pointer-events-none h-0 min-w-0 opacity-0",style:{gridColumn:e6,gridRow:1}})]}):(0,r.jsxs)("div",{ref:ea,className:(0,a.b)("relative grid min-w-0 items-center gap-x-3",B&&"text-[11px]",ev&&"gap-y-2"),style:{gridTemplateColumns:e2.join(" ")},children:[eF,e1,eY,(0,r.jsx)("div",{className:"min-w-0",style:ev?{gridColumn:"1 / -1"}:void 0,children:ti}),z?(0,r.jsx)("div",{ref:eo,"aria-hidden":!0,"data-input-selector-label-measure":!0,className:(0,a.b)("pointer-events-none absolute inset-0 h-0 w-max max-w-none overflow-hidden text-sm leading-5 whitespace-nowrap opacity-0 [&_.katex]:!text-[1em]",eP&&"font-medium"),children:eR?(0,r.jsx)(l.a,{className:"katex",latex:z??""}):z}):null]})},b:e=>e,c:p,d:h})},xSSK(e,t,n){var r=n("ABep"),i=n("mevF"),a=n("Ipng"),o=n("Njew"),s=n("oeGO"),l=n("zd8w"),d=n("Qgfj"),u=n("Wf1j"),c=n("oyxz"),f=n("PVZC"),m=n("KwmQ"),p=n("sKwe"),h=n("LP6J"),v=n("I1g8"),x=n("qHXe");let b=s.a,g=i.a,y=a.a,w=o.a,S="group",E="mesh",M=Math.PI/12,j=[4.08,3.36,4.44],k={x:2.4,y:2.4,z:2.4},A=(0,d.f)({surface:{id:"learningBlock.parametrizedSurfaces.surfaceKind",defaultMessage:"surface"},cameraInstructions:{id:"learningBlock.parametrizedSurfaces.cameraInstructions",defaultMessage:"Use the arrow keys to rotate the three-dimensional scene"}}),L=(e,t)=>e.formatNumber(1e-9>Math.abs(t)?0:t,{maximumFractionDigits:2,useGrouping:!1}),z=(e,t)=>L(e,t).replaceAll(",","{,}"),_=(0,l.memo)(function(e){let{color:t,opacity:n=1,points:i,width:a=1.4}=e,o=(0,l.useMemo)(()=>i.map(x.m),[i]);return o.length<2?null:(0,r.jsx)(y,{color:t,depthWrite:!1,lineWidth:a,opacity:n,points:o,transparent:n<1})}),P=e=>{let{bounds:t,color:n,showLabels:i}=e;return(0,r.jsxs)(S,{children:[(0,r.jsx)(_,{color:n,opacity:.4,points:[[-t.x,0,0],[t.x,0,0]],width:1}),(0,r.jsx)(_,{color:n,opacity:.4,points:[[0,-t.y,0],[0,t.y,0]],width:1}),(0,r.jsx)(_,{color:n,opacity:.45,points:[[0,0,-t.z],[0,0,t.z]],width:1}),i&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(g,{center:!0,position:[t.x+.2,0,0],children:(0,r.jsx)("span",{className:"text-token-text-secondary text-xs",children:"x"})}),(0,r.jsx)(g,{center:!0,position:[0,0,t.y+.2],children:(0,r.jsx)("span",{className:"text-token-text-secondary text-xs",children:"y"})}),(0,r.jsx)(g,{center:!0,position:[0,t.z+.2,0],children:(0,r.jsx)("span",{className:"text-token-text-secondary text-xs",children:"z"})})]})]})},C=(0,l.memo)(function(e){let{colors:t,geometry:n,isThumbnail:i,scale:a,staticColumnSegments:o,staticRowSegments:s}=e;return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(P,{bounds:k,color:t.axis,showLabels:!i}),(0,r.jsxs)(S,{scale:a,children:[(0,r.jsx)(E,{geometry:n,renderOrder:1,children:(0,r.jsx)("meshBasicMaterial",{color:t.primary,depthWrite:!1,opacity:.15,side:2,transparent:!0})}),s.map(e=>{let{key:n,points:i}=e;return(0,r.jsx)(_,{color:t.primary,opacity:.3,points:i,width:.95},n)}),o.map(e=>{let{key:n,points:i}=e;return(0,r.jsx)(_,{color:t.primary,opacity:.3,points:i,width:.95},n)})]})]})}),N=e=>{let{colors:t,isThumbnail:n,parsed:i,values:a}=e,o=(0,l.useMemo)(()=>(0,x.i)(i),[i]),s=(0,l.useMemo)(()=>(0,x.d)(i),[i]),d=(0,l.useMemo)(()=>(e=>{let t=[];for(let n=0;n+1<e.length;n+=1)for(let r=0;r+1<e[n].length;r+=1){let i=e[n][r],a=e[n+1][r],o=e[n+1][r+1],s=e[n][r+1];i&&a&&o&&s&&t.push(...(0,x.m)(i),...(0,x.m)(a),...(0,x.m)(o),...(0,x.m)(i),...(0,x.m)(o),...(0,x.m)(s))}let n=new f.A;return n.setAttribute("position",new f.ub(t,3)),n.computeVertexNormals(),n})(s),[s]),u=(0,x.g)(i,a),c=(0,l.useMemo)(()=>(0,x.j)(s.flat()),[s]),m=(0,l.useMemo)(()=>[c.x,c.z,c.y],[c]),p=o[0]?.slot??"t",h="t"===p?a.s:a.t,v=(0,l.useMemo)(()=>(0,x.e)(i,a,p),[h,p,i]),b=o[1]?.slot,g="t"===b?a.s:a.t,y=(0,l.useMemo)(()=>b?(0,x.e)(i,a,b):[],[i,g,b]),w=(0,l.useMemo)(()=>s.filter((e,t)=>t%4==0).flatMap((e,t)=>(0,x.l)(e).map((e,n)=>({key:`first-parameter-${t}-${n}`,points:e}))),[s]),M=(0,l.useMemo)(()=>Array.from({length:9},(e,t)=>Math.round(t*((s[0]?.length??1)-1)/8)).flatMap(e=>(0,x.l)(s.map(t=>t[e]??null)).map((t,n)=>({key:`second-parameter-${e}-${n}`,points:t}))),[s]);return(0,l.useEffect)(()=>()=>d.dispose(),[d]),(0,r.jsxs)(S,{children:[(0,r.jsx)(C,{colors:t,geometry:d,isThumbnail:n,scale:m,staticColumnSegments:M,staticRowSegments:w}),(0,r.jsx)(S,{scale:m,children:!n&&(0,r.jsxs)(r.Fragment,{children:[v.map((e,n)=>(0,r.jsx)(_,{color:t.companion,points:e,width:2.2},`selected-first-parameter-${n}`)),y.map((e,n)=>(0,r.jsx)(_,{color:t.accent,points:e,width:2.4},`selected-second-parameter-${n}`))]})}),!n&&u&&(0,r.jsx)(S,{position:(0,x.m)((0,x.h)(u,c)),children:(0,r.jsxs)(E,{children:[(0,r.jsx)("sphereGeometry",{args:[.13,20,16]}),(0,r.jsx)("meshStandardMaterial",{color:t.accent,roughness:.45})]})})]})};n.d(t,{},{ParametrizedSurfacesCaption:e=>{let{values:t}=e,n=(0,u.a)(),i=(0,x.k)(t),a=(0,v.f)(i.sourceContent)??x.a,o=(0,x.i)(a),s=(0,x.g)(a,i);if(!s)return null;let l=a.declaredParameters.map(e=>{let t,r=o.find(t=>{let{name:n}=t;return n===e});return r?(0,v.e)(r.name)?1e-9>Math.abs(t=i[r.slot]/Math.PI)?"0":1e-9>Math.abs(t-1)?"\\pi":1e-9>Math.abs(t+1)?"-\\pi":`${z(n,t)}\\pi`:z(n,i[r.slot]):(0,v.b)(e)}).join(","),d=s.map(e=>z(n,e)).join(",\\,");return(0,r.jsx)(m.a,{reserveLines:1,children:(0,r.jsx)(m.b,{className:"text-sm leading-6 sm:text-base",format:"katex",content:`${a.functionName}\\left(${l}\\right)=\\left[${d}\\right]`,noWrap:!0})})},ParametrizedSurfacesControls:e=>{let{values:t,setValues:n}=e,i=(0,u.a)(),a=(0,x.k)(t),o=(0,v.f)(a.sourceContent)??x.a,s=(0,x.i)(o),l=(0,h.c)(i);return(0,r.jsx)(m.c,{screenReaderContent:(0,r.jsx)(c.a,{id:"learningBlock.parametrizedSurfaces.controlsDescription",defaultMessage:"Adjust both parameters of the vector-valued surface. The selected point and the corresponding parameter curves update together."}),children:(0,r.jsx)(p.a,{inputs:s.map(e=>{let{name:t,slot:r}=e,o=(0,v.b)(t),s=i.formatMessage({id:"learningBlock.parametrizedSurfaces.surfaceParameter",defaultMessage:"Surface parameter {parameter}"},{parameter:t});if(!(0,v.e)(t))return(0,p.b)(r,"t"===r?x.c:x.b,a,n,{...l,ariaLabel:s,variable:o,variableFormat:"katex"});let d="t"===r?x.c:x.b,u=a[r]/Math.PI;return{...l,formatValueForInput:e=>L(i,e),ariaLabel:s,ariaValueText:i.formatMessage({id:"learningBlock.parametrizedSurfaces.angularParameterValuePluralized",defaultMessage:"{coefficient, plural, one {# pi radian} other {# pi radians}}"},{coefficient:u}),min:d.min/Math.PI,max:d.max/Math.PI,step:d.step,value:u,variable:o,variableFormat:"katex",inlineUnit:!0,unit:"π",onChange:e=>n(t=>({...t,[r]:e*Math.PI}),"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")}})})})},ParametrizedSurfacesVisualization:e=>{let{values:t,presentationMode:n}=e,i=(0,u.a)(),a=(0,l.useRef)(null),o=(0,l.useRef)(null),s=(e=>{let[t,n]=(0,l.useState)(null);return(0,l.useEffect)(()=>{let t=e.current;if(!t)return;let r=()=>{let e,r,i=(e=window.getComputedStyle(t),{accent:(r=t=>e.getPropertyValue(t).trim()||e.color)("--learning-block-accent"),axis:r("--text-tertiary"),companion:r("--learning-block-color-companion"),primary:r("--learning-block-color-primary")});n(e=>e&&Object.keys(i).every(t=>e[t]===i[t])?e:i)};r();let i=new MutationObserver(r);return i.observe(document.documentElement,{attributes:!0,attributeFilter:["class","data-theme","style"]}),i.observe(t,{attributes:!0,attributeFilter:["class","style"]}),()=>i.disconnect()},[e]),t})(a),d=(e=>{let[t,n]=(0,l.useState)(!1);return(0,l.useEffect)(()=>{let t=e.current;if(!t)return;if("u"<typeof IntersectionObserver)return void n(!0);let r=new IntersectionObserver(e=>{let[t]=e;t?.isIntersecting&&n(!0)},{rootMargin:"64px 0px"});return r.observe(t),()=>r.disconnect()},[e]),t})(a),c=(0,l.useMemo)(()=>(0,x.k)(t),[t.s,t.sourceContent,t.t]),f=(0,l.useMemo)(()=>(0,v.f)(c.sourceContent)??x.a,[c.sourceContent]),m=(0,l.useMemo)(()=>(0,x.i)(f),[f]),p=(0,x.g)(f,c),h="thumbnail"===n,g=i.formatMessage(A.surface),y=m.map(e=>{let{name:t,slot:n}=e;return(0,v.e)(t)?`${t} = ${L(i,c[n]/Math.PI)}π`:`${t} = ${L(i,c[n])}`}).join(", "),S=p?p.map(e=>L(i,e)).join(", "):i.formatMessage({id:"learningBlock.parametrizedSurfaces.undefinedPoint",defaultMessage:"undefined"}),E=i.formatMessage({id:"learningBlock.parametrizedSurfaces.visualizationDescription",defaultMessage:"Three-dimensional parametrized {kind} with {parameters} and selected point ({point})."},{kind:g,parameters:y,point:S});return(0,r.jsx)("div",{ref:a,"aria-label":E,"aria-description":h?void 0:i.formatMessage(A.cameraInstructions),className:`text-token-text-primary relative w-full overflow-hidden ${h?"h-full":"h-[252px] sm:h-[270px]"}`,onKeyDown:h?void 0:e=>{let t=o.current;if(t){switch(e.key){case"ArrowLeft":t.setAzimuthalAngle(t.getAzimuthalAngle()+M);break;case"ArrowRight":t.setAzimuthalAngle(t.getAzimuthalAngle()-M);break;case"ArrowUp":t.setPolarAngle(t.getPolarAngle()-M);break;case"ArrowDown":t.setPolarAngle(t.getPolarAngle()+M);break;default:return}e.preventDefault()}},role:"img",tabIndex:h?void 0:0,children:s&&d&&(0,r.jsxs)(b,{"data-learning-block-pan":h?void 0:"both","aria-hidden":"true",camera:{fov:43,position:j},dpr:[1,1.5],frameloop:"demand",gl:{alpha:!0,antialias:!0,powerPreference:"low-power"},style:{height:"100%",touchAction:h?"auto":"none",width:"100%"},children:[(0,r.jsx)("ambientLight",{intensity:1.5}),(0,r.jsx)("directionalLight",{position:[4,7,5],intensity:1.25}),(0,r.jsx)(N,{colors:s,isThumbnail:h,parsed:f,values:c}),!h&&(0,r.jsx)(w,{ref:o,enableDamping:!1,enablePan:!1,enableZoom:!1,minPolarAngle:.18,maxPolarAngle:Math.PI-.18})]})})}})}};