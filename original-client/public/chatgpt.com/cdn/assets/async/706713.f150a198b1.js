export const __rspack_esm_ids=[706713];export const __webpack_modules__={Ipng(e,t,n){let r,a;n.d(t,{a:()=>N});var i=n("unhp"),o=n("zd8w"),s=n("PVZC"),l=n("hPwS");let d=new s.v,c=new s.Xd;class u extends s.Kb{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new s.ub([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new s.ub([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new s.Lb(t,6,1);return this.setAttribute("instanceStart",new s.Rb(n,3,0)),this.setAttribute("instanceEnd",new s.Rb(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let r=new s.Lb(n,2*t,1);return this.setAttribute("instanceColorStart",new s.Rb(r,t,0)),this.setAttribute("instanceColorEnd",new s.Rb(r,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new s.fe(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new s.v);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),d.setFromBufferAttribute(t),this.boundingBox.union(d))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new s.td),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let a=0,i=e.count;a<i;a++)c.fromBufferAttribute(e,a),r=Math.max(r,n.distanceToSquared(c)),c.fromBufferAttribute(t,a),r=Math.max(r,n.distanceToSquared(c));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var p=n("STXV");let f=parseInt("179".replace(/\D+/g,""));class m extends s.jd{constructor(e){super({type:"LineMaterial",uniforms:s.Vd.clone(s.Vd.merge([p.UniformsLib.common,p.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new s.Wd(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let h=f>=125?"uv1":"uv2",v=new s.Yd,x=new s.Xd,g=new s.Xd,b=new s.Yd,y=new s.Yd,w=new s.Yd,S=new s.Xd,M=new s.sc,E=new s.ac,_=new s.Xd,A=new s.v,j=new s.td,k=new s.Yd;function L(e,t,n){return k.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),k.multiplyScalar(1/k.w),k.x=a/n.width,k.y=a/n.height,k.applyMatrix4(e.projectionMatrixInverse),k.multiplyScalar(1/k.w),Math.abs(Math.max(k.x,k.y))}class z extends s.tc{constructor(e=new u,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,a=0,i=t.count;e<i;e++,a+=2)x.fromBufferAttribute(t,e),g.fromBufferAttribute(n,e),r[a]=0===a?0:r[a-1],r[a+1]=r[a]+x.distanceTo(g);let a=new s.Lb(r,2,1);return e.setAttribute("instanceDistanceStart",new s.Rb(a,1,0)),e.setAttribute("instanceDistanceEnd",new s.Rb(a,1,1)),this}raycast(e,t){let n,i,o=this.material.worldUnits,l=e.camera;null!==l||o||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let d=void 0!==e.params.Line2&&e.params.Line2.threshold||0;r=e.ray;let c=this.matrixWorld,u=this.geometry,p=this.material;if(a=p.linewidth+d,null===u.boundingSphere&&u.computeBoundingSphere(),j.copy(u.boundingSphere).applyMatrix4(c),o)n=.5*a;else{let e=Math.max(l.near,j.distanceToPoint(r.origin));n=L(l,e,p.resolution)}if(j.radius+=n,!1!==r.intersectsSphere(j)){if(null===u.boundingBox&&u.computeBoundingBox(),A.copy(u.boundingBox).applyMatrix4(c),o)i=.5*a;else{let e=Math.max(l.near,A.distanceToPoint(r.origin));i=L(l,e,p.resolution)}A.expandByScalar(i),!1!==r.intersectsBox(A)&&(o?function(e,t){let n=e.matrixWorld,i=e.geometry,o=i.attributes.instanceStart,l=i.attributes.instanceEnd,d=Math.min(i.instanceCount,o.count);for(let i=0;i<d;i++){E.start.fromBufferAttribute(o,i),E.end.fromBufferAttribute(l,i),E.applyMatrix4(n);let d=new s.Xd,c=new s.Xd;r.distanceSqToSegment(E.start,E.end,c,d),c.distanceTo(d)<.5*a&&t.push({point:c,pointOnLine:d,distance:r.origin.distanceTo(c),object:e,face:null,faceIndex:i,uv:null,[h]:null})}}(this,t):function(e,t,n){let i=t.projectionMatrix,o=e.material.resolution,l=e.matrixWorld,d=e.geometry,c=d.attributes.instanceStart,u=d.attributes.instanceEnd,p=Math.min(d.instanceCount,c.count),f=-t.near;r.at(1,w),w.w=1,w.applyMatrix4(t.matrixWorldInverse),w.applyMatrix4(i),w.multiplyScalar(1/w.w),w.x*=o.x/2,w.y*=o.y/2,w.z=0,S.copy(w),M.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<p;t++){if(b.fromBufferAttribute(c,t),y.fromBufferAttribute(u,t),b.w=1,y.w=1,b.applyMatrix4(M),y.applyMatrix4(M),b.z>f&&y.z>f)continue;if(b.z>f){let e=b.z-y.z,t=(b.z-f)/e;b.lerp(y,t)}else if(y.z>f){let e=y.z-b.z,t=(y.z-f)/e;y.lerp(b,t)}b.applyMatrix4(i),y.applyMatrix4(i),b.multiplyScalar(1/b.w),y.multiplyScalar(1/y.w),b.x*=o.x/2,b.y*=o.y/2,y.x*=o.x/2,y.y*=o.y/2,E.start.copy(b),E.start.z=0,E.end.copy(y),E.end.z=0;let d=E.closestPointToPointParameter(S,!0);E.at(d,_);let p=s.pc.lerp(b.z,y.z,d),m=p>=-1&&p<=1,v=S.distanceTo(_)<.5*a;if(m&&v){E.start.fromBufferAttribute(c,t),E.end.fromBufferAttribute(u,t),E.start.applyMatrix4(l),E.end.applyMatrix4(l);let a=new s.Xd,i=new s.Xd;r.distanceSqToSegment(E.start,E.end,i,a),n.push({point:i,pointOnLine:a,distance:r.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,[h]:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(v),this.material.uniforms.resolution.value.set(v.z,v.w))}}class P extends u{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,r=new Float32Array(2*n);if(3===t)for(let a=0;a<n;a+=t)r[2*a]=e[a],r[2*a+1]=e[a+1],r[2*a+2]=e[a+2],r[2*a+3]=e[a+3],r[2*a+4]=e[a+4],r[2*a+5]=e[a+5];else for(let a=0;a<n;a+=t)r[2*a]=e[a],r[2*a+1]=e[a+1],r[2*a+2]=e[a+2],r[2*a+3]=e[a+3],r[2*a+4]=e[a+4],r[2*a+5]=e[a+5],r[2*a+6]=e[a+6],r[2*a+7]=e[a+7];return super.setColors(r,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class C extends z{constructor(e=new P,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let N=o.forwardRef(function({points:e,color:t=0xffffff,vertexColors:n,linewidth:r,lineWidth:a,segments:d,dashed:c,...p},f){var h,v;let x=(0,l.C)(e=>e.size),g=o.useMemo(()=>d?new z:new C,[d]),[b]=o.useState(()=>new m),y=(null==n||null==(h=n[0])?void 0:h.length)===4?4:3,w=o.useMemo(()=>{let r=d?new u:new P,a=e.map(e=>{let t=Array.isArray(e);return e instanceof s.Xd||e instanceof s.Yd?[e.x,e.y,e.z]:e instanceof s.Wd?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(r.setPositions(a.flat()),n){t=0xffffff;let e=n.map(e=>e instanceof s.K?e.toArray():e);r.setColors(e.flat(),y)}return r},[e,d,n,y]);return o.useLayoutEffect(()=>{g.computeLineDistances()},[e,g]),o.useLayoutEffect(()=>{c?b.defines.USE_DASH="":delete b.defines.USE_DASH,b.needsUpdate=!0},[c,b]),o.useEffect(()=>()=>{w.dispose(),b.dispose()},[w]),o.createElement("primitive",(0,i.a)({object:g,ref:f},p),o.createElement("primitive",{object:w,attach:"geometry"}),o.createElement("primitive",(0,i.a)({object:b,attach:"material",color:t,vertexColors:!!n,resolution:[x.width,x.height],linewidth:null!=(v=null!=r?r:a)?v:1,dashed:c,transparent:4===y},p)))})},mevF(e,t,n){let r,a;var i=n("unhp"),o=n("zd8w"),s=n("CE87"),l=n("PVZC"),d=n("hPwS");let c=new l.Xd,u=new l.Xd,p=new l.Xd,f=new l.Wd;function m(e,t,n){let r=c.setFromMatrixPosition(e.matrixWorld);r.project(t);let a=n.width/2,i=n.height/2;return[r.x*a+a,-(r.y*i)+i]}let h=e=>1e-10>Math.abs(e)?0:e;function v(e,t,n=""){let r="matrix3d(";for(let n=0;16!==n;n++)r+=h(t[n]*e.elements[n])+(15!==n?",":")");return n+r}let x=(r=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>v(e,r)),g=(a=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>v(e,a(t),"translate(-50%,-50%)")),b=o.forwardRef(({children:e,eps:t=.001,style:n,className:r,prepend:a,center:v,fullscreen:b,portal:y,distanceFactor:w,sprite:S=!1,transform:M=!1,occlude:E,onOcclude:_,castShadow:A,receiveShadow:j,material:k,geometry:L,zIndexRange:z=[0x1000037,0],calculatePosition:P=m,as:C="div",wrapperClass:N,pointerEvents:B="auto",...R},T)=>{let{gl:I,camera:U,scene:D,size:O,raycaster:W,events:F,viewport:V}=(0,d.C)(),[H]=o.useState(()=>document.createElement(C)),$=o.useRef(null),G=o.useRef(null),X=o.useRef(0),K=o.useRef([0,0]),Y=o.useRef(null),q=o.useRef(null),Z=(null==y?void 0:y.current)||F.connected||I.domElement.parentNode,J=o.useRef(null),Q=o.useRef(!1),ee=o.useMemo(()=>{var e;return E&&"blending"!==E||Array.isArray(E)&&E.length&&(e=E[0])&&"object"==typeof e&&"current"in e},[E]);o.useLayoutEffect(()=>{let e=I.domElement;E&&"blending"===E?(e.style.zIndex=`${Math.floor(z[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[E]),o.useLayoutEffect(()=>{if(G.current){let e=$.current=s.createRoot(H);if(D.updateMatrixWorld(),M)H.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=P(G.current,U,O);H.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return Z&&(a?Z.prepend(H):Z.appendChild(H)),()=>{Z&&Z.removeChild(H),e.unmount()}}},[Z,M]),o.useLayoutEffect(()=>{N&&(H.className=N)},[N]);let et=o.useMemo(()=>M?{position:"absolute",top:0,left:0,width:O.width,height:O.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:v?"translate3d(-50%,-50%,0)":"none",...b&&{top:-O.height/2,left:-O.width/2,width:O.width,height:O.height},...n},[n,v,b,O,M]),en=o.useMemo(()=>({position:"absolute",pointerEvents:B}),[B]);o.useLayoutEffect(()=>{var t,a;Q.current=!1,M?null==(t=$.current)||t.render(o.createElement("div",{ref:Y,style:et},o.createElement("div",{ref:q,style:en},o.createElement("div",{ref:T,className:r,style:n,children:e})))):null==(a=$.current)||a.render(o.createElement("div",{ref:T,style:et,className:r,children:e}))});let er=o.useRef(!0);(0,d.D)(e=>{if(G.current){U.updateMatrixWorld(),G.current.updateWorldMatrix(!0,!1);let e=M?K.current:P(G.current,U,O);if(M||Math.abs(X.current-U.zoom)>t||Math.abs(K.current[0]-e[0])>t||Math.abs(K.current[1]-e[1])>t){var n;let t,r,a,i,o=(n=G.current,t=c.setFromMatrixPosition(n.matrixWorld),r=u.setFromMatrixPosition(U.matrixWorld),a=t.sub(r),i=U.getWorldDirection(p),a.angleTo(i)>Math.PI/2),s=!1;ee&&(Array.isArray(E)?s=E.map(e=>e.current):"blending"!==E&&(s=[D]));let d=er.current;s?er.current=function(e,t,n,r){let a=c.setFromMatrixPosition(e.matrixWorld),i=a.clone();i.project(t),f.set(i.x,i.y),n.setFromCamera(f,t);let o=n.intersectObjects(r,!0);if(o.length){let e=o[0].distance;return a.distanceTo(n.ray.origin)<e}return!0}(G.current,U,W,s)&&!o:er.current=!o,d!==er.current&&(_?_(!er.current):H.style.display=er.current?"block":"none");let m=Math.floor(z[0]/2),v=E?ee?[z[0],m]:[m-1,0]:z;if(H.style.zIndex=`${function(e,t,n){if(t instanceof l.Kc||t instanceof l.Ic){let r=c.setFromMatrixPosition(e.matrixWorld),a=u.setFromMatrixPosition(t.matrixWorld),i=r.distanceTo(a),o=(n[1]-n[0])/(t.far-t.near),s=n[1]-o*t.far;return Math.round(o*i+s)}}(G.current,U,v)}`,M){let[e,t]=[O.width/2,O.height/2],n=U.projectionMatrix.elements[5]*t,{isOrthographicCamera:r,top:a,left:i,bottom:o,right:s}=U,l=x(U.matrixWorldInverse),d=r?`scale(${n})translate(${h(-(s+i)/2)}px,${h((a+o)/2)}px)`:`translateZ(${n}px)`,c=G.current.matrixWorld;S&&((c=U.matrixWorldInverse.clone().transpose().copyPosition(c).scale(G.current.scale)).elements[3]=c.elements[7]=c.elements[11]=0,c.elements[15]=1),H.style.width=O.width+"px",H.style.height=O.height+"px",H.style.perspective=r?"":`${n}px`,Y.current&&q.current&&(Y.current.style.transform=`${d}${l}translate(${e}px,${t}px)`,q.current.style.transform=g(c,1/((w||10)/400)))}else{let t=void 0===w?1:function(e,t){if(t instanceof l.Ic)return t.zoom;if(!(t instanceof l.Kc))return 1;{let n=c.setFromMatrixPosition(e.matrixWorld),r=u.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*n.distanceTo(r))}}(G.current,U)*w;H.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}K.current=e,X.current=U.zoom}}if(!ee&&J.current&&!Q.current)if(M){if(Y.current){let e=Y.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=U;if(t||L)R.scale&&(Array.isArray(R.scale)?R.scale instanceof l.Xd?J.current.scale.copy(R.scale.clone().divideScalar(1)):J.current.scale.set(1/R.scale[0],1/R.scale[1],1/R.scale[2]):J.current.scale.setScalar(1/R.scale));else{let t=(w||10)/400,n=e.clientWidth*t,r=e.clientHeight*t;J.current.scale.set(n,r,1)}Q.current=!0}}}else{let t=H.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/V.factor,n=t.clientWidth*e,r=t.clientHeight*e;J.current.scale.set(n,r,1),Q.current=!0}J.current.lookAt(e.camera.position)}});let ea=o.useMemo(()=>({vertexShader:M?void 0:`
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
      `}),[M]);return o.createElement("group",(0,i.a)({},R,{ref:G}),E&&!ee&&o.createElement("mesh",{castShadow:A,receiveShadow:j,ref:J},L||o.createElement("planeGeometry",null),k||o.createElement("shaderMaterial",{side:2,vertexShader:ea.vertexShader,fragmentShader:ea.fragmentShader})))});n.d(t,{},{a:b})},sKwe(e,t,n){var r=n("ABep"),a=n("on57"),i=n("zd8w"),o=n("iLdV");let s=e=>e?e.replace(/\\mid/g,"|").replace(/\\neg/g,"¬").replace(/\\cap/g,"∩").replace(/\\cup/g,"∪").replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\mathrm\{([^}]*)\}/g,"$1").replace(/\\[a-zA-Z]+/g,"").replace(/[{}_^]/g,"").replace(/\s+/g," ").trim().length:0,l=e=>{let t=e.formatValueForInput??o.c,n=Math.max((0,o.d)(e.min,e.step,t).length,(0,o.d)(e.max,e.step,t).length),r=e.inlineUnit?e.unit?.length??0:0;return e.range?2*n+2:n+r};n.d(t,{},{a:e=>{let{inputs:t}=e,n=(0,i.useRef)(null),[d,c]=(0,i.useState)(),u=t.some(e=>e.before),p=t.filter(e=>!e.options&&!1!==e.showValueInput),f=Math.max(0,...t.map(e=>s(e.variable))),m=Math.max(0,...p.map(l)),h=Math.max(0,...p.map(e=>s(e.inlineUnit?void 0:e.unit))),v=t.map(e=>e.variable??"").join("\0");return(0,i.useLayoutEffect)(()=>{let e=n.current;if(!e)return;let t=Array.from(e.querySelectorAll("[data-input-selector-variable]"));if(0===t.length)return;let r=()=>{let n=t.filter(e=>"stacked"!==e.dataset.inputSelectorLabelLayout),r=n.length?Math.max(...n.map(t=>{let n=t.cloneNode(!0);n.removeAttribute("data-input-selector-variable"),Object.assign(n.style,{inset:"0 auto auto 0",maxWidth:"none",position:"absolute",visibility:"hidden",whiteSpace:"nowrap",width:"max-content"}),e.appendChild(n);let r=n.getBoundingClientRect().width;return n.remove(),r})):void 0;c(e=>e===r?e:r)};if(r(),"u"<typeof ResizeObserver)return;let a=new ResizeObserver(r);t.forEach(e=>a.observe(e));let i=new MutationObserver(r);return t.forEach(e=>i.observe(e,{attributeFilter:["data-input-selector-label-layout"]})),()=>{a.disconnect(),i.disconnect()}},[v]),(0,r.jsx)("div",{ref:n,"data-input-selector-group":!0,className:"grid min-h-fit min-w-0 shrink grow-0 gap-y-3",children:t.map((e,t)=>(0,r.jsxs)("div",{className:(0,a.b)("grid h-full min-w-0 items-center gap-x-2",u?"grid-cols-[auto_minmax(0,1fr)]":"grid-cols-[minmax(0,1fr)]"),children:[u?e.before??(0,r.jsx)("div",{"aria-hidden":!0}):null,(0,r.jsx)(o.a,{...e,groupVariableWidthCh:f,groupVariableWidthPx:d,groupUnitWidthCh:h,groupValueWidthCh:m})]},t))})},b:function(e,t,n,r){var a;let{before:i,disabled:o,displayValue:s,editType:l="CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE",formatValueForInput:d,inlineUnit:c,parseInputValue:u,mapValue:p,options:f,optionLabelFormat:m,showValueInput:h,sliderStyle:v,ariaLabel:x,ariaValueText:g,onActiveChange:b,value:y,variable:w,variableBold:S,variableFormat:M,unit:E}=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{};return{before:i,disabled:o,displayValue:s,options:f,optionLabelFormat:m,showValueInput:h,sliderStyle:v,inlineUnit:c,ariaLabel:x,ariaValueText:g,variable:w??t.variable??(a=String(e),a.match(/[A-Za-z]/)?.[0]??a),variableBold:S??t.variableBold,variableFormat:M??t.variableFormat,unit:E??t.unit,formatValueForInput:d,parseInputValue:u,max:t.max,min:t.min,step:t.step,value:y??Number(n[e]),onActiveChange:b,onChange:(t,n)=>{let a=p?p(t):t;r(t=>({...t,[e]:a}),"function"==typeof l?l(n):l)}}}})},iLdV(e,t,n){var r=n("ABep"),a=n("YAOF"),i=n("on57"),o=n("zd8w"),s=n("Wf1j"),l=n("l7Go"),d=n("jYuH"),c=n("evpU");let u=(e,t,n)=>Math.min(Math.max(e,t),n),p=/[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?/i,f=(e,t,n,r)=>{if(!Number.isFinite(e))return t;let a=Math.round((u(e,t,n)-t)/r),i=(0,d.c)(r);return u((0,d.h)(t+a*r,Math.max(1,i)),t,n)},m=(e,t)=>Number.isFinite(e)?e.toFixed(Math.max(1,(0,d.c)(t))):"",h=(e,t,n)=>{let r=n(e,t);return r.match(p)?.[0]??r},v=e=>{let t=[],n=e.parentElement;for(;n;)"visible"!==window.getComputedStyle(n).overflowY&&t.push(n),n=n.parentElement;return t},x=(0,o.createContext)({isNativeSlider:!1}),g=()=>(0,r.jsx)("svg",{"aria-hidden":!0,className:"h-4 w-4 flex-none",fill:"none",viewBox:"0 0 16 16",children:(0,r.jsx)("path",{d:"m5 6 3-3 3 3M5 10l3 3 3-3",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"1.5"})});n.d(t,{},{a:e=>{let t,{min:n,max:d,step:u,value:b,displayValue:y,onChange:w,onActiveChange:S,disabled:M,options:E,optionLabelFormat:_="text",sliderStyle:A="continuous",ariaLabel:j,ariaValueText:k,variable:L,variableBold:z,variableFormat:P,inlineUnit:C,unit:N,formatValueForInput:B=m,parseInputValue:R,normalizeCommittedValue:T,minSliderWidthPx:I,showValueInput:U=!0,range:D,valueClassName:O,groupVariableWidthCh:W,groupVariableWidthPx:F,groupUnitWidthCh:V,groupValueWidthCh:H}=e,{isNativeSlider:$,onSliderInteractionEnd:G,onSliderInteractionStart:X}=(0,o.useContext)(x),K=(0,s.a)(),Y=R??Number.parseFloat,q=f(b,n,d,u),Z=Number.isFinite(y)?y:q,[J,Q]=(0,o.useState)(()=>h(Z,u,B)),[ee,et]=(0,o.useState)(!1),en=(0,o.useRef)(!1),er=(0,o.useRef)(!1),ea=(0,o.useRef)(!1),ei=(0,o.useRef)(null),eo=(0,o.useRef)(null),es=(0,o.useRef)(null),el=(0,o.useRef)(null),ed=(0,o.useRef)(null),ec=(0,o.useRef)(null),eu=(0,o.useRef)(null),ep=(0,o.useRef)(null),ef=(0,o.useRef)(!1),[em,eh]=(0,o.useState)(!1),[ev,ex]=(0,o.useState)(!1),[eg,eb]=(0,o.useState)(!1),[ey,ew]=(0,o.useState)($?"above":"below"),eS=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"blur";"blur"===e&&ea.current||er.current&&(er.current=!1,S?.(!1),G?.())},eM=()=>{er.current||(er.current=!0,S?.(!0),X?.(L))},eE=()=>{ea.current=!0,eM()};(0,o.useEffect)(()=>{let e=()=>{ea.current=!1,eS("pointer-end")};return window.addEventListener("pointerup",e),window.addEventListener("pointercancel",e),()=>{window.removeEventListener("pointerup",e),window.removeEventListener("pointercancel",e)}},[S,G]),(0,o.useLayoutEffect)(()=>{let e=ed.current,t=ec.current;if(!E||!e||!t)return void eh(!1);let n=()=>{let n=e.clientWidth,r=t.scrollWidth>n+1;eh(e=>e===r?e:r)};n();let r="u"<typeof document?void 0:document.fonts;if(r?.addEventListener("loadingdone",n),"u"<typeof ResizeObserver)return()=>r?.removeEventListener("loadingdone",n);let a=new ResizeObserver(n);return a.observe(e),a.observe(t),()=>{r?.removeEventListener("loadingdone",n),a.disconnect()}},[E,_]),(0,o.useEffect)(()=>{let e=e=>{"Escape"===e.key&&ef.current&&(ef.current=!1,e.preventDefault(),e.stopPropagation())};return document.addEventListener("keyup",e,!0),()=>document.removeEventListener("keyup",e,!0)},[]),(0,o.useEffect)(()=>{if(!eg)return;ef.current=!1;let e=e=>{let t=e.target;!(t instanceof Node)||eu.current?.contains(t)||ep.current?.contains(t)||eb(!1)},t=e=>{"Escape"===e.key&&(ef.current=!0,e.preventDefault(),e.stopPropagation(),eb(!1),ep.current?.focus())};return document.addEventListener("pointerdown",e),document.addEventListener("keydown",t,!0),()=>{document.removeEventListener("pointerdown",e),document.removeEventListener("keydown",t,!0)}},[eg]),(0,o.useEffect)(()=>{(!em||M)&&eb(!1)},[M,em]),(0,o.useLayoutEffect)(()=>{if(!eg)return void ew($?"above":"below");let e=eu.current,t=ep.current;if(!e||!t)return;let n=()=>{ew((e=>{let{boundary:t,menuHeight:n,trigger:r}=e,a=t.bottom-r.bottom-4;if(n<=a)return"below";let i=r.top-t.top-4;return n<=i||i>a?"above":"below"})({boundary:(e=>{let{clippingAncestors:t,viewport:n}=e;return t.reduce((e,t)=>({bottom:Math.min(e.bottom,t.bottom),top:Math.max(e.top,t.top)}),n)})({clippingAncestors:v(t).map(e=>e.getBoundingClientRect()),viewport:{bottom:window.innerHeight,top:0}}),menuHeight:e.getBoundingClientRect().height,trigger:t.getBoundingClientRect()}))};if(n(),window.addEventListener("resize",n),"u"<typeof ResizeObserver)return()=>window.removeEventListener("resize",n);let r=new ResizeObserver(n);return r.observe(e),r.observe(t),v(t).forEach(e=>r.observe(e)),()=>{window.removeEventListener("resize",n),r.disconnect()}},[eg,$]);let e_=ee?J:h(Z,u,B),eA=Math.max(h(n,u,B).length,h(d,u,B).length),ej=D?(t=D.displayValues??D.ariaValueTexts??[h(D.values[0],u,B),h(D.values[1],u,B)],`(${t[0]}, ${t[1]})`):void 0,ek=D?2*eA+2:eA,eL=H??ek,ez=I??96,eP=z??!1,eC=L?L.replace(/[^\w-]+/g,"_"):"input-selector-value",eN=j??(L?K.formatMessage({id:"learningBlock.inputSelector.valueAriaLabel",defaultMessage:"{label} value"},{label:L}):void 0),eB=!!L&&"text"!==P&&(!!("katex"===P||/\\/.test(L))||/^[A-Za-zθμσλπΔ](?:[_^][A-Za-z0-9{}]+)?$/.test(L)),eR=E?.find(e=>f(e.value,n,d,u)===q)??E?.[0],eT=em?K.formatMessage({id:"learningBlock.inputSelector.overflowMenuAriaLabel",defaultMessage:"{value}. Show all {label} options"},{label:eN??K.formatMessage({id:"learningBlock.inputSelector.selectorAriaLabel",defaultMessage:"selector"}),value:eR?.ariaLabel??eR?.label??""}):void 0,eI=(0,o.useId)(),eU=(e,t)=>"katex"!==t?e:(0,r.jsx)(l.a,{className:"katex",latex:e}),eD=e=>f(e.value,n,d,u),eO=E?.find(e=>eD(e)===q)??E?.[0],eW=e=>{let t=Y(e);if(!Number.isFinite(t))return void Q(h(Z,u,B));let r=((e,t)=>{let{max:n,min:r,normalizeCommittedValue:a,step:i}=t;return a?a(e):f(e,r,n,i)})(t,{min:n,max:d,step:u,normalizeCommittedValue:T});w(r,"input"),Q(h(r,u,B))},eF=L?(0,r.jsx)("div",{"data-input-selector-variable":!0,"data-input-selector-label-layout":ev?"stacked":"inline",className:(0,i.b)("text-token-text-primary min-w-0 max-w-full justify-self-start text-sm leading-5 whitespace-normal hyphens-auto [overflow-wrap:anywhere] [&_.katex]:!text-[1em]",eP&&"font-medium"),children:eB?(0,r.jsx)(l.a,{className:"katex",latex:L??""}):L}):null,eV=!!(C&&N&&!D),eH=N&&!eV?(0,r.jsx)("div",{ref:el,className:"text-token-text-secondary shrink-0 text-xs leading-4 whitespace-nowrap [&_.katex]:text-inherit",children:N}):null,e$=!!H,eG=`minmax(max(${eL}ch,2rem), max(${eL}ch,2rem))`,eX=!!V,eK=`minmax(${V??0}ch, ${V??0}ch)`,eY=!E&&eX?eH??(0,r.jsx)("div",{ref:el,"aria-hidden":!0}):null,eq=F?`${F}px`:W?`${W}ch`:null,eZ=eq?`minmax(0, min(${eq}, 40%))`:"fit-content(40%)";(0,o.useLayoutEffect)(()=>{let e=ei.current,t=eo.current;if(E||!e||!t)return void ex(!1);let n=()=>{let n=e.clientWidth;if(0===n)return;let r=(e=>{let{availableWidth:t,labelWidth:n,minSliderWidthPx:r=96,unitWidth:a,valueWidth:i}=e,o=2+Number(i>0)+Number(a>0);return n+i+a+(o-1)*12+r>t+1})({availableWidth:n,labelWidth:Math.max(t.scrollWidth,F??0),minSliderWidthPx:ez,unitWidth:el.current?.clientWidth??0,valueWidth:es.current?.clientWidth??0});ex(e=>e===r?e:r)};n();let r="u"<typeof document?void 0:document.fonts;if(r?.addEventListener("loadingdone",n),"u"<typeof ResizeObserver)return()=>r?.removeEventListener("loadingdone",n);let a=new ResizeObserver(n);return a.observe(e),a.observe(t),es.current&&a.observe(es.current),el.current&&a.observe(el.current),()=>{r?.removeEventListener("loadingdone",n),a.disconnect()}},[V,H,F,E,ez,L,U,N]);let eJ=e=>eu.current?.querySelectorAll("[data-input-selector-discrete-menu-option]").item(e).focus();(0,o.useEffect)(()=>{eg&&E&&eJ(Math.max(E.findIndex(e=>eD(e)===q),0))},[eg,E,q]);let eQ=E?(0,r.jsx)("div",{role:"radiogroup","aria-label":eN,className:(0,i.b)("flex h-6 w-full min-w-0 flex-nowrap gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-black/7 p-0.5 dark:bg-white/6",M&&"opacity-40"),children:E.map(e=>{let t=eD(e),n=t===q;return(0,r.jsx)("button",{type:"button",role:"radio","aria-checked":n,"aria-label":e.ariaLabel,disabled:M,className:(0,i.b)("text-token-text-secondary flex h-5 min-w-max flex-1 items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",n&&"bg-token-bg-primary !text-token-text-primary shadow-sm dark:bg-white dark:!text-black",!n&&!M&&"hover:text-token-text-primary focus-visible:text-token-text-primary",!M&&"focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"),onClick:()=>w(t,"input"),children:(0,r.jsx)("span",{className:"min-w-6",children:eU(e.label,_)})},e.value)})}):null,e0=E?(0,r.jsxs)("div",{"data-input-selector-discrete-rail":!0,className:(0,i.b)("relative h-6 w-full min-w-0",em&&"flex justify-end"),children:[em&&eO?(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)("button",{type:"button","aria-controls":eI,"aria-expanded":eg,"aria-haspopup":"listbox","aria-label":eT,disabled:M,"data-input-selector-discrete-menu-trigger":!0,ref:ep,className:(0,i.b)("text-token-text-primary flex h-6 max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-full px-2 text-[15px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",!M&&"hover:bg-black/5 focus-visible:bg-black/7 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/7 dark:focus-visible:bg-white/10"),onClick:()=>eb(e=>!e),children:[(0,r.jsx)("span",{className:"min-w-0 truncate",children:eU(eO.label,_)}),(0,r.jsx)(g,{})]}),eg?(0,r.jsx)("div",{ref:eu,"aria-label":eN,className:(0,i.b)("border-token-border-default bg-token-bg-primary text-token-text-primary absolute end-0 z-50 flex min-w-max flex-col gap-0.5 overflow-hidden rounded-lg border p-1 shadow-lg","above"===ey?"bottom-full mb-1":"top-full mt-1"),id:eI,role:"listbox",children:E.map((e,t)=>{let n=eD(e),a=n===q;return(0,r.jsx)("button",{type:"button","aria-selected":a,"data-input-selector-discrete-menu-option":!0,role:"option",className:(0,i.b)("flex min-w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-start text-[15px] leading-5 whitespace-nowrap outline-none [&_.katex]:!text-[1em]",a&&"bg-black/7 font-medium dark:bg-white/10",!a&&"hover:bg-black/7 focus-visible:bg-black/7 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"),onClick:()=>{w(n,"input"),eb(!1),ep.current?.focus()},onKeyDown:e=>((e,t)=>{if(E)switch(e.key){case"ArrowDown":e.preventDefault(),eJ((t+1)%E.length);break;case"ArrowUp":e.preventDefault(),eJ((t-1+E.length)%E.length);break;case"Home":e.preventDefault(),eJ(0);break;case"End":e.preventDefault(),eJ(E.length-1)}})(e,t),children:eU(e.label,_)},e.value)})}):null]}):eQ,(0,r.jsx)("div",{ref:ec,"aria-hidden":!0,"data-input-selector-overflow-measure":!0,className:"pointer-events-none absolute inset-x-0 top-0 h-6 overflow-hidden opacity-0",children:(0,r.jsx)("div",{className:"flex h-6 w-max min-w-max gap-0.5 p-0.5",children:E.map(e=>(0,r.jsx)("span",{className:"flex h-5 min-w-max flex-none items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap [&_.katex]:!text-[1em]",children:(0,r.jsx)("span",{className:"min-w-6",children:eU(e.label,_)})},e.value))})})]}):null,e1=L&&!E&&U&&(0,r.jsxs)("div",{ref:es,className:(0,i.b)("text-token-text-primary grid h-5 min-w-8 grid-rows-1 rounded-md px-1.5 text-end text-[11px] leading-none whitespace-nowrap after:invisible after:font-mono after:whitespace-pre after:content-[attr(data-value)] after:[grid-area:1/1]",eV?"grid-cols-[minmax(0,1fr)_auto] gap-x-0.5":"grid-cols-1",D&&(ev?"text-end":"text-start"),O,!M&&!D&&"transition-colors focus-within:bg-black/7 hover:bg-black/5 dark:focus-within:bg-white/10 dark:hover:bg-white/7"),"data-value":"0".repeat(eL),children:[D?(0,r.jsx)("span",{"data-input-selector-range-value":!0,className:(0,i.b)("relative flex h-full items-center tabular-nums [grid-area:1/1]",ev?"justify-end":"justify-start"),children:ej}):(0,r.jsx)("input",{"aria-label":eN,className:"relative h-full min-w-[4ch] border-none bg-transparent p-0 text-end text-[11px] leading-none whitespace-nowrap shadow-[none] outline-none [grid-area:1/1] focus:outline-none",disabled:M,inputMode:"decimal",name:eC,size:1,type:"text",value:e_,onBlur:()=>{if(en.current){en.current=!1;return}et(!1),eW(J)},onChange:e=>{var t;let n;return Q(R?e.currentTarget.value:""===(n=(t=e.currentTarget.value).trim())||"-"===n||"."===n?t:n.match(p)?.[0]??t)},onFocus:()=>{et(!0),Q(h(Z,u,B))},onKeyDown:e=>{if("Enter"===e.key){e.preventDefault(),en.current=!0,et(!1),eW(J),e.currentTarget.blur();return}"Escape"===e.key&&(e.preventDefault(),en.current=!0,et(!1),Q(h(q,u,B)),e.currentTarget.blur())}}),eV?(0,r.jsx)("span",{"aria-hidden":!0,className:"text-token-text-secondary self-center text-xs leading-4",children:N}):null]}),e2=[];ev?(L&&e2.push("minmax(0, 1fr)"),e1&&e2.push(eG),eY&&e2.push(eK)):(L&&e2.push(eZ),e1&&e2.push(eG),eY&&e2.push(eK),e2.push("minmax(0, 1fr)"));let e3=[],e4=e$&&!!L,e5=eX&&!!L;L&&e3.push(eZ),e4&&e3.push(eG),e5&&e3.push(eK),e3.push("minmax(0, 1fr)");let e6=`${e3.length} / ${e3.length+1}`,e7=L?"2 / -1":"1 / -1",e8=Number.isFinite(n)&&Number.isFinite(d)&&Number.isFinite(u)&&u>0&&d>=n?Math.max(0,Math.round((d-n)/u)):0,e9=Math.min(e8+1,12),te="stepped"===A&&e8>0?Array.from({length:e9},(e,t)=>t):[],tt="stepped"===A?"h-6 w-6":"h-5 w-5",tn="relative flex h-6 w-full min-w-0 flex-1 items-center rounded-full bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.06)]",tr=te.length>0?(0,r.jsx)("div",{"aria-hidden":!0,"data-input-selector-rendered-marker-count":te.length,className:"pointer-events-none absolute inset-x-4 top-1/2 z-0 flex -translate-y-1/2 justify-between",children:te.map(e=>(0,r.jsx)("span",{"data-input-selector-step-marker":!0,className:"h-[3px] w-[3px] rounded-full bg-black/20 dark:bg-white/20"},e))}):null,ta=$&&!D?(0,r.jsxs)("div",{"data-input-selector-slider":!0,"data-input-selector-slider-style":A,className:(0,i.b)(tn,M&&"opacity-40"),children:[tr,(0,r.jsx)("input",{"aria-label":eN,"aria-valuetext":k,type:"range","data-learning-block-pan":M?void 0:"horizontal",className:(0,i.b)(c.a.inputSelector,"stepped"===A&&c.a.inputSelectorStepped,"text-token-text-primary relative z-10 flex w-full min-w-0 flex-1 items-center"),disabled:M,max:d,min:n,step:u,value:q,onBlur:()=>eS("blur"),onChange:e=>{eM(),w(f(e.currentTarget.valueAsNumber,n,d,u),"slider")},onPointerDown:eE})]}):(0,r.jsxs)(a.b,{"data-input-selector-slider":!0,"data-input-selector-slider-style":A,"data-learning-block-pan":M?void 0:"horizontal",className:(0,i.b)(tn,"touch-pan-y",M&&"opacity-40"),disabled:M,max:d,min:n,onBlurCapture:()=>eS("blur"),onPointerDownCapture:eE,step:u,value:D?D.values.map(e=>f(e,n,d,u)):[q],onValueChange:e=>{(eM(),D)?D.onChange([f(e[0],n,d,u),f(e[1],n,d,u)]):w(f(e[0],n,d,u),"slider")},children:[(0,r.jsx)(a.d,{className:"absolute inset-0 rounded-full",children:(0,r.jsx)(a.a,{className:"absolute inset-y-0 rounded-full bg-transparent"})}),tr,(0,r.jsx)(a.c,{"aria-label":D?.ariaLabels[0]??eN,"aria-valuetext":D?.ariaValueTexts?.[0]??k,className:(0,i.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative cursor-pointer rounded-full border shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt,D?"flex items-center justify-center text-black":"block"),children:D?.thumbLabels?.[0]&&(0,r.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:D.thumbLabels[0]})}),D&&(0,r.jsx)(a.c,{"aria-label":D.ariaLabels[1],"aria-valuetext":D.ariaValueTexts?.[1],className:(0,i.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative flex cursor-pointer items-center justify-center rounded-full border text-black shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt),children:D.thumbLabels?.[1]&&(0,r.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:D.thumbLabels[1]})})]});return E?(0,r.jsxs)("div",{className:"grid h-full min-w-0 items-center gap-x-3",style:{gridTemplateColumns:e3.join(" ")},children:[eF,!em&&e4?(0,r.jsx)("div",{"aria-hidden":!0}):null,!em&&e5?(0,r.jsx)("div",{"aria-hidden":!0}):null,(0,r.jsx)("div",{className:"h-full min-w-0",style:{gridColumn:em?e7:e6,gridRow:1},children:e0}),(0,r.jsx)("div",{ref:ed,"aria-hidden":!0,"data-input-selector-discrete-width-measure":!0,className:"pointer-events-none h-0 min-w-0 opacity-0",style:{gridColumn:e6,gridRow:1}})]}):(0,r.jsxs)("div",{ref:ei,className:(0,i.b)("relative grid min-w-0 items-center gap-x-3",D&&"text-[11px]",ev&&"gap-y-2"),style:{gridTemplateColumns:e2.join(" ")},children:[eF,e1,eY,(0,r.jsx)("div",{className:"min-w-0",style:ev?{gridColumn:"1 / -1"}:void 0,children:ta}),L?(0,r.jsx)("div",{ref:eo,"aria-hidden":!0,"data-input-selector-label-measure":!0,className:(0,i.b)("pointer-events-none absolute inset-0 h-0 w-max max-w-none overflow-hidden text-sm leading-5 whitespace-nowrap opacity-0 [&_.katex]:!text-[1em]",eP&&"font-medium"),children:eB?(0,r.jsx)(l.a,{className:"katex",latex:L??""}):L}):null]})},b:e=>e,c:m,d:h})},WU2o(e,t,n){n.d(t,{SphericalCoordinatesControls:()=>W,SphericalCoordinatesVisualization:()=>F});var r,a,i,o,s=n("ABep"),l=n("Ipng"),d=n("mevF"),c=n("unhp"),u=n("PVZC"),p=n("zd8w"),f=n("hPwS");let m=parseInt("179".replace(/\D+/g,"")),h=(r={screenspace:!1,color:new u.K("black"),opacity:1,thickness:.05,size:new u.Wd},a=`#include <common>
   #include <morphtarget_pars_vertex>
   #include <skinning_pars_vertex>
   #include <clipping_planes_pars_vertex>
   uniform float thickness;
   uniform bool screenspace;
   uniform vec2 size;
   void main() {
     #if defined (USE_SKINNING)
	     #include <beginnormal_vertex>
       #include <morphnormal_vertex>
       #include <skinbase_vertex>
       #include <skinnormal_vertex>
       #include <defaultnormal_vertex>
     #endif
     #include <begin_vertex>
	   #include <morphtarget_vertex>
	   #include <skinning_vertex>
     #include <project_vertex>
     #include <clipping_planes_vertex>
     vec4 tNormal = vec4(normal, 0.0);
     vec4 tPosition = vec4(transformed, 1.0);
     #ifdef USE_INSTANCING
       tNormal = instanceMatrix * tNormal;
       tPosition = instanceMatrix * tPosition;
     #endif
     if (screenspace) {
       vec3 newPosition = tPosition.xyz + tNormal.xyz * thickness;
       gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0); 
     } else {
       vec4 clipPosition = projectionMatrix * modelViewMatrix * tPosition;
       vec4 clipNormal = projectionMatrix * modelViewMatrix * tNormal;
       vec2 offset = normalize(clipNormal.xy) * thickness / size * clipPosition.w * 2.0;
       clipPosition.xy += offset;
       gl_Position = clipPosition;
     }
   }`,i=`uniform vec3 color;
   uniform float opacity;
   #include <clipping_planes_pars_fragment>
   void main(){
     #include <clipping_planes_fragment>
     gl_FragColor = vec4(color, opacity);
     #include <tonemapping_fragment>
     #include <${m>=154?"colorspace_fragment":"encodings_fragment"}>
   }`,(o=class extends u.jd{constructor(e){for(let t in super({vertexShader:a,fragmentShader:i,...e}),r)this.uniforms[t]=new u.Td(r[t]),Object.defineProperty(this,t,{get(){return this.uniforms[t].value},set(e){this.uniforms[t].value=e}});this.uniforms=u.Vd.clone(this.uniforms)}}).key=u.pc.generateUUID(),o);function v({color:e="black",opacity:t=1,transparent:n=!1,screenspace:r=!1,toneMapped:a=!0,polygonOffset:i=!1,polygonOffsetFactor:o=0,renderOrder:s=0,thickness:l=.05,angle:d=Math.PI,clippingPlanes:m,...x}){let g=p.useRef(null),[b]=p.useState(()=>new h({side:1})),{gl:y}=(0,f.C)(),w=y.getDrawingBufferSize(new u.Wd);p.useMemo(()=>(0,f.e)({OutlinesMaterial:h}),[]);let S=p.useRef(0),M=p.useRef(null);return p.useLayoutEffect(()=>{let e=g.current;if(!e)return;let t=e.parent;if(t&&t.geometry&&(S.current!==d||M.current!==t.geometry)){var n;S.current=d,M.current=t.geometry;let r=null==(n=e.children)?void 0:n[0];r&&(d&&r.geometry.dispose(),e.remove(r)),t.skeleton?((r=new u.rd).material=b,r.bind(t.skeleton,t.bindMatrix)):t.isInstancedMesh?(r=new u.Mb(t.geometry,b,t.count)).instanceMatrix=t.instanceMatrix:(r=new u.tc).material=b,e.add(r),r.geometry=d?function(e,t=Math.PI/3){let n=Math.cos(t),r=(1+1e-10)*100,a=[new u.Xd,new u.Xd,new u.Xd],i=new u.Xd,o=new u.Xd,s=new u.Xd,l=new u.Xd;function d(e){let t=~~(e.x*r),n=~~(e.y*r),a=~~(e.z*r);return`${t},${n},${a}`}let c=e.index?e.toNonIndexed():e,p=c.attributes.position,f={};for(let e=0,t=p.count/3;e<t;e++){let t=3*e,n=a[0].fromBufferAttribute(p,t+0),r=a[1].fromBufferAttribute(p,t+1),s=a[2].fromBufferAttribute(p,t+2);i.subVectors(s,r),o.subVectors(n,r);let l=new u.Xd().crossVectors(i,o).normalize();for(let e=0;e<3;e++){let t=d(a[e]);t in f||(f[t]=[]),f[t].push(l)}}let m=new Float32Array(3*p.count),h=new u.z(m,3,!1);for(let e=0,t=p.count/3;e<t;e++){let t=3*e,r=a[0].fromBufferAttribute(p,t+0),c=a[1].fromBufferAttribute(p,t+1),u=a[2].fromBufferAttribute(p,t+2);i.subVectors(u,c),o.subVectors(r,c),s.crossVectors(i,o).normalize();for(let e=0;e<3;e++){let r=f[d(a[e])];l.set(0,0,0);for(let e=0,t=r.length;e<t;e++){let t=r[e];s.dot(t)>n&&l.add(t)}l.normalize(),h.setXYZ(t+e,l.x,l.y,l.z)}}return c.setAttribute("normal",h),c}(t.geometry,d):t.geometry,r.morphTargetInfluences=t.morphTargetInfluences,r.morphTargetDictionary=t.morphTargetDictionary}}),p.useLayoutEffect(()=>{let d=g.current;if(!d)return;let c=d.children[0];if(c){c.renderOrder=s;let u=d.parent;(0,f.s)(c,{morphTargetInfluences:u.morphTargetInfluences,morphTargetDictionary:u.morphTargetDictionary}),(0,f.s)(c.material,{transparent:n,thickness:l,color:e,opacity:t,size:w,screenspace:r,toneMapped:a,polygonOffset:i,polygonOffsetFactor:o,clippingPlanes:m,clipping:m&&m.length>0})}}),p.useEffect(()=>()=>{let e=g.current;if(!e)return;let t=e.children[0];t&&(d&&t.geometry.dispose(),e.remove(t))},[]),p.createElement("group",(0,c.a)({ref:g},x))}var x=n("Njew"),g=n("oeGO"),b=n("Qgfj"),y=n("Wf1j"),w=n("oyxz"),S=n("KwmQ"),M=n("iLdV"),E=n("sKwe"),_=n("LP6J"),A=n("A8Th"),j=n("sszc");let k=j.b.max+.45,L=j.b.max+.72,z=Math.PI/18,P=Math.PI-.16,C=(e,t,n)=>{let r=document.createElement("span");r.style.color=`var(${t})`,r.style.position="absolute",r.style.visibility="hidden",e.appendChild(r);let a=window.getComputedStyle(r).color||n;return r.remove(),a},N=e=>{let{boundary:t,color:n,innerBoundary:r,opacity:a}=e,i=(0,p.useMemo)(()=>{let e,n;return e=r?[...t,...r].map(j.m):[[0,0,0],...t].map(j.m),(n=new u.A).setAttribute("position",new u.ub(e.flat(),3)),n.setIndex(Array.from({length:Math.max(0,t.length-1)},(e,n)=>r?[n,n+1,t.length+n,n+1,t.length+n+1,t.length+n]:[0,n+1,n+2]).flat()),n.computeVertexNormals(),n},[t,r]);return(0,p.useLayoutEffect)(()=>()=>i.dispose(),[i]),(0,s.jsx)("mesh",{geometry:i,renderOrder:1,children:(0,s.jsx)("meshBasicMaterial",{color:n,transparent:!0,opacity:a,side:2,depthWrite:!1})})},B=e=>{let{color:t,opacity:n=1,points:r,width:a=1.6}=e;return(0,s.jsx)(l.a,{color:t,depthWrite:!1,lineWidth:a,opacity:n,points:r.map(j.m),transparent:n<1})},R=()=>(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(d.a,{center:!0,position:[L,0,0],children:(0,s.jsx)("span",{className:"text-token-text-secondary text-xs",children:"x"})}),(0,s.jsx)(d.a,{center:!0,position:[0,0,L],children:(0,s.jsx)("span",{className:"text-token-text-secondary text-xs",children:"y"})}),(0,s.jsx)(d.a,{center:!0,position:[0,L,0],children:(0,s.jsx)("span",{className:"text-token-text-secondary text-xs",children:"z"})})]}),T=e=>{let{colors:t,isThumbnail:n,values:r}=e,{pStart:a,p:i,phiStart:o,phi:l,thetaStart:d,theta:c}=r,u=l-o,f=c-d,m=(0,p.useMemo)(()=>(0,j.f)(i,o,l,d),[i,o,l,d]),h=(0,p.useMemo)(()=>(0,j.f)(i,o,l,c),[i,o,l,c]),x=(0,p.useMemo)(()=>(0,j.f)(a,o,l,d),[a,o,l,d]),g=(0,p.useMemo)(()=>(0,j.f)(a,o,l,c),[a,o,l,c]),b=(0,p.useMemo)(()=>(0,j.e)(i,o,d,c),[i,o,d,c]),y=(0,p.useMemo)(()=>(0,j.e)(i,l,d,c),[i,l,d,c]),w=(0,p.useMemo)(()=>(0,j.e)(a,o,d,c),[a,o,d,c]),S=(0,p.useMemo)(()=>(0,j.e)(a,l,d,c),[a,l,d,c]),M=(0,p.useMemo)(()=>(0,j.g)(j.b.max,"equatorial"),[]),E=(0,p.useMemo)(()=>(0,j.g)(j.b.max,"meridian"),[]),_=i-a>1e-6&&u>1e-6&&f>1e-6,A=a>1e-6,L=f<j.d.max-1e-6,z=o>j.a.controlMin+1e-6,P=l<j.a.max-1e-6;return(0,s.jsxs)("group",{children:[!n&&(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(B,{color:t.secondary,opacity:.22,points:[[-k,0,0],[k,0,0]],width:1}),(0,s.jsx)(B,{color:t.secondary,opacity:.22,points:[[0,-k,0],[0,k,0]],width:1}),(0,s.jsx)(B,{color:t.secondary,opacity:.22,points:[[0,0,-k],[0,0,k]],width:1}),(0,s.jsx)(B,{color:t.secondary,opacity:.14,points:M,width:1}),(0,s.jsx)(B,{color:t.secondary,opacity:.14,points:E,width:1}),(0,s.jsx)(R,{})]}),_&&(0,s.jsxs)("mesh",{renderOrder:2,children:[(0,s.jsx)("sphereGeometry",{args:[i,64,40,(0,j.h)(c),f,o,u]}),(0,s.jsx)("meshBasicMaterial",{color:t.primary,transparent:!0,opacity:.25,side:2,depthWrite:!1}),(0,s.jsx)(v,{angle:0,color:t.primary,opacity:.34,renderOrder:3,thickness:.8,transparent:!0})]}),_&&A&&(0,s.jsxs)("mesh",{renderOrder:2,children:[(0,s.jsx)("sphereGeometry",{args:[a,64,40,(0,j.h)(c),f,o,u]}),(0,s.jsx)("meshBasicMaterial",{color:t.companion,transparent:!0,opacity:.2,side:2,depthWrite:!1}),(0,s.jsx)(v,{angle:0,color:t.companion,opacity:.24,renderOrder:3,thickness:.65,transparent:!0})]}),_&&L&&(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(N,{boundary:m,color:t.companion,innerBoundary:A?x:void 0,opacity:.14}),(0,s.jsx)(N,{boundary:h,color:t.companion,innerBoundary:A?g:void 0,opacity:.2})]}),_&&z&&(0,s.jsx)(N,{boundary:b,color:t.accent,innerBoundary:A?w:void 0,opacity:.13}),_&&P&&(0,s.jsx)(N,{boundary:y,color:t.accent,innerBoundary:A?S:void 0,opacity:.18}),_&&L&&(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(B,{color:t.primary,opacity:.3,points:m,width:1}),(0,s.jsx)(B,{color:t.primary,opacity:.3,points:h,width:1})]}),_&&z&&(0,s.jsx)(B,{color:t.primary,opacity:.3,points:b,width:1}),_&&P&&(0,s.jsx)(B,{color:t.primary,opacity:.3,points:y,width:1})]})},I=(0,b.f)({sphere:{id:"learningBlock.sphericalCoordinates.shapeSphere",defaultMessage:"Sphere"},cone:{id:"learningBlock.sphericalCoordinates.shapeCone",defaultMessage:"Cone"},donut:{id:"learningBlock.sphericalCoordinates.shapeDonut",defaultMessage:"Donut"}}),U=(0,b.f)({radialStart:{id:"learningBlock.sphericalCoordinates.radialLowerBound",defaultMessage:"Radial lower bound a"},radialEnd:{id:"learningBlock.sphericalCoordinates.radialUpperBound",defaultMessage:"Radial upper bound b"},polarStart:{id:"learningBlock.sphericalCoordinates.polarLowerBound",defaultMessage:"Polar-angle lower bound a"},polarEnd:{id:"learningBlock.sphericalCoordinates.polarUpperBound",defaultMessage:"Polar-angle upper bound b"},azimuthalStart:{id:"learningBlock.sphericalCoordinates.azimuthalLowerBound",defaultMessage:"Azimuthal-angle lower bound a"},azimuthalEnd:{id:"learningBlock.sphericalCoordinates.azimuthalUpperBound",defaultMessage:"Azimuthal-angle upper bound b"}}),D=(0,b.f)({value:{id:"learningBlock.sphericalCoordinates.angularValuePluralized",defaultMessage:"{quantity, plural, one {{multiple} pi radian} other {{multiple} pi radians}}"}}),O=(e,t)=>e.formatMessage(D.value,{quantity:t/Math.PI,multiple:(0,A.c)(e,t/Math.PI)}),W=e=>{let{values:t,setValues:n}=e,r=(0,y.a)(),a=(0,j.l)(t),i=(0,_.c)(r),o=r.formatMessage({id:"learningBlock.sphericalCoordinates.shapeSelector",defaultMessage:"Spherical-coordinate shape"}),l=r.formatMessage(U.radialStart),d=r.formatMessage(U.radialEnd),c=r.formatMessage(U.polarStart),u=r.formatMessage(U.polarEnd),p=r.formatMessage(U.azimuthalStart),f=r.formatMessage(U.azimuthalEnd),m=(0,M.b)(j.c.map((e,t)=>({value:t,label:r.formatMessage(I[e])}))),h=function(e,t,r){let[a,i]=r,o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:1,s=i*o;n(n=>({...n,[e]:s>1e-6?a*o/s:0,[t]:s}),"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")};return(0,s.jsx)(S.c,{screenReaderContent:(0,s.jsx)(w.a,{id:"learningBlock.sphericalCoordinates.controlsDescription",defaultMessage:"Choose a sphere, cone, or donut preset, then adjust the a and b handles to set each radial, polar-angle, and azimuthal-angle interval."}),children:(0,s.jsx)(E.a,{inputs:[{ariaLabel:o,min:0,max:j.c.length-1,step:1,value:j.c.indexOf(a.shape),options:m,onChange:e=>{let t=j.c[e];t&&n((0,j.j)(t),"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")}},{...i,variable:"p",min:j.b.controlMin,max:j.b.max,step:j.b.step,value:a.p,ariaLabel:d,ariaValueText:(0,A.c)(r,a.p),onChange:e=>h("radialInnerFraction","p",[Math.min(a.pStart,e),e]),range:{values:[a.pStart,a.p],ariaLabels:[l,d],ariaValueTexts:[(0,A.c)(r,a.pStart),(0,A.c)(r,a.p)],displayValues:[(0,A.c)(r,a.pStart),(0,A.c)(r,a.p)],onChange:e=>h("radialInnerFraction","p",e)}},{...i,variable:"\\phi",min:j.a.controlMin/Math.PI,max:j.a.max/Math.PI,step:j.a.sliderStep,value:a.phi/Math.PI,ariaLabel:u,ariaValueText:O(r,a.phi),onChange:e=>h("polarLowerFraction","phi",[Math.min(a.phiStart/Math.PI,e),e],Math.PI),range:{values:[a.phiStart/Math.PI,a.phi/Math.PI],ariaLabels:[c,u],ariaValueTexts:[O(r,a.phiStart),O(r,a.phi)],displayValues:[(0,A.b)(r,a.phiStart),(0,A.b)(r,a.phi)],onChange:e=>h("polarLowerFraction","phi",e,Math.PI)}},{...i,variable:"\\theta",min:j.d.controlMin/Math.PI,max:j.d.max/Math.PI,step:j.d.sliderStep,value:a.theta/Math.PI,ariaLabel:f,ariaValueText:O(r,a.theta),onChange:e=>h("azimuthalLowerFraction","theta",[Math.min(a.thetaStart/Math.PI,e),e],Math.PI),range:{values:[a.thetaStart/Math.PI,a.theta/Math.PI],ariaLabels:[p,f],ariaValueTexts:[O(r,a.thetaStart),O(r,a.theta)],displayValues:[(0,A.b)(r,a.thetaStart),(0,A.b)(r,a.theta)],onChange:e=>h("azimuthalLowerFraction","theta",e,Math.PI)}}]})})},F=e=>{let{values:t,presentationMode:n}=e,r=(0,y.a)(),a=(0,p.useRef)(null),i=(0,p.useRef)(null),o=(e=>{let[t,n]=(0,p.useState)(null);return(0,p.useLayoutEffect)(()=>{let t=e.current;if(!t)return;let r=()=>{let e=window.getComputedStyle(t).color,r={accent:C(t,"--learning-block-accent",e),companion:C(t,"--learning-block-color-companion",e),primary:C(t,"--learning-block-color-primary",e),secondary:C(t,"--text-secondary",e)};n(e=>e?.accent===r.accent&&e.companion===r.companion&&e.primary===r.primary&&e.secondary===r.secondary?e:r)};if(r(),"u"<typeof MutationObserver)return;let a=new MutationObserver(r),i={attributes:!0,attributeFilter:["class","style","data-theme","data-accent"]};return a.observe(document.documentElement,i),document.body&&a.observe(document.body,i),a.observe(t,i),()=>a.disconnect()},[e]),t})(a),l=(0,j.l)(t),d="thumbnail"===n,c=r.formatMessage({id:"learningBlock.sphericalCoordinates.regionDescriptionWithLocalizedAngles",defaultMessage:"{shape} with radial bounds {radiusStart} to {radiusEnd}, polar-angle bounds {polarStart} to {polarEnd}, and azimuthal-angle bounds {azimuthStart} to {azimuthEnd}. The transverse azimuthal radius is {transverseRadius}, equal to radial distance times the sine of the polar angle."},{shape:r.formatMessage(I[l.shape]),radiusStart:(0,A.c)(r,l.pStart),radiusEnd:(0,A.c)(r,l.p),polarStart:O(r,l.phiStart),polarEnd:O(r,l.phi),azimuthStart:O(r,l.thetaStart),azimuthEnd:O(r,l.theta),transverseRadius:(0,A.c)(r,(0,j.i)(l.p,Math.min(Math.max(Math.PI/2,l.phiStart),l.phi)))}),u=r.formatMessage({id:"learningBlock.sphericalCoordinates.keyboardCameraControls",defaultMessage:"Use the arrow keys to rotate the three-dimensional view"});return(0,s.jsx)("div",{ref:a,"aria-description":d?void 0:u,"aria-keyshortcuts":d?void 0:"ArrowLeft ArrowRight ArrowUp ArrowDown","aria-label":c,className:`text-token-text-primary relative w-full overflow-hidden ${d?"h-full":"h-[252px]"}`,onKeyDown:d?void 0:e=>{let t=i.current;if(t){switch(e.key){case"ArrowLeft":t.setAzimuthalAngle(t.getAzimuthalAngle()+z);break;case"ArrowRight":t.setAzimuthalAngle(t.getAzimuthalAngle()-z);break;case"ArrowUp":t.setPolarAngle(Math.max(.16,t.getPolarAngle()-z));break;case"ArrowDown":t.setPolarAngle(Math.min(P,t.getPolarAngle()+z));break;default:return}e.preventDefault(),t.update()}},role:"img",tabIndex:d?void 0:0,children:o&&(0,s.jsxs)(g.a,{"data-learning-block-pan":d?void 0:"both","aria-hidden":!0,camera:{fov:d?45:47,position:[12,9,12]},dpr:[1,1.5],frameloop:"demand",gl:{alpha:!0,antialias:!0},style:{height:"100%",touchAction:d?"auto":"none",width:"100%"},children:[(0,s.jsx)(T,{colors:o,isThumbnail:d,values:l}),!d&&(0,s.jsx)(x.a,{ref:i,enableDamping:!1,enablePan:!1,enableZoom:!1,maxPolarAngle:P,minPolarAngle:.16})]})})}}};