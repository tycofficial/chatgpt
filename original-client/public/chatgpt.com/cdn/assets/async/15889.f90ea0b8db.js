export const __rspack_esm_ids=[15889];export const __webpack_modules__={Ipng(e,t,n){let r,i;n.d(t,{a:()=>P});var a=n("unhp"),o=n("zd8w"),s=n("PVZC"),l=n("hPwS");let u=new s.v,d=new s.Xd;class c extends s.Kb{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new s.ub([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new s.ub([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new s.Lb(t,6,1);return this.setAttribute("instanceStart",new s.Rb(n,3,0)),this.setAttribute("instanceEnd",new s.Rb(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let r=new s.Lb(n,2*t,1);return this.setAttribute("instanceColorStart",new s.Rb(r,t,0)),this.setAttribute("instanceColorEnd",new s.Rb(r,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new s.fe(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new s.v);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),u.setFromBufferAttribute(t),this.boundingBox.union(u))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new s.td),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)d.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(d)),d.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(d));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var f=n("STXV");let p=parseInt("179".replace(/\D+/g,""));class m extends s.jd{constructor(e){super({type:"LineMaterial",uniforms:s.Vd.clone(s.Vd.merge([f.UniformsLib.common,f.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new s.Wd(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let h=p>=125?"uv1":"uv2",v=new s.Yd,x=new s.Xd,g=new s.Xd,b=new s.Yd,w=new s.Yd,y=new s.Yd,S=new s.Xd,E=new s.sc,M=new s.ac,L=new s.Xd,_=new s.v,j=new s.td,A=new s.Yd;function k(e,t,n){return A.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),A.multiplyScalar(1/A.w),A.x=i/n.width,A.y=i/n.height,A.applyMatrix4(e.projectionMatrixInverse),A.multiplyScalar(1/A.w),Math.abs(Math.max(A.x,A.y))}class z extends s.tc{constructor(e=new c,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)x.fromBufferAttribute(t,e),g.fromBufferAttribute(n,e),r[i]=0===i?0:r[i-1],r[i+1]=r[i]+x.distanceTo(g);let i=new s.Lb(r,2,1);return e.setAttribute("instanceDistanceStart",new s.Rb(i,1,0)),e.setAttribute("instanceDistanceEnd",new s.Rb(i,1,1)),this}raycast(e,t){let n,a,o=this.material.worldUnits,l=e.camera;null!==l||o||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let u=void 0!==e.params.Line2&&e.params.Line2.threshold||0;r=e.ray;let d=this.matrixWorld,c=this.geometry,f=this.material;if(i=f.linewidth+u,null===c.boundingSphere&&c.computeBoundingSphere(),j.copy(c.boundingSphere).applyMatrix4(d),o)n=.5*i;else{let e=Math.max(l.near,j.distanceToPoint(r.origin));n=k(l,e,f.resolution)}if(j.radius+=n,!1!==r.intersectsSphere(j)){if(null===c.boundingBox&&c.computeBoundingBox(),_.copy(c.boundingBox).applyMatrix4(d),o)a=.5*i;else{let e=Math.max(l.near,_.distanceToPoint(r.origin));a=k(l,e,f.resolution)}_.expandByScalar(a),!1!==r.intersectsBox(_)&&(o?function(e,t){let n=e.matrixWorld,a=e.geometry,o=a.attributes.instanceStart,l=a.attributes.instanceEnd,u=Math.min(a.instanceCount,o.count);for(let a=0;a<u;a++){M.start.fromBufferAttribute(o,a),M.end.fromBufferAttribute(l,a),M.applyMatrix4(n);let u=new s.Xd,d=new s.Xd;r.distanceSqToSegment(M.start,M.end,d,u),d.distanceTo(u)<.5*i&&t.push({point:d,pointOnLine:u,distance:r.origin.distanceTo(d),object:e,face:null,faceIndex:a,uv:null,[h]:null})}}(this,t):function(e,t,n){let a=t.projectionMatrix,o=e.material.resolution,l=e.matrixWorld,u=e.geometry,d=u.attributes.instanceStart,c=u.attributes.instanceEnd,f=Math.min(u.instanceCount,d.count),p=-t.near;r.at(1,y),y.w=1,y.applyMatrix4(t.matrixWorldInverse),y.applyMatrix4(a),y.multiplyScalar(1/y.w),y.x*=o.x/2,y.y*=o.y/2,y.z=0,S.copy(y),E.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<f;t++){if(b.fromBufferAttribute(d,t),w.fromBufferAttribute(c,t),b.w=1,w.w=1,b.applyMatrix4(E),w.applyMatrix4(E),b.z>p&&w.z>p)continue;if(b.z>p){let e=b.z-w.z,t=(b.z-p)/e;b.lerp(w,t)}else if(w.z>p){let e=w.z-b.z,t=(w.z-p)/e;w.lerp(b,t)}b.applyMatrix4(a),w.applyMatrix4(a),b.multiplyScalar(1/b.w),w.multiplyScalar(1/w.w),b.x*=o.x/2,b.y*=o.y/2,w.x*=o.x/2,w.y*=o.y/2,M.start.copy(b),M.start.z=0,M.end.copy(w),M.end.z=0;let u=M.closestPointToPointParameter(S,!0);M.at(u,L);let f=s.pc.lerp(b.z,w.z,u),m=f>=-1&&f<=1,v=S.distanceTo(L)<.5*i;if(m&&v){M.start.fromBufferAttribute(d,t),M.end.fromBufferAttribute(c,t),M.start.applyMatrix4(l),M.end.applyMatrix4(l);let i=new s.Xd,a=new s.Xd;r.distanceSqToSegment(M.start,M.end,a,i),n.push({point:a,pointOnLine:i,distance:r.origin.distanceTo(a),object:e,face:null,faceIndex:t,uv:null,[h]:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(v),this.material.uniforms.resolution.value.set(v.z,v.w))}}class C extends c{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,r=new Float32Array(2*n);if(3===t)for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5];else for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5],r[2*i+6]=e[i+6],r[2*i+7]=e[i+7];return super.setColors(r,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class N extends z{constructor(e=new C,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let P=o.forwardRef(function({points:e,color:t=0xffffff,vertexColors:n,linewidth:r,lineWidth:i,segments:u,dashed:d,...f},p){var h,v;let x=(0,l.C)(e=>e.size),g=o.useMemo(()=>u?new z:new N,[u]),[b]=o.useState(()=>new m),w=(null==n||null==(h=n[0])?void 0:h.length)===4?4:3,y=o.useMemo(()=>{let r=u?new c:new C,i=e.map(e=>{let t=Array.isArray(e);return e instanceof s.Xd||e instanceof s.Yd?[e.x,e.y,e.z]:e instanceof s.Wd?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(r.setPositions(i.flat()),n){t=0xffffff;let e=n.map(e=>e instanceof s.K?e.toArray():e);r.setColors(e.flat(),w)}return r},[e,u,n,w]);return o.useLayoutEffect(()=>{g.computeLineDistances()},[e,g]),o.useLayoutEffect(()=>{d?b.defines.USE_DASH="":delete b.defines.USE_DASH,b.needsUpdate=!0},[d,b]),o.useEffect(()=>()=>{y.dispose(),b.dispose()},[y]),o.createElement("primitive",(0,a.a)({object:g,ref:p},f),o.createElement("primitive",{object:y,attach:"geometry"}),o.createElement("primitive",(0,a.a)({object:b,attach:"material",color:t,vertexColors:!!n,resolution:[x.width,x.height],linewidth:null!=(v=null!=r?r:i)?v:1,dashed:d,transparent:4===w},f)))})},mevF(e,t,n){let r,i;var a=n("unhp"),o=n("zd8w"),s=n("CE87"),l=n("PVZC"),u=n("hPwS");let d=new l.Xd,c=new l.Xd,f=new l.Xd,p=new l.Wd;function m(e,t,n){let r=d.setFromMatrixPosition(e.matrixWorld);r.project(t);let i=n.width/2,a=n.height/2;return[r.x*i+i,-(r.y*a)+a]}let h=e=>1e-10>Math.abs(e)?0:e;function v(e,t,n=""){let r="matrix3d(";for(let n=0;16!==n;n++)r+=h(t[n]*e.elements[n])+(15!==n?",":")");return n+r}let x=(r=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>v(e,r)),g=(i=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>v(e,i(t),"translate(-50%,-50%)")),b=o.forwardRef(({children:e,eps:t=.001,style:n,className:r,prepend:i,center:v,fullscreen:b,portal:w,distanceFactor:y,sprite:S=!1,transform:E=!1,occlude:M,onOcclude:L,castShadow:_,receiveShadow:j,material:A,geometry:k,zIndexRange:z=[0x1000037,0],calculatePosition:C=m,as:N="div",wrapperClass:P,pointerEvents:R="auto",...U},B)=>{let{gl:T,camera:O,scene:D,size:W,raycaster:I,events:H,viewport:F}=(0,u.C)(),[$]=o.useState(()=>document.createElement(N)),V=o.useRef(null),G=o.useRef(null),q=o.useRef(0),X=o.useRef([0,0]),K=o.useRef(null),Y=o.useRef(null),Z=(null==w?void 0:w.current)||H.connected||T.domElement.parentNode,Q=o.useRef(null),J=o.useRef(!1),ee=o.useMemo(()=>{var e;return M&&"blending"!==M||Array.isArray(M)&&M.length&&(e=M[0])&&"object"==typeof e&&"current"in e},[M]);o.useLayoutEffect(()=>{let e=T.domElement;M&&"blending"===M?(e.style.zIndex=`${Math.floor(z[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[M]),o.useLayoutEffect(()=>{if(G.current){let e=V.current=s.createRoot($);if(D.updateMatrixWorld(),E)$.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=C(G.current,O,W);$.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return Z&&(i?Z.prepend($):Z.appendChild($)),()=>{Z&&Z.removeChild($),e.unmount()}}},[Z,E]),o.useLayoutEffect(()=>{P&&($.className=P)},[P]);let et=o.useMemo(()=>E?{position:"absolute",top:0,left:0,width:W.width,height:W.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:v?"translate3d(-50%,-50%,0)":"none",...b&&{top:-W.height/2,left:-W.width/2,width:W.width,height:W.height},...n},[n,v,b,W,E]),en=o.useMemo(()=>({position:"absolute",pointerEvents:R}),[R]);o.useLayoutEffect(()=>{var t,i;J.current=!1,E?null==(t=V.current)||t.render(o.createElement("div",{ref:K,style:et},o.createElement("div",{ref:Y,style:en},o.createElement("div",{ref:B,className:r,style:n,children:e})))):null==(i=V.current)||i.render(o.createElement("div",{ref:B,style:et,className:r,children:e}))});let er=o.useRef(!0);(0,u.D)(e=>{if(G.current){O.updateMatrixWorld(),G.current.updateWorldMatrix(!0,!1);let e=E?X.current:C(G.current,O,W);if(E||Math.abs(q.current-O.zoom)>t||Math.abs(X.current[0]-e[0])>t||Math.abs(X.current[1]-e[1])>t){var n;let t,r,i,a,o=(n=G.current,t=d.setFromMatrixPosition(n.matrixWorld),r=c.setFromMatrixPosition(O.matrixWorld),i=t.sub(r),a=O.getWorldDirection(f),i.angleTo(a)>Math.PI/2),s=!1;ee&&(Array.isArray(M)?s=M.map(e=>e.current):"blending"!==M&&(s=[D]));let u=er.current;s?er.current=function(e,t,n,r){let i=d.setFromMatrixPosition(e.matrixWorld),a=i.clone();a.project(t),p.set(a.x,a.y),n.setFromCamera(p,t);let o=n.intersectObjects(r,!0);if(o.length){let e=o[0].distance;return i.distanceTo(n.ray.origin)<e}return!0}(G.current,O,I,s)&&!o:er.current=!o,u!==er.current&&(L?L(!er.current):$.style.display=er.current?"block":"none");let m=Math.floor(z[0]/2),v=M?ee?[z[0],m]:[m-1,0]:z;if($.style.zIndex=`${function(e,t,n){if(t instanceof l.Kc||t instanceof l.Ic){let r=d.setFromMatrixPosition(e.matrixWorld),i=c.setFromMatrixPosition(t.matrixWorld),a=r.distanceTo(i),o=(n[1]-n[0])/(t.far-t.near),s=n[1]-o*t.far;return Math.round(o*a+s)}}(G.current,O,v)}`,E){let[e,t]=[W.width/2,W.height/2],n=O.projectionMatrix.elements[5]*t,{isOrthographicCamera:r,top:i,left:a,bottom:o,right:s}=O,l=x(O.matrixWorldInverse),u=r?`scale(${n})translate(${h(-(s+a)/2)}px,${h((i+o)/2)}px)`:`translateZ(${n}px)`,d=G.current.matrixWorld;S&&((d=O.matrixWorldInverse.clone().transpose().copyPosition(d).scale(G.current.scale)).elements[3]=d.elements[7]=d.elements[11]=0,d.elements[15]=1),$.style.width=W.width+"px",$.style.height=W.height+"px",$.style.perspective=r?"":`${n}px`,K.current&&Y.current&&(K.current.style.transform=`${u}${l}translate(${e}px,${t}px)`,Y.current.style.transform=g(d,1/((y||10)/400)))}else{let t=void 0===y?1:function(e,t){if(t instanceof l.Ic)return t.zoom;if(!(t instanceof l.Kc))return 1;{let n=d.setFromMatrixPosition(e.matrixWorld),r=c.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*n.distanceTo(r))}}(G.current,O)*y;$.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}X.current=e,q.current=O.zoom}}if(!ee&&Q.current&&!J.current)if(E){if(K.current){let e=K.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=O;if(t||k)U.scale&&(Array.isArray(U.scale)?U.scale instanceof l.Xd?Q.current.scale.copy(U.scale.clone().divideScalar(1)):Q.current.scale.set(1/U.scale[0],1/U.scale[1],1/U.scale[2]):Q.current.scale.setScalar(1/U.scale));else{let t=(y||10)/400,n=e.clientWidth*t,r=e.clientHeight*t;Q.current.scale.set(n,r,1)}J.current=!0}}}else{let t=$.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/F.factor,n=t.clientWidth*e,r=t.clientHeight*e;Q.current.scale.set(n,r,1),J.current=!0}Q.current.lookAt(e.camera.position)}});let ei=o.useMemo(()=>({vertexShader:E?void 0:`
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
      `}),[E]);return o.createElement("group",(0,a.a)({},U,{ref:G}),M&&!ee&&o.createElement("mesh",{castShadow:_,receiveShadow:j,ref:Q},k||o.createElement("planeGeometry",null),A||o.createElement("shaderMaterial",{side:2,vertexShader:ei.vertexShader,fragmentShader:ei.fragmentShader})))});n.d(t,{},{a:b})},xJmQ(e,t,n){var r=n("Qgfj"),i=n("tARr");let a=(0,r.f)({plus:{id:"learningBlock.accessibleMath.plus",defaultMessage:"{left} plus {right}"},minus:{id:"learningBlock.accessibleMath.minus",defaultMessage:"{left} minus {right}"},times:{id:"learningBlock.accessibleMath.times",defaultMessage:"{left} times {right}"},over:{id:"learningBlock.accessibleMath.over",defaultMessage:"{left} over {right}"},power:{id:"learningBlock.accessibleMath.power",defaultMessage:"{base} to the power of {exponent}"},squared:{id:"learningBlock.accessibleMath.squared",defaultMessage:"{value} squared"},cubed:{id:"learningBlock.accessibleMath.cubed",defaultMessage:"{value} cubed"},negative:{id:"learningBlock.accessibleMath.negative",defaultMessage:"negative {value}"},squareRoot:{id:"learningBlock.accessibleMath.squareRoot",defaultMessage:"square root of {value}"},function:{id:"learningBlock.accessibleMath.function",defaultMessage:"{functionName} of {value}"}}),o=/^(?:[a-z][a-z0-9]*|-?\d+(?:\.\d+)?)$/i;n.d(t,{},{a:(e,t)=>{let n=t.replaceAll("\\left","").replaceAll("\\right","").trim();if(o.test(n)){let t=Number(n);return Number.isFinite(t)?e.formatNumber(t,{maximumSignificantDigits:6}):n}let r=(0,i.b)(`z=${n}`);if(!r)return n.replace(/[{}\\]/g,"");let s=[];for(let t of r){if("number"===t.type){s.push({text:e.formatNumber(t.value,{maximumSignificantDigits:6,useGrouping:!1}),numericValue:t.value});continue}if("identifier"===t.type){s.push({text:t.value});continue}if("function"===t.type){let r=s.pop();if(!r)return n.replace(/[{}\\]/g,"");let i="sqrt"===t.value?a.squareRoot:"neg"===t.value?a.negative:a.function;s.push({text:e.formatMessage(i,{functionName:t.value,value:r.text})});continue}if("operator"!==t.type)continue;let r=s.pop(),i=s.pop();if(!i||!r)return n.replace(/[{}\\]/g,"");if("^"===t.value&&2===r.numericValue){s.push({text:e.formatMessage(a.squared,{value:i.text})});continue}if("^"===t.value&&3===r.numericValue){s.push({text:e.formatMessage(a.cubed,{value:i.text})});continue}let o="+"===t.value?a.plus:"-"===t.value?a.minus:"*"===t.value?a.times:"/"===t.value?a.over:a.power;s.push({text:e.formatMessage(o,{left:i.text,right:r.text,base:i.text,exponent:r.text})})}return 1===s.length?s[0].text:n.replace(/[{}\\]/g,"")}})},sKwe(e,t,n){var r=n("ABep"),i=n("on57"),a=n("zd8w"),o=n("iLdV");let s=e=>e?e.replace(/\\mid/g,"|").replace(/\\neg/g,"¬").replace(/\\cap/g,"∩").replace(/\\cup/g,"∪").replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\mathrm\{([^}]*)\}/g,"$1").replace(/\\[a-zA-Z]+/g,"").replace(/[{}_^]/g,"").replace(/\s+/g," ").trim().length:0,l=e=>{let t=e.formatValueForInput??o.c,n=Math.max((0,o.d)(e.min,e.step,t).length,(0,o.d)(e.max,e.step,t).length),r=e.inlineUnit?e.unit?.length??0:0;return e.range?2*n+2:n+r};n.d(t,{},{a:e=>{let{inputs:t}=e,n=(0,a.useRef)(null),[u,d]=(0,a.useState)(),c=t.some(e=>e.before),f=t.filter(e=>!e.options&&!1!==e.showValueInput),p=Math.max(0,...t.map(e=>s(e.variable))),m=Math.max(0,...f.map(l)),h=Math.max(0,...f.map(e=>s(e.inlineUnit?void 0:e.unit))),v=t.map(e=>e.variable??"").join("\0");return(0,a.useLayoutEffect)(()=>{let e=n.current;if(!e)return;let t=Array.from(e.querySelectorAll("[data-input-selector-variable]"));if(0===t.length)return;let r=()=>{let n=t.filter(e=>"stacked"!==e.dataset.inputSelectorLabelLayout),r=n.length?Math.max(...n.map(t=>{let n=t.cloneNode(!0);n.removeAttribute("data-input-selector-variable"),Object.assign(n.style,{inset:"0 auto auto 0",maxWidth:"none",position:"absolute",visibility:"hidden",whiteSpace:"nowrap",width:"max-content"}),e.appendChild(n);let r=n.getBoundingClientRect().width;return n.remove(),r})):void 0;d(e=>e===r?e:r)};if(r(),"u"<typeof ResizeObserver)return;let i=new ResizeObserver(r);t.forEach(e=>i.observe(e));let a=new MutationObserver(r);return t.forEach(e=>a.observe(e,{attributeFilter:["data-input-selector-label-layout"]})),()=>{i.disconnect(),a.disconnect()}},[v]),(0,r.jsx)("div",{ref:n,"data-input-selector-group":!0,className:"grid min-h-fit min-w-0 shrink grow-0 gap-y-3",children:t.map((e,t)=>(0,r.jsxs)("div",{className:(0,i.b)("grid h-full min-w-0 items-center gap-x-2",c?"grid-cols-[auto_minmax(0,1fr)]":"grid-cols-[minmax(0,1fr)]"),children:[c?e.before??(0,r.jsx)("div",{"aria-hidden":!0}):null,(0,r.jsx)(o.a,{...e,groupVariableWidthCh:p,groupVariableWidthPx:u,groupUnitWidthCh:h,groupValueWidthCh:m})]},t))})},b:function(e,t,n,r){var i;let{before:a,disabled:o,displayValue:s,editType:l="CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE",formatValueForInput:u,inlineUnit:d,parseInputValue:c,mapValue:f,options:p,optionLabelFormat:m,showValueInput:h,sliderStyle:v,ariaLabel:x,ariaValueText:g,onActiveChange:b,value:w,variable:y,variableBold:S,variableFormat:E,unit:M}=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{};return{before:a,disabled:o,displayValue:s,options:p,optionLabelFormat:m,showValueInput:h,sliderStyle:v,inlineUnit:d,ariaLabel:x,ariaValueText:g,variable:y??t.variable??(i=String(e),i.match(/[A-Za-z]/)?.[0]??i),variableBold:S??t.variableBold,variableFormat:E??t.variableFormat,unit:M??t.unit,formatValueForInput:u,parseInputValue:c,max:t.max,min:t.min,step:t.step,value:w??Number(n[e]),onActiveChange:b,onChange:(t,n)=>{let i=f?f(t):t;r(t=>({...t,[e]:i}),"function"==typeof l?l(n):l)}}}})},iLdV(e,t,n){var r=n("ABep"),i=n("YAOF"),a=n("on57"),o=n("zd8w"),s=n("Wf1j"),l=n("l7Go"),u=n("jYuH"),d=n("evpU");let c=(e,t,n)=>Math.min(Math.max(e,t),n),f=/[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?/i,p=(e,t,n,r)=>{if(!Number.isFinite(e))return t;let i=Math.round((c(e,t,n)-t)/r),a=(0,u.c)(r);return c((0,u.h)(t+i*r,Math.max(1,a)),t,n)},m=(e,t)=>Number.isFinite(e)?e.toFixed(Math.max(1,(0,u.c)(t))):"",h=(e,t,n)=>{let r=n(e,t);return r.match(f)?.[0]??r},v=e=>{let t=[],n=e.parentElement;for(;n;)"visible"!==window.getComputedStyle(n).overflowY&&t.push(n),n=n.parentElement;return t},x=(0,o.createContext)({isNativeSlider:!1}),g=()=>(0,r.jsx)("svg",{"aria-hidden":!0,className:"h-4 w-4 flex-none",fill:"none",viewBox:"0 0 16 16",children:(0,r.jsx)("path",{d:"m5 6 3-3 3 3M5 10l3 3 3-3",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"1.5"})});n.d(t,{},{a:e=>{let t,{min:n,max:u,step:c,value:b,displayValue:w,onChange:y,onActiveChange:S,disabled:E,options:M,optionLabelFormat:L="text",sliderStyle:_="continuous",ariaLabel:j,ariaValueText:A,variable:k,variableBold:z,variableFormat:C,inlineUnit:N,unit:P,formatValueForInput:R=m,parseInputValue:U,normalizeCommittedValue:B,minSliderWidthPx:T,showValueInput:O=!0,range:D,valueClassName:W,groupVariableWidthCh:I,groupVariableWidthPx:H,groupUnitWidthCh:F,groupValueWidthCh:$}=e,{isNativeSlider:V,onSliderInteractionEnd:G,onSliderInteractionStart:q}=(0,o.useContext)(x),X=(0,s.a)(),K=U??Number.parseFloat,Y=p(b,n,u,c),Z=Number.isFinite(w)?w:Y,[Q,J]=(0,o.useState)(()=>h(Z,c,R)),[ee,et]=(0,o.useState)(!1),en=(0,o.useRef)(!1),er=(0,o.useRef)(!1),ei=(0,o.useRef)(!1),ea=(0,o.useRef)(null),eo=(0,o.useRef)(null),es=(0,o.useRef)(null),el=(0,o.useRef)(null),eu=(0,o.useRef)(null),ed=(0,o.useRef)(null),ec=(0,o.useRef)(null),ef=(0,o.useRef)(null),ep=(0,o.useRef)(!1),[em,eh]=(0,o.useState)(!1),[ev,ex]=(0,o.useState)(!1),[eg,eb]=(0,o.useState)(!1),[ew,ey]=(0,o.useState)(V?"above":"below"),eS=function(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"blur";"blur"===e&&ei.current||er.current&&(er.current=!1,S?.(!1),G?.())},eE=()=>{er.current||(er.current=!0,S?.(!0),q?.(k))},eM=()=>{ei.current=!0,eE()};(0,o.useEffect)(()=>{let e=()=>{ei.current=!1,eS("pointer-end")};return window.addEventListener("pointerup",e),window.addEventListener("pointercancel",e),()=>{window.removeEventListener("pointerup",e),window.removeEventListener("pointercancel",e)}},[S,G]),(0,o.useLayoutEffect)(()=>{let e=eu.current,t=ed.current;if(!M||!e||!t)return void eh(!1);let n=()=>{let n=e.clientWidth,r=t.scrollWidth>n+1;eh(e=>e===r?e:r)};n();let r="u"<typeof document?void 0:document.fonts;if(r?.addEventListener("loadingdone",n),"u"<typeof ResizeObserver)return()=>r?.removeEventListener("loadingdone",n);let i=new ResizeObserver(n);return i.observe(e),i.observe(t),()=>{r?.removeEventListener("loadingdone",n),i.disconnect()}},[M,L]),(0,o.useEffect)(()=>{let e=e=>{"Escape"===e.key&&ep.current&&(ep.current=!1,e.preventDefault(),e.stopPropagation())};return document.addEventListener("keyup",e,!0),()=>document.removeEventListener("keyup",e,!0)},[]),(0,o.useEffect)(()=>{if(!eg)return;ep.current=!1;let e=e=>{let t=e.target;!(t instanceof Node)||ec.current?.contains(t)||ef.current?.contains(t)||eb(!1)},t=e=>{"Escape"===e.key&&(ep.current=!0,e.preventDefault(),e.stopPropagation(),eb(!1),ef.current?.focus())};return document.addEventListener("pointerdown",e),document.addEventListener("keydown",t,!0),()=>{document.removeEventListener("pointerdown",e),document.removeEventListener("keydown",t,!0)}},[eg]),(0,o.useEffect)(()=>{(!em||E)&&eb(!1)},[E,em]),(0,o.useLayoutEffect)(()=>{if(!eg)return void ey(V?"above":"below");let e=ec.current,t=ef.current;if(!e||!t)return;let n=()=>{ey((e=>{let{boundary:t,menuHeight:n,trigger:r}=e,i=t.bottom-r.bottom-4;if(n<=i)return"below";let a=r.top-t.top-4;return n<=a||a>i?"above":"below"})({boundary:(e=>{let{clippingAncestors:t,viewport:n}=e;return t.reduce((e,t)=>({bottom:Math.min(e.bottom,t.bottom),top:Math.max(e.top,t.top)}),n)})({clippingAncestors:v(t).map(e=>e.getBoundingClientRect()),viewport:{bottom:window.innerHeight,top:0}}),menuHeight:e.getBoundingClientRect().height,trigger:t.getBoundingClientRect()}))};if(n(),window.addEventListener("resize",n),"u"<typeof ResizeObserver)return()=>window.removeEventListener("resize",n);let r=new ResizeObserver(n);return r.observe(e),r.observe(t),v(t).forEach(e=>r.observe(e)),()=>{window.removeEventListener("resize",n),r.disconnect()}},[eg,V]);let eL=ee?Q:h(Z,c,R),e_=Math.max(h(n,c,R).length,h(u,c,R).length),ej=D?(t=D.displayValues??D.ariaValueTexts??[h(D.values[0],c,R),h(D.values[1],c,R)],`(${t[0]}, ${t[1]})`):void 0,eA=D?2*e_+2:e_,ek=$??eA,ez=T??96,eC=z??!1,eN=k?k.replace(/[^\w-]+/g,"_"):"input-selector-value",eP=j??(k?X.formatMessage({id:"learningBlock.inputSelector.valueAriaLabel",defaultMessage:"{label} value"},{label:k}):void 0),eR=!!k&&"text"!==C&&(!!("katex"===C||/\\/.test(k))||/^[A-Za-zθμσλπΔ](?:[_^][A-Za-z0-9{}]+)?$/.test(k)),eU=M?.find(e=>p(e.value,n,u,c)===Y)??M?.[0],eB=em?X.formatMessage({id:"learningBlock.inputSelector.overflowMenuAriaLabel",defaultMessage:"{value}. Show all {label} options"},{label:eP??X.formatMessage({id:"learningBlock.inputSelector.selectorAriaLabel",defaultMessage:"selector"}),value:eU?.ariaLabel??eU?.label??""}):void 0,eT=(0,o.useId)(),eO=(e,t)=>"katex"!==t?e:(0,r.jsx)(l.a,{className:"katex",latex:e}),eD=e=>p(e.value,n,u,c),eW=M?.find(e=>eD(e)===Y)??M?.[0],eI=e=>{let t=K(e);if(!Number.isFinite(t))return void J(h(Z,c,R));let r=((e,t)=>{let{max:n,min:r,normalizeCommittedValue:i,step:a}=t;return i?i(e):p(e,r,n,a)})(t,{min:n,max:u,step:c,normalizeCommittedValue:B});y(r,"input"),J(h(r,c,R))},eH=k?(0,r.jsx)("div",{"data-input-selector-variable":!0,"data-input-selector-label-layout":ev?"stacked":"inline",className:(0,a.b)("text-token-text-primary min-w-0 max-w-full justify-self-start text-sm leading-5 whitespace-normal hyphens-auto [overflow-wrap:anywhere] [&_.katex]:!text-[1em]",eC&&"font-medium"),children:eR?(0,r.jsx)(l.a,{className:"katex",latex:k??""}):k}):null,eF=!!(N&&P&&!D),e$=P&&!eF?(0,r.jsx)("div",{ref:el,className:"text-token-text-secondary shrink-0 text-xs leading-4 whitespace-nowrap [&_.katex]:text-inherit",children:P}):null,eV=!!$,eG=`minmax(max(${ek}ch,2rem), max(${ek}ch,2rem))`,eq=!!F,eX=`minmax(${F??0}ch, ${F??0}ch)`,eK=!M&&eq?e$??(0,r.jsx)("div",{ref:el,"aria-hidden":!0}):null,eY=H?`${H}px`:I?`${I}ch`:null,eZ=eY?`minmax(0, min(${eY}, 40%))`:"fit-content(40%)";(0,o.useLayoutEffect)(()=>{let e=ea.current,t=eo.current;if(M||!e||!t)return void ex(!1);let n=()=>{let n=e.clientWidth;if(0===n)return;let r=(e=>{let{availableWidth:t,labelWidth:n,minSliderWidthPx:r=96,unitWidth:i,valueWidth:a}=e,o=2+Number(a>0)+Number(i>0);return n+a+i+(o-1)*12+r>t+1})({availableWidth:n,labelWidth:Math.max(t.scrollWidth,H??0),minSliderWidthPx:ez,unitWidth:el.current?.clientWidth??0,valueWidth:es.current?.clientWidth??0});ex(e=>e===r?e:r)};n();let r="u"<typeof document?void 0:document.fonts;if(r?.addEventListener("loadingdone",n),"u"<typeof ResizeObserver)return()=>r?.removeEventListener("loadingdone",n);let i=new ResizeObserver(n);return i.observe(e),i.observe(t),es.current&&i.observe(es.current),el.current&&i.observe(el.current),()=>{r?.removeEventListener("loadingdone",n),i.disconnect()}},[F,$,H,M,ez,k,O,P]);let eQ=e=>ec.current?.querySelectorAll("[data-input-selector-discrete-menu-option]").item(e).focus();(0,o.useEffect)(()=>{eg&&M&&eQ(Math.max(M.findIndex(e=>eD(e)===Y),0))},[eg,M,Y]);let eJ=M?(0,r.jsx)("div",{role:"radiogroup","aria-label":eP,className:(0,a.b)("flex h-6 w-full min-w-0 flex-nowrap gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-black/7 p-0.5 dark:bg-white/6",E&&"opacity-40"),children:M.map(e=>{let t=eD(e),n=t===Y;return(0,r.jsx)("button",{type:"button",role:"radio","aria-checked":n,"aria-label":e.ariaLabel,disabled:E,className:(0,a.b)("text-token-text-secondary flex h-5 min-w-max flex-1 items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",n&&"bg-token-bg-primary !text-token-text-primary shadow-sm dark:bg-white dark:!text-black",!n&&!E&&"hover:text-token-text-primary focus-visible:text-token-text-primary",!E&&"focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"),onClick:()=>y(t,"input"),children:(0,r.jsx)("span",{className:"min-w-6",children:eO(e.label,L)})},e.value)})}):null,e0=M?(0,r.jsxs)("div",{"data-input-selector-discrete-rail":!0,className:(0,a.b)("relative h-6 w-full min-w-0",em&&"flex justify-end"),children:[em&&eW?(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)("button",{type:"button","aria-controls":eT,"aria-expanded":eg,"aria-haspopup":"listbox","aria-label":eB,disabled:E,"data-input-selector-discrete-menu-trigger":!0,ref:ef,className:(0,a.b)("text-token-text-primary flex h-6 max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-full px-2 text-[15px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",!E&&"hover:bg-black/5 focus-visible:bg-black/7 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/7 dark:focus-visible:bg-white/10"),onClick:()=>eb(e=>!e),children:[(0,r.jsx)("span",{className:"min-w-0 truncate",children:eO(eW.label,L)}),(0,r.jsx)(g,{})]}),eg?(0,r.jsx)("div",{ref:ec,"aria-label":eP,className:(0,a.b)("border-token-border-default bg-token-bg-primary text-token-text-primary absolute end-0 z-50 flex min-w-max flex-col gap-0.5 overflow-hidden rounded-lg border p-1 shadow-lg","above"===ew?"bottom-full mb-1":"top-full mt-1"),id:eT,role:"listbox",children:M.map((e,t)=>{let n=eD(e),i=n===Y;return(0,r.jsx)("button",{type:"button","aria-selected":i,"data-input-selector-discrete-menu-option":!0,role:"option",className:(0,a.b)("flex min-w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-start text-[15px] leading-5 whitespace-nowrap outline-none [&_.katex]:!text-[1em]",i&&"bg-black/7 font-medium dark:bg-white/10",!i&&"hover:bg-black/7 focus-visible:bg-black/7 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"),onClick:()=>{y(n,"input"),eb(!1),ef.current?.focus()},onKeyDown:e=>((e,t)=>{if(M)switch(e.key){case"ArrowDown":e.preventDefault(),eQ((t+1)%M.length);break;case"ArrowUp":e.preventDefault(),eQ((t-1+M.length)%M.length);break;case"Home":e.preventDefault(),eQ(0);break;case"End":e.preventDefault(),eQ(M.length-1)}})(e,t),children:eO(e.label,L)},e.value)})}):null]}):eJ,(0,r.jsx)("div",{ref:ed,"aria-hidden":!0,"data-input-selector-overflow-measure":!0,className:"pointer-events-none absolute inset-x-0 top-0 h-6 overflow-hidden opacity-0",children:(0,r.jsx)("div",{className:"flex h-6 w-max min-w-max gap-0.5 p-0.5",children:M.map(e=>(0,r.jsx)("span",{className:"flex h-5 min-w-max flex-none items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap [&_.katex]:!text-[1em]",children:(0,r.jsx)("span",{className:"min-w-6",children:eO(e.label,L)})},e.value))})})]}):null,e1=k&&!M&&O&&(0,r.jsxs)("div",{ref:es,className:(0,a.b)("text-token-text-primary grid h-5 min-w-8 grid-rows-1 rounded-md px-1.5 text-end text-[11px] leading-none whitespace-nowrap after:invisible after:font-mono after:whitespace-pre after:content-[attr(data-value)] after:[grid-area:1/1]",eF?"grid-cols-[minmax(0,1fr)_auto] gap-x-0.5":"grid-cols-1",D&&(ev?"text-end":"text-start"),W,!E&&!D&&"transition-colors focus-within:bg-black/7 hover:bg-black/5 dark:focus-within:bg-white/10 dark:hover:bg-white/7"),"data-value":"0".repeat(ek),children:[D?(0,r.jsx)("span",{"data-input-selector-range-value":!0,className:(0,a.b)("relative flex h-full items-center tabular-nums [grid-area:1/1]",ev?"justify-end":"justify-start"),children:ej}):(0,r.jsx)("input",{"aria-label":eP,className:"relative h-full min-w-[4ch] border-none bg-transparent p-0 text-end text-[11px] leading-none whitespace-nowrap shadow-[none] outline-none [grid-area:1/1] focus:outline-none",disabled:E,inputMode:"decimal",name:eN,size:1,type:"text",value:eL,onBlur:()=>{if(en.current){en.current=!1;return}et(!1),eI(Q)},onChange:e=>{var t;let n;return J(U?e.currentTarget.value:""===(n=(t=e.currentTarget.value).trim())||"-"===n||"."===n?t:n.match(f)?.[0]??t)},onFocus:()=>{et(!0),J(h(Z,c,R))},onKeyDown:e=>{if("Enter"===e.key){e.preventDefault(),en.current=!0,et(!1),eI(Q),e.currentTarget.blur();return}"Escape"===e.key&&(e.preventDefault(),en.current=!0,et(!1),J(h(Y,c,R)),e.currentTarget.blur())}}),eF?(0,r.jsx)("span",{"aria-hidden":!0,className:"text-token-text-secondary self-center text-xs leading-4",children:P}):null]}),e2=[];ev?(k&&e2.push("minmax(0, 1fr)"),e1&&e2.push(eG),eK&&e2.push(eX)):(k&&e2.push(eZ),e1&&e2.push(eG),eK&&e2.push(eX),e2.push("minmax(0, 1fr)"));let e3=[],e4=eV&&!!k,e5=eq&&!!k;k&&e3.push(eZ),e4&&e3.push(eG),e5&&e3.push(eX),e3.push("minmax(0, 1fr)");let e6=`${e3.length} / ${e3.length+1}`,e7=k?"2 / -1":"1 / -1",e8=Number.isFinite(n)&&Number.isFinite(u)&&Number.isFinite(c)&&c>0&&u>=n?Math.max(0,Math.round((u-n)/c)):0,e9=Math.min(e8+1,12),te="stepped"===_&&e8>0?Array.from({length:e9},(e,t)=>t):[],tt="stepped"===_?"h-6 w-6":"h-5 w-5",tn="relative flex h-6 w-full min-w-0 flex-1 items-center rounded-full bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.06)]",tr=te.length>0?(0,r.jsx)("div",{"aria-hidden":!0,"data-input-selector-rendered-marker-count":te.length,className:"pointer-events-none absolute inset-x-4 top-1/2 z-0 flex -translate-y-1/2 justify-between",children:te.map(e=>(0,r.jsx)("span",{"data-input-selector-step-marker":!0,className:"h-[3px] w-[3px] rounded-full bg-black/20 dark:bg-white/20"},e))}):null,ti=V&&!D?(0,r.jsxs)("div",{"data-input-selector-slider":!0,"data-input-selector-slider-style":_,className:(0,a.b)(tn,E&&"opacity-40"),children:[tr,(0,r.jsx)("input",{"aria-label":eP,"aria-valuetext":A,type:"range","data-learning-block-pan":E?void 0:"horizontal",className:(0,a.b)(d.a.inputSelector,"stepped"===_&&d.a.inputSelectorStepped,"text-token-text-primary relative z-10 flex w-full min-w-0 flex-1 items-center"),disabled:E,max:u,min:n,step:c,value:Y,onBlur:()=>eS("blur"),onChange:e=>{eE(),y(p(e.currentTarget.valueAsNumber,n,u,c),"slider")},onPointerDown:eM})]}):(0,r.jsxs)(i.b,{"data-input-selector-slider":!0,"data-input-selector-slider-style":_,"data-learning-block-pan":E?void 0:"horizontal",className:(0,a.b)(tn,"touch-pan-y",E&&"opacity-40"),disabled:E,max:u,min:n,onBlurCapture:()=>eS("blur"),onPointerDownCapture:eM,step:c,value:D?D.values.map(e=>p(e,n,u,c)):[Y],onValueChange:e=>{(eE(),D)?D.onChange([p(e[0],n,u,c),p(e[1],n,u,c)]):y(p(e[0],n,u,c),"slider")},children:[(0,r.jsx)(i.d,{className:"absolute inset-0 rounded-full",children:(0,r.jsx)(i.a,{className:"absolute inset-y-0 rounded-full bg-transparent"})}),tr,(0,r.jsx)(i.c,{"aria-label":D?.ariaLabels[0]??eP,"aria-valuetext":D?.ariaValueTexts?.[0]??A,className:(0,a.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative cursor-pointer rounded-full border shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt,D?"flex items-center justify-center text-black":"block"),children:D?.thumbLabels?.[0]&&(0,r.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:D.thumbLabels[0]})}),D&&(0,r.jsx)(i.c,{"aria-label":D.ariaLabels[1],"aria-valuetext":D.ariaValueTexts?.[1],className:(0,a.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative flex cursor-pointer items-center justify-center rounded-full border text-black shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",tt),children:D.thumbLabels?.[1]&&(0,r.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:D.thumbLabels[1]})})]});return M?(0,r.jsxs)("div",{className:"grid h-full min-w-0 items-center gap-x-3",style:{gridTemplateColumns:e3.join(" ")},children:[eH,!em&&e4?(0,r.jsx)("div",{"aria-hidden":!0}):null,!em&&e5?(0,r.jsx)("div",{"aria-hidden":!0}):null,(0,r.jsx)("div",{className:"h-full min-w-0",style:{gridColumn:em?e7:e6,gridRow:1},children:e0}),(0,r.jsx)("div",{ref:eu,"aria-hidden":!0,"data-input-selector-discrete-width-measure":!0,className:"pointer-events-none h-0 min-w-0 opacity-0",style:{gridColumn:e6,gridRow:1}})]}):(0,r.jsxs)("div",{ref:ea,className:(0,a.b)("relative grid min-w-0 items-center gap-x-3",D&&"text-[11px]",ev&&"gap-y-2"),style:{gridTemplateColumns:e2.join(" ")},children:[eH,e1,eK,(0,r.jsx)("div",{className:"min-w-0",style:ev?{gridColumn:"1 / -1"}:void 0,children:ti}),k?(0,r.jsx)("div",{ref:eo,"aria-hidden":!0,"data-input-selector-label-measure":!0,className:(0,a.b)("pointer-events-none absolute inset-0 h-0 w-max max-w-none overflow-hidden text-sm leading-5 whitespace-nowrap opacity-0 [&_.katex]:!text-[1em]",eC&&"font-medium"),children:eR?(0,r.jsx)(l.a,{className:"katex",latex:k??""}):k}):null]})},b:e=>e,c:m,d:h})},eBVc(e,t,n){var r=n("ABep"),i=n("Ipng"),a=n("mevF"),o=n("Njew"),s=n("oeGO"),l=n("zd8w"),u=n("Qgfj"),d=n("Wf1j"),c=n("oyxz"),f=n("PVZC"),p=n("KwmQ"),m=n("sKwe"),h=n("xJmQ"),v=n("LP6J"),x=n("l7Go"),g=n("jwNX"),b=n("uUVS");let w=(0,u.f)({lower:{id:"learningBlock.cartesianTripleIntegral.lowerBound",defaultMessage:"Lower {axis} integration bound"},upper:{id:"learningBlock.cartesianTripleIntegral.upperBound",defaultMessage:"Upper {axis} integration bound"}}),y=(e,t)=>e.formatNumber(1e-9>Math.abs(t)?0:t,{maximumFractionDigits:2,useGrouping:!1}),S=e=>[...(0,b.f)(e)],E=e=>{let{active:t,colors:n,face:i}=e,a=(0,l.useMemo)(()=>(e=>{let t=[];for(let n=0;n+1<e.grid.length;n+=1)for(let r=0;r+1<e.grid[n].length;r+=1){let i=e.grid[n][r],a=e.grid[n+1][r],o=e.grid[n+1][r+1],s=e.grid[n][r+1];i&&a&&o&&s&&t.push(...(0,b.f)(i),...(0,b.f)(a),...(0,b.f)(o),...(0,b.f)(i),...(0,b.f)(o),...(0,b.f)(s))}let n=new f.A;return n.setAttribute("position",new f.ub(t,3)),n.computeVertexNormals(),n})(i),[i]);return(0,l.useEffect)(()=>()=>a.dispose(),[a]),(0,r.jsx)("mesh",{geometry:a,renderOrder:t?2:1,children:(0,r.jsx)("meshBasicMaterial",{color:t?n.accent:n.secondary,depthWrite:!1,opacity:t?"upper"===i.side?.24:.14:.085,side:2,transparent:!0})})},M=e=>{let{color:t,from:n,opacity:a=1,points:o,to:s,width:l=1.5}=e;return(0,r.jsx)(i.a,{color:t,depthWrite:!1,lineWidth:l,opacity:a,points:(o??(n&&s?[n,s]:[])).map(S),transparent:a<1})},L=e=>{let{color:t,extent:n,showLabels:i}=e;return(0,r.jsx)("group",{children:[{axis:"x",from:[-n,0,0],to:[n,0,0]},{axis:"y",from:[0,-n,0],to:[0,n,0]},{axis:"z",from:[0,0,-n],to:[0,0,n]}].map(e=>{let{axis:n,from:o,to:s}=e;return(0,r.jsxs)("group",{children:[(0,r.jsx)(M,{color:t,from:o,opacity:.46,to:s,width:.95}),i?(0,r.jsx)(a.a,{center:!0,position:S(s),children:(0,r.jsx)(x.a,{latex:n,className:"pointer-events-none text-xs whitespace-nowrap",style:{color:t}})}):null]},n)})})},_=(e,t,n,r)=>(0,h.a)(r,(0,g.d)(e.parsed.expressions[t][n],e.parsed.bounds[t][n],e.bounds[t][n],e=>y(r,e))),j=e=>{let{analysis:t,colors:n,intl:i,isThumbnail:o}=e,s=t.values.activeAxis,l=t.bounds[s],u=l.lower===l.upper?["upper"]:["lower","upper"];return(0,r.jsxs)("group",{children:[t.faces.map(e=>(0,r.jsx)(E,{active:e.axis===s,colors:n,face:e},`${e.axis}:${e.side}`)),t.edges.map((e,t)=>(0,r.jsx)(M,{color:e.axis===s?n.accent:n.primary,opacity:e.axis===s?.95:.7,points:e.points,width:e.axis===s?2.45:1.35},`${e.axis}:${t}`)),o?null:u.map(e=>(0,r.jsx)(a.a,{center:!0,position:S(((e,t)=>{let n=e.values.activeAxis,r=e.faces.find(e=>e.axis===n&&e.side===t),i=r?Math.floor(r.grid.length/2):0,a=r?.grid[i]?Math.floor(r.grid[i].length/2):0,[o,s,l]=r?.grid[i]?.[a]??e.center,u="lower"===t?-.35:.35;return"x"===n?[o+u,s,l]:"y"===n?[o,s+u,l]:[o,s,l+u]})(t,e)),children:(0,r.jsx)(x.a,{latex:`${s}=${(0,g.d)(t.parsed.expressions[s][e],t.parsed.bounds[s][e],t.bounds[s][e],e=>y(i,e).replaceAll(",","{,}"))}`,className:"pointer-events-none text-xs font-semibold whitespace-nowrap",style:{color:n.accent}})},e))]})},A=e=>{let{analysis:t,ariaLabel:n,groundAxis:i="z",presentationMode:a}=e,u=(0,d.a)(),c=(0,l.useRef)(null),f=(e=>{let[t,n]=(0,l.useState)(null);return(0,l.useEffect)(()=>{let t=e.current;if(!t)return;let r=()=>{let e=window.getComputedStyle(t),r=t=>e.getPropertyValue(t).trim()||e.color,i={accent:r("--learning-block-accent"),axis:r("--text-tertiary"),primary:r("--learning-block-color-primary"),secondary:r("--learning-block-color-secondary")};n(e=>e&&Object.keys(i).every(t=>e[t]===i[t])?e:i)};r();let i=new MutationObserver(r);return i.observe(document.documentElement,{attributes:!0,attributeFilter:["class","data-theme","style"]}),i.observe(t,{attributes:!0,attributeFilter:["class","style"]}),()=>i.disconnect()},[e]),t})(c),p=(e=>{let[t,n]=(0,l.useState)(()=>"u"<typeof IntersectionObserver);return(0,l.useEffect)(()=>{let t=e.current;if(!t||"u"<typeof IntersectionObserver)return;let r=new IntersectionObserver(e=>{let[t]=e;return n(t?.isIntersecting??!1)},{rootMargin:"48px 0px"});return r.observe(t),()=>r.disconnect()},[e]),t})(c),m="thumbnail"===a,h=m?Math.max(1.1,t.parsed.maxCoordinate+.25):t.rangeLimit+.3,v=m?Math.max(1.5,t.parsed.maxCoordinate+.55):t.rangeLimit+.7;return(0,r.jsx)("div",{ref:c,"aria-label":n,className:`text-token-text-primary relative w-full overflow-hidden ${m?"h-full":"h-[246px] sm:h-[270px]"}`,role:"img",children:f&&p?(0,r.jsxs)(s.a,{"data-learning-block-pan":m?void 0:"both","aria-hidden":"true",camera:{fov:m?35:40,position:[1.65*v,1.42*v,1.7*v]},dpr:[1,1.5],frameloop:"demand",gl:{alpha:!0,antialias:!0,powerPreference:"low-power"},style:{height:"100%",touchAction:"none",width:"100%"},children:[(0,r.jsx)("ambientLight",{intensity:1.45}),(0,r.jsx)("directionalLight",{intensity:1.3,position:[4,7,5]}),m?null:(0,r.jsx)("gridHelper",{args:[2*t.rangeLimit,8,f.axis,f.axis],"material-opacity":.13,"material-transparent":!0,rotation:"x"===i?[0,0,Math.PI/2]:"y"===i?[Math.PI/2,0,0]:[0,0,0]}),(0,r.jsx)(L,{color:f.axis,extent:h,showLabels:!m}),(0,r.jsx)(j,{analysis:t,colors:f,intl:u,isThumbnail:m}),m?null:(0,r.jsx)(o.a,{enableDamping:!1,enablePan:!1,enableZoom:!1,minPolarAngle:.18,maxPolarAngle:Math.PI-.18})]}):null})};n.d(t,{},{CartesianTripleIntegralControls:e=>{let{values:t,setValues:n}=e,i=(0,d.a)(),a=(0,b.a)(t),o=g.b.filter(e=>{let t=a.parsed.expressions[e];return 0===t.lower.dependencies.length&&0===t.upper.dependencies.length}),s=(0,v.c)(i),l=(e,t)=>{let[r,i]=t;n(t=>{let n=(0,b.a)({...t,[`${e}Lower`]:r,[`${e}Upper`]:i,activeAxis:e}).values;return n[`${e}Lower`]===r&&n[`${e}Upper`]===i?n:t},"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")};return(0,r.jsx)(p.c,{screenReaderContent:(0,r.jsx)(c.a,{id:"learningBlock.cartesianTripleIntegral.controlsDescription",defaultMessage:"Adjust the constant Cartesian integration bounds to reshape the three-dimensional region."}),children:(0,r.jsx)(m.a,{inputs:o.map(e=>{let t=i.formatMessage(w.lower,{axis:e}),r=i.formatMessage(w.upper,{axis:e}),o=a.bounds[e],u=o.lower>o.upper,d=u?[o.upper,o.lower]:[o.lower,o.upper],c=u?[y(i,o.upper),y(i,o.lower)]:[y(i,o.lower),y(i,o.upper)];return{...s,variable:e,variableFormat:"katex",min:-a.rangeLimit,max:a.rangeLimit,step:.01,value:o.upper,ariaLabel:r,ariaValueText:y(i,o.upper),onChange:t=>l(e,[u?Math.max(o.lower,t):Math.min(o.lower,t),t]),range:{values:d,ariaLabels:u?[r,t]:[t,r],ariaValueTexts:c,displayValues:[y(i,o.lower),y(i,o.upper)],onChange:t=>l(e,u?[t[1],t[0]]:t)},onActiveChange:t=>{t&&a.values.activeAxis!==e&&n(t=>({...t,activeAxis:e}),"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")}}})})})},CartesianTripleIntegralVisualization:e=>{let{values:t,presentationMode:n}=e,i=(0,d.a)(),a=(0,l.useMemo)(()=>(0,b.a)(t),[t]),o=i.formatMessage({id:"learningBlock.cartesianTripleIntegral.visualizationDescription",defaultMessage:"Cartesian triple-integral region with x from {xLower} to {xUpper}, y from {yLower} to {yUpper}, and z from {zLower} to {zUpper}. The oriented bounds enclose approximately {volumeCount, plural, one {{volume} cubic unit} other {{volume} cubic units}} of signed volume."},{xLower:_(a,"x","lower",i),xUpper:_(a,"x","upper",i),yLower:_(a,"y","lower",i),yUpper:_(a,"y","upper",i),zLower:_(a,"z","lower",i),zUpper:_(a,"z","upper",i),volume:y(i,a.volume),volumeCount:a.volume});return(0,r.jsx)(A,{analysis:a,ariaLabel:o,presentationMode:n})},a:A})}};