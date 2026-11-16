export const __rspack_esm_ids=[930704];export const __webpack_modules__={Ipng(e,t,n){let r,i;n.d(t,{a:()=>U});var a=n("unhp"),o=n("zd8w"),s=n("PVZC"),l=n("hPwS");let c=new s.v,d=new s.Xd;class u extends s.Kb{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new s.ub([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new s.ub([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new s.Lb(t,6,1);return this.setAttribute("instanceStart",new s.Rb(n,3,0)),this.setAttribute("instanceEnd",new s.Rb(n,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,t=3){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));let r=new s.Lb(n,2*t,1);return this.setAttribute("instanceColorStart",new s.Rb(r,t,0)),this.setAttribute("instanceColorEnd",new s.Rb(r,t,t)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new s.fe(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new s.v);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),c.setFromBufferAttribute(t),this.boundingBox.union(c))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new s.td),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)d.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(d)),d.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(d));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}var p=n("STXV");let f=parseInt("179".replace(/\D+/g,""));class m extends s.jd{constructor(e){super({type:"LineMaterial",uniforms:s.Vd.clone(s.Vd.merge([p.UniformsLib.common,p.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new s.Wd(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}let h=f>=125?"uv1":"uv2",g=new s.Yd,v=new s.Xd,y=new s.Xd,x=new s.Yd,b=new s.Yd,w=new s.Yd,S=new s.Xd,M=new s.sc,E=new s.ac,A=new s.Xd,j=new s.v,L=new s.td,P=new s.Yd;function _(e,t,n){return P.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),P.multiplyScalar(1/P.w),P.x=i/n.width,P.y=i/n.height,P.applyMatrix4(e.projectionMatrixInverse),P.multiplyScalar(1/P.w),Math.abs(Math.max(P.x,P.y))}class z extends s.tc{constructor(e=new u,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,a=t.count;e<a;e++,i+=2)v.fromBufferAttribute(t,e),y.fromBufferAttribute(n,e),r[i]=0===i?0:r[i-1],r[i+1]=r[i]+v.distanceTo(y);let i=new s.Lb(r,2,1);return e.setAttribute("instanceDistanceStart",new s.Rb(i,1,0)),e.setAttribute("instanceDistanceEnd",new s.Rb(i,1,1)),this}raycast(e,t){let n,a,o=this.material.worldUnits,l=e.camera;null!==l||o||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let c=void 0!==e.params.Line2&&e.params.Line2.threshold||0;r=e.ray;let d=this.matrixWorld,u=this.geometry,p=this.material;if(i=p.linewidth+c,null===u.boundingSphere&&u.computeBoundingSphere(),L.copy(u.boundingSphere).applyMatrix4(d),o)n=.5*i;else{let e=Math.max(l.near,L.distanceToPoint(r.origin));n=_(l,e,p.resolution)}if(L.radius+=n,!1!==r.intersectsSphere(L)){if(null===u.boundingBox&&u.computeBoundingBox(),j.copy(u.boundingBox).applyMatrix4(d),o)a=.5*i;else{let e=Math.max(l.near,j.distanceToPoint(r.origin));a=_(l,e,p.resolution)}j.expandByScalar(a),!1!==r.intersectsBox(j)&&(o?function(e,t){let n=e.matrixWorld,a=e.geometry,o=a.attributes.instanceStart,l=a.attributes.instanceEnd,c=Math.min(a.instanceCount,o.count);for(let a=0;a<c;a++){E.start.fromBufferAttribute(o,a),E.end.fromBufferAttribute(l,a),E.applyMatrix4(n);let c=new s.Xd,d=new s.Xd;r.distanceSqToSegment(E.start,E.end,d,c),d.distanceTo(c)<.5*i&&t.push({point:d,pointOnLine:c,distance:r.origin.distanceTo(d),object:e,face:null,faceIndex:a,uv:null,[h]:null})}}(this,t):function(e,t,n){let a=t.projectionMatrix,o=e.material.resolution,l=e.matrixWorld,c=e.geometry,d=c.attributes.instanceStart,u=c.attributes.instanceEnd,p=Math.min(c.instanceCount,d.count),f=-t.near;r.at(1,w),w.w=1,w.applyMatrix4(t.matrixWorldInverse),w.applyMatrix4(a),w.multiplyScalar(1/w.w),w.x*=o.x/2,w.y*=o.y/2,w.z=0,S.copy(w),M.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<p;t++){if(x.fromBufferAttribute(d,t),b.fromBufferAttribute(u,t),x.w=1,b.w=1,x.applyMatrix4(M),b.applyMatrix4(M),x.z>f&&b.z>f)continue;if(x.z>f){let e=x.z-b.z,t=(x.z-f)/e;x.lerp(b,t)}else if(b.z>f){let e=b.z-x.z,t=(b.z-f)/e;b.lerp(x,t)}x.applyMatrix4(a),b.applyMatrix4(a),x.multiplyScalar(1/x.w),b.multiplyScalar(1/b.w),x.x*=o.x/2,x.y*=o.y/2,b.x*=o.x/2,b.y*=o.y/2,E.start.copy(x),E.start.z=0,E.end.copy(b),E.end.z=0;let c=E.closestPointToPointParameter(S,!0);E.at(c,A);let p=s.pc.lerp(x.z,b.z,c),m=p>=-1&&p<=1,g=S.distanceTo(A)<.5*i;if(m&&g){E.start.fromBufferAttribute(d,t),E.end.fromBufferAttribute(u,t),E.start.applyMatrix4(l),E.end.applyMatrix4(l);let i=new s.Xd,a=new s.Xd;r.distanceSqToSegment(E.start,E.end,a,i),n.push({point:a,pointOnLine:i,distance:r.origin.distanceTo(a),object:e,face:null,faceIndex:t,uv:null,[h]:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(g),this.material.uniforms.resolution.value.set(g.z,g.w))}}class k extends u{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){let t=e.length-3,n=new Float32Array(2*t);for(let r=0;r<t;r+=3)n[2*r]=e[r],n[2*r+1]=e[r+1],n[2*r+2]=e[r+2],n[2*r+3]=e[r+3],n[2*r+4]=e[r+4],n[2*r+5]=e[r+5];return super.setPositions(n),this}setColors(e,t=3){let n=e.length-t,r=new Float32Array(2*n);if(3===t)for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5];else for(let i=0;i<n;i+=t)r[2*i]=e[i],r[2*i+1]=e[i+1],r[2*i+2]=e[i+2],r[2*i+3]=e[i+3],r[2*i+4]=e[i+4],r[2*i+5]=e[i+5],r[2*i+6]=e[i+6],r[2*i+7]=e[i+7];return super.setColors(r,t),this}fromLine(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class C extends z{constructor(e=new k,t=new m({color:0xffffff*Math.random()})){super(e,t),this.isLine2=!0,this.type="Line2"}}let U=o.forwardRef(function({points:e,color:t=0xffffff,vertexColors:n,linewidth:r,lineWidth:i,segments:c,dashed:d,...p},f){var h,g;let v=(0,l.C)(e=>e.size),y=o.useMemo(()=>c?new z:new C,[c]),[x]=o.useState(()=>new m),b=(null==n||null==(h=n[0])?void 0:h.length)===4?4:3,w=o.useMemo(()=>{let r=c?new u:new k,i=e.map(e=>{let t=Array.isArray(e);return e instanceof s.Xd||e instanceof s.Yd?[e.x,e.y,e.z]:e instanceof s.Wd?[e.x,e.y,0]:t&&3===e.length?[e[0],e[1],e[2]]:t&&2===e.length?[e[0],e[1],0]:e});if(r.setPositions(i.flat()),n){t=0xffffff;let e=n.map(e=>e instanceof s.K?e.toArray():e);r.setColors(e.flat(),b)}return r},[e,c,n,b]);return o.useLayoutEffect(()=>{y.computeLineDistances()},[e,y]),o.useLayoutEffect(()=>{d?x.defines.USE_DASH="":delete x.defines.USE_DASH,x.needsUpdate=!0},[d,x]),o.useEffect(()=>()=>{w.dispose(),x.dispose()},[w]),o.createElement("primitive",(0,a.a)({object:y,ref:f},p),o.createElement("primitive",{object:w,attach:"geometry"}),o.createElement("primitive",(0,a.a)({object:x,attach:"material",color:t,vertexColors:!!n,resolution:[v.width,v.height],linewidth:null!=(g=null!=r?r:i)?g:1,dashed:d,transparent:4===b},p)))})},mevF(e,t,n){let r,i;var a=n("unhp"),o=n("zd8w"),s=n("CE87"),l=n("PVZC"),c=n("hPwS");let d=new l.Xd,u=new l.Xd,p=new l.Xd,f=new l.Wd;function m(e,t,n){let r=d.setFromMatrixPosition(e.matrixWorld);r.project(t);let i=n.width/2,a=n.height/2;return[r.x*i+i,-(r.y*a)+a]}let h=e=>1e-10>Math.abs(e)?0:e;function g(e,t,n=""){let r="matrix3d(";for(let n=0;16!==n;n++)r+=h(t[n]*e.elements[n])+(15!==n?",":")");return n+r}let v=(r=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],e=>g(e,r)),y=(i=e=>[1/e,1/e,1/e,1,-1/e,-1/e,-1/e,-1,1/e,1/e,1/e,1,1,1,1,1],(e,t)=>g(e,i(t),"translate(-50%,-50%)")),x=o.forwardRef(({children:e,eps:t=.001,style:n,className:r,prepend:i,center:g,fullscreen:x,portal:b,distanceFactor:w,sprite:S=!1,transform:M=!1,occlude:E,onOcclude:A,castShadow:j,receiveShadow:L,material:P,geometry:_,zIndexRange:z=[0x1000037,0],calculatePosition:k=m,as:C="div",wrapperClass:U,pointerEvents:D="auto",...O},R)=>{let{gl:T,camera:I,scene:B,size:W,raycaster:N,events:H,viewport:$}=(0,c.C)(),[F]=o.useState(()=>document.createElement(C)),X=o.useRef(null),V=o.useRef(null),G=o.useRef(0),Y=o.useRef([0,0]),Z=o.useRef(null),K=o.useRef(null),q=(null==b?void 0:b.current)||H.connected||T.domElement.parentNode,Q=o.useRef(null),J=o.useRef(!1),ee=o.useMemo(()=>{var e;return E&&"blending"!==E||Array.isArray(E)&&E.length&&(e=E[0])&&"object"==typeof e&&"current"in e},[E]);o.useLayoutEffect(()=>{let e=T.domElement;E&&"blending"===E?(e.style.zIndex=`${Math.floor(z[0]/2)}`,e.style.position="absolute",e.style.pointerEvents="none"):(e.style.zIndex=null,e.style.position=null,e.style.pointerEvents=null)},[E]),o.useLayoutEffect(()=>{if(V.current){let e=X.current=s.createRoot(F);if(B.updateMatrixWorld(),M)F.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let e=k(V.current,I,W);F.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${e[0]}px,${e[1]}px,0);transform-origin:0 0;`}return q&&(i?q.prepend(F):q.appendChild(F)),()=>{q&&q.removeChild(F),e.unmount()}}},[q,M]),o.useLayoutEffect(()=>{U&&(F.className=U)},[U]);let et=o.useMemo(()=>M?{position:"absolute",top:0,left:0,width:W.width,height:W.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:g?"translate3d(-50%,-50%,0)":"none",...x&&{top:-W.height/2,left:-W.width/2,width:W.width,height:W.height},...n},[n,g,x,W,M]),en=o.useMemo(()=>({position:"absolute",pointerEvents:D}),[D]);o.useLayoutEffect(()=>{var t,i;J.current=!1,M?null==(t=X.current)||t.render(o.createElement("div",{ref:Z,style:et},o.createElement("div",{ref:K,style:en},o.createElement("div",{ref:R,className:r,style:n,children:e})))):null==(i=X.current)||i.render(o.createElement("div",{ref:R,style:et,className:r,children:e}))});let er=o.useRef(!0);(0,c.D)(e=>{if(V.current){I.updateMatrixWorld(),V.current.updateWorldMatrix(!0,!1);let e=M?Y.current:k(V.current,I,W);if(M||Math.abs(G.current-I.zoom)>t||Math.abs(Y.current[0]-e[0])>t||Math.abs(Y.current[1]-e[1])>t){var n;let t,r,i,a,o=(n=V.current,t=d.setFromMatrixPosition(n.matrixWorld),r=u.setFromMatrixPosition(I.matrixWorld),i=t.sub(r),a=I.getWorldDirection(p),i.angleTo(a)>Math.PI/2),s=!1;ee&&(Array.isArray(E)?s=E.map(e=>e.current):"blending"!==E&&(s=[B]));let c=er.current;s?er.current=function(e,t,n,r){let i=d.setFromMatrixPosition(e.matrixWorld),a=i.clone();a.project(t),f.set(a.x,a.y),n.setFromCamera(f,t);let o=n.intersectObjects(r,!0);if(o.length){let e=o[0].distance;return i.distanceTo(n.ray.origin)<e}return!0}(V.current,I,N,s)&&!o:er.current=!o,c!==er.current&&(A?A(!er.current):F.style.display=er.current?"block":"none");let m=Math.floor(z[0]/2),g=E?ee?[z[0],m]:[m-1,0]:z;if(F.style.zIndex=`${function(e,t,n){if(t instanceof l.Kc||t instanceof l.Ic){let r=d.setFromMatrixPosition(e.matrixWorld),i=u.setFromMatrixPosition(t.matrixWorld),a=r.distanceTo(i),o=(n[1]-n[0])/(t.far-t.near),s=n[1]-o*t.far;return Math.round(o*a+s)}}(V.current,I,g)}`,M){let[e,t]=[W.width/2,W.height/2],n=I.projectionMatrix.elements[5]*t,{isOrthographicCamera:r,top:i,left:a,bottom:o,right:s}=I,l=v(I.matrixWorldInverse),c=r?`scale(${n})translate(${h(-(s+a)/2)}px,${h((i+o)/2)}px)`:`translateZ(${n}px)`,d=V.current.matrixWorld;S&&((d=I.matrixWorldInverse.clone().transpose().copyPosition(d).scale(V.current.scale)).elements[3]=d.elements[7]=d.elements[11]=0,d.elements[15]=1),F.style.width=W.width+"px",F.style.height=W.height+"px",F.style.perspective=r?"":`${n}px`,Z.current&&K.current&&(Z.current.style.transform=`${c}${l}translate(${e}px,${t}px)`,K.current.style.transform=y(d,1/((w||10)/400)))}else{let t=void 0===w?1:function(e,t){if(t instanceof l.Ic)return t.zoom;if(!(t instanceof l.Kc))return 1;{let n=d.setFromMatrixPosition(e.matrixWorld),r=u.setFromMatrixPosition(t.matrixWorld);return 1/(2*Math.tan(t.fov*Math.PI/180/2)*n.distanceTo(r))}}(V.current,I)*w;F.style.transform=`translate3d(${e[0]}px,${e[1]}px,0) scale(${t})`}Y.current=e,G.current=I.zoom}}if(!ee&&Q.current&&!J.current)if(M){if(Z.current){let e=Z.current.children[0];if(null!=e&&e.clientWidth&&null!=e&&e.clientHeight){let{isOrthographicCamera:t}=I;if(t||_)O.scale&&(Array.isArray(O.scale)?O.scale instanceof l.Xd?Q.current.scale.copy(O.scale.clone().divideScalar(1)):Q.current.scale.set(1/O.scale[0],1/O.scale[1],1/O.scale[2]):Q.current.scale.setScalar(1/O.scale));else{let t=(w||10)/400,n=e.clientWidth*t,r=e.clientHeight*t;Q.current.scale.set(n,r,1)}J.current=!0}}}else{let t=F.children[0];if(null!=t&&t.clientWidth&&null!=t&&t.clientHeight){let e=1/$.factor,n=t.clientWidth*e,r=t.clientHeight*e;Q.current.scale.set(n,r,1),J.current=!0}Q.current.lookAt(e.camera.position)}});let ei=o.useMemo(()=>({vertexShader:M?void 0:`
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
      `}),[M]);return o.createElement("group",(0,a.a)({},O,{ref:V}),E&&!ee&&o.createElement("mesh",{castShadow:j,receiveShadow:L,ref:Q},_||o.createElement("planeGeometry",null),P||o.createElement("shaderMaterial",{side:2,vertexShader:ei.vertexShader,fragmentShader:ei.fragmentShader})))});n.d(t,{},{a:x})},SqdN(e,t,n){var r=n("ABep"),i=n("Qgfj"),a=n("Wf1j"),o=n("oyxz"),s=n("KwmQ"),l=n("pNxJ"),c=n("tkCL"),d=n("ElcG");let u=(0,i.f)({rankSelector:{id:"learningBlock.columnSpace.rankSelector",defaultMessage:"Matrix rank"},rankOption:{id:"learningBlock.columnSpace.rankOption",defaultMessage:"Rank {rank}"},inputVectorLegend:{id:"learningBlock.columnSpace.inputVectorLegend",defaultMessage:"Input vector"},columnSpaceLegend:{id:"learningBlock.columnSpace.columnSpaceLegend",defaultMessage:"Column space"},dragInstruction:{id:"learningBlock.columnSpace.dragInstruction",defaultMessage:"Drag the input vector"},inputVectorHandle:{id:"learningBlock.columnSpace.inputVectorHandle",defaultMessage:"Input vector, coordinates ({x}, {y}, {z})"},line:{id:"learningBlock.columnSpace.line",defaultMessage:"line"},plane:{id:"learningBlock.columnSpace.plane",defaultMessage:"plane"},space:{id:"learningBlock.columnSpace.space",defaultMessage:"three-dimensional space"},visualization:{id:"learningBlock.columnSpace.visualization",defaultMessage:"Rank {rank}. The column space is {shape, select, line {a line} plane {a plane} space {a three-dimensional space} other {a space}}. Input ({inputX}, {inputY}, {inputZ}) maps to ({outputX}, {outputY}, {outputZ})."}}),p=(e,t)=>e.formatNumber(Object.is(t,-0)?0:t,{maximumFractionDigits:3,useGrouping:!1});n.d(t,{},{ColumnSpaceCaption:e=>{let t,{values:n}=e,i=(0,a.a)(),o=(0,d.b)(n),l=`A=${(t=o.matrix,`\\begin{bmatrix}${t.map(e=>e.map(e=>p(i,e)).join("&")).join("\\\\")}\\end{bmatrix}`)},`,c=`\\operatorname{span}(A)=\\operatorname{span}\\left\\{${o.columnBasis.map(e=>`\\begin{bmatrix}${p(i,e.x)}\\\\${p(i,e.y)}\\\\${p(i,e.z)}\\end{bmatrix}`).join(",")}\\right\\}`;return(0,r.jsx)(s.a,{reserveLines:1,children:(0,r.jsxs)("div",{className:"flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1",children:[(0,r.jsx)("div",{className:"shrink-0",children:(0,r.jsx)(s.b,{content:l,format:"katex"})}),(0,r.jsx)("div",{className:"shrink-0",children:(0,r.jsx)(s.b,{content:c,format:"katex"})})]})})},ColumnSpaceControls:e=>{let{values:t,setValues:n}=e,i=(0,a.a)(),c=(0,d.e)(t);return(0,r.jsx)(s.c,{screenReaderContent:(0,r.jsx)(o.a,{id:"learningBlock.columnSpace.controlsDescription",defaultMessage:"Choose matrix rank one, two, or three. Drag the input vector to see its output remain in the selected matrix's column space."}),children:(0,r.jsx)(l.a,{inputs:[{min:1,max:3,step:1,value:c.rank,ariaLabel:i.formatMessage(u.rankSelector),options:[1,2,3].map(e=>({value:e,label:i.formatMessage(u.rankOption,{rank:p(i,e)})})),onChange:e=>n({...c,rank:e},"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")}]})})},ColumnSpaceVisualization:e=>{let{values:t,presentationMode:n,setValues:i}=e,s=(0,a.a)(),l=(0,d.e)(t),f=(0,d.b)(l),m="thumbnail"===n,h=s.formatMessage(u.inputVectorHandle,{x:p(s,f.input.x),y:p(s,f.input.y),z:p(s,f.input.z)}),g=(0,d.c)(f,h),v=s.formatMessage(u.visualization,{rank:p(s,f.rank),shape:f.columnSpaceShape,inputX:p(s,f.input.x),inputY:p(s,f.input.y),inputZ:p(s,f.input.z),outputX:p(s,f.output.x),outputY:p(s,f.output.y),outputZ:p(s,f.output.z)});return(0,r.jsxs)("div",{className:m?"relative h-full w-full":"relative w-full",children:[(0,r.jsx)(c.a,{scene:g,ariaLabel:v,presentationMode:n,onDragPoint:m?void 0:(e,t)=>i((0,d.d)(l,t),"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")}),m?null:(0,r.jsxs)("div",{"aria-hidden":"true",className:"pointer-events-none absolute start-3 top-3 flex flex-col gap-1.5 text-xs",children:[(0,r.jsx)(o.a,{...u.dragInstruction}),(0,r.jsxs)("div",{className:"flex flex-wrap items-center gap-x-3 gap-y-1",children:[(0,r.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,r.jsx)("span",{className:"size-2 rounded-full",style:{backgroundColor:"var(--learning-block-color-secondary)"}}),(0,r.jsx)(o.a,{...u.inputVectorLegend})]}),(0,r.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,r.jsx)("span",{className:"size-2 rounded-full",style:{backgroundColor:"var(--learning-block-color-primary)"}}),(0,r.jsx)(o.a,{...u.columnSpaceLegend})]})]})]})]})}})},tkCL(e,t,n){var r=n("ABep"),i=n("mevF"),a=n("Ipng"),o=n("Njew"),s=n("oeGO"),l=n("hPwS"),c=n("zd8w"),d=n("Qgfj"),u=n("Wf1j"),p=n("PVZC"),f=n("l7Go"),m=n("sCEh"),h=n("ZKaa");let g=s.a,v=i.a,y=a.a,x="group",b="mesh",w="sphereGeometry",S="meshBasicMaterial",M="meshStandardMaterial",E=Math.PI/12,A=(0,d.f)({cameraInstructions:{id:"learningBlock.multivariable.cameraInstructions",defaultMessage:"Use the arrow keys to rotate the three-dimensional scene"},pointInstructions:{id:"learningBlock.multivariable.pointInstructions",defaultMessage:"Use the arrow keys to move horizontally or vertically, and Page Up or Page Down to move in depth"},adjustPoint:{id:"learningBlock.multivariable.adjustPoint",defaultMessage:"Adjust point"}}),j={accent:"var(--learning-block-accent)",primary:"var(--learning-block-color-primary)",secondary:"var(--learning-block-color-secondary)",third:"var(--learning-block-color-third)",fourth:"var(--learning-block-color-fourth)",neutral:"var(--text-secondary)"},L=e=>{let{x:t,y:n,z:r}=e;return[t,n,r]},P=e=>{let{position:t}=e,n=(0,l.C)(e=>e.camera),r=(0,l.C)(e=>e.invalidate);return(0,c.useEffect)(()=>{n.position.set(t[0],t[1],t[2]),n.lookAt(0,0,0),n.updateMatrixWorld(),r()},[n,r,t[0],t[1],t[2]]),null},_=e=>{let{arrow:t,colors:n,showLabel:i}=e,a=t.from??(0,h.e)(0,0,0),o=(0,h.a)(t.to,(0,h.h)(a,-1)),s=(0,h.c)(o);if(s<1e-5)return null;let l=(0,h.d)(o),c=new p.Zc().setFromUnitVectors(new p.Xd(0,1,0),new p.Xd(l.x,l.y,l.z)),d=Math.min(t.headLength??(t.emphasis?.32:.24),.3*s),u=t.shaftRadius??(t.emphasis?.046:.034),m=t.headRadius??(t.emphasis?.13:.1),g=s-d,y=(0,h.a)(a,(0,h.h)(l,g/2)),w=(0,h.a)(a,(0,h.h)(l,g+d/2)),S=n[t.role??"primary"];return(0,r.jsxs)(x,{children:[(0,r.jsxs)(b,{position:L(y),quaternion:c.toArray(),children:[(0,r.jsx)("cylinderGeometry",{args:[u,u,g,16]}),(0,r.jsx)(M,{color:S,roughness:.45})]}),(0,r.jsxs)(b,{position:L(w),quaternion:c.toArray(),children:[(0,r.jsx)("coneGeometry",{args:[m,d,18]}),(0,r.jsx)(M,{color:S,roughness:.42})]}),i&&t.label?(0,r.jsx)(v,{center:!0,position:L((0,h.a)(t.to,(0,h.h)(l,.18))),children:(0,r.jsx)(f.a,{latex:t.label,className:"pointer-events-none text-xs font-semibold whitespace-nowrap",style:{color:S}})}):null]})},z=e=>{let{patch:t,colors:n}=e,i=(0,c.useMemo)(()=>{var e;let n;return e=t.corners,(n=new p.A).setAttribute("position",new p.ub([0,1,2,0,2,3].flatMap(t=>L(e[t])),3)),n.computeVertexNormals(),n},[t.corners]);return(0,r.jsx)(b,{geometry:i,renderOrder:1,children:(0,r.jsx)(S,{color:n[t.role??"secondary"],side:2,transparent:!0,opacity:t.opacity??.16,depthWrite:!1})})},k=(e,t)=>{if(!t)return e.length>1?[e]:[];let n=[],r=[];return e.forEach((e,i)=>{t[i]?r.push(e):(r.length>1&&n.push(r),r=[])}),r.length>1&&n.push(r),n},C=(0,c.memo)(function(e){let{surface:t,colors:n}=e,i=(0,c.useMemo)(()=>{let e=[];for(let n=0;n+1<t.grid.length;n+=1)for(let r=0;r+1<t.grid[n].length;r+=1){if(t.validity&&(!t.validity[n]?.[r]||!t.validity[n+1]?.[r]||!t.validity[n+1]?.[r+1]||!t.validity[n]?.[r+1]))continue;let i=t.grid[n][r],a=t.grid[n+1][r],o=t.grid[n+1][r+1],s=t.grid[n][r+1];e.push(...L(i),...L(a),...L(o)),e.push(...L(i),...L(o),...L(s))}let n=new p.A;return n.setAttribute("position",new p.ub(e,3)),n.computeVertexNormals(),n},[t.grid,t.validity]),a=n[t.role??"secondary"],o=t.grid[0]?.length??0,s=(0,c.useMemo)(()=>t.grid.flatMap((e,n)=>k(e,t.validity?.[n]).map((e,t)=>({key:`row-${n}-${t}`,points:e.map(L)}))),[t.grid,t.validity]),l=(0,c.useMemo)(()=>Array.from({length:o},(e,n)=>({points:t.grid.map(e=>e[n]),validity:t.validity?.map(e=>e[n])})).flatMap((e,t)=>{let{points:n,validity:r}=e;return k(n,r).map((e,n)=>({key:`column-${t}-${n}`,points:e.map(L)}))}),[o,t.grid,t.validity]);return(0,r.jsxs)(x,{children:[(0,r.jsx)(b,{geometry:i,renderOrder:1,children:(0,r.jsx)(S,{color:a,side:2,transparent:!0,opacity:t.opacity??.17,depthWrite:!1})}),s.map(e=>{let{key:n,points:i}=e;return(0,r.jsx)(y,{points:i,color:a,transparent:!0,opacity:t.wireOpacity??.5,lineWidth:.9},n)}),l.map(e=>{let{key:n,points:i}=e;return(0,r.jsx)(y,{points:i,color:a,transparent:!0,opacity:t.wireOpacity??.5,lineWidth:.9},n)})]})}),U=e=>{let{curtain:t,colors:n}=e,i=(0,c.useMemo)(()=>{let e=[],n=Math.min(t.upper.length,t.lower.length);for(let r=0;r+1<n;r+=1){let n=t.upper[r],i=t.upper[r+1],a=t.lower[r],o=t.lower[r+1];e.push(...L(n),...L(a),...L(o),...L(n),...L(o),...L(i))}let r=new p.A;return r.setAttribute("position",new p.ub(e,3)),r.computeVertexNormals(),r},[t.lower,t.upper]);return(0,r.jsx)(b,{geometry:i,renderOrder:1,children:(0,r.jsx)(S,{color:n[t.role??"primary"],side:2,transparent:!0,opacity:t.opacity??.22,depthWrite:!1})})},D=e=>{let{colors:t,extent:n,extents:i,labelScale:a=1,labels:o=["x","y","z"],showLabels:s}=e;return(0,r.jsx)(x,{children:[{endpoint:(0,h.e)(i?.[0]??n,0,0),label:o[0]},{endpoint:(0,h.e)(0,i?.[1]??n,0),label:o[1]},{endpoint:(0,h.e)(0,0,i?.[2]??n),label:o[2]}].map(e=>{let{endpoint:n,label:i}=e;return(0,r.jsxs)(x,{children:[(0,r.jsx)(y,{points:[L((0,h.h)(n,-1)),L(n)],color:t.neutral,transparent:!0,opacity:.32,lineWidth:.85}),s?(0,r.jsx)(v,{center:!0,position:L((0,h.h)(n,a)),children:(0,r.jsx)(f.a,{latex:i,className:"pointer-events-none text-xs whitespace-nowrap",style:{color:t.neutral}})}):null]},i)})})},O=e=>{let{colors:t,coordinateGroupRef:n,index:i,interactive:a,onDragActiveChange:o,onDragPoint:s,point:l,showLabel:d}=e,u=(0,c.useRef)(null),m=(0,c.useRef)(new p.Wd),g=(0,c.useRef)(null),y=a&&l.draggable&&void 0!==s,E=(e,t)=>{let n=e.nativeEvent.target;if(!(n instanceof HTMLElement))return e.ray;let r=t??n.getBoundingClientRect();return 0===r.width||0===r.height?e.ray:(m.current.set((e.nativeEvent.clientX-r.left)/r.width*2-1,-(2*((e.nativeEvent.clientY-r.top)/r.height))+1),g.current??=new p.dd,g.current.setFromCamera(m.current,e.camera),g.current.ray)},A=(e,t)=>{let n=e.nativeEvent.target;n instanceof HTMLElement&&(n.style.cursor=t)},j=e=>{if(void 0===l.hitTolerancePixels)return!0;let t=e.nativeEvent.target,r=n.current;if(!(t instanceof HTMLElement)||!r)return!0;let i=t.getBoundingClientRect();if(0===i.width||0===i.height)return!0;r.updateWorldMatrix(!0,!1);let a=t=>{let n=r.localToWorld(new p.Xd(t.x,t.y,t.z)).project(e.camera);return{x:i.left+(n.x+1)*i.width/2,y:i.top+(1-n.y)*i.height/2}},o=a(l.point),s=a(l.dragOrigin??l.point),c=o.x-s.x,d=o.y-s.y,u=c*c+d*d,f=u>0?Math.min(1,Math.max(0,((e.nativeEvent.clientX-s.x)*c+(e.nativeEvent.clientY-s.y)*d)/u)):1,m=s.x+f*c,h=s.y+f*d,g="touch"===e.nativeEvent.pointerType?Math.max(l.hitTolerancePixels,22):l.hitTolerancePixels;return Math.hypot(e.nativeEvent.clientX-m,e.nativeEvent.clientY-h)<=g},P=e=>{let t=u.current;if(t&&t.pointerId===e.pointerId){u.current=null,o(!1),A(e,"grab");try{e.target.releasePointerCapture?.(e.pointerId)}catch{}e.stopPropagation()}};return(0,r.jsxs)(x,{position:L(l.point),onPointerDown:y?e=>{if(!y||!j(e))return;let t=new p.Xd(l.point.x,l.point.y,l.point.z);n.current?.updateWorldMatrix(!0,!1),n.current?.localToWorld(t);let r=e.camera.getWorldDirection(new p.Xd),i=new p.Lc().setFromNormalAndCoplanarPoint(r,t),a=E(e).intersectPlane(i,new p.Xd);if(!a)return;let s=e.nativeEvent.target;if(!(s instanceof HTMLElement))return;let c=s.getBoundingClientRect();u.current={bounds:{height:c.height,left:c.left,top:c.top,width:c.width},offset:t.sub(a),plane:i,pointerId:e.pointerId},o(!0),A(e,"grabbing");try{e.target.setPointerCapture?.(e.pointerId)}catch{}e.stopPropagation()}:void 0,onPointerMove:y?e=>{let t=u.current;if(!y)return;if(!t)return void A(e,j(e)?"grab":"auto");if(t.pointerId!==e.pointerId)return;if(0===e.buttons)return void P(e);let r=E(e,t.bounds).intersectPlane(t.plane,new p.Xd);if(!r)return;let a=r.add(t.offset);n.current?.worldToLocal(a),s(i,(0,h.e)(a.x,a.y,a.z)),e.stopPropagation()}:void 0,onPointerUp:y?P:void 0,onPointerCancel:y?P:void 0,onLostPointerCapture:y?P:void 0,onPointerOver:y?e=>A(e,j(e)?"grab":"auto"):void 0,onPointerOut:y?e=>A(e,u.current?"grabbing":"auto"):void 0,children:[y?(0,r.jsxs)(b,{children:[(0,r.jsx)(w,{args:[l.hitRadius??.36,16,12]}),(0,r.jsx)(S,{transparent:!0,opacity:0,depthWrite:!1})]}):null,(0,r.jsxs)(b,{children:[(0,r.jsx)(w,{args:[l.radius??.085,20,16]}),(0,r.jsx)(M,{color:t[l.role??"accent"]})]}),d&&l.label?(0,r.jsx)(v,{center:!0,position:[.18,.14,0],children:(0,r.jsx)(f.a,{latex:l.label,className:"pointer-events-none text-xs font-semibold whitespace-nowrap",style:{color:t[l.role??"accent"]}})}):null]})},R=e=>{let{scene:t,ariaLabel:n,presentationMode:i,onDragPoint:a}=e,s=(0,u.a)(),l=(0,c.useRef)(null),d=(0,c.useRef)(null),p=(0,c.useRef)(null),f=(e=>{let[t,n]=(0,c.useState)(null);return(0,c.useEffect)(()=>{let t=e.current;if(!t)return;let r=()=>{let e=window.getComputedStyle(t),r=t=>e.getPropertyValue(t).trim()||e.color,i={accent:r("--learning-block-accent"),primary:r("--learning-block-color-primary"),secondary:r("--learning-block-color-secondary"),third:r("--learning-block-color-third"),fourth:r("--learning-block-color-fourth"),neutral:r("--text-secondary")};n(e=>e&&Object.keys(i).every(t=>e[t]===i[t])?e:i)};r();let i=new MutationObserver(r);return i.observe(document.documentElement,{attributes:!0,attributeFilter:["class","data-theme","style"]}),i.observe(t,{attributes:!0,attributeFilter:["class","style"]}),()=>i.disconnect()},[e]),t})(l),m=(e=>{let[t,n]=(0,c.useState)(()=>"u"<typeof IntersectionObserver);return(0,c.useEffect)(()=>{let t=e.current;if(!t||"u"<typeof IntersectionObserver)return;let r=new IntersectionObserver(e=>{let[t]=e;n(t?.isIntersecting??!1)});return r.observe(t),()=>r.disconnect()},[e]),t})(l),v="thumbnail"===i,M=!v&&"fixed"!==t.cameraControls,[j,k]=(0,c.useState)(!1),R=t.extent??2.8,T=t.camera??[2.5*R,-(1.9*R),2.7*R];return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("div",{ref:l,role:"img","aria-label":n,"aria-description":M?s.formatMessage(A.cameraInstructions):void 0,className:v?"text-token-text-primary relative h-full w-full overflow-hidden":"text-token-text-primary relative h-[246px] max-h-[270px] w-full overflow-hidden sm:h-[270px]",onKeyDown:M?e=>{let t=p.current;if(t){switch(e.key){case"ArrowLeft":t.setAzimuthalAngle(t.getAzimuthalAngle()+E);break;case"ArrowRight":t.setAzimuthalAngle(t.getAzimuthalAngle()-E);break;case"ArrowUp":t.setPolarAngle(t.getPolarAngle()-E);break;case"ArrowDown":t.setPolarAngle(t.getPolarAngle()+E);break;default:return}e.preventDefault()}}:void 0,tabIndex:M?0:void 0,children:f&&m?(0,r.jsxs)(g,{"data-learning-block-pan":M||!v&&a&&t.points?.some(e=>e.draggable)?"both":void 0,"aria-hidden":"true",camera:{position:T,fov:38},dpr:[1,1.5],frameloop:"demand",gl:{alpha:!0,antialias:!0,powerPreference:"low-power"},style:{height:"100%",touchAction:v?"auto":"none",width:"100%"},children:[(0,r.jsx)(P,{position:T}),(0,r.jsx)("ambientLight",{intensity:1.5}),(0,r.jsx)("directionalLight",{position:[5,6,8],intensity:1.5}),(0,r.jsxs)(x,{ref:d,rotation:"y"===t.upAxis?void 0:[-Math.PI/2,0,0],children:[t.hideAxes?null:(0,r.jsx)(D,{colors:f,extent:R,extents:t.axisExtents,labelScale:t.axisLabelScale,labels:t.axisLabels,showLabels:!v}),t.surfaces?.map((e,t)=>(0,r.jsx)(C,{surface:e,colors:f},`surface-${t}`)),t.patches?.map((e,t)=>(0,r.jsx)(z,{patch:e,colors:f},`patch-${t}`)),t.curtains?.map((e,t)=>(0,r.jsx)(U,{curtain:e,colors:f},`curtain-${t}`)),t.lines?.map((e,t)=>(0,r.jsx)(y,{points:e.points.map(L),color:f[e.role??"primary"],lineWidth:e.width??1.7,transparent:!0,opacity:e.opacity??.9},`line-${t}`)),t.spheres?.map((e,t)=>(0,r.jsxs)(x,{position:L(e.center??(0,h.e)(0,0,0)),children:[(0,r.jsxs)(b,{children:[(0,r.jsx)(w,{args:[e.radius,32,24]}),(0,r.jsx)(S,{color:f[e.role??"secondary"],transparent:!0,opacity:e.opacity??.15,depthWrite:!1,side:2})]}),(0,r.jsxs)(b,{children:[(0,r.jsx)(w,{args:[e.radius,18,12]}),(0,r.jsx)(S,{color:f[e.role??"secondary"],transparent:!0,opacity:.28,wireframe:!0})]})]},`sphere-${t}`)),t.arrows?.map((e,t)=>(0,r.jsx)(_,{arrow:e,colors:f,showLabel:!v},`arrow-${t}`)),t.points?.map((e,t)=>(0,r.jsx)(O,{point:e,index:t,colors:f,coordinateGroupRef:d,interactive:!v,onDragActiveChange:k,onDragPoint:a,showLabel:!v},`point-${t}`))]}),M?(0,r.jsx)(o.a,{ref:p,enabled:!j,enableDamping:!1,enablePan:!1,enableZoom:!1,minPolarAngle:.18,maxPolarAngle:Math.PI-.18}):null]}):null}),!v&&a?t.points?.map((e,t)=>e.draggable?(0,r.jsx)("button",{type:"button","aria-label":e.ariaLabel,"aria-description":s.formatMessage(A.pointInstructions),className:"bg-token-main-surface-primary sr-only start-3 bottom-3 z-10 rounded-md text-xs focus:not-sr-only",style:{paddingBlock:"calc(var(--spacing) * 2)",paddingInline:"calc(var(--spacing) * 3)",position:"absolute"},onKeyDown:n=>{let r=e.keyboardStep??.1,i="ArrowLeft"===n.key?(0,h.e)(-r,0,0):"ArrowRight"===n.key?(0,h.e)(r,0,0):"ArrowDown"===n.key?(0,h.e)(0,-r,0):"ArrowUp"===n.key?(0,h.e)(0,r,0):"PageDown"===n.key?(0,h.e)(0,0,-r):"PageUp"===n.key?(0,h.e)(0,0,r):null;i&&(n.preventDefault(),n.stopPropagation(),a(t,(0,h.a)(e.point,i)))},children:s.formatMessage(A.adjustPoint)},`point-control-${t}`):null):null]})},T=e=>{let{scene:t,ariaLabel:n,presentationMode:i,onDragPoint:a}=e,o=t.segments?.map(e=>({from:e.from,to:e.to,stroke:j[e.role??"primary"],strokeWidth:e.width??2,opacity:e.opacity,strokeDasharray:e.dashed?"5 4":void 0,endMarker:e.arrow?"arrow":void 0})),s=t.polygons?.map(e=>({points:e.points,fill:j[e.role??"secondary"],opacity:e.opacity??.18})),l=t.circles?.map(e=>({center:e.center,radius:e.radius,stroke:j[e.role??"secondary"],strokeWidth:1.6,opacity:e.opacity})),c=t.points?.map(e=>({x:e.point.x,y:e.point.y,label:"thumbnail"===i?void 0:e.label,labelStyle:"derived_pill",draggable:"thumbnail"!==i&&e.draggable,ariaLabel:e.ariaLabel,keyboardStep:e.keyboardStep,appearance:{fill:j[e.role??"accent"],stroke:"var(--learning-block-visualization-surface, var(--bg-primary))",strokeWidth:2,radius:4}})),d=t.curves?.map(e=>({kind:"polyline",points:e.points,closed:e.closed,stroke:j[e.role??"primary"],strokeWidth:e.width??2,opacity:e.opacity}));return(0,r.jsx)(m.a,{ariaLabel:n,presentationMode:i,canvasSize:{width:360,height:265,padding:22},viewport:{mode:"bounds",bounds:t.bounds,paddingUnits:.18},segments:o,polygons:s,circles:l,points:c,onDragPoint:"thumbnail"!==i&&a?(e,t,n)=>a(e,(0,h.e)(n.x,n.y,0)):void 0,series:d,xAxisLabel:"x",yAxisLabel:"y",showAxisLabels:"thumbnail"!==i,showCoordinateTooltip:t.showCoordinateTooltip})};n.d(t,{},{a:e=>{let{scene:t,ariaLabel:n,presentationMode:i,onDragPoint:a}=e;return"three"===t.kind?(0,r.jsx)(R,{scene:t,ariaLabel:n,presentationMode:i,onDragPoint:a}):(0,r.jsx)(T,{scene:t,ariaLabel:n,presentationMode:i,onDragPoint:a})}})}};