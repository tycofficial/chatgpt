export const __rspack_esm_ids=[639728];export const __webpack_modules__={Ipng(e,t,n){let i,r;n.d(t,{a:()=>R});var o=n("unhp"),s=n("zd8w"),a=n("PVZC"),l=n("hPwS");let u=new a.v,d=new a.Xd;class c extends a.Kb{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new a.ub([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new a.ub([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new a.Lb(t,6,1);return this.setAttribute("instanceStart",new a.Rb(n,3,0)),this.setAttribute("instanceEnd",new a.Rb(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let i=new a.Lb(n,2*t,1);return this.setAttribute("instanceColorStart",new a.Rb(i,t,0)),this.setAttribute("instanceColorEnd",new a.Rb(i,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new a.fe(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new a.v);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),u.setFromBufferAttribute(t),this.boundingBox.union(u))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new a.td),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let i=0;for(let r=0,o=e.count;r<o;r++)d.fromBufferAttribute(e,r),i=Math.max(i,n.distanceToSquared(d)),d.fromBufferAttribute(t,r),i=Math.max(i,n.distanceToSquared(d));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var f=n("STXV");let p=parseInt("179".replace(/\D+/g,""));class h extends a.jd{constructor(e){super({type:"LineMaterial",uniforms:a.Vd.clone(a.Vd.merge([f.UniformsLib.common,f.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new a.Wd(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let m=p>=125?"uv1":"uv2",v=new a.Yd,x=new a.Xd,g=new a.Xd,y=new a.Yd,b=new a.Yd,w=new a.Yd,S=new a.Xd,M=new a.sc,E=new a.ac,j=new a.Xd,_=new a.v,z=new a.td,A=new a.Yd;function P(e,t,n){return A.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),A.multiplyScalar(1/A.w),A.x=r/n.width,A.y=r/n.height,A.applyMatrix4(e.projectionMatrixInverse),A.multiplyScalar(1/A.w),Math.abs(Math.max(A.x,A.y))}class C extends a.tc{constructor(e=new c,t=new h({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,i=new Float32Array(2*t.count);for(let e=0,r=0,o=t.count;e<o;e++,r+=2)x.fromBufferAttribute(t,e),g.fromBufferAttribute(n,e),i[r]=0===r?0:i[r-1],i[r+1]=i[r]+x.distanceTo(g);let r=new a.Lb(i,2,1);return e.setAttribute("instanceDistanceStart",new a.Rb(r,1,0)),e.setAttribute("instanceDistanceEnd",new a.Rb(r,1,1)),this}raycast(e,t){let n,o,s=this.material.worldUnits,l=e.camera;null!==l||s||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let u=void 0!==e.params.Line2&&e.params.Line2.threshold||0;i=e.ray;let d=this.matrixWorld,c=this.geometry,f=this.material;if(r=f.linewidth+u,null===c.boundingSphere&&c.computeBoundingSphere(),z.copy(c.boundingSphere).applyMatrix4(d),s)n=.5*r;else{let e=Math.max(l.near,z.distanceToPoint(i.origin));n=P(l,e,f.resolution)}if(z.radius+=n,!1!==i.intersectsSphere(z)){if(null===c.boundingBox&&c.computeBoundingBox(),_.copy(c.boundingBox).applyMatrix4(d),s)o=.5*r;else{let e=Math.max(l.near,_.distanceToPoint(i.origin));o=P(l,e,f.resolution)}_.expandByScalar(o),!1!==i.intersectsBox(_)&&(s?function(e,t){let n=e.matrixWorld,o=e.geometry,s=o.attributes.instanceStart,l=o.attributes.instanceEnd,u=Math.min(o.instanceCount,s.count);for(let o=0;o<u;o++){E.start.fromBufferAttribute(s,o),E.end.fromBufferAttribute(l,o),E.applyMatrix4(n);let u=new a.Xd,d=new a.Xd;i.distanceSqToSegment(E.start,E.end,d,u),d.distanceTo(u)<.5*r&&t.push({point:d,pointOnLine:u,distance:i.origin.distanceTo(d),object:e,face:null,faceIndex:o,uv:null,[m]:null})}}(this,t):function(e,t,n){let o=t.projectionMatrix,s=e.material.resolution,l=e.matrixWorld,u=e.geometry,d=u.attributes.instanceStart,c=u.attributes.instanceEnd,f=Math.min(u.instanceCount,d.count),p=-t.near;i.at(1,w),w.w=1,w.applyMatrix4(t.matrixWorldInverse),w.applyMatrix4(o),w.multiplyScalar(1/w.w),w.x*=s.x/2,w.y*=s.y/2,w.z=0,S.copy(w),M.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<f;t++){if(y.fromBufferAttribute(d,t),b.fromBufferAttribute(c,t),y.w=1,b.w=1,y.applyMatrix4(M),b.applyMatrix4(M),y.z>p&&b.z>p)continue;if(y.z>p){let e=y.z-b.z,t=(y.z-p)/e;y.lerp(b,t)}else if(b.z>p){let e=b.z-y.z,t=(b.z-p)/e;b.lerp(y,t)}y.applyMatrix4(o),b.applyMatrix4(o),y.multiplyScalar(1/y.w),b.multiplyScalar(1/b.w),y.x*=s.x/2,y.y*=s.y/2,b.x*=s.x/2,b.y*=s.y/2,E.start.copy(y),E.start.z=0,E.end.copy(b),E.end.z=0;let u=E.closestPointToPointParameter(S,!0);E.at(u,j);let f=a.pc.lerp(y.z,b.z,u),h=f>=-1&&f<=1,v=S.distanceTo(j)<.5*r;if(h&&v){E.start.fromBufferAttribute(d,t),E.end.fromBufferAttribute(c,t),E.start.applyMatrix4(l),E.end.applyMatrix4(l);let r=new a.Xd,o=new a.Xd;i.distanceSqToSegment(E.start,E.end,o,r),n.push({point:o,pointOnLine:r,distance:i.origin.distanceTo(o),object:e,face:null,faceIndex:t,uv:null,[m]:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(v),this.material.uniforms.resolution.value.set(v.z,v.w))}}class L extends c{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let i=0;i<t;i+=3)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,i=new Float32Array(2*n);if(3===t)for(let r=0;r<n;r+=t)i[2*r]=e[r],i[2*r+1]=e[r+1],i[2*r+2]=e[r+2],i[2*r+3]=e[r+3],i[2*r+4]=e[r+4],i[2*r+5]=e[r+5];else for(let r=0;r<n;r+=t)i[2*r]=e[r],i[2*r+1]=e[r+1],i[2*r+2]=e[r+2],i[2*r+3]=e[r+3],i[2*r+4]=e[r+4],i[2*r+5]=e[r+5],i[2*r+6]=e[r+6],i[2*r+7]=e[r+7];return super.setColors(i,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class F extends C{constructor(e=new L,t=new h({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let R=s.forwardRef(function({points:e,color:t=0xffffff,vertexColors:n,linewidth:i,lineWidth:r,segments:u,dashed:d,...f},p){var m,v;let x=(0,l.C)(e=>e.size),g=s.useMemo(()=>u?new C:new F,[u]),[y]=s.useState(()=>new h),b=(null==n||null==(m=n[0])?void 0:m.length)===4?4:3,w=s.useMemo(()=>{let i=u?new c:new L,r=e.map(e=>{let t=Array.isArray(e);return e instanceof a.Xd||e instanceof a.Yd?[e.x,e.y,e.z]:e instanceof a.Wd?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(i.setPositions(r.flat()),n){t=0xffffff;let e=n.map(e=>e instanceof a.K?e.toArray():e);i.setColors(e.flat(),b)}return i},[e,u,n,b]);return s.useLayoutEffect(()=>{g.computeLineDistances()},[e,g]),s.useLayoutEffect(()=>{d?y.defines.USE_DASH="":delete y.defines.USE_DASH,y.needsUpdate=!0},[d,y]),s.useEffect(()=>()=>{w.dispose(),y.dispose()},[w]),s.createElement("primitive",(0,o.a)({object:g,ref:p},f),s.createElement("primitive",{object:w,attach:"geometry"}),s.createElement("primitive",(0,o.a)({object:y,attach:"material",color:t,vertexColors:!!n,resolution:[x.width,x.height],linewidth:null!=(v=null!=i?i:r)?v:1,dashed:d,transparent:4===b},f)))})},mevF(e,t,n){let i,r;var o=n("unhp"),s=n("zd8w"),a=n("CE87"),l=n("PVZC"),u=n("hPwS");let d=new l.Xd,c=new l.Xd,f=new l.Xd,p=new l.Wd;function h(e,t,n){let i=d.setFromMatrixPosition(e.matrixWorld);i.project(t);let r=n.width/2,o=n.height/2;return[i.x*r+r,-(i.y*o)+o]}let m=e=>1e-10>Math.abs(e)?0:e;function v(e,t,n=""){let i="matrix3d(";for(let n=0;16!==n;n++)i+=m(t[n]*e.elements[n])+(15!==n?",":")");return n+i}let x=(i=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>v(e,i)),g=(r=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>v(e,r(t),"translate(-50%,-50%)")),y=s.forwardRef(({children:e,eps:t=.001,style:n,className:i,prepend:r,center:v,fullscreen:y,portal:b,distanceFactor:w,sprite:S=!1,transform:M=!1,occlude:E,onOcclude:j,castShadow:_,receiveShadow:z,material:A,geometry:P,zIndexRange:C=[0x1000037,0],calculatePosition:L=h,as:F="div",wrapperClass:R,pointerEvents:U="auto",...O},k)=>{let{gl:I,camera:D,scene:W,size:N,raycaster:B,events:T,viewport:H}=(0,u.C)(),[q]=s.useState(()=>document.createElement(F)),V=s.useRef(null),$=s.useRef(null),G=s.useRef(0),X=s.useRef([0,0]),Z=s.useRef(null),Y=s.useRef(null),K=(null==b?void 0:b.current)||T.connected||I.domElement.parentNode,J=s.useRef(null),Q=s.useRef(!1),ee=s.useMemo(()=>{var e;return E&&"blending"!==E||Array.isArray(E)&&E.length&&(e=E[0])&&"object"==typeof e&&"current"in e},[E]);s.useLayoutEffect(()=>{let e=I.domElement;E&&"blending"===E?(e.style.zIndex=`${Math.floor(C[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[E]),s.useLayoutEffect(()=>{if($.current){let e=V.current=a.createRoot(q);if(W.updateMatrixWorld(),M)q.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=L($.current,D,N);q.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return K&&(r?K.prepend(q):K.appendChild(q)),()=>{K&&K.removeChild(q),e.unmount()}}},[K,M]),s.useLayoutEffect(()=>{R&&(q.className=R)},[R]);let et=s.useMemo(()=>M?{position:"absolute",top:0,left:0,width:N.width,height:N.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:v?"translate3d(-50%,-50%,0)":"none",...y&&{top:-N.height/2,left:-N.width/2,width:N.width,height:N.height},...n},[n,v,y,N,M]),en=s.useMemo(()=>({position:"absolute",pointerEvents:U}),[U]);s.useLayoutEffect(()=>{var t,r;Q.current=!1,M?null==(t=V.current)||t.render(s.createElement("div",{ref:Z,style:et},s.createElement("div",{ref:Y,style:en},s.createElement("div",{ref:k,className:i,style:n,children:e})))):null==(r=V.current)||r.render(s.createElement("div",{ref:k,style:et,className:i,children:e}))});let ei=s.useRef(!0);(0,u.D)(e=>{if($.current){D.updateMatrixWorld(),$.current.updateWorldMatrix(!0,!1);let e=M?X.current:L($.current,D,N);if(M||Math.abs(G.current-D.zoom)>t||Math.abs(X.current[0]-e[0])>t||Math.abs(X.current[1]-e[1])>t){var n;let t,i,r,o,s=(n=$.current,t=d.setFromMatrixPosition(n.matrixWorld),i=c.setFromMatrixPosition(D.matrixWorld),r=t.sub(i),o=D.getWorldDirection(f),r.angleTo(o)>Math.PI/2),a=!1;ee&&(Array.isArray(E)?a=E.map(e=>e.current):"blending"!==E&&(a=[W]));let u=ei.current;a?ei.current=function(e,t,n,i){let r=d.setFromMatrixPosition(e.matrixWorld),o=r.clone();o.project(t),p.set(o.x,o.y),n.setFromCamera(p,t);let s=n.intersectObjects(i,!0);if(s.length){let e=s[0].distance;return r.distanceTo(n.ray.origin)<e}return!0}($.current,D,B,a)&&!s:ei.current=!s,u!==ei.current&&(j?j(!ei.current):q.style.display=ei.current?"block":"none");let h=Math.floor(C[0]/2),v=E?ee?[C[0],h]:[h-1,0]:C;if(q.style.zIndex=`${function(e,t,n){if(t instanceof l.Kc||t instanceof l.Ic){let i=d.setFromMatrixPosition(e.matrixWorld),r=c.setFromMatrixPosition(t.matrixWorld),o=i.distanceTo(r),s=(n[1]-n[0])/(t.far-t.near),a=n[1]-s*t.far;return Math.round(s*o+a)}}($.current,D,v)}`,M){let[e,t]=[N.width/2,N.height/2],n=D.projectionMatrix.elements[5]*t,{isOrthographicCamera:i,top:r,left:o,bottom:s,right:a}=D,l=x(D.matrixWorldInverse),u=i?`scale(${n})translate(${m(-(a+o)/2)}px,${m((r+s)/2)}px)`:`translateZ(${n}px)`,d=$.current.matrixWorld;S&&((d=D.matrixWorldInverse.clone().transpose().copyPosition(d).scale($.current.scale)).elements[3]=d.elements[7]=d.elements[11]=0,d.elements[15]=1),q.style.width=N.width+"px",q.style.height=N.height+"px",q.style.perspective=i?"":`${n}px`,Z.current&&Y.current&&(Z.current.style.transform=`${u}${l}translate(${e}px,${t}px)`,Y.current.style.transform=g(d,1/((w||10)/400)))}else{let t=void 0===w?1:function(e,t){if(t instanceof l.Ic)return t.zoom;if(!(t instanceof l.Kc))return 1;{let n=d.setFromMatrixPosition(e.matrixWorld),i=c.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*n.distanceTo(i))}}($.current,D)*w;q.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}X.current=e,G.current=D.zoom}}if(!ee&&J.current&&!Q.current)if(M){if(Z.current){let e=Z.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=D;if(t||P)O.scale&&(Array.isArray(O.scale)?O.scale instanceof l.Xd?J.current.scale.copy(O.scale.clone().divideScalar(1)):J.current.scale.set(1/O.scale[0],1/O.scale[1],1/O.scale[2]):J.current.scale.setScalar(1/O.scale));else{let t=(w||10)/400,n=e.clientWidth*t,i=e.clientHeight*t;J.current.scale.set(n,i,1)}Q.current=!0}}}else{let t=q.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/H.factor,n=t.clientWidth*e,i=t.clientHeight*e;J.current.scale.set(n,i,1),Q.current=!0}J.current.lookAt(e.camera.position)}});let er=s.useMemo(()=>({vertexShader:M?void 0:`
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
      `}),[M]);return s.createElement("group",(0,o.a)({},O,{ref:$}),E&&!ee&&s.createElement("mesh",{castShadow:_,receiveShadow:z,ref:J},P||s.createElement("planeGeometry",null),A||s.createElement("shaderMaterial",{side:2,vertexShader:er.vertexShader,fragmentShader:er.fragmentShader})))});n.d(t,{},{a:y})},QI6X(e,t,n){n.d(t,{Three3DRenderer:()=>eI});var i=n("ABep"),r=n("mevF"),o=n("Njew"),s=n("Ipng"),a=n("oeGO"),l=n("zd8w"),u=n("Wf1j"),d=n("PVZC"),c=n("cVOc"),f=n("JOpY"),p=e=>(0,i.jsxs)("svg",{width:20,height:20,viewBox:"0 0 20 20",fill:"none",xmlns:"http://www.w3.org/2000/svg",...e,children:[(0,i.jsx)("path",{d:"M9.99976 7.875C11.1734 7.875 12.1248 8.8264 12.1248 10C12.1248 11.1736 11.1734 12.125 9.99976 12.125C8.82626 12.1249 7.87476 11.1735 7.87476 10C7.87476 8.82648 8.82626 7.87513 9.99976 7.875Z",fill:"currentColor"}),(0,i.jsx)("path",{fillRule:"evenodd",clipRule:"evenodd",d:"M9.99976 1.625C10.483 1.625 10.8748 2.01675 10.8748 2.5V4.95898H13.3337C14.2769 4.95925 15.0416 5.72382 15.0417 6.66699V9.12891H17.4958C17.9787 9.12917 18.3706 9.52104 18.3708 10.0039C18.3708 10.4868 17.9796 10.8784 17.4968 10.8789H15.0417V13.334C15.0415 14.2771 14.2768 15.0417 13.3337 15.042H10.8748V17.5C10.8748 17.9832 10.483 18.375 9.99976 18.375C9.51662 18.3749 9.12476 17.9832 9.12476 17.5V15.042H6.66675C5.72357 15.0418 4.959 14.2771 4.95874 13.334V10.8789H2.49585C2.01276 10.8789 1.62111 10.4879 1.62085 10.0049C1.62085 9.52163 2.0126 9.12891 2.49585 9.12891H4.95874V6.66699C4.95892 5.72376 5.72352 4.95916 6.66675 4.95898H9.12476V2.5C9.12476 2.01683 9.51662 1.62513 9.99976 1.625ZM6.70874 13.292H13.2917V6.70898H6.70874V13.292Z",fill:"currentColor"})]}),h=n("d8SQ"),m=n("oTpV");let v=e=>{let[t,n,i]=e;return[t,i,-n]},x=e=>{let[t,n,i]=e;return[t,-i,n]},g=[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],y=g.slice(0,4),b=[[0,5,1,7],[0,1,3,7],[0,3,2,7],[0,2,6,7],[0,6,4,7],[0,4,5,7]],w=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],S=[[0,1,3],[0,3,2]],M=[[0,1],[1,2],[2,0]],E=(e,t)=>{let n=e.value-t.value,i=0===n?.5:e.value/n;return[e.point[0]+i*(t.point[0]-e.point[0]),e.point[1]+i*(t.point[1]-e.point[1]),e.point[2]+i*(t.point[2]-e.point[2])]},j=function(e){for(var t=arguments.length,n=Array(t>1?t-1:0),i=1;i<t;i++)n[i-1]=arguments[i];for(let t of n)e.push(...v(t))},_=(e,t)=>[e[0]-t[0],e[1]-t[1],e[2]-t[2]],z=(e,t)=>e[0]*t[0]+e[1]*t[1]+e[2]*t[2],A=(e,t)=>[e[1]*t[2]-e[2]*t[1],e[2]*t[0]-e[0]*t[2],e[0]*t[1]-e[1]*t[0]],P=e=>{let t=Math.hypot(...e);return 0===t?[0,0,0]:[e[0]/t,e[1]/t,e[2]/t]},C=(e,t)=>{let n=[];for(let[e,i]of w){let r=t[e],o=t[i];r.value<=0!=o.value<=0&&n.push(E(r,o))}if(3===n.length)j(e,...n);else if(4===n.length){let t,i,r,o,s=(t=n.reduce((e,t)=>[e[0]+t[0]/n.length,e[1]+t[1]/n.length,e[2]+t[2]/n.length],[0,0,0]),i=P(_(n[0],t)),r=P(A(_(n[1],n[0]),_(n[2],n[0]))),o=A(r,i),n.toSorted((e,n)=>Math.atan2(z(_(e,t),o),z(_(e,t),i))-Math.atan2(z(_(n,t),o),z(_(n,t),i))));j(e,s[0],s[1],s[2]),j(e,s[0],s[2],s[3])}},L=(e,t)=>{let n=[];for(let[e,i]of M){let r=t[e],o=t[i];r.value<=0!=o.value<=0&&n.push(E(r,o))}2===n.length&&Math.hypot(..._(n[0],n[1]))>1e-9&&e.push([v(n[0]),v(n[1])])},F=e=>e.map(e=>Math.round(e/1e-9)).join(":"),R=[-10,-5,0,5,10],U=R.filter(e=>0!==e),O="#9298a0",k=[11,9,11],I=[0,28,.001],D=Math.hypot(...k),W=k.map(e=>37.5*e/D),N={max:15,min:-15},B=(e,t)=>{let{max:n,min:i}=t;return Math.max(i,Math.min(n,e))},T=(e,t)=>{let{max:n,min:i}=t;return e>=i-1e-6&&e<=n+1e-6},H=a.a,q=r.a,V=o.a,$="mesh",G="meshBasicMaterial",X="meshStandardMaterial",Z="sphereGeometry",Y=s.a,K=(e,t)=>{let n=new d.A;return n.setAttribute("position",new d.ub(e,3)),n.setIndex(t),n.computeVertexNormals(),n},J=e=>({geometry:e}),Q={color:"var(--text-tertiary)",fontSize:"clamp(7px, 1.5cqw, 10px)",fontWeight:400,pointerEvents:"none",userSelect:"none",whiteSpace:"nowrap"},ee={...Q,color:"var(--text-secondary)",fontSize:13,fontWeight:600},et={bottom:12,display:"flex",gap:6,position:"absolute",right:12},en={alignItems:"center",border:"1px solid var(--border-light)",borderRadius:9999,background:"var(--bg-primary)",boxShadow:"0 2px 8px rgb(0 0 0 / 8%)",color:"var(--text-primary)",cursor:"pointer",display:"inline-flex",height:32,justifyContent:"center",padding:0,width:32},ei={alignItems:"center",background:"var(--bg-primary)",border:"1px solid var(--border-light)",borderRadius:9999,bottom:12,boxShadow:"0 2px 8px rgb(0 0 0 / 8%)",color:"var(--text-primary)",display:"inline-flex",height:32,justifyContent:"center",left:12,padding:0,position:"absolute",transition:"opacity 160ms ease, transform 160ms ease",width:32,zIndex:2},er={pointerEvents:"none",transform:"translate3d(-50%, -100%, 0) scale(0.65)",transformOrigin:"bottom center"},eo=new d.Xd,es=(e,t,n)=>{let i=t.userData.graphContainer,r=i?.clientWidth||n.width,o=i?.clientHeight||n.height;return eo.setFromMatrixPosition(e.matrixWorld).project(t),[(eo.x+1)*r/2,(1-eo.y)*o/2]},ea=e=>{let{children:t,position:n,style:r=Q}=e;return(0,i.jsx)(q,{calculatePosition:es,center:!0,position:n,style:{pointerEvents:"none"},children:(0,i.jsx)("span",{"data-graph-axis-position":n.join(","),style:r,children:t})})},el=()=>(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(ea,{position:[10.75,0,0],style:ee,children:"x"}),(0,i.jsx)(ea,{position:[0,0,-10.75],style:ee,children:"y"}),(0,i.jsx)(ea,{position:[0,10.75,0],style:ee,children:"z"}),R.map(e=>(0,i.jsx)(ea,{position:[e,0,.42],children:e},`x-${e}`)),U.map(e=>(0,i.jsx)(ea,{position:[.42,0,-e],children:e},`y-${e}`)),U.map(e=>(0,i.jsx)(ea,{position:[.48,e,0],children:(0,c.a)(e,2)},`z-${e}`))]}),eu=e=>{let{color:t,points:n,rotation:r}=e;return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(Y,{color:t,depthTest:!1,lineWidth:1.75,points:n,renderOrder:10}),(0,i.jsxs)($,{position:n[1],raycast:()=>null,renderOrder:10,rotation:r,children:[(0,i.jsx)("coneGeometry",{args:[.12,.38,12]}),(0,i.jsx)(G,{color:t,depthTest:!1,depthWrite:!1})]})]})},ed=e=>{let{color:t}=e;return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(eu,{color:t,points:[[-10,0,0],[10.19,0,0]],rotation:[0,0,-Math.PI/2]}),(0,i.jsx)(eu,{color:t,points:[[0,0,10],[0,0,-10.19]],rotation:[-Math.PI/2,0,0]}),(0,i.jsx)(eu,{color:t,points:[[0,-10,0],[0,10.19,0]]}),U.map(e=>(0,i.jsx)(Y,{color:t,depthTest:!1,lineWidth:1,points:[[-.16,e,0],[.16,e,0]],renderOrder:10},`z-tick-${e}`))]})},ec=e=>{let{color:t,point:[n,r,o]}=e,s=`(${(0,c.a)(n,2)}, ${(0,c.a)(r,2)}, ${(0,c.a)(o,2)})`;return(0,i.jsx)(q,{position:[0,0,0],style:er,children:(0,i.jsx)(f.e,{"aria-hidden":!0,bodyWidth:(0,f.l)(s),contentClassName:"text-[var(--learning-block-tooltip-text)] font-semibold",fill:t,pointerSide:"bottom",stroke:"var(--bg-primary)",strokeWidth:2,children:s})})},ef=e=>{let{columnSteps:t,getPoint:n,rowSteps:i}=e,r=[],o=[],s=[];for(let e=0;e<=i;e+=1)for(let i=0;i<=t;i+=1){let t=n(i,e);s.push(null!=t),r.push(...v(t??[0,0,0]))}let a=t+1;for(let e=0;e<i;e+=1)for(let n=0;n<t;n+=1){let t=e*a+n,i=t+1,r=t+a,l=r+1;s[t]&&s[i]&&s[r]&&s[l]&&(o.push(t,r,i),o.push(i,r,l))}return K(r,o)},ep=e=>{if(e.some(e=>{let{value:t}=e;return!Number.isFinite(t)}))return[];let t=[];for(let n=0;n<e.length;n+=1){let i=e[n],r=e[(n+1)%e.length],o=i.value>=0,s=r.value>=0;if(o&&t.push(i),o!==s){let e=i.value/(i.value-r.value);t.push({value:0,x:i.x+(r.x-i.x)*e,y:i.y+(r.y-i.y)*e})}}return t},eh=e=>("explicit-2d"===e.kind||"implicit-2d"===e.kind||"compound-2d-inequality"===e.kind)&&(0,h.l)(e.relation),em=e=>("explicit-3d"===e.kind||"implicit-3d"===e.kind||"compound-3d-inequality"===e.kind)&&(0,h.l)(e.relation),ev=e=>"<="===e||">="===e,ex=function(e,t){for(var n=arguments.length,i=Array(n>2?n-2:0),r=2;r<n;r++)i[r-2]=arguments[r];let o=e.length/3;for(let t of i)e.push(...v(t));t.push(o,o+1,o+2),t.push(o,o+2,o+3)},eg=(e,t,n)=>{if(n.length<3)return;let i=e.length/3;for(let t of n)e.push(...v(t));for(let e=1;e<n.length-1;e+=1)t.push(i,i+e,i+e+1)},ey=(e,t)=>e.some(e=>"identifier"===e.type&&e.value===t),eb=(e,t,n)=>e+(t-e)*n,ew=(e,t)=>{let n=B(e.lower,t),i=B(e.upper,t);return{lower:n,lowerInclusive:n===e.lower&&e.lowerInclusive,restrictionZ:(n+i)/2,upper:i,upperInclusive:i===e.upper&&e.upperInclusive}},eS=(e,t)=>Number.isFinite(e)&&("<"===t||"<="===t?e<=0:e>=0),eM=(e,t,n)=>({lower:eb(e.lower,t.lower,n),lowerInclusive:e.lowerInclusive||t.lowerInclusive,restrictionZ:eb(e.restrictionZ,t.restrictionZ,n),upper:eb(e.upper,t.upper,n),upperInclusive:e.upperInclusive||t.upperInclusive,x:eb(e.x,t.x,n),y:eb(e.y,t.y,n)}),eE=(e,t)=>{let{relation:n,valueAt:i}=t;if(e.length<3)return[];let r=[];for(let t=0;t<e.length;t+=1){let o=e[t],s=e[(t+1)%e.length],a=i(o),l=i(s),u=eS(a,n),d=eS(l,n);if(u&&d){r.push(s);continue}if(!u&&!d)continue;let c=eM(o,s,Number.isFinite(a)&&Number.isFinite(l)&&a!==l?Math.max(0,Math.min(1,a/(a-l))):.5);r.push(c),!u&&d&&r.push(s)}return r},ej=(e,t)=>1e-6>=Math.abs(e-t),e_=(e,t,n,i,r,o)=>ej(e.x,n)&&ej(t.x,n)||ej(e.x,i)&&ej(t.x,i)||ej(e.y,r)&&ej(t.y,r)||ej(e.y,o)&&ej(t.y,o),ez=(e,t)=>ej(e.x,-10)&&ej(t.x,-10)||ej(e.x,10)&&ej(t.x,10)||ej(e.y,-10)&&ej(t.y,-10)||ej(e.y,10)&&ej(t.y,10),eA=(e,t,n)=>{let i=eM(e,t,.5);return n.some(e=>{let{valueAt:t}=e,n=t(i);return Number.isFinite(n)&&1e-5>=Math.abs(n)})},eP=(e,t,n)=>{let i=eM(e,t,.5);return n.some(e=>{let{inclusive:t,valueAt:n}=e,r=n(i);return t&&Number.isFinite(r)&&1e-5>=Math.abs(r)})},eC=e=>{let{upper:t,x:n,y:i}=e;return[n,i,t]},eL=e=>{let{lower:t,x:n,y:i}=e;return[n,i,t]},eF=e=>{let{clippingInequalities:t,constants:n,getRange:i,restrictions:r,resolveFunction:o}=e,s=[],a=[],l=[],u=[],d=e=>{eg(s,a,e)},c=e=>{eg(l,u,e)},f=[],p=(e,t)=>{var n,o;let s,a=49*t+e;if(void 0!==f[a])return f[a];let l=(s=i(n=-10+20*e/48,o=-10+20*t/48))&&Number.isFinite(s.lower)&&Number.isFinite(s.upper)&&!(s.lower>=s.upper)&&(0,m.a)(r,{x:n,y:o})?{...s,x:n,y:o}:null;return f[a]=l,l};for(let e=0;e<48;e+=1){let n=-10+20*e/48,i=-10+20*(e+1)/48;for(let r=0;r<48;r+=1){let o=-10+20*r/48,f=-10+20*(r+1)/48,h=[p(r,e),p(r+1,e),p(r+1,e+1),p(r,e+1)];if(h.some(e=>null==e))continue;let m=h;for(let e of t)if((m=eE(m,e)).length<3)break;if(m.length<3)continue;let v=m.map(eC),x=[...m].reverse().map(eL);d(v),d(x),m.some(e=>e.upperInclusive)&&c(v),m.some(e=>e.lowerInclusive)&&c(x);for(let e=0;e<m.length;e+=1){let r=m[e],d=m[(e+1)%m.length];(!e_(r,d,o,f,n,i)||ez(r,d)||eA(r,d,t))&&(!function(){for(var e=arguments.length,t=Array(e),n=0;n<e;n++)t[n]=arguments[n];ex(s,a,...t)}(eL(r),eC(r),eC(d),eL(d)),eP(r,d,t)&&function(){for(var e=arguments.length,t=Array(e),n=0;n<e;n++)t[n]=arguments[n];ex(l,u,...t)}(eL(r),eC(r),eC(d),eL(d)))}}}return{geometry:K(s,a),inclusiveBoundaryGeometry:l.length>0?K(l,u):void 0}},eR=e=>"implicit-3d"===e.kind&&(ey(e.left,"z")||ey(e.right,"z")),eU=e=>{let{color:t,constants:n,dependentVariable:r,equation:o,expression:s,interactive:a,mirroredRadicand:u,resolveFunction:c,restrictions:f,surfaceStyle:p,zRange:y}=e,[w,S]=(0,l.useState)(null),M=(0,h.l)(o.relation),E=em(o),j=(0,l.useDeferredValue)(n),_=(0,l.useDeferredValue)(o),z=(0,l.useDeferredValue)(f),A=null==u&&(null==s||null==r),P=A?j:n,L=A?_:o,F=A?z:f,R=(0,l.useMemo)(()=>((e,t,n,i,r,o,s,a,l)=>{var u;if(em(e)){let n=(0,h.k)(e)&&e.comparisons.every(e=>"explicit-3d"===e.kind)?e.comparisons:null,r=(e=>{if(!(0,h.k)(e))return null;let t=[],n=[];for(let i of e.comparisons)if("explicit-3d"===i.kind)t.push(i);else{if(eR(i))return null;n.push(i)}return t.length>0&&n.length>0?{xyComparisons:n,zComparisons:t}:null})(e);if(n){let e;return eF({clippingInequalities:[],constants:o,getRange:(t,i)=>{let r=-1/0,s=!1,l=1/0,u=!1;for(let a of n){let n=(0,h.e)({constants:o,tokens:a.expression,resolveFunction:e,x:t,y:i});if(!Number.isFinite(n))return null;"<"===a.relation||"<="===a.relation?n<l&&(l=n,u=ev(a.relation)):n>r&&(r=n,s=ev(a.relation))}return ew({lower:r,lowerInclusive:s,restrictionZ:(r+l)/2,upper:l,upperInclusive:u},a)},resolveFunction:e=l,restrictions:s})}if(r){let e,t;return e=r.zComparisons,t=r.xyComparisons,eF({clippingInequalities:t.map(e=>({inclusive:ev(e.relation),relation:e.relation,valueAt:t=>{let{restrictionZ:n,x:i,y:r}=t;return(0,h.d)({constants:o,equation:e,resolveFunction:l,x:i,y:r,z:n})}})),constants:o,getRange:(t,n)=>{let i=-1/0,r=!1,s=1/0,u=!1;for(let a of e){let e=(0,h.e)({constants:o,tokens:a.expression,resolveFunction:l,x:t,y:n});if(!Number.isFinite(e))return null;"<"===a.relation||"<="===a.relation?e<s&&(s=e,u=ev(a.relation)):e>i&&(i=e,r=ev(a.relation))}return ew({lower:i,lowerInclusive:r,restrictionZ:(i+s)/2,upper:s,upperInclusive:u},a)},resolveFunction:l,restrictions:s})}if(t&&"z"===i){let n;return u=e.relation,n="<"===u||"<="===u,eF({clippingInequalities:[],constants:o,getRange:(e,i)=>{let r=(0,h.e)({constants:o,tokens:t,resolveFunction:l,x:e,y:i});if(!Number.isFinite(r))return null;let s=n?a.min:r,u=n?r:a.max;return ew({lower:s,restrictionZ:r,upper:u},a)},resolveFunction:l,restrictions:s})}return J(((e,t,n,i,r)=>{let o=[],s=[],a=[],l=[],u=(i,o,s)=>(0,h.f)({constants:t,equation:e,resolveFunction:r,x:i,y:o,z:s})&&(0,m.a)(n,{x:i,y:o});for(let e=0;e<=24;e+=1){let t=i.min+(i.max-i.min)*e/24;for(let e=0;e<=48;e+=1){let n=-10+20*e/48;for(let e=0;e<=48;e+=1){let i=-10+20*e/48;a.push(u(i,n,t))}}}let d=(e,t,n)=>2401*n+49*t+e,c=(e,t,n)=>48*n*48+48*t+e;for(let e=0;e<24;e+=1)for(let t=0;t<48;t+=1)for(let n=0;n<48;n+=1){let r=[a[d(n,t,e)],a[d(n+1,t,e)],a[d(n,t+1,e)],a[d(n+1,t+1,e)],a[d(n,t,e+1)],a[d(n+1,t,e+1)],a[d(n,t+1,e+1)],a[d(n+1,t+1,e+1)]],o=-10+20*(n+.5)/48,s=-10+20*(t+.5)/48,f=i.min+(i.max-i.min)*(e+.5)/24;l[c(n,t,e)]=r.some(Boolean)||u(o,s,f)}let f=function(){for(var e=arguments.length,t=Array(e),n=0;n<e;n++)t[n]=arguments[n];ex(o,s,...t)},p=(e,t,n)=>e>=0&&e<48&&t>=0&&t<48&&n>=0&&n<24&&l[c(e,t,n)];for(let e=0;e<24;e+=1){let t=i.min+(i.max-i.min)*e/24,n=i.min+(i.max-i.min)*(e+1)/24;for(let i=0;i<48;i+=1){let r=-10+20*i/48,o=-10+20*(i+1)/48;for(let s=0;s<48;s+=1){if(!p(s,i,e))continue;let a=-10+20*s/48,l=-10+20*(s+1)/48;p(s,i,e-1)||f([a,o,t],[l,o,t],[l,r,t],[a,r,t]),p(s,i,e+1)||f([a,r,n],[l,r,n],[l,o,n],[a,o,n]),p(s-1,i,e)||f([a,r,t],[a,r,n],[a,o,n],[a,o,t]),p(s+1,i,e)||f([l,o,t],[l,o,n],[l,r,n],[l,r,t]),p(s,i-1,e)||f([l,r,t],[l,r,n],[a,r,n],[a,r,t]),p(s,i+1,e)||f([a,o,t],[a,o,n],[l,o,n],[l,o,t])}}}return K(o,s)})(e,o,s,a,l))}if(eh(e)){if("prism-2d-inequality"===r)return eF({clippingInequalities:((0,h.j)(e)?e.comparisons:[e]).map(e=>({inclusive:ev(e.relation),relation:e.relation,valueAt:t=>{let{x:n,y:i}=t;return(0,h.c)({constants:o,equation:e,resolveFunction:l,x:n,y:i})}})),constants:o,getRange:()=>({lower:a.min,restrictionZ:0,upper:a.max}),resolveFunction:l,restrictions:s});return J(ef({columnSteps:96,getPoint:(t,n)=>{let i=-10+20*t/96,r=-10+20*n/96;return(0,h.f)({constants:o,equation:e,resolveFunction:l,x:i,y:r})&&(0,m.a)(s,{x:i,y:r})?[i,r,.01]:null},rowSteps:96}))}if(n)return J(((e,t,n,i,r)=>{let o=[],s=[],a=new Map,l=[];for(let n=0;n<=96;n+=1){let i=-10+20*n/96;for(let n=0;n<=96;n+=1){let o=-10+20*n/96;l.push({value:(0,h.e)({constants:t,tokens:e,x:o,y:i,resolveFunction:r}),x:o,y:i})}}let u=e=>{let t=v(e),n=t.map(e=>e.toFixed(10)).join(":"),i=a.get(n);if(null!=i)return i;let r=o.length/3;return a.set(n,r),o.push(...t),r},d=(e,t)=>{for(let r=1;r<e.length-1;r+=1){let o=[e[0],e[r],e[r+1]].map(e=>{let{value:n,x:i,y:r}=e;return[i,r,t*Math.sqrt(Math.max(0,n))]});if(!o.every(e=>{let[t,r,o]=e;return T(o,i)&&(0,m.a)(n,{x:t,y:r})}))continue;let a=o.map(u);s.push(...1===t?a:[a[0],a[2],a[1]])}},c=(e,t)=>l[97*t+e];for(let e=0;e<96;e+=1)for(let t=0;t<96;t+=1){let n=c(t,e),i=c(t+1,e),r=c(t,e+1);for(let o of[[n,r,i],[i,r,c(t+1,e+1)]]){let e=ep(o);e.length<3||(d(e,1),d(e,-1))}}return K(o,s)})(n,o,s,a,l));if(t&&i){let e;return J("z"===i?ef({columnSteps:96,getPoint:(e,n)=>{let i=-10+20*e/96,r=-10+20*n/96,u=(0,h.e)({constants:o,tokens:t,x:i,y:r,resolveFunction:l});return Number.isFinite(u)&&T(u,a)&&(0,m.a)(s,{x:i,y:r})?[i,r,u]:null},rowSteps:96}):(e=Array.from({length:97},(e,n)=>(0,h.e)({constants:o,tokens:t,x:-10+20*n/96,resolveFunction:l})),ef({columnSteps:96,getPoint:(t,n)=>{let i=-10+20*t/96,r=e[t],o=a.min+(a.max-a.min)*n/24;return Number.isFinite(r)&&10>=Math.abs(r)&&(0,m.a)(s,{x:i,y:r})?[i,r,o]:null},rowSteps:24})))}return J((e=>{let{constants:t,equation:n,resolveFunction:i,restrictions:r,zRange:o}=e,s=new d.A;return s.setAttribute("position",new d.ub((e=>{let{constants:t,equation:n,resolveFunction:i,restrictions:r=[],zRange:o={max:10,min:-10}}=e,s=[],a=[];for(let e=0;e<=24;e+=1){let s=o.min+(o.max-o.min)*e/24;for(let e=0;e<=48;e+=1){let o=-10+20*e/48;for(let e=0;e<=48;e+=1){let l=-10+20*e/48;a.push((0,m.a)(r,{x:l,y:o})?(0,h.d)({constants:t,equation:n,resolveFunction:i,x:l,y:o,z:s}):0/0)}}}let l=(e,t,n)=>a[2401*n+49*t+e];for(let e=0;e<24;e+=1)for(let t=0;t<48;t+=1)for(let n=0;n<48;n+=1){let i=g.map(i=>{let[r,s,a]=i;return{point:[-10+20*(n+r)/48,-10+20*(t+s)/48,o.min+(o.max-o.min)*(e+a)/24],value:l(n+r,t+s,e+a)}});if(!i.some(e=>!Number.isFinite(e.value))){for(let e of b)if(C(s,e.map(e=>i[e])),s.length/9>=7e4)return s}}return s})({constants:t,equation:n,resolveFunction:i,restrictions:r,zRange:o}),3)),s.computeVertexNormals(),s})({constants:o,equation:e,resolveFunction:l,restrictions:s,zRange:a}))})(L,s,u,r,p,P,F,y,c),[r,s,u,P,L,F,c,p,y]);return(0,l.useEffect)(()=>()=>{R.geometry.dispose(),R.inclusiveBoundaryGeometry?.dispose()},[R]),(0,i.jsxs)(i.Fragment,{children:[(0,i.jsxs)($,{geometry:R.geometry,onPointerMove:a?e=>{e.stopPropagation(),S(x([e.point.x,e.point.y,e.point.z]))}:void 0,onPointerOut:a?()=>S(null):void 0,children:[(0,i.jsx)(X,{color:t,depthWrite:!M,metalness:.05,opacity:E||M?.31:.82,roughness:.7,side:2,transparent:!0}),w?(0,i.jsxs)($,{position:v(w),raycast:()=>null,children:[(0,i.jsx)(Z,{args:[.14,16,16]}),(0,i.jsx)(G,{color:t}),(0,i.jsx)(ec,{color:t,point:w})]}):null]}),R.inclusiveBoundaryGeometry?(0,i.jsx)($,{geometry:R.inclusiveBoundaryGeometry,raycast:()=>null,children:(0,i.jsx)(X,{color:t,depthWrite:!1,metalness:.05,opacity:.82,roughness:.7,side:2,transparent:!0})}):null]})},eO=e=>{let t,{color:n,constants:r,equation:o,renderPlan:s,resolveFunction:a,restrictions:u}=e,d=(0,h.l)(o.relation)&&("<"===(t=o.relation)||">"===t),c=(0,l.useMemo)(()=>{if("implicit"===s.kind)return"implicit-2d"!==o.kind?[]:(e=>{let{constants:t,equation:n,resolveFunction:i,restrictions:r=[]}=e,o=[];for(let e=0;e<=96;e+=1){let s=-10+20*e/96;for(let e=0;e<=96;e+=1){let a=-10+20*e/96;o.push({point:[a,s,0],value:(0,m.a)(r,{x:a,y:s})?(0,h.d)({constants:t,equation:n,resolveFunction:i,x:a,y:s,z:0}):0/0})}}let s=(e,t)=>o[97*t+e],a=[];for(let e=0;e<96;e+=1)for(let t=0;t<96;t+=1){let n=y.map(n=>{let[i,r]=n;return s(t+i,e+r)});if(!n.some(e=>!Number.isFinite(e.value)))for(let e of S)L(a,e.map(e=>n[e]))}return(e=>{let t=new Map;for(let[n,i]of e.entries())for(let e of i){let i=F(e),r=t.get(i);r?r.push(n):t.set(i,[n])}let n=new Set(e.keys()),i=i=>{let r=F(i),o=t.get(r)?.find(e=>n.has(e));if(void 0===o)return null;n.delete(o);let[s,a]=e[o];return F(s)===r?a:s},r=[];for(;n.size>0;){let t=n.values().next().value;if(void 0===t)break;n.delete(t);let o=[...e[t]],s=i(o[o.length-1]);for(;s;)o.push(s),s=i(s);let a=i(o[0]);for(;a;)o.unshift(a),a=i(a);r.push(o)}return r})(a)})({constants:r,equation:o,resolveFunction:a,restrictions:u});let e=[];for(let t of s.expressions){let n=[];for(let i=0;i<=320;i+=1){let o=-10+20*i/320,s=(0,h.e)({constants:r,tokens:t,resolveFunction:a,x:o});if(!Number.isFinite(s)||Math.abs(s)>10||!(0,m.a)(u,{x:o,y:s})){n.length>1&&e.push(n),n=[];continue}n.push(v([o,s,0]))}n.length>1&&e.push(n)}return e},[r,o,s,a,u]);return(0,i.jsx)(i.Fragment,{children:c.map((e,t)=>(0,i.jsx)(Y,{color:n,dashSize:.3,dashed:d,gapSize:.16,lineWidth:2,points:e},`${e[0].join(":")}:${t}`))})},ek=e=>{let{color:t,connectPoints:n,interactive:r,points:o}=e,[s,a]=(0,l.useState)(null),u=r?e=>{e.stopPropagation();let t=x([e.point.x,e.point.y,e.point.z]),n=0,i=1/0;for(let[e,r]of o.entries()){let o=r.reduce((e,n,i)=>e+(n-t[i])**2,0);o<i&&(i=o,n=e)}a(n)}:void 0,d=r?()=>a(null):void 0;return(0,i.jsxs)(i.Fragment,{children:[n&&o.length>1?(0,i.jsx)(Y,{color:t,lineWidth:2,onPointerMove:u,onPointerOut:d,points:o.map(v)}):null,o.map((e,n)=>(0,i.jsxs)($,{onPointerMove:u,onPointerOut:d,position:v(e),children:[(0,i.jsx)(Z,{args:[.16,16,16]}),(0,i.jsx)(G,{color:t}),s===n?(0,i.jsx)(ec,{color:t,point:e}):null]},`${e.join(":")}:${n}`))]})},eI=e=>{let{ariaLabel:t,constants:n,interactive:r,onViewportPan:o,onViewportReset:s,plots:a,resolveFunction:c}=e,f=(0,u.a)(),m=(0,l.useRef)(null),v=(0,l.useRef)(null),x=(0,l.useRef)(null),[g,y]=(0,l.useState)(O),[b,w]=(0,l.useState)(!1),S=f.formatMessage({id:"learning_blocks.graphing_calculator.viewport.reset",defaultMessage:"Reset viewport"}),M=f.formatMessage({id:"learning_blocks.graphing_calculator.viewport.xy_orientation",defaultMessage:"XY orientation"});(0,l.useEffect)(()=>{let e=v.current;if(!e)return;let t=()=>{y("dark"===getComputedStyle(e).colorScheme?"#a8adb4":O)};t();let n=new MutationObserver(t);n.observe(document.documentElement,{attributeFilter:["class","style"],attributes:!0});let i=new ResizeObserver(t=>{let[n]=t,i=m.current,{height:r,width:o}=n.contentRect;if(!i||!r||!o)return;i.aspect=o/r,i.updateProjectionMatrix();let s=new d.Xd;for(let t of e.querySelectorAll("[data-graph-axis-position]")){let e=t.parentElement?.parentElement;if(!e)continue;let[n,a,l]=t.dataset.graphAxisPosition.split(",").map(Number);s.set(n,a,l).project(i),e.style.transform=`translate3d(${(s.x+1)*o/2}px, ${(1-s.y)*r/2}px, 0) scale(1)`}});return i.observe(e),()=>{n.disconnect(),i.disconnect()}},[]);let E=e=>{let t=x.current;t&&(t.object.position.set(...e),t.target.set(0,0,0),t.update())},j=()=>{let e=x.current;e&&w(W.some((t,n)=>Math.abs(t-e.object.position.getComponent(n))>1e-6)||e.target.lengthSq()>1e-12)};return(0,i.jsxs)("div",{className:`relative aspect-[4/3] w-full min-w-0${r?"":" pointer-events-none"}`,ref:v,style:{containerType:"inline-size"},children:[(0,i.jsxs)(H,{"aria-label":t,camera:{fov:42,position:W},frameloop:"demand",onCreated:e=>{let{camera:t,gl:n}=e;m.current=t,t.userData.graphContainer=v.current,n.domElement.classList.add("size-full!")},role:"img",children:[(0,i.jsx)("ambientLight",{intensity:1.1}),(0,i.jsx)("directionalLight",{intensity:1.4,position:[6,10,8]}),(0,i.jsx)("gridHelper",{args:[20,20,"#d1d5db","#e5e7eb"]}),(0,i.jsx)(ed,{color:g}),(0,i.jsx)(el,{}),a.map(e=>{if("curve"===e.kind)return(0,i.jsx)(eO,{color:e.color,constants:n,equation:e.equation,renderPlan:e.renderPlan,resolveFunction:c,restrictions:e.restrictions},e.id);if("table"===e.kind)return(0,i.jsx)(ek,{color:e.color,connectPoints:e.connectPoints,interactive:r,points:e.points},e.id);let t={color:e.color,constants:n,interactive:r,resolveFunction:c,restrictions:e.restrictions,zRange:N},o=n=>{let{equation:r,keyPrefix:o,renderPlan:s,surfaceStyle:a}=n,l=s??e.renderPlan,u="explicit"===l.kind&&"z"===l.dependentVariable&&em(r)&&l.relation!==r.relation?{...r,relation:l.relation}:r;return"explicit"===l.kind?"z"===l.dependentVariable&&2===l.expressions.length&&l.mirroredRadicand?[(0,i.jsx)(eU,{dependentVariable:"z",equation:u,expression:null,mirroredRadicand:l.mirroredRadicand,surfaceStyle:a,...t},`${o}:mirrored`)]:l.expressions.map((e,n)=>(0,i.jsx)(eU,{dependentVariable:l.dependentVariable,equation:u,expression:e,mirroredRadicand:null,surfaceStyle:a,...t},`${o}:${n}`)):[(0,i.jsx)(eU,{dependentVariable:null,equation:u,expression:null,mirroredRadicand:null,surfaceStyle:a,...t},o)]},s=(t,r,o)=>(0,i.jsx)(eO,{color:e.color,constants:n,equation:t,renderPlan:r,resolveFunction:c,restrictions:e.restrictions},o),a=eh(e.equation)?(0,h.j)(e.equation)?e.equation.comparisons.map((t,i)=>s(t,(0,h.h)(t,{constants:n,resolveFunction:c}),`${e.id}:boundary:${i}`)):[s(e.equation,e.renderPlan,`${e.id}:boundary`)]:[],l=(t,i)=>{if(i&&!(0,h.k)(e.equation)&&"compound-2d-inequality"!==e.equation.kind){var r,s;ev(e.equation.relation)&&(r={...e.equation,relation:"="},s=`${e.id}:equality`,t.push(...o({equation:r,keyPrefix:s,renderPlan:(0,h.h)(r,{constants:n,resolveFunction:c})})))}};if(a.length>0){let t=o({equation:e.equation,keyPrefix:e.id,surfaceStyle:e.surfaceStyle});return l(t,"prism-2d-inequality"===e.surfaceStyle),t.push(...a),t}let u=o({equation:e.equation,keyPrefix:e.id,surfaceStyle:e.surfaceStyle});return l(u,em(e.equation)),u}),(0,i.jsx)(V,{enablePan:r,enableRotate:r,enableZoom:r,makeDefault:!0,maxDistance:37.5,minDistance:3,onEnd:()=>{j(),o?.()},ref:x,target:[0,0,0]})]}),r?(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)("button",{"aria-label":S,onClick:()=>{E(W),s?.(),w(!1)},style:{...ei,opacity:+!!b,pointerEvents:b?"auto":"none",transform:b?"translateY(0)":"translateY(6px)"},title:S,type:"button",children:(0,i.jsxs)("svg",{width:"16",height:"16",viewBox:"0 0 20 20",fill:"none",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"1.5","aria-hidden":"true",children:[(0,i.jsx)("path",{d:"M16 10a6 6 0 1 1-1.76-4.24"}),(0,i.jsx)("path",{d:"M16 4v4h-4"})]})}),(0,i.jsx)("div",{style:et,children:(0,i.jsx)("button",{"aria-label":M,onClick:()=>{E(I),j(),o?.()},style:en,title:M,type:"button",children:(0,i.jsx)(p,{"aria-hidden":"true"})})})]}):null]})}},cVOc(e,t,n){let i=[2,3,4,5],r=new Map,o=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:2,n=Number(e.toFixed(t));return 0===n?0:n};n.d(t,{},{a:function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:2,n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"en-US",i=`${n}:${t}`,s=r.get(i);return s||(s=new Intl.NumberFormat(n,{maximumFractionDigits:t,useGrouping:!1}),r.set(i,s)),s.format(o(e,t))},b:e=>{if(null==e)return 2;let t=Math.abs(e[1]-e[0]);return!Number.isFinite(t)||t<=0?2:t<=2?4:t<=30?3:t<=200?2:+(t<=1e3)},c:o,d:e=>{let{value:t,displayPrecision:n,valuePixel:r,getPixelForValue:s}=e,a=null,l=1/0;for(let e=n-2;e>=0;e-=1){let u=i[Math.min(n-e-2,i.length-1)],d=o(t,e),c=s(d);if(!Number.isFinite(c))continue;let f=s(d+10**-e),p=Number.isFinite(f)?.05*Math.abs(f-c):u,h=Math.abs(c-r);h<=Math.min(u,p)&&h<l-1e-6&&(a=d,l=h)}return a??o(t,n)}})}};