export const __rspack_esm_ids=[249107];export const __webpack_modules__={Ipng(e,t,n){let r,a;n.d(t,{a:()=>P});var i=n("unhp"),o=n("zd8w"),s=n("PVZC"),l=n("hPwS");let d=new s.v,u=new s.Xd;class c extends s.Kb{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new s.ub([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new s.ub([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new s.Lb(t,6,1);return this.setAttribute("instanceStart",new s.Rb(n,3,0)),this.setAttribute("instanceEnd",new s.Rb(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let r=new s.Lb(n,2*t,1);return this.setAttribute("instanceColorStart",new s.Rb(r,t,0)),this.setAttribute("instanceColorEnd",new s.Rb(r,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new s.fe(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new s.v);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),d.setFromBufferAttribute(t),this.boundingBox.union(d))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new s.td),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let a=0,i=e.count;a<i;a++)u.fromBufferAttribute(e,a),r=Math.max(r,n.distanceToSquared(u)),u.fromBufferAttribute(t,a),r=Math.max(r,n.distanceToSquared(u));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var f=n("STXV");let p=parseInt("179".replace(/\D+/g,""));class m extends s.jd{constructor(e){super({type:"LineMaterial",uniforms:s.Vd.clone(s.Vd.merge([f.UniformsLib.common,f.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new s.Wd(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
					#include <${p>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let h=p>=125?"uv1":"uv2",v=new s.Yd,g=new s.Xd,x=new s.Xd,b=new s.Yd,y=new s.Yd,w=new s.Yd,S=new s.Xd,M=new s.sc,E=new s.ac,L=new s.Xd,j=new s.v,A=new s.td,k=new s.Yd;function z(e,t,n){return k.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),k.multiplyScalar(1/k.w),k.x=a/n.width,k.y=a/n.height,k.applyMatrix4(e.projectionMatrixInverse),k.multiplyScalar(1/k.w),Math.abs(Math.max(k.x,k.y))}class _ extends s.tc{constructor(e=new c,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,a=0,i=t.count;e<i;e++,a+=2)g.fromBufferAttribute(t,e),x.fromBufferAttribute(n,e),r[a]=0===a?0:r[a-1],r[a+1]=r[a]+g.distanceTo(x);let a=new s.Lb(r,2,1);return e.setAttribute("instanceDistanceStart",new s.Rb(a,1,0)),e.setAttribute("instanceDistanceEnd",new s.Rb(a,1,1)),this}raycast(e,t){let n,i,o=this.material.worldUnits,l=e.camera;null!==l||o||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let d=void 0!==e.params.Line2&&e.params.Line2.threshold||0;r=e.ray;let u=this.matrixWorld,c=this.geometry,f=this.material;if(a=f.linewidth+d,null===c.boundingSphere&&c.computeBoundingSphere(),A.copy(c.boundingSphere).applyMatrix4(u),o)n=.5*a;else{let e=Math.max(l.near,A.distanceToPoint(r.origin));n=z(l,e,f.resolution)}if(A.radius+=n,!1!==r.intersectsSphere(A)){if(null===c.boundingBox&&c.computeBoundingBox(),j.copy(c.boundingBox).applyMatrix4(u),o)i=.5*a;else{let e=Math.max(l.near,j.distanceToPoint(r.origin));i=z(l,e,f.resolution)}j.expandByScalar(i),!1!==r.intersectsBox(j)&&(o?function(e,t){let n=e.matrixWorld,i=e.geometry,o=i.attributes.instanceStart,l=i.attributes.instanceEnd,d=Math.min(i.instanceCount,o.count);for(let i=0;i<d;i++){E.start.fromBufferAttribute(o,i),E.end.fromBufferAttribute(l,i),E.applyMatrix4(n);let d=new s.Xd,u=new s.Xd;r.distanceSqToSegment(E.start,E.end,u,d),u.distanceTo(d)<.5*a&&t.push({point:u,pointOnLine:d,distance:r.origin.distanceTo(u),object:e,face:null,faceIndex:i,uv:null,[h]:null})}}(this,t):function(e,t,n){let i=t.projectionMatrix,o=e.material.resolution,l=e.matrixWorld,d=e.geometry,u=d.attributes.instanceStart,c=d.attributes.instanceEnd,f=Math.min(d.instanceCount,u.count),p=-t.near;r.at(1,w),w.w=1,w.applyMatrix4(t.matrixWorldInverse),w.applyMatrix4(i),w.multiplyScalar(1/w.w),w.x*=o.x/2,w.y*=o.y/2,w.z=0,S.copy(w),M.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<f;t++){if(b.fromBufferAttribute(u,t),y.fromBufferAttribute(c,t),b.w=1,y.w=1,b.applyMatrix4(M),y.applyMatrix4(M),b.z>p&&y.z>p)continue;if(b.z>p){let e=b.z-y.z,t=(b.z-p)/e;b.lerp(y,t)}else if(y.z>p){let e=y.z-b.z,t=(y.z-p)/e;y.lerp(b,t)}b.applyMatrix4(i),y.applyMatrix4(i),b.multiplyScalar(1/b.w),y.multiplyScalar(1/y.w),b.x*=o.x/2,b.y*=o.y/2,y.x*=o.x/2,y.y*=o.y/2,E.start.copy(b),E.start.z=0,E.end.copy(y),E.end.z=0;let d=E.closestPointToPointParameter(S,!0);E.at(d,L);let f=s.pc.lerp(b.z,y.z,d),m=f>=-1&&f<=1,v=S.distanceTo(L)<.5*a;if(m&&v){E.start.fromBufferAttribute(u,t),E.end.fromBufferAttribute(c,t),E.start.applyMatrix4(l),E.end.applyMatrix4(l);let a=new s.Xd,i=new s.Xd;r.distanceSqToSegment(E.start,E.end,i,a),n.push({point:i,pointOnLine:a,distance:r.origin.distanceTo(i),object:e,face:null,faceIndex:t,uv:null,[h]:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(v),this.material.uniforms.resolution.value.set(v.z,v.w))}}class C extends c{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,r=new Float32Array(2*n);if(3===t)for(let a=0;a<n;a+=t)r[2*a]=e[a],r[2*a+1]=e[a+1],r[2*a+2]=e[a+2],r[2*a+3]=e[a+3],r[2*a+4]=e[a+4],r[2*a+5]=e[a+5];else for(let a=0;a<n;a+=t)r[2*a]=e[a],r[2*a+1]=e[a+1],r[2*a+2]=e[a+2],r[2*a+3]=e[a+3],r[2*a+4]=e[a+4],r[2*a+5]=e[a+5],r[2*a+6]=e[a+6],r[2*a+7]=e[a+7];return super.setColors(r,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class B extends _{constructor(e=new C,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let P=o.forwardRef(function({points:e,color:t=0xffffff,vertexColors:n,linewidth:r,lineWidth:a,segments:d,dashed:u,...f},p){var h,v;let g=(0,l.C)(e=>e.size),x=o.useMemo(()=>d?new _:new B,[d]),[b]=o.useState(()=>new m),y=(null==n||null==(h=n[0])?void 0:h.length)===4?4:3,w=o.useMemo(()=>{let r=d?new c:new C,a=e.map(e=>{let t=Array.isArray(e);return e instanceof s.Xd||e instanceof s.Yd?[e.x,e.y,e.z]:e instanceof s.Wd?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(r.setPositions(a.flat()),n){t=0xffffff;let e=n.map(e=>e instanceof s.K?e.toArray():e);r.setColors(e.flat(),y)}return r},[e,d,n,y]);return o.useLayoutEffect(()=>{x.computeLineDistances()},[e,x]),o.useLayoutEffect(()=>{u?b.defines.USE_DASH="":delete b.defines.USE_DASH,b.needsUpdate=!0},[u,b]),o.useEffect(()=>()=>{w.dispose(),b.dispose()},[w]),o.createElement("primitive",(0,i.a)({object:x,ref:p},f),o.createElement("primitive",{object:w,attach:"geometry"}),o.createElement("primitive",(0,i.a)({object:b,attach:"material",color:t,vertexColors:!!n,resolution:[g.width,g.height],linewidth:null!=(v=null!=r?r:a)?v:1,dashed:u,transparent:4===y},f)))})},mevF(e,t,n){let r,a;var i=n("unhp"),o=n("zd8w"),s=n("CE87"),l=n("PVZC"),d=n("hPwS");let u=new l.Xd,c=new l.Xd,f=new l.Xd,p=new l.Wd;function m(e,t,n){let r=u.setFromMatrixPosition(e.matrixWorld);r.project(t);let a=n.width/2,i=n.height/2;return[r.x*a+a,-(r.y*i)+i]}let h=e=>1e-10>Math.abs(e)?0:e;function v(e,t,n=""){let r="matrix3d(";for(let n=0;16!==n;n++)r+=h(t[n]*e.elements[n])+(15!==n?",":")");return n+r}let g=(r=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>v(e,r)),x=(a=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>v(e,a(t),"translate(-50%,-50%)")),b=o.forwardRef(({children:e,eps:t=.001,style:n,className:r,prepend:a,center:v,fullscreen:b,portal:y,distanceFactor:w,sprite:S=!1,transform:M=!1,occlude:E,onOcclude:L,castShadow:j,receiveShadow:A,material:k,geometry:z,zIndexRange:_=[0x1000037,0],calculatePosition:C=m,as:B="div",wrapperClass:P,pointerEvents:N="auto",...U},R)=>{let{gl:O,camera:D,scene:T,size:W,raycaster:I,events:F,viewport:H}=(0,d.C)(),[V]=o.useState(()=>document.createElement(B)),$=o.useRef(null),G=o.useRef(null),X=o.useRef(0),K=o.useRef([0,0]),Y=o.useRef(null),Z=o.useRef(null),q=(null==y?void 0:y.current)||F.connected||O.domElement.parentNode,J=o.useRef(null),Q=o.useRef(!1),ee=o.useMemo(()=>{var e;return E&&"blending"!==E||Array.isArray(E)&&E.length&&(e=E[0])&&"object"==typeof e&&"current"in e},[E]);o.useLayoutEffect(()=>{let e=O.domElement;E&&"blending"===E?(e.style.zIndex=`${Math.floor(_[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[E]),o.useLayoutEffect(()=>{if(G.current){let e=$.current=s.createRoot(V);if(T.updateMatrixWorld(),M)V.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=C(G.current,D,W);V.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return q&&(a?q.prepend(V):q.appendChild(V)),()=>{q&&q.removeChild(V),e.unmount()}}},[q,M]),o.useLayoutEffect(()=>{P&&(V.className=P)},[P]);let et=o.useMemo(()=>M?{position:"absolute",top:0,left:0,width:W.width,height:W.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:v?"translate3d(-50%,-50%,0)":"none",...b&&{top:-W.height/2,left:-W.width/2,width:W.width,height:W.height},...n},[n,v,b,W,M]),en=o.useMemo(()=>({position:"absolute",pointerEvents:N}),[N]);o.useLayoutEffect(()=>{var t,a;Q.current=!1,M?null==(t=$.current)||t.render(o.createElement("div",{ref:Y,style:et},o.createElement("div",{ref:Z,style:en},o.createElement("div",{ref:R,className:r,style:n,children:e})))):null==(a=$.current)||a.render(o.createElement("div",{ref:R,style:et,className:r,children:e}))});let er=o.useRef(!0);(0,d.D)(e=>{if(G.current){D.updateMatrixWorld(),G.current.updateWorldMatrix(!0,!1);let e=M?K.current:C(G.current,D,W);if(M||Math.abs(X.current-D.zoom)>t||Math.abs(K.current[0]-e[0])>t||Math.abs(K.current[1]-e[1])>t){var n;let t,r,a,i,o=(n=G.current,t=u.setFromMatrixPosition(n.matrixWorld),r=c.setFromMatrixPosition(D.matrixWorld),a=t.sub(r),i=D.getWorldDirection(f),a.angleTo(i)>Math.PI/2),s=!1;ee&&(Array.isArray(E)?s=E.map(e=>e.current):"blending"!==E&&(s=[T]));let d=er.current;s?er.current=function(e,t,n,r){let a=u.setFromMatrixPosition(e.matrixWorld),i=a.clone();i.project(t),p.set(i.x,i.y),n.setFromCamera(p,t);let o=n.intersectObjects(r,!0);if(o.length){let e=o[0].distance;return a.distanceTo(n.ray.origin)<e}return!0}(G.current,D,I,s)&&!o:er.current=!o,d!==er.current&&(L?L(!er.current):V.style.display=er.current?"block":"none");let m=Math.floor(_[0]/2),v=E?ee?[_[0],m]:[m-1,0]:_;if(V.style.zIndex=`${function(e,t,n){if(t instanceof l.Kc||t instanceof l.Ic){let r=u.setFromMatrixPosition(e.matrixWorld),a=c.setFromMatrixPosition(t.matrixWorld),i=r.distanceTo(a),o=(n[1]-n[0])/(t.far-t.near),s=n[1]-o*t.far;return Math.round(o*i+s)}}(G.current,D,v)}`,M){let[e,t]=[W.width/2,W.height/2],n=D.projectionMatrix.elements[5]*t,{isOrthographicCamera:r,top:a,left:i,bottom:o,right:s}=D,l=g(D.matrixWorldInverse),d=r?`scale(${n})translate(${h(-(s+i)/2)}px,${h((a+o)/2)}px)`:`translateZ(${n}px)`,u=G.current.matrixWorld;S&&((u=D.matrixWorldInverse.clone().transpose().copyPosition(u).scale(G.current.scale)).elements[3]=u.elements[7]=u.elements[11]=0,u.elements[15]=1),V.style.width=W.width+"px",V.style.height=W.height+"px",V.style.perspective=r?"":`${n}px`,Y.current&&Z.current&&(Y.current.style.transform=`${d}${l}translate(${e}px,${t}px)`,Z.current.style.transform=x(u,1/((w||10)/400)))}else{let t=void 0===w?1:function(e,t){if(t instanceof l.Ic)return t.zoom;if(!(t instanceof l.Kc))return 1;{let n=u.setFromMatrixPosition(e.matrixWorld),r=c.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*n.distanceTo(r))}}(G.current,D)*w;V.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}K.current=e,X.current=D.zoom}}if(!ee&&J.current&&!Q.current)if(M){if(Y.current){let e=Y.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=D;if(t||z)U.scale&&(Array.isArray(U.scale)?U.scale instanceof l.Xd?J.current.scale.copy(U.scale.clone().divideScalar(1)):J.current.scale.set(1/U.scale[0],1/U.scale[1],1/U.scale[2]):J.current.scale.setScalar(1/U.scale));else{let t=(w||10)/400,n=e.clientWidth*t,r=e.clientHeight*t;J.current.scale.set(n,r,1)}Q.current=!0}}}else{let t=V.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/H.factor,n=t.clientWidth*e,r=t.clientHeight*e;J.current.scale.set(n,r,1),Q.current=!0}J.current.lookAt(e.camera.position)}});let ea=o.useMemo(()=>({vertexShader:M?void 0:`
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
      `}),[M]);return o.createElement("group",(0,i.a)({},U,{ref:G}),E&&!ee&&o.createElement("mesh",{castShadow:j,receiveShadow:A,ref:J},z||o.createElement("planeGeometry",null),k||o.createElement("shaderMaterial",{side:2,vertexShader:ea.vertexShader,fragmentShader:ea.fragmentShader})))});n.d(t,{},{a:b})},Zva3(e,t,n){var r=n("ABep"),a=n("Ipng"),i=n("mevF"),o=n("Njew"),s=n("oeGO"),l=n("zd8w"),d=n("Qgfj"),u=n("Wf1j"),c=n("oyxz"),f=n("PVZC"),p=n("KwmQ"),m=n("iLdV"),h=n("sKwe"),v=n("LP6J"),g=n("SfwA"),x=n("b6Ou");let b=Math.PI/12,y=x.b.max+.45,w=x.b.max+.72,S=x.f.max+.45,M=x.f.max+.72,E=(0,d.f)({cylinder:{id:"learningBlock.cylindricalCoordinates.cylinderOption",defaultMessage:"Cylinder"},sector:{id:"learningBlock.cylindricalCoordinates.sectorOption",defaultMessage:"Sector"},"cylindrical-shell":{id:"learningBlock.cylindricalCoordinates.shellOption",defaultMessage:"Shell"},shapeAriaLabel:{id:"learningBlock.cylindricalCoordinates.shapeAriaLabel",defaultMessage:"Cylindrical-coordinate shape preset"},radialLowerBound:{id:"learningBlock.cylindricalCoordinates.radialLowerBound",defaultMessage:"Radial lower bound r"},radialUpperBound:{id:"learningBlock.cylindricalCoordinates.radialUpperBound",defaultMessage:"Radial upper bound r"},angularLowerBound:{id:"learningBlock.cylindricalCoordinates.angularLowerBound",defaultMessage:"Azimuthal-angle lower bound theta"},angularUpperBound:{id:"learningBlock.cylindricalCoordinates.angularUpperBound",defaultMessage:"Azimuthal-angle upper bound theta"},heightLowerBound:{id:"learningBlock.cylindricalCoordinates.heightLowerBound",defaultMessage:"Height lower bound z"},heightUpperBound:{id:"learningBlock.cylindricalCoordinates.heightUpperBound",defaultMessage:"Height upper bound z"},angularValue:{id:"learningBlock.cylindricalCoordinates.angularValue",defaultMessage:"{multiple, plural, one {# pi radian} other {# pi radians}}"},cameraInstructions:{id:"learningBlock.cylindricalCoordinates.cameraInstructions",defaultMessage:"Use the arrow keys to rotate the three-dimensional region"}}),L=(e,t,n)=>{let r=document.createElement("span");r.style.color=`var(${t})`,r.style.position="absolute",r.style.visibility="hidden",e.appendChild(r);let a=window.getComputedStyle(r).color||n;return r.remove(),a},j=e=>{let{boundary:t,color:n,opacity:a,oppositeBoundary:i}=e,o=(0,l.useMemo)(()=>{let e,n;return e=[...t,...i].map(x.m),(n=new f.A).setAttribute("position",new f.ub(e.flat(),3)),n.setIndex(Array.from({length:Math.max(0,t.length-1)},(e,n)=>[n,n+1,t.length+n,n+1,t.length+n+1,t.length+n]).flat()),n.computeVertexNormals(),n},[t,i]);return(0,l.useLayoutEffect)(()=>()=>o.dispose(),[o]),(0,r.jsx)("mesh",{geometry:o,renderOrder:1,children:(0,r.jsx)("meshBasicMaterial",{color:n,depthWrite:!1,opacity:a,side:2,transparent:!0})})},A=e=>{let{color:t,opacity:n=1,points:i,width:o=1.6}=e;return(0,r.jsx)(a.a,{color:t,depthWrite:!1,lineWidth:o,opacity:n,points:i.map(x.m),transparent:n<1})},k=()=>(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(i.a,{center:!0,position:[w,0,0],children:(0,r.jsx)("span",{className:"text-token-text-secondary text-xs",children:"x"})}),(0,r.jsx)(i.a,{center:!0,position:[0,0,w],children:(0,r.jsx)("span",{className:"text-token-text-secondary text-xs",children:"y"})}),(0,r.jsx)(i.a,{center:!0,position:[0,M,0],children:(0,r.jsx)("span",{className:"text-token-text-secondary text-xs",children:"z"})})]}),z=e=>{let{colors:t,isThumbnail:n,values:a}=e,{rStart:i,r:o,thetaStart:s,theta:d,zStart:u,z:c}=a,f=(0,l.useMemo)(()=>(0,x.h)(o,s,d,u),[o,s,d,u]),p=(0,l.useMemo)(()=>(0,x.h)(o,s,d,c),[o,s,d,c]),m=(0,l.useMemo)(()=>(0,x.h)(i,s,d,u),[i,s,d,u]),h=(0,l.useMemo)(()=>(0,x.h)(i,s,d,c),[i,s,d,c]),v=(0,l.useMemo)(()=>(0,x.h)(x.b.max,0,2*Math.PI,0),[]),g=(0,x.i)(o,s,u),b=(0,x.i)(o,s,c),w=(0,x.i)(o,d,u),M=(0,x.i)(o,d,c),E=(0,x.i)(i,s,u),L=(0,x.i)(i,s,c),z=(0,x.i)(i,d,u),_=(0,x.i)(i,d,c),C=d-s>1e-6,B=c-u>1e-6,P=o-i>1e-6&&C&&B,N=d-s<x.d.max-1e-6,U=i>1e-6;return(0,r.jsxs)("group",{children:[!n&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(A,{color:t.secondary,opacity:.22,points:[[-y,0,0],[y,0,0]],width:1}),(0,r.jsx)(A,{color:t.secondary,opacity:.22,points:[[0,-y,0],[0,y,0]],width:1}),(0,r.jsx)(A,{color:t.secondary,opacity:.22,points:[[0,0,-.45],[0,0,S]],width:1}),(0,r.jsx)(A,{color:t.secondary,opacity:.14,points:v,width:1}),(0,r.jsx)(k,{})]}),P&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(j,{boundary:f,color:t.primary,opacity:.23,oppositeBoundary:p}),(0,r.jsx)(j,{boundary:f,color:t.companion,opacity:.12,oppositeBoundary:m}),(0,r.jsx)(j,{boundary:p,color:t.accent,opacity:.16,oppositeBoundary:h})]}),P&&U&&(0,r.jsx)(j,{boundary:m,color:t.companion,opacity:.2,oppositeBoundary:h}),P&&N&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(j,{boundary:[g,b],color:t.companion,opacity:.13,oppositeBoundary:[E,L]}),(0,r.jsx)(j,{boundary:[w,M],color:t.companion,opacity:.2,oppositeBoundary:[z,_]})]}),o>1e-6&&C&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(A,{color:t.primary,points:f}),(0,r.jsx)(A,{color:t.accent,points:p,width:2})]}),U&&C&&(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(A,{color:t.companion,opacity:.75,points:m}),(0,r.jsx)(A,{color:t.companion,points:h})]})]})};n.d(t,{},{CylindricalCoordinatesControls:e=>{let{values:t,setValues:n}=e,a=(0,u.a)(),i=(0,x.l)(t),o=(0,v.c)(a),s=e=>a.formatMessage(E.angularValue,{multiple:e/Math.PI}),l=(0,m.b)(x.a.map((e,t)=>({label:a.formatMessage(E[e]),value:t}))),d="CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE",f=function(e,t,r){let a=arguments.length>3&&void 0!==arguments[3]?arguments[3]:1;return n(n=>(0,x.l)({...n,[e]:r[0]*a,[t]:r[1]*a}),d)};return(0,r.jsx)(p.c,{screenReaderContent:(0,r.jsx)(c.a,{id:"learningBlock.cylindricalCoordinates.controlsDescription",defaultMessage:"Choose a cylinder, sector, or shell preset, then adjust the lower and upper radial, azimuthal-angle, and height bounds."}),children:(0,r.jsx)(h.a,{inputs:[{ariaLabel:a.formatMessage(E.shapeAriaLabel),min:0,max:x.a.length-1,step:1,value:x.a.indexOf(i.shape),options:l,onChange:e=>{let t=x.a[e];t&&n((0,x.j)(t),d)}},{...o,min:x.c.min,max:x.b.max,step:x.b.step,value:i.r,variable:"r",ariaLabel:a.formatMessage(E.radialUpperBound),onChange:e=>f("rStart","r",[i.rStart,e]),range:{ariaLabels:[a.formatMessage(E.radialLowerBound),a.formatMessage(E.radialUpperBound)],ariaValueTexts:[(0,g.c)(a,i.rStart),(0,g.c)(a,i.r)],displayValues:[(0,g.c)(a,i.rStart),(0,g.c)(a,i.r)],onChange:e=>f("rStart","r",e),values:[i.rStart,i.r]}},{...o,min:x.e.min/Math.PI,max:x.d.max/Math.PI,step:x.d.sliderStep,value:i.theta/Math.PI,variable:"\\theta",ariaLabel:a.formatMessage(E.angularUpperBound),onChange:e=>f("thetaStart","theta",[i.thetaStart/Math.PI,e],Math.PI),range:{ariaLabels:[a.formatMessage(E.angularLowerBound),a.formatMessage(E.angularUpperBound)],ariaValueTexts:[s(i.thetaStart),s(i.theta)],displayValues:[(0,g.b)(a,i.thetaStart),(0,g.b)(a,i.theta)],onChange:e=>f("thetaStart","theta",e,Math.PI),values:[i.thetaStart/Math.PI,i.theta/Math.PI]}},{...o,min:x.g.min,max:x.f.max,step:x.f.step,value:i.z,variable:"z",ariaLabel:a.formatMessage(E.heightUpperBound),onChange:e=>f("zStart","z",[i.zStart,e]),range:{ariaLabels:[a.formatMessage(E.heightLowerBound),a.formatMessage(E.heightUpperBound)],ariaValueTexts:[(0,g.c)(a,i.zStart),(0,g.c)(a,i.z)],displayValues:[(0,g.c)(a,i.zStart),(0,g.c)(a,i.z)],onChange:e=>f("zStart","z",e),values:[i.zStart,i.z]}}]})})},CylindricalCoordinatesVisualization:e=>{let{values:t,presentationMode:n}=e,a=(0,u.a)(),i=(0,l.useRef)(null),d=(0,l.useRef)(null),c=(e=>{let[t,n]=(0,l.useState)(null);return(0,l.useLayoutEffect)(()=>{let t=e.current;if(!t)return;let r=()=>{let e=window.getComputedStyle(t).color,r={accent:L(t,"--learning-block-accent",e),companion:L(t,"--learning-block-color-companion",e),primary:L(t,"--learning-block-color-primary",e),secondary:L(t,"--text-secondary",e)};n(e=>e?.accent===r.accent&&e.companion===r.companion&&e.primary===r.primary&&e.secondary===r.secondary?e:r)};if(r(),"u"<typeof MutationObserver)return;let a=new MutationObserver(r),i={attributes:!0,attributeFilter:["class","style","data-theme","data-accent"]};return a.observe(document.documentElement,i),document.body&&a.observe(document.body,i),a.observe(t,i),()=>a.disconnect()},[e]),t})(i),f=(0,x.l)(t),p="thumbnail"===n,m=a.formatMessage({id:"learningBlock.cylindricalCoordinates.regionDescription",defaultMessage:"{shape} in cylindrical coordinates with radius from {radialStart} to {radialEnd}, azimuthal angle from {angularStart} to {angularEnd}, and height from {heightStart} to {heightEnd}."},{shape:a.formatMessage(E[f.shape]),radialStart:(0,g.c)(a,f.rStart),radialEnd:(0,g.c)(a,f.r),angularStart:a.formatMessage(E.angularValue,{multiple:f.thetaStart/Math.PI}),angularEnd:a.formatMessage(E.angularValue,{multiple:f.theta/Math.PI}),heightStart:(0,g.c)(a,f.zStart),heightEnd:(0,g.c)(a,f.z)});return(0,r.jsx)("div",{ref:i,"aria-description":p?void 0:a.formatMessage(E.cameraInstructions),"aria-label":m,className:`text-token-text-primary focus-visible:outline-token-border-heavy relative w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${p?"h-full":"h-[252px]"}`,onKeyDown:p?void 0:e=>{let t=d.current;if(t){switch(e.key){case"ArrowLeft":t.setAzimuthalAngle(t.getAzimuthalAngle()+b);break;case"ArrowRight":t.setAzimuthalAngle(t.getAzimuthalAngle()-b);break;case"ArrowUp":t.setPolarAngle(t.getPolarAngle()-b);break;case"ArrowDown":t.setPolarAngle(t.getPolarAngle()+b);break;default:return}e.preventDefault()}},role:"img",tabIndex:p?void 0:0,children:c&&(0,r.jsxs)(s.a,{"data-learning-block-pan":p?void 0:"both","aria-hidden":!0,camera:{fov:p?43:45,position:[12,9,12]},dpr:[1,1.5],frameloop:"demand",gl:{alpha:!0,antialias:!0},style:{height:"100%",touchAction:p?"auto":"none",width:"100%"},children:[(0,r.jsx)(z,{colors:c,isThumbnail:p,values:f}),!p&&(0,r.jsx)(o.a,{ref:d,enableDamping:!1,enablePan:!1,enableZoom:!1,maxPolarAngle:Math.PI-.16,minPolarAngle:.16,target:[0,x.f.max/2,0]})]})})}})},sKwe(e,t,n){var r=n("ABep"),a=n("on57"),i=n("zd8w"),o=n("iLdV");let s=e=>e?e.replace(/\\mid/g,"|").replace(/\\neg/g,"¬").replace(/\\cap/g,"∩").replace(/\\cup/g,"∪").replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\mathrm\{([^}]*)\}/g,"$1").replace(/\\[a-zA-Z]+/g,"").replace(/[{}_^]/g,"").replace(/\s+/g," ").trim().length:0,l=e=>{let t=e.formatValueForInput??o.c,n=Math.max((0,o.d)(e.min,e.step,t).length,(0,o.d)(e.max,e.step,t).length),r=e.inlineUnit?e.unit?.length??0:0;return e.range?2*n+2:n+r};n.d(t,{},{a:e=>{let{inputs:t}=e,n=(0,i.useRef)(null),[d,u]=(0,i.useState)(),c=t.some(e=>e.before),f=t.filter(e=>!e.options&&!1!==e.showValueInput),p=Math.max(0,...t.map(e=>s(e.variable))),m=Math.max(0,...f.map(l)),h=Math.max(0,...f.map(e=>s(e.inlineUnit?void 0:e.unit))),v=t.map(e=>e.variable??"").join("\0");return(0,i.useLayoutEffect)(()=>{let e=n.current;if(!e)return;let t=Array.from(e.querySelectorAll("[data-input-selector-variable]"));if(0===t.length)return;let r=()=>{let n=t.filter(e=>"stacked"!==e.dataset.inputSelectorLabelLayout),r=n.length?Math.max(...n.map(t=>{let n=t.cloneNode(!0);n.removeAttribute("data-input-selector-variable"),Object.assign(n.style,{inset:"0 auto auto 0",maxWidth:"none",position:"absolute",visibility:"hidden",whiteSpace:"nowrap",width:"max-content"}),e.appendChild(n);let r=n.getBoundingClientRect().width;return n.remove(),r})):void 0;u(e=>e===r?e:r)};if(r(),"u"<typeof ResizeObserver)return;let a=new ResizeObserver(r);t.forEach(e=>a.observe(e));let i=new MutationObserver(r);return t.forEach(e=>i.observe(e,{attributeFilter:["data-input-selector-label-layout"]})),()=>{a.disconnect(),i.disconnect()}},[v]),(0,r.jsx)("div",{ref:n,"data-input-selector-group":!0,className:"grid min-h-fit min-w-0 shrink grow-0 gap-y-3",children:t.map((e,t)=>(0,r.jsxs)("div",{className:(0,a.b)("grid h-full min-w-0 items-center gap-x-2",c?"grid-cols-[auto_minmax(0,1fr)]":"grid-cols-[minmax(0,1fr)]"),children:[c?e.before??(0,r.jsx)("div",{"aria-hidden":!0}):null,(0,r.jsx)(o.a,{...e,groupVariableWidthCh:p,groupVariableWidthPx:d,groupUnitWidthCh:h,groupValueWidthCh:m})]},t))})},b:function(e,t,n,r){var a;let{before:i,disabled:o,displayValue:s,editType:l="CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE",formatValueForInput:d,inlineUnit:u,parseInputValue:c,mapValue:f,options:p,optionLabelFormat:m,showValueInput:h,sliderStyle:v,ariaLabel:g,ariaValueText:x,onActiveChange:b,value:y,variable:w,variableBold:S,variableFormat:M,unit:E}=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{};return{before:i,disabled:o,displayValue:s,options:p,optionLabelFormat:m,showValueInput:h,sliderStyle:v,inlineUnit:u,ariaLabel:g,ariaValueText:x,variable:w??t.variable??(a=String(e),a.match(/[A-Za-z]/)?.[0]??a),variableBold:S??t.variableBold,variableFormat:M??t.variableFormat,unit:E??t.unit,formatValueForInput:d,parseInputValue:c,max:t.max,min:t.min,step:t.step,value:y??Number(n[e]),onActiveChange:b,onChange:(t,n)=>{let a=f?f(t):t;r(t=>({...t,[e]:a}),"function"==typeof l?l(n):l)}}}})},iLdV(e,t,n){var r=n("ABep"),a=n("YAOF"),i=n("on57"),o=n("zd8w"),s=n("Wf1j"),l=n("l7Go"),d=n("jYuH"),u=n("evpU");let c=(e,t,n)=>Math.min(Math.max(e,t),n),f=/[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?/i,p=(e,t,n,r)=>{if(!Number.isFinite(e))return t;let a=Math.round((c(e,t,n)-t)/r),i=(0,d.c)(r);return c((0,d.h)(t+a*r,Math.max(1,i)),t,n)},m=(e,t)=>Number.isFinite(e)?e.toFixed(Math.max(1,(0,d.c)(t))):"",h=(e,t,n)=>{let r=n(e,t);return r.match(f)?.[0]??r},v=e=>{let t=[],n=e.parentElement;for(;n;)"visible"!==window.getComputedStyle(n).overflowY&&t.push(n),n=n.parentElement;return t},g=(0,o.createContext)({isNativeSlider:!1}),x=()=>(0,r.jsx)("svg",{"aria-hidden":!0,className:"h-4 w-4 flex-none",fill:"none",viewBox:"0 0 16 16",children:(0,r.jsx)("path",{d:"m5 6 3-3 3 3M5 10l3 3 3-3",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"1.5"})});n.d(t,{},{a:e=>{let t,{min:n,max:d,step:c,value:b,displayValue:y,onChange:w,onActiveChange:S,disabled:M,options:E,optionLabelFormat:L="text",sliderStyle:j="continuous",ariaLabel:A,ariaValueText:k,variable:z,variableBold:_,variableFormat:C,inlineUnit:B,unit:P,formatValueForInput:N=m,parseInputValue:U,normalizeCommittedValue:R,minSliderWidthPx:O,showValueInput:D=!0,range:T,valueClassName:W,groupVariableWidthCh:I,groupVariableWidthPx:F,groupUnitWidthCh:H,groupValueWidthCh:V}=e,{isNativeSlider:$,onSliderInteractionEnd:G,onSliderInteractionStart:X}=(0,o.useContext)(g),K=(0,s.a)(),Y=U??Number.parseFloat,Z=p(b,n,d,c),q=Number.isFinite(y)?y:Z,[J,Q]=(0,o.useState)(()=>h(q,c,N)),[ee,et]=(0,o.useState)(!1),en=(0,o.useRef)(!1),er=(0,o.useRef)(!1),ea=(0,o.useRef)(!1),ei=(0,o.useRef)(null),eo=(0,o.useRef)(null),es=(0,o.useRef)(null),el=(0,o.useRef)(null),ed=(0,o.useRef)(null),eu=(0,o.useRef)(null),ec=(0,o.useRef)(null),ef=(0,o.useRef)(null),ep=(0,o.useRef)(!1),[em,eh]=(0,o.useState)(!1),[ev,eg]=(0,o.useState)(!1),[ex,eb]=(0,o.useState)(!1),[ey,ew]=(0,o.useState)($?"above":"below"),eS=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"blur";"blur"===e&&ea.current||er.current&&(er.current=!1,S?.(!1),G?.())},eM=()=>{er.current||(er.current=!0,S?.(!0),X?.(z))},eE=()=>{ea.current=!0,eM()};(0,o.useEffect)(()=>{let e=()=>{ea.current=!1,eS("pointer-end")};return window.addEventListener("pointerup",e),window.addEventListener("pointercancel",e),()=>{window.removeEventListener("pointerup",e),window.removeEventListener("pointercancel",e)}},[S,G]),(0,o.useLayoutEffect)(()=>{let e=ed.current,t=eu.current;if(!E||!e||!t)return void eh(!1);let n=()=>{let n=e.clientWidth,r=t.scrollWidth>n+1;eh(e=>e===r?e:r)};n();let r="u"<typeof document?void 0:document.fonts;if(r?.addEventListener("loadingdone",n),"u"<typeof ResizeObserver)return()=>r?.removeEventListener("loadingdone",n);let a=new ResizeObserver(n);return a.observe(e),a.observe(t),()=>{r?.removeEventListener("loadingdone",n),a.disconnect()}},[E,L]),(0,o.useEffect)(()=>{let e=e=>{"Escape"===e.key&&ep.current&&(ep.current=!1,e.preventDefault(),e.stopPropagation())};return document.addEventListener("keyup",e,!0),()=>document.removeEventListener("keyup",e,!0)},[]),(0,o.useEffect)(()=>{if(!ex)return;ep.current=!1;let e=e=>{let t=e.target;!(t instanceof Node)||ec.current?.contains(t)||ef.current?.contains(t)||eb(!1)},t=e=>{"Escape"===e.key&&(ep.current=!0,e.preventDefault(),e.stopPropagation(),eb(!1),ef.current?.focus())};return document.addEventListener("pointerdown",e),document.addEventListener("keydown",t,!0),()=>{document.removeEventListener("pointerdown",e),document.removeEventListener("keydown",t,!0)}},[ex]),(0,o.useEffect)(()=>{(!em||M)&&eb(!1)},[M,em]),(0,o.useLayoutEffect)(()=>{if(!ex)return void ew($?"above":"below");let e=ec.current,t=ef.current;if(!e||!t)return;let n=()=>{ew((e=>{let{boundary:t,menuHeight:n,trigger:r}=e,a=t.bottom-r.bottom-4;if(n<=a)return"below";let i=r.top-t.top-4;return n<=i||i>a?"above":"below"})({boundary:(e=>{let{clippingAncestors:t,viewport:n}=e;return t.reduce((e,t)=>({bottom:Math.min(e.bottom,t.bottom),top:Math.max(e.top,t.top)}),n)})({clippingAncestors:v(t).map(e=>e.getBoundingClientRect()),viewport:{bottom:window.innerHeight,top:0}}),menuHeight:e.getBoundingClientRect().height,trigger:t.getBoundingClientRect()}))};if(n(),window.addEventListener("resize",n),"u"<typeof ResizeObserver)return()=>window.removeEventListener("resize",n);let r=new ResizeObserver(n);return r.observe(e),r.observe(t),v(t).forEach(e=>r.observe(e)),()=>{window.removeEventListener("resize",n),r.disconnect()}},[ex,$]);let eL=ee?J:h(q,c,N),ej=Math.max(h(n,c,N).length,h(d,c,N).length),eA=T?(t=T.displayValues??T.ariaValueTexts??[h(T.values[0],c,N),h(T.values[1],c,N)],`(${t[0]}, ${t[1]})`):void 0,ek=T?2*ej+2:ej,ez=V??ek,e_=O??96,eC=_??!1,eB=z?z.replace(/[^\w-]+/g,"_"):"input-selector-value",eP=A??(z?K.formatMessage({id:"learningBlock.inputSelector.valueAriaLabel",defaultMessage:"{label} value"},{label:z}):void 0),eN=!!z&&"text"!==C&&(!!("katex"===C||/\\/.test(z))||/^[A-Za-zθμσλπΔ](?:[_^][A-Za-z0-9{}]+)?$/.test(z)),eU=E?.find(e=>p(e.value,n,d,c)===Z)??E?.[0],eR=em?K.formatMessage({id:"learningBlock.inputSelector.overflowMenuAriaLabel",defaultMessage:"{value}. Show all {label} options"},{label:eP??K.formatMessage({id:"learningBlock.inputSelector.selectorAriaLabel",defaultMessage:"selector"}),value:eU?.ariaLabel??eU?.label??""}):void 0,eO=(0,o.useId)(),eD=(e,t)=>"katex"!==t?e:(0,r.jsx)(l.a,{className:"katex",latex:e}),eT=e=>p(e.value,n,d,c),eW=E?.find(e=>eT(e)===Z)??E?.[0],eI=e=>{let t=Y(e);if(!Number.isFinite(t))return void Q(h(q,c,N));let r=((e,t)=>{let{max:n,min:r,normalizeCommittedValue:a,step:i}=t;return a?a(e):p(e,r,n,i)})(t,{min:n,max:d,step:c,normalizeCommittedValue:R});w(r,"input"),Q(h(r,c,N))},eF=z?(0,r.jsx)("div",{"data-input-selector-variable":!0,"data-input-selector-label-layout":ev?"stacked":"inline",className:(0,i.b)("text-token-text-primary min-w-0 max-w-full justify-self-start text-sm leading-5 whitespace-normal hyphens-auto [overflow-wrap:anywhere] [&_.katex]:!text-[1em]",eC&&"font-medium"),children:eN?(0,r.jsx)(l.a,{className:"katex",latex:z??""}):z}):null,eH=!!(B&&P&&!T),eV=P&&!eH?(0,r.jsx)("div",{ref:el,className:"text-token-text-secondary shrink-0 text-xs leading-4 whitespace-nowrap [&_.katex]:text-inherit",children:P}):null,e$=!!V,eG=`minmax(max(${ez}ch,2rem), max(${ez}ch,2rem))`,eX=!!H,eK=`minmax(${H??0}ch, ${H??0}ch)`,eY=!E&&eX?eV??(0,r.jsx)("div",{ref:el,"aria-hidden":!0}):null,eZ=F?`${F}px`:I?`${I}ch`:null,eq=eZ?`minmax(0, min(${eZ}, 40%))`:"fit-content(40%)";(0,o.useLayoutEffect)(()=>{let e=ei.current,t=eo.current;if(E||!e||!t)return void eg(!1);let n=()=>{let n=e.clientWidth;if(0===n)return;let r=(e=>{let{availableWidth:t,labelWidth:n,minSliderWidthPx:r=96,unitWidth:a,valueWidth:i}=e,o=2+Number(i>0)+Number(a>0);return n+i+a+(o-1)*12+r>t+1})({availableWidth:n,labelWidth:Math.max(t.scrollWidth,F??0),minSliderWidthPx:e_,unitWidth:el.current?.clientWidth??0,valueWidth:es.current?.clientWidth??0});eg(e=>e===r?e:r)};n();let r="u"<typeof document?void 0:document.fonts;if(r?.addEventListener("loadingdone",n),"u"<typeof ResizeObserver)return()=>r?.removeEventListener("loadingdone",n);let a=new ResizeObserver(n);return a.observe(e),a.observe(t),es.current&&a.observe(es.current),el.current&&a.observe(el.current),()=>{r?.removeEventListener("loadingdone",n),a.disconnect()}},[H,V,F,E,e_,z,D,P]);let eJ=e=>ec.current?.querySelectorAll("[data-input-selector-discrete-menu-option]").item(e).focus();(0,o.useEffect)(()=>{ex&&E&&eJ(Math.max(E.findIndex(e=>eT(e)===Z),0))},[ex,E,Z]);let eQ=E?(0,r.jsx)("div",{role:"radiogroup","aria-label":eP,className:(0,i.b)("flex h-6 w-full min-w-0 flex-nowrap gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-black/7 p-0.5 dark:bg-white/6",M&&"opacity-40"),children:E.map(e=>{let t=eT(e),n=t===Z;return(0,r.jsx)("button",{type:"button",role:"radio","aria-checked":n,"aria-label":e.ariaLabel,disabled:M,className:(0,i.b)("text-token-text-secondary flex h-5 min-w-max flex-1 items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",n&&"bg-token-bg-primary !text-token-text-primary shadow-sm dark:bg-white dark:!text-black",!n&&!M&&"hover:text-token-text-primary focus-visible:text-token-text-primary",!M&&"focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"),onClick:()=>w(t,"input"),children:(0,r.jsx)("span",{className:"min-w-6",children:eD(e.label,L)})},e.value)})}):null,e0=E?(0,r.jsxs)("div",{"data-input-selector-discrete-rail":!0,className:(0,i.b)("relative h-6 w-full min-w-0",em&&"flex justify-end"),children:[em&&eW?(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)("button",{type:"button","aria-controls":eO,"aria-expanded":ex,"aria-haspopup":"listbox","aria-label":eR,disabled:M,"data-input-selector-discrete-menu-trigger":!0,ref:ef,className:(0,i.b)("text-token-text-primary flex h-6 max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-full px-2 text-[15px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",!M&&"hover:bg-black/5 focus-visible:bg-black/7 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/7 dark:focus-visible:bg-white/10"),onClick:()=>eb(e=>!e),children:[(0,r.jsx)("span",{className:"min-w-0 truncate",children:eD(eW.label,L)}),(0,r.jsx)(x,{})]}),ex?(0,r.jsx)("div",{ref:ec,"aria-label":eP,className:(0,i.b)("border-token-border-default bg-token-bg-primary text-token-text-primary absolute end-0 z-50 flex min-w-max flex-col gap-0.5 overflow-hidden rounded-lg border p-1 shadow-lg","above"===ey?"bottom-full mb-1":"top-full mt-1"),id:eO,role:"listbox",children:E.map((e,t)=>{let n=eT(e),a=n===Z;return(0,r.jsx)("button",{type:"button","aria-selected":a,"data-input-selector-discrete-menu-option":!0,role:"option",className:(0,i.b)("flex min-w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-start text-[15px] leading-5 whitespace-nowrap outline-none [&_.katex]:!text-[1em]",a&&"bg-black/7 font-medium dark:bg-white/10",!a&&"hover:bg-black/7 focus-visible:bg-black/7 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"),onClick:()=>{w(n,"input"),eb(!1),ef.current?.focus()},onKeyDown:e=>((e,t)=>{if(E)switch(e.key){case"ArrowDown":e.preventDefault(),eJ((t+1)%E.length);break;case"ArrowUp":e.preventDefault(),eJ((t-1+E.length)%E.length);break;case"Home":e.preventDefault(),eJ(0);break;case"End":e.preventDefault(),eJ(E.length-1)}})(e,t),children:eD(e.label,L)},e.value)})}):null]}):eQ,(0,r.jsx)("div",{ref:eu,"aria-hidden":!0,"data-input-selector-overflow-measure":!0,className:"pointer-events-none absolute inset-x-0 top-0 h-6 overflow-hidden opacity-0",children:(0,r.jsx)("div",{className:"flex h-6 w-max min-w-max gap-0.5 p-0.5",children:E.map(e=>(0,r.jsx)("span",{className:"flex h-5 min-w-max flex-none items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap [&_.katex]:!text-[1em]",children:(0,r.jsx)("span",{className:"min-w-6",children:eD(e.label,L)})},e.value))})})]}):null,e1=z&&!E&&D&&(0,r.jsxs)("div",{ref:es,className:(0,i.b)("text-token-text-primary grid h-5 min-w-8 grid-rows-1 rounded-md px-1.5 text-end text-[11px] leading-none whitespace-nowrap after:invisible after:font-mono after:whitespace-pre after:content-[attr(data-value)] after:[grid-area:1/1]",eH?"grid-cols-[minmax(0,1fr)_auto] gap-x-0.5":"grid-cols-1",T&&(ev?"text-end":"text-start"),W,!M&&!T&&"transition-colors focus-within:bg-black/7 hover:bg-black/5 dark:focus-within:bg-white/10 dark:hover:bg-white/7"),"data-value":"0".repeat(ez),children:[T?(0,r.jsx)("span",{"data-input-selector-range-value":!0,className:(0,i.b)("relative flex h-full items-center tabular-nums [grid-area:1/1]",ev?"justify-end":"justify-start"),children:eA}):(0,r.jsx)("input",{"aria-label":eP,className:"relative h-full min-w-[4ch] border-none bg-transparent p-0 text-end text-[11px] leading-none whitespace-nowrap shadow-[none] outline-none [grid-area:1/1] focus:outline-none",disabled:M,inputMode:"decimal",name:eB,size:1,type:"text",value:eL,onBlur:()=>{if(en.current){en.current=!1;return}et(!1),eI(J)},onChange:e=>{var t;let n;return Q(U?e.currentTarget.value:""===(n=(t=e.currentTarget.value).trim())||"-"===n||"."===n?t:n.match(f)?.[0]??t)},onFocus:()=>{et(!0),Q(h(q,c,N))},onKeyDown:e=>{if("Enter"===e.key){e.preventDefault(),en.current=!0,et(!1),eI(J),e.currentTarget.blur();return}"Escape"===e.key&&(e.preventDefault(),en.current=!0,et(!1),Q(h(Z,c,N)),e.currentTarget.blur())}}),eH?(0,r.jsx)("span",{"aria-hidden":!0,className:"text-token-text-secondary self-center text-xs leading-4",children:P}):null]}),e2=[];ev?(z&&e2.push("minmax(0, 1fr)"),e1&&e2.push(eG),eY&&e2.push(eK)):(z&&e2.push(eq),e1&&e2.push(eG),eY&&e2.push(eK),e2.push("minmax(0, 1fr)"));let e3=[],e4=e$&&!!z,e5=eX&&!!z;z&&e3.push(eq),e4&&e3.push(eG),e5&&e3.push(eK),e3.push("minmax(0, 1fr)");let e6=`${e3.length} / ${e3.length+1}`,e7=z?"2 / -1":"1 / -1",e8=Number.isFinite(n)&&Number.isFinite(d)&&Number.isFinite(c)&&c>0&&d>=n?Math.max(0,Math.round((d-n)/c)):0,e9=Math.min(e8+1,12),te="stepped"===j&&e8>0?Array.from({length:e9},(e,t)=>t):[],tt="stepped"===j?"h-6 w-6":"h-5 w-5",tn="relative flex h-6 w-full min-w-0 flex-1 items-center rounded-full bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.06)]",tr=te.length>0?(0,r.jsx)("div",{"aria-hidden":!0,"data-input-selector-rendered-marker-count":te.length,className:"pointer-events-none absolute inset-x-4 top-1/2 z-0 flex -translate-y-1/2 justify-between",children:te.map(e=>(0,r.jsx)("span",{"data-input-selector-step-marker":!0,className:"h-[3px] w-[3px] rounded-full bg-black/20 dark:bg-white/20"},e))}):null,ta=$&&!T?(0,r.jsxs)("div",{"data-input-selector-slider":!0,"data-input-selector-slider-style":j,className:(0,i.b)(tn,M&&"opacity-40"),children:[tr,(0,r.jsx)("input",{"aria-label":eP,"aria-valuetext":k,type:"range","data-learning-block-pan":M?void 0:"horizontal",className:(0,i.b)(u.a.inputSelector,"stepped"===j&&u.a.inputSelectorStepped,"text-token-text-primary relative z-10 flex w-full min-w-0 flex-1 items-center"),disabled:M,max:d,min:n,step:c,value:Z,onBlur:()=>eS("blur"),onChange:e=>{eM(),w(p(e.currentTarget.valueAsNumber,n,d,c),"slider")},onPointerDown:eE})]}):(0,r.jsxs)(a.b,{"data-input-selector-slider":!0,"data-input-selector-slider-style":j,"data-learning-block-pan":M?void 0:"horizontal",className:(0,i.b)(tn,"touch-pan-y",M&&"opacity-40"),disabled:M,max:d,min:n,onBlurCapture:()=>eS("blur"),onPointerDownCapture:eE,step:c,value:T?T.values.map(e=>p(e,n,d,c)):[Z],onValueChange:e=>{(eM(),T)?T.onChange([p(e[0],n,d,c),p(e[1],n,d,c)]):w(p(e[0],n,d,c),"slider")},children:[(0,r.jsx)(a.d,{className:"absolute inset-0 rounded-full",children:(0,r.jsx)(a.a,{className:"absolute inset-y-0 rounded-full bg-transparent"})}),tr,(0,r.jsx)(a.c,{"aria-label":T?.ariaLabels[0]??eP,"aria-valuetext":T?.ariaValueTexts?.[0]??k,className:(0,i.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative cursor-pointer rounded-full border shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt,T?"flex items-center justify-center text-black":"block"),children:T?.thumbLabels?.[0]&&(0,r.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:T.thumbLabels[0]})}),T&&(0,r.jsx)(a.c,{"aria-label":T.ariaLabels[1],"aria-valuetext":T.ariaValueTexts?.[1],className:(0,i.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative flex cursor-pointer items-center justify-center rounded-full border text-black shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt),children:T.thumbLabels?.[1]&&(0,r.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:T.thumbLabels[1]})})]});return E?(0,r.jsxs)("div",{className:"grid h-full min-w-0 items-center gap-x-3",style:{gridTemplateColumns:e3.join(" ")},children:[eF,!em&&e4?(0,r.jsx)("div",{"aria-hidden":!0}):null,!em&&e5?(0,r.jsx)("div",{"aria-hidden":!0}):null,(0,r.jsx)("div",{className:"h-full min-w-0",style:{gridColumn:em?e7:e6,gridRow:1},children:e0}),(0,r.jsx)("div",{ref:ed,"aria-hidden":!0,"data-input-selector-discrete-width-measure":!0,className:"pointer-events-none h-0 min-w-0 opacity-0",style:{gridColumn:e6,gridRow:1}})]}):(0,r.jsxs)("div",{ref:ei,className:(0,i.b)("relative grid min-w-0 items-center gap-x-3",T&&"text-[11px]",ev&&"gap-y-2"),style:{gridTemplateColumns:e2.join(" ")},children:[eF,e1,eY,(0,r.jsx)("div",{className:"min-w-0",style:ev?{gridColumn:"1 / -1"}:void 0,children:ta}),z?(0,r.jsx)("div",{ref:eo,"aria-hidden":!0,"data-input-selector-label-measure":!0,className:(0,i.b)("pointer-events-none absolute inset-0 h-0 w-max max-w-none overflow-hidden text-sm leading-5 whitespace-nowrap opacity-0 [&_.katex]:!text-[1em]",eC&&"font-medium"),children:eN?(0,r.jsx)(l.a,{className:"katex",latex:z??""}):z}):null]})},b:e=>e,c:m,d:h})}};