export const __rspack_esm_ids=[706713];export const __webpack_modules__={Ipng(a,b,c){let d,e;c.d(b,{a:()=>H});var f=c("unhp"),g=c("zd8w"),h=c("PVZC"),i=c("hPwS");let j=new h.v,k=new h.Xd;class l extends h.Kb{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new h.ub([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new h.ub([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(a){let b=this.attributes.instanceStart,c=this.attributes.instanceEnd;return void 0!==b&&(b.applyMatrix4(a),c.applyMatrix4(a),b.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(a){let b;a instanceof Float32Array?b=a:Array.isArray(a)&&(b=new Float32Array(a));let c=new h.Lb(b,6,1);return this.setAttribute("instanceStart",new h.Rb(c,3,0)),this.setAttribute("instanceEnd",new h.Rb(c,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(a,b=3){let c;a instanceof Float32Array?c=a:Array.isArray(a)&&(c=new Float32Array(a));let d=new h.Lb(c,2*b,1);return this.setAttribute("instanceColorStart",new h.Rb(d,b,0)),this.setAttribute("instanceColorEnd",new h.Rb(d,b,b)),this}fromWireframeGeometry(a){return this.setPositions(a.attributes.position.array),this}fromEdgesGeometry(a){return this.setPositions(a.attributes.position.array),this}fromMesh(a){return this.fromWireframeGeometry(new h.fe(a.geometry)),this}fromLineSegments(a){let b=a.geometry;return this.setPositions(b.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new h.v);let a=this.attributes.instanceStart,b=this.attributes.instanceEnd;void 0!==a&&void 0!==b&&(this.boundingBox.setFromBufferAttribute(a),j.setFromBufferAttribute(b),this.boundingBox.union(j))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new h.td),null===this.boundingBox&&this.computeBoundingBox();let a=this.attributes.instanceStart,b=this.attributes.instanceEnd;if(void 0!==a&&void 0!==b){let c=this.boundingSphere.center;this.boundingBox.getCenter(c);let d=0;for(let e=0,f=a.count;e<f;e++)k.fromBufferAttribute(a,e),d=Math.max(d,c.distanceToSquared(k)),k.fromBufferAttribute(b,e),d=Math.max(d,c.distanceToSquared(k));this.boundingSphere.radius=Math.sqrt(d),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(a){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(a)}}var m=c("STXV");let n=parseInt("179".replace(/\D+/g,""));class o extends h.jd{constructor(a){super({type:"LineMaterial",uniforms:h.Vd.clone(h.Vd.merge([m.UniformsLib.common,m.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new h.Wd(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
					#include <${n>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(a){this.uniforms.diffuse.value=a}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(a){!0===a?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(a){this.uniforms.linewidth.value=a}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(a){!!a!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===a?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(a){this.uniforms.dashScale.value=a}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(a){this.uniforms.dashSize.value=a}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(a){this.uniforms.dashOffset.value=a}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(a){this.uniforms.gapSize.value=a}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(a){this.uniforms.opacity.value=a}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(a){this.uniforms.resolution.value.copy(a)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(a){!!a!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===a?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(a)}}let p=n>=125?"uv1":"uv2",q=new h.Yd,r=new h.Xd,s=new h.Xd,t=new h.Yd,u=new h.Yd,v=new h.Yd,w=new h.Xd,x=new h.sc,y=new h.ac,z=new h.Xd,A=new h.v,B=new h.td,C=new h.Yd;function D(a,b,c){return C.set(0,0,-b,1).applyMatrix4(a.projectionMatrix),C.multiplyScalar(1/C.w),C.x=e/c.width,C.y=e/c.height,C.applyMatrix4(a.projectionMatrixInverse),C.multiplyScalar(1/C.w),Math.abs(Math.max(C.x,C.y))}class E extends h.tc{constructor(a=new l,b=new o({color:0xffffff*Math.random()})){super(a,b),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let a=this.geometry,b=a.attributes.instanceStart,c=a.attributes.instanceEnd,d=new Float32Array(2*b.count);for(let a=0,e=0,f=b.count;a<f;a++,e+=2)r.fromBufferAttribute(b,a),s.fromBufferAttribute(c,a),d[e]=0===e?0:d[e-1],d[e+1]=d[e]+r.distanceTo(s);let e=new h.Lb(d,2,1);return a.setAttribute("instanceDistanceStart",new h.Rb(e,1,0)),a.setAttribute("instanceDistanceEnd",new h.Rb(e,1,1)),this}raycast(a,b){let c,f,g=this.material.worldUnits,i=a.camera;null!==i||g||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let j=void 0!==a.params.Line2&&a.params.Line2.threshold||0;d=a.ray;let k=this.matrixWorld,l=this.geometry,m=this.material;if(e=m.linewidth+j,null===l.boundingSphere&&l.computeBoundingSphere(),B.copy(l.boundingSphere).applyMatrix4(k),g)c=.5*e;else{let a=Math.max(i.near,B.distanceToPoint(d.origin));c=D(i,a,m.resolution)}if(B.radius+=c,!1!==d.intersectsSphere(B)){if(null===l.boundingBox&&l.computeBoundingBox(),A.copy(l.boundingBox).applyMatrix4(k),g)f=.5*e;else{let a=Math.max(i.near,A.distanceToPoint(d.origin));f=D(i,a,m.resolution)}A.expandByScalar(f),!1!==d.intersectsBox(A)&&(g?function(a,b){let c=a.matrixWorld,f=a.geometry,g=f.attributes.instanceStart,i=f.attributes.instanceEnd,j=Math.min(f.instanceCount,g.count);for(let f=0;f<j;f++){y.start.fromBufferAttribute(g,f),y.end.fromBufferAttribute(i,f),y.applyMatrix4(c);let j=new h.Xd,k=new h.Xd;d.distanceSqToSegment(y.start,y.end,k,j),k.distanceTo(j)<.5*e&&b.push({point:k,pointOnLine:j,distance:d.origin.distanceTo(k),object:a,face:null,faceIndex:f,uv:null,[p]:null})}}(this,b):function(a,b,c){let f=b.projectionMatrix,g=a.material.resolution,i=a.matrixWorld,j=a.geometry,k=j.attributes.instanceStart,l=j.attributes.instanceEnd,m=Math.min(j.instanceCount,k.count),n=-b.near;d.at(1,v),v.w=1,v.applyMatrix4(b.matrixWorldInverse),v.applyMatrix4(f),v.multiplyScalar(1/v.w),v.x*=g.x/2,v.y*=g.y/2,v.z=0,w.copy(v),x.multiplyMatrices(b.matrixWorldInverse,i);for(let b=0;b<m;b++){if(t.fromBufferAttribute(k,b),u.fromBufferAttribute(l,b),t.w=1,u.w=1,t.applyMatrix4(x),u.applyMatrix4(x),t.z>n&&u.z>n)continue;if(t.z>n){let a=t.z-u.z,b=(t.z-n)/a;t.lerp(u,b)}else if(u.z>n){let a=u.z-t.z,b=(u.z-n)/a;u.lerp(t,b)}t.applyMatrix4(f),u.applyMatrix4(f),t.multiplyScalar(1/t.w),u.multiplyScalar(1/u.w),t.x*=g.x/2,t.y*=g.y/2,u.x*=g.x/2,u.y*=g.y/2,y.start.copy(t),y.start.z=0,y.end.copy(u),y.end.z=0;let j=y.closestPointToPointParameter(w,!0);y.at(j,z);let m=h.pc.lerp(t.z,u.z,j),o=m>=-1&&m<=1,q=w.distanceTo(z)<.5*e;if(o&&q){y.start.fromBufferAttribute(k,b),y.end.fromBufferAttribute(l,b),y.start.applyMatrix4(i),y.end.applyMatrix4(i);let e=new h.Xd,f=new h.Xd;d.distanceSqToSegment(y.start,y.end,f,e),c.push({point:f,pointOnLine:e,distance:d.origin.distanceTo(f),object:a,face:null,faceIndex:b,uv:null,[p]:null})}}}(this,i,b))}}onBeforeRender(a){let b=this.material.uniforms;b&&b.resolution&&(a.getViewport(q),this.material.uniforms.resolution.value.set(q.z,q.w))}}class F extends l{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(a){let b=a.length-3,c=new Float32Array(2*b);for(let d=0;d<b;d+=3)c[2*d]=a[d],c[2*d+1]=a[d+1],c[2*d+2]=a[d+2],c[2*d+3]=a[d+3],c[2*d+4]=a[d+4],c[2*d+5]=a[d+5];return super.setPositions(c),this}setColors(a,b=3){let c=a.length-b,d=new Float32Array(2*c);if(3===b)for(let e=0;e<c;e+=b)d[2*e]=a[e],d[2*e+1]=a[e+1],d[2*e+2]=a[e+2],d[2*e+3]=a[e+3],d[2*e+4]=a[e+4],d[2*e+5]=a[e+5];else for(let e=0;e<c;e+=b)d[2*e]=a[e],d[2*e+1]=a[e+1],d[2*e+2]=a[e+2],d[2*e+3]=a[e+3],d[2*e+4]=a[e+4],d[2*e+5]=a[e+5],d[2*e+6]=a[e+6],d[2*e+7]=a[e+7];return super.setColors(d,b),this}fromLine(a){let b=a.geometry;return this.setPositions(b.attributes.position.array),this}}class G extends E{constructor(a=new F,b=new o({color:0xffffff*Math.random()})){super(a,b),this.isLine2=!0,this.type="Line2"}}let H=g.forwardRef(function({points:a,color:b=0xffffff,vertexColors:c,linewidth:d,lineWidth:e,segments:j,dashed:k,...m},n){var p,q;let r=(0,i.C)(a=>a.size),s=g.useMemo(()=>j?new E:new G,[j]),[t]=g.useState(()=>new o),u=(null==c||null==(p=c[0])?void 0:p.length)===4?4:3,v=g.useMemo(()=>{let d=j?new l:new F,e=a.map(a=>{let b=Array.isArray(a);return a instanceof h.Xd||a instanceof h.Yd?[a.x,a.y,a.z]:a instanceof h.Wd?[a.x,a.y,0]:b&&3===a.length?[a[0],a[1],a[2]]:b&&2===a.length?[a[0],a[1],0]:a});if(d.setPositions(e.flat()),c){b=0xffffff;let a=c.map(a=>a instanceof h.K?a.toArray():a);d.setColors(a.flat(),u)}return d},[a,j,c,u]);return g.useLayoutEffect(()=>{s.computeLineDistances()},[a,s]),g.useLayoutEffect(()=>{k?t.defines.USE_DASH="":delete t.defines.USE_DASH,t.needsUpdate=!0},[k,t]),g.useEffect(()=>()=>{v.dispose(),t.dispose()},[v]),g.createElement("primitive",(0,f.a)({object:s,ref:n},m),g.createElement("primitive",{object:v,attach:"geometry"}),g.createElement("primitive",(0,f.a)({object:t,attach:"material",color:b,vertexColors:!!c,resolution:[r.width,r.height],linewidth:null!=(q=null!=d?d:e)?q:1,dashed:k,transparent:4===u},m)))})},mevF(a,b,c){let d,e;var f=c("unhp"),g=c("zd8w"),h=c("CE87"),i=c("PVZC"),j=c("hPwS");let k=new i.Xd,l=new i.Xd,m=new i.Xd,n=new i.Wd;function o(a,b,c){let d=k.setFromMatrixPosition(a.matrixWorld);d.project(b);let e=c.width/2,f=c.height/2;return[d.x*e+e,-(d.y*f)+f]}let p=a=>1e-10>Math.abs(a)?0:a;function q(a,b,c=""){let d="matrix3d(";for(let c=0;16!==c;c++)d+=p(b[c]*a.elements[c])+(15!==c?",":")");return c+d}let r=(d=[1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1],a=>q(a,d)),s=(e=a=>[1/a,1/a,1/a,1,-1/a,-1/a,-1/a,-1,1/a,1/a,1/a,1,1,1,1,1],(a,b)=>q(a,e(b),"translate(-50%,-50%)")),t=g.forwardRef(({children:a,eps:b=.001,style:c,className:d,prepend:e,center:q,fullscreen:t,portal:u,distanceFactor:v,sprite:w=!1,transform:x=!1,occlude:y,onOcclude:z,castShadow:A,receiveShadow:B,material:C,geometry:D,zIndexRange:E=[0x1000037,0],calculatePosition:F=o,as:G="div",wrapperClass:H,pointerEvents:I="auto",...J},K)=>{let{gl:L,camera:M,scene:N,size:O,raycaster:P,events:Q,viewport:R}=(0,j.C)(),[S]=g.useState(()=>document.createElement(G)),T=g.useRef(null),U=g.useRef(null),V=g.useRef(0),W=g.useRef([0,0]),X=g.useRef(null),Y=g.useRef(null),Z=(null==u?void 0:u.current)||Q.connected||L.domElement.parentNode,$=g.useRef(null),_=g.useRef(!1),aa=g.useMemo(()=>{var a;return y&&"blending"!==y||Array.isArray(y)&&y.length&&(a=y[0])&&"object"==typeof a&&"current"in a},[y]);g.useLayoutEffect(()=>{let a=L.domElement;y&&"blending"===y?(a.style.zIndex=`${Math.floor(E[0]/2)}`,a.style.position="absolute",a.style.pointerEvents="none"):(a.style.zIndex=null,a.style.position=null,a.style.pointerEvents=null)},[y]),g.useLayoutEffect(()=>{if(U.current){let a=T.current=h.createRoot(S);if(N.updateMatrixWorld(),x)S.style.cssText="position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;";else{let a=F(U.current,M,O);S.style.cssText=`position:absolute;top:0;left:0;transform:translate3d(${a[0]}px,${a[1]}px,0);transform-origin:0 0;`}return Z&&(e?Z.prepend(S):Z.appendChild(S)),()=>{Z&&Z.removeChild(S),a.unmount()}}},[Z,x]),g.useLayoutEffect(()=>{H&&(S.className=H)},[H]);let ab=g.useMemo(()=>x?{position:"absolute",top:0,left:0,width:O.width,height:O.height,transformStyle:"preserve-3d",pointerEvents:"none"}:{position:"absolute",transform:q?"translate3d(-50%,-50%,0)":"none",...t&&{top:-O.height/2,left:-O.width/2,width:O.width,height:O.height},...c},[c,q,t,O,x]),ac=g.useMemo(()=>({position:"absolute",pointerEvents:I}),[I]);g.useLayoutEffect(()=>{var b,e;_.current=!1,x?null==(b=T.current)||b.render(g.createElement("div",{ref:X,style:ab},g.createElement("div",{ref:Y,style:ac},g.createElement("div",{ref:K,className:d,style:c,children:a})))):null==(e=T.current)||e.render(g.createElement("div",{ref:K,style:ab,className:d,children:a}))});let ad=g.useRef(!0);(0,j.D)(a=>{if(U.current){M.updateMatrixWorld(),U.current.updateWorldMatrix(!0,!1);let a=x?W.current:F(U.current,M,O);if(x||Math.abs(V.current-M.zoom)>b||Math.abs(W.current[0]-a[0])>b||Math.abs(W.current[1]-a[1])>b){var c;let b,d,e,f,g=(c=U.current,b=k.setFromMatrixPosition(c.matrixWorld),d=l.setFromMatrixPosition(M.matrixWorld),e=b.sub(d),f=M.getWorldDirection(m),e.angleTo(f)>Math.PI/2),h=!1;aa&&(Array.isArray(y)?h=y.map(a=>a.current):"blending"!==y&&(h=[N]));let j=ad.current;h?ad.current=function(a,b,c,d){let e=k.setFromMatrixPosition(a.matrixWorld),f=e.clone();f.project(b),n.set(f.x,f.y),c.setFromCamera(n,b);let g=c.intersectObjects(d,!0);if(g.length){let a=g[0].distance;return e.distanceTo(c.ray.origin)<a}return!0}(U.current,M,P,h)&&!g:ad.current=!g,j!==ad.current&&(z?z(!ad.current):S.style.display=ad.current?"block":"none");let o=Math.floor(E[0]/2),q=y?aa?[E[0],o]:[o-1,0]:E;if(S.style.zIndex=`${function(a,b,c){if(b instanceof i.Kc||b instanceof i.Ic){let d=k.setFromMatrixPosition(a.matrixWorld),e=l.setFromMatrixPosition(b.matrixWorld),f=d.distanceTo(e),g=(c[1]-c[0])/(b.far-b.near),h=c[1]-g*b.far;return Math.round(g*f+h)}}(U.current,M,q)}`,x){let[a,b]=[O.width/2,O.height/2],c=M.projectionMatrix.elements[5]*b,{isOrthographicCamera:d,top:e,left:f,bottom:g,right:h}=M,i=r(M.matrixWorldInverse),j=d?`scale(${c})translate(${p(-(h+f)/2)}px,${p((e+g)/2)}px)`:`translateZ(${c}px)`,k=U.current.matrixWorld;w&&((k=M.matrixWorldInverse.clone().transpose().copyPosition(k).scale(U.current.scale)).elements[3]=k.elements[7]=k.elements[11]=0,k.elements[15]=1),S.style.width=O.width+"px",S.style.height=O.height+"px",S.style.perspective=d?"":`${c}px`,X.current&&Y.current&&(X.current.style.transform=`${j}${i}translate(${a}px,${b}px)`,Y.current.style.transform=s(k,1/((v||10)/400)))}else{let b=void 0===v?1:function(a,b){if(b instanceof i.Ic)return b.zoom;if(!(b instanceof i.Kc))return 1;{let c=k.setFromMatrixPosition(a.matrixWorld),d=l.setFromMatrixPosition(b.matrixWorld);return 1/(2*Math.tan(b.fov*Math.PI/180/2)*c.distanceTo(d))}}(U.current,M)*v;S.style.transform=`translate3d(${a[0]}px,${a[1]}px,0) scale(${b})`}W.current=a,V.current=M.zoom}}if(!aa&&$.current&&!_.current)if(x){if(X.current){let a=X.current.children[0];if(null!=a&&a.clientWidth&&null!=a&&a.clientHeight){let{isOrthographicCamera:b}=M;if(b||D)J.scale&&(Array.isArray(J.scale)?J.scale instanceof i.Xd?$.current.scale.copy(J.scale.clone().divideScalar(1)):$.current.scale.set(1/J.scale[0],1/J.scale[1],1/J.scale[2]):$.current.scale.setScalar(1/J.scale));else{let b=(v||10)/400,c=a.clientWidth*b,d=a.clientHeight*b;$.current.scale.set(c,d,1)}_.current=!0}}}else{let b=S.children[0];if(null!=b&&b.clientWidth&&null!=b&&b.clientHeight){let a=1/R.factor,c=b.clientWidth*a,d=b.clientHeight*a;$.current.scale.set(c,d,1),_.current=!0}$.current.lookAt(a.camera.position)}});let ae=g.useMemo(()=>({vertexShader:x?void 0:`
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
      `}),[x]);return g.createElement("group",(0,f.a)({},J,{ref:U}),y&&!aa&&g.createElement("mesh",{castShadow:A,receiveShadow:B,ref:$},D||g.createElement("planeGeometry",null),C||g.createElement("shaderMaterial",{side:2,vertexShader:ae.vertexShader,fragmentShader:ae.fragmentShader})))});c.d(b,{},{a:t})},sKwe(a,b,c){var d=c("ABep"),e=c("on57"),f=c("zd8w"),g=c("iLdV");let h=a=>a?a.replace(/\\mid/g,"|").replace(/\\neg/g,"\xac").replace(/\\cap/g,"\u2229").replace(/\\cup/g,"\u222A").replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\mathrm\{([^}]*)\}/g,"$1").replace(/\\[a-zA-Z]+/g,"").replace(/[{}_^]/g,"").replace(/\s+/g," ").trim().length:0,i=a=>{let b=a.formatValueForInput??g.c,c=Math.max((0,g.d)(a.min,a.step,b).length,(0,g.d)(a.max,a.step,b).length),d=a.inlineUnit?a.unit?.length??0:0;return a.range?2*c+2:c+d};c.d(b,{},{a:a=>{let{inputs:b}=a,c=(0,f.useRef)(null),[j,k]=(0,f.useState)(),l=b.some(a=>a.before),m=b.filter(a=>!a.options&&!1!==a.showValueInput),n=Math.max(0,...b.map(a=>h(a.variable))),o=Math.max(0,...m.map(i)),p=Math.max(0,...m.map(a=>h(a.inlineUnit?void 0:a.unit))),q=b.map(a=>a.variable??"").join("\0");return(0,f.useLayoutEffect)(()=>{let a=c.current;if(!a)return;let b=Array.from(a.querySelectorAll("[data-input-selector-variable]"));if(0===b.length)return;let d=()=>{let c=b.filter(a=>"stacked"!==a.dataset.inputSelectorLabelLayout),d=c.length?Math.max(...c.map(b=>{let c=b.cloneNode(!0);c.removeAttribute("data-input-selector-variable"),Object.assign(c.style,{inset:"0 auto auto 0",maxWidth:"none",position:"absolute",visibility:"hidden",whiteSpace:"nowrap",width:"max-content"}),a.appendChild(c);let d=c.getBoundingClientRect().width;return c.remove(),d})):void 0;k(a=>a===d?a:d)};if(d(),"u"<typeof ResizeObserver)return;let e=new ResizeObserver(d);b.forEach(a=>e.observe(a));let f=new MutationObserver(d);return b.forEach(a=>f.observe(a,{attributeFilter:["data-input-selector-label-layout"]})),()=>{e.disconnect(),f.disconnect()}},[q]),(0,d.jsx)("div",{ref:c,"data-input-selector-group":!0,className:"grid min-h-fit min-w-0 shrink grow-0 gap-y-3",children:b.map((a,b)=>(0,d.jsxs)("div",{className:(0,e.b)("grid h-full min-w-0 items-center gap-x-2",l?"grid-cols-[auto_minmax(0,1fr)]":"grid-cols-[minmax(0,1fr)]"),children:[l?a.before??(0,d.jsx)("div",{"aria-hidden":!0}):null,(0,d.jsx)(g.a,{...a,groupVariableWidthCh:n,groupVariableWidthPx:j,groupUnitWidthCh:p,groupValueWidthCh:o})]},b))})},b:function(a,b,c,d){var e;let{before:f,disabled:g,displayValue:h,editType:i="CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE",formatValueForInput:j,inlineUnit:k,parseInputValue:l,mapValue:m,options:n,optionLabelFormat:o,showValueInput:p,sliderStyle:q,ariaLabel:r,ariaValueText:s,onActiveChange:t,value:u,variable:v,variableBold:w,variableFormat:x,unit:y}=arguments.length>4&&void 0!==arguments[4]?arguments[4]:{};return{before:f,disabled:g,displayValue:h,options:n,optionLabelFormat:o,showValueInput:p,sliderStyle:q,inlineUnit:k,ariaLabel:r,ariaValueText:s,variable:v??b.variable??(e=String(a),e.match(/[A-Za-z]/)?.[0]??e),variableBold:w??b.variableBold,variableFormat:x??b.variableFormat,unit:y??b.unit,formatValueForInput:j,parseInputValue:l,max:b.max,min:b.min,step:b.step,value:u??Number(c[a]),onActiveChange:t,onChange:(b,c)=>{let e=m?m(b):b;d(b=>({...b,[a]:e}),"function"==typeof i?i(c):i)}}}})},iLdV(a,b,c){var d=c("ABep"),e=c("YAOF"),f=c("on57"),g=c("zd8w"),h=c("Wf1j"),i=c("l7Go"),j=c("jYuH"),k=c("Bdtm");let l=(a,b,c)=>Math.min(Math.max(a,b),c),m=/[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[-+]?\d+)?/i,n=(a,b,c,d)=>{if(!Number.isFinite(a))return b;let e=Math.round((l(a,b,c)-b)/d),f=(0,j.c)(d);return l((0,j.h)(b+e*d,Math.max(1,f)),b,c)},o=(a,b)=>Number.isFinite(a)?a.toFixed(Math.max(1,(0,j.c)(b))):"",p=(a,b,c)=>{let d=c(a,b);return d.match(m)?.[0]??d},q=a=>{let b=[],c=a.parentElement;for(;c;)"visible"!==window.getComputedStyle(c).overflowY&&b.push(c),c=c.parentElement;return b},r=(0,g.createContext)({isNativeSlider:!1}),s=()=>(0,d.jsx)("svg",{"aria-hidden":!0,className:"h-4 w-4 flex-none",fill:"none",viewBox:"0 0 16 16",children:(0,d.jsx)("path",{d:"m5 6 3-3 3 3M5 10l3 3 3-3",stroke:"currentColor",strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:"1.5"})});c.d(b,{},{a:a=>{let b,{min:c,max:j,step:l,value:t,displayValue:u,onChange:v,onActiveChange:w,disabled:x,options:y,optionLabelFormat:z="text",sliderStyle:A="continuous",ariaLabel:B,ariaValueText:C,variable:D,variableBold:E,variableFormat:F,inlineUnit:G,unit:H,formatValueForInput:I=o,parseInputValue:J,normalizeCommittedValue:K,minSliderWidthPx:L,showValueInput:M=!0,range:N,valueClassName:O,groupVariableWidthCh:P,groupVariableWidthPx:Q,groupUnitWidthCh:R,groupValueWidthCh:S}=a,{isNativeSlider:T,onSliderInteractionEnd:U,onSliderInteractionStart:V}=(0,g.useContext)(r),W=(0,h.a)(),X=J??Number.parseFloat,Y=n(t,c,j,l),Z=Number.isFinite(u)?u:Y,[$,_]=(0,g.useState)(()=>p(Z,l,I)),[aa,ab]=(0,g.useState)(!1),ac=(0,g.useRef)(!1),ad=(0,g.useRef)(!1),ae=(0,g.useRef)(!1),af=(0,g.useRef)(null),ag=(0,g.useRef)(null),ah=(0,g.useRef)(null),ai=(0,g.useRef)(null),aj=(0,g.useRef)(null),ak=(0,g.useRef)(null),al=(0,g.useRef)(null),am=(0,g.useRef)(null),an=(0,g.useRef)(!1),[ao,ap]=(0,g.useState)(!1),[aq,ar]=(0,g.useState)(!1),[as,at]=(0,g.useState)(!1),[au,av]=(0,g.useState)(T?"above":"below"),aw=function(){let a=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"blur";"blur"===a&&ae.current||ad.current&&(ad.current=!1,w?.(!1),U?.())},ax=()=>{ad.current||(ad.current=!0,w?.(!0),V?.(D))},ay=()=>{ae.current=!0,ax()};(0,g.useEffect)(()=>{let a=()=>{ae.current=!1,aw("pointer-end")};return window.addEventListener("pointerup",a),window.addEventListener("pointercancel",a),()=>{window.removeEventListener("pointerup",a),window.removeEventListener("pointercancel",a)}},[w,U]),(0,g.useLayoutEffect)(()=>{let a=aj.current,b=ak.current;if(!y||!a||!b)return void ap(!1);let c=()=>{let c=a.clientWidth,d=b.scrollWidth>c+1;ap(a=>a===d?a:d)};c();let d="u"<typeof document?void 0:document.fonts;if(d?.addEventListener("loadingdone",c),"u"<typeof ResizeObserver)return()=>d?.removeEventListener("loadingdone",c);let e=new ResizeObserver(c);return e.observe(a),e.observe(b),()=>{d?.removeEventListener("loadingdone",c),e.disconnect()}},[y,z]),(0,g.useEffect)(()=>{let a=a=>{"Escape"===a.key&&an.current&&(an.current=!1,a.preventDefault(),a.stopPropagation())};return document.addEventListener("keyup",a,!0),()=>document.removeEventListener("keyup",a,!0)},[]),(0,g.useEffect)(()=>{if(!as)return;an.current=!1;let a=a=>{let b=a.target;!(b instanceof Node)||al.current?.contains(b)||am.current?.contains(b)||at(!1)},b=a=>{"Escape"===a.key&&(an.current=!0,a.preventDefault(),a.stopPropagation(),at(!1),am.current?.focus())};return document.addEventListener("pointerdown",a),document.addEventListener("keydown",b,!0),()=>{document.removeEventListener("pointerdown",a),document.removeEventListener("keydown",b,!0)}},[as]),(0,g.useEffect)(()=>{(!ao||x)&&at(!1)},[x,ao]),(0,g.useLayoutEffect)(()=>{if(!as)return void av(T?"above":"below");let a=al.current,b=am.current;if(!a||!b)return;let c=()=>{av((a=>{let{boundary:b,menuHeight:c,trigger:d}=a,e=b.bottom-d.bottom-4;if(c<=e)return"below";let f=d.top-b.top-4;return c<=f||f>e?"above":"below"})({boundary:(a=>{let{clippingAncestors:b,viewport:c}=a;return b.reduce((a,b)=>({bottom:Math.min(a.bottom,b.bottom),top:Math.max(a.top,b.top)}),c)})({clippingAncestors:q(b).map(a=>a.getBoundingClientRect()),viewport:{bottom:window.innerHeight,top:0}}),menuHeight:a.getBoundingClientRect().height,trigger:b.getBoundingClientRect()}))};if(c(),window.addEventListener("resize",c),"u"<typeof ResizeObserver)return()=>window.removeEventListener("resize",c);let d=new ResizeObserver(c);return d.observe(a),d.observe(b),q(b).forEach(a=>d.observe(a)),()=>{window.removeEventListener("resize",c),d.disconnect()}},[as,T]);let az=aa?$:p(Z,l,I),aA=Math.max(p(c,l,I).length,p(j,l,I).length),aB=N?(b=N.displayValues??N.ariaValueTexts??[p(N.values[0],l,I),p(N.values[1],l,I)],`(${b[0]}, ${b[1]})`):void 0,aC=N?2*aA+2:aA,aD=S??aC,aE=L??96,aF=E??!1,aG=D?D.replace(/[^\w-]+/g,"_"):"input-selector-value",aH=B??(D?W.formatMessage({id:"learningBlock.inputSelector.valueAriaLabel",defaultMessage:"{label} value"},{label:D}):void 0),aI=!!D&&"text"!==F&&(!!("katex"===F||/\\/.test(D))||/^[A-Za-z\u03b8\u03bc\u03c3\u03bb\u03c0\u0394](?:[_^][A-Za-z0-9{}]+)?$/.test(D)),aJ=y?.find(a=>n(a.value,c,j,l)===Y)??y?.[0],aK=ao?W.formatMessage({id:"learningBlock.inputSelector.overflowMenuAriaLabel",defaultMessage:"{value}. Show all {label} options"},{label:aH??W.formatMessage({id:"learningBlock.inputSelector.selectorAriaLabel",defaultMessage:"selector"}),value:aJ?.ariaLabel??aJ?.label??""}):void 0,aL=(0,g.useId)(),aM=(a,b)=>"katex"!==b?a:(0,d.jsx)(i.a,{className:"katex",latex:a}),aN=a=>n(a.value,c,j,l),aO=y?.find(a=>aN(a)===Y)??y?.[0],aP=a=>{let b=X(a);if(!Number.isFinite(b))return void _(p(Z,l,I));let d=((a,b)=>{let{max:c,min:d,normalizeCommittedValue:e,step:f}=b;return e?e(a):n(a,d,c,f)})(b,{min:c,max:j,step:l,normalizeCommittedValue:K});v(d,"input"),_(p(d,l,I))},aQ=D?(0,d.jsx)("div",{"data-input-selector-variable":!0,"data-input-selector-label-layout":aq?"stacked":"inline",className:(0,f.b)("text-token-text-primary min-w-0 max-w-full justify-self-start text-sm leading-5 whitespace-normal hyphens-auto [overflow-wrap:anywhere] [&_.katex]:!text-[1em]",aF&&"font-medium"),children:aI?(0,d.jsx)(i.a,{className:"katex",latex:D??""}):D}):null,aR=!!(G&&H&&!N),aS=H&&!aR?(0,d.jsx)("div",{ref:ai,className:"text-token-text-secondary shrink-0 text-xs leading-4 whitespace-nowrap [&_.katex]:text-inherit",children:H}):null,aT=!!S,aU=`minmax(max(${aD}ch,2rem), max(${aD}ch,2rem))`,aV=!!R,aW=`minmax(${R??0}ch, ${R??0}ch)`,aX=!y&&aV?aS??(0,d.jsx)("div",{ref:ai,"aria-hidden":!0}):null,aY=Q?`${Q}px`:P?`${P}ch`:null,aZ=aY?`minmax(0, min(${aY}, 40%))`:"fit-content(40%)";(0,g.useLayoutEffect)(()=>{let a=af.current,b=ag.current;if(y||!a||!b)return void ar(!1);let c=()=>{let c=a.clientWidth;if(0===c)return;let d=(a=>{let{availableWidth:b,labelWidth:c,minSliderWidthPx:d=96,unitWidth:e,valueWidth:f}=a,g=2+Number(f>0)+Number(e>0);return c+f+e+(g-1)*12+d>b+1})({availableWidth:c,labelWidth:Math.max(b.scrollWidth,Q??0),minSliderWidthPx:aE,unitWidth:ai.current?.clientWidth??0,valueWidth:ah.current?.clientWidth??0});ar(a=>a===d?a:d)};c();let d="u"<typeof document?void 0:document.fonts;if(d?.addEventListener("loadingdone",c),"u"<typeof ResizeObserver)return()=>d?.removeEventListener("loadingdone",c);let e=new ResizeObserver(c);return e.observe(a),e.observe(b),ah.current&&e.observe(ah.current),ai.current&&e.observe(ai.current),()=>{d?.removeEventListener("loadingdone",c),e.disconnect()}},[R,S,Q,y,aE,D,M,H]);let a$=a=>al.current?.querySelectorAll("[data-input-selector-discrete-menu-option]").item(a).focus();(0,g.useEffect)(()=>{as&&y&&a$(Math.max(y.findIndex(a=>aN(a)===Y),0))},[as,y,Y]);let a_=y?(0,d.jsx)("div",{role:"radiogroup","aria-label":aH,className:(0,f.b)("flex h-6 w-full min-w-0 flex-nowrap gap-0.5 overflow-x-auto overflow-y-hidden rounded-full bg-black/7 p-0.5 dark:bg-white/6",x&&"opacity-40"),children:y.map(a=>{let b=aN(a),c=b===Y;return(0,d.jsx)("button",{type:"button",role:"radio","aria-checked":c,"aria-label":a.ariaLabel,disabled:x,className:(0,f.b)("text-token-text-secondary flex h-5 min-w-max flex-1 items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",c&&"bg-token-bg-primary !text-token-text-primary shadow-sm dark:bg-white dark:!text-black",!c&&!x&&"hover:text-token-text-primary focus-visible:text-token-text-primary",!x&&"focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"),onClick:()=>v(b,"input"),children:(0,d.jsx)("span",{className:"min-w-6",children:aM(a.label,z)})},a.value)})}):null,a0=y?(0,d.jsxs)("div",{"data-input-selector-discrete-rail":!0,className:(0,f.b)("relative h-6 w-full min-w-0",ao&&"flex justify-end"),children:[ao&&aO?(0,d.jsxs)(d.Fragment,{children:[(0,d.jsxs)("button",{type:"button","aria-controls":aL,"aria-expanded":as,"aria-haspopup":"listbox","aria-label":aK,disabled:x,"data-input-selector-discrete-menu-trigger":!0,ref:am,className:(0,f.b)("text-token-text-primary flex h-6 max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-full px-2 text-[15px] leading-5 whitespace-nowrap transition-colors [&_.katex]:!text-[1em]",!x&&"hover:bg-black/5 focus-visible:bg-black/7 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 dark:hover:bg-white/7 dark:focus-visible:bg-white/10"),onClick:()=>at(a=>!a),children:[(0,d.jsx)("span",{className:"min-w-0 truncate",children:aM(aO.label,z)}),(0,d.jsx)(s,{})]}),as?(0,d.jsx)("div",{ref:al,"aria-label":aH,className:(0,f.b)("border-token-border-default bg-token-bg-primary text-token-text-primary absolute end-0 z-50 flex min-w-max flex-col gap-0.5 overflow-hidden rounded-lg border p-1 shadow-lg","above"===au?"bottom-full mb-1":"top-full mt-1"),id:aL,role:"listbox",children:y.map((a,b)=>{let c=aN(a),e=c===Y;return(0,d.jsx)("button",{type:"button","aria-selected":e,"data-input-selector-discrete-menu-option":!0,role:"option",className:(0,f.b)("flex min-w-full cursor-pointer items-center rounded-md px-2 py-1.5 text-start text-[15px] leading-5 whitespace-nowrap outline-none [&_.katex]:!text-[1em]",e&&"bg-black/7 font-medium dark:bg-white/10",!e&&"hover:bg-black/7 focus-visible:bg-black/7 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"),onClick:()=>{v(c,"input"),at(!1),am.current?.focus()},onKeyDown:a=>((a,b)=>{if(y)switch(a.key){case"ArrowDown":a.preventDefault(),a$((b+1)%y.length);break;case"ArrowUp":a.preventDefault(),a$((b-1+y.length)%y.length);break;case"Home":a.preventDefault(),a$(0);break;case"End":a.preventDefault(),a$(y.length-1)}})(a,b),children:aM(a.label,z)},a.value)})}):null]}):a_,(0,d.jsx)("div",{ref:ak,"aria-hidden":!0,"data-input-selector-overflow-measure":!0,className:"pointer-events-none absolute inset-x-0 top-0 h-6 overflow-hidden opacity-0",children:(0,d.jsx)("div",{className:"flex h-6 w-max min-w-max gap-0.5 p-0.5",children:y.map(a=>(0,d.jsx)("span",{className:"flex h-5 min-w-max flex-none items-center justify-center rounded-full px-2 text-[13px] leading-5 whitespace-nowrap [&_.katex]:!text-[1em]",children:(0,d.jsx)("span",{className:"min-w-6",children:aM(a.label,z)})},a.value))})})]}):null,a1=D&&!y&&M&&(0,d.jsxs)("div",{ref:ah,className:(0,f.b)("text-token-text-primary grid h-5 min-w-8 grid-rows-1 rounded-md px-1.5 text-end text-[11px] leading-none whitespace-nowrap after:invisible after:font-mono after:whitespace-pre after:content-[attr(data-value)] after:[grid-area:1/1]",aR?"grid-cols-[minmax(0,1fr)_auto] gap-x-0.5":"grid-cols-1",N&&(aq?"text-end":"text-start"),O,!x&&!N&&"transition-colors focus-within:bg-black/7 hover:bg-black/5 dark:focus-within:bg-white/10 dark:hover:bg-white/7"),"data-value":"0".repeat(aD),children:[N?(0,d.jsx)("span",{"data-input-selector-range-value":!0,className:(0,f.b)("relative flex h-full items-center tabular-nums [grid-area:1/1]",aq?"justify-end":"justify-start"),children:aB}):(0,d.jsx)("input",{"aria-label":aH,className:"relative h-full min-w-[4ch] border-none bg-transparent p-0 text-end text-[11px] leading-none whitespace-nowrap shadow-[none] outline-none [grid-area:1/1] focus:outline-none",disabled:x,inputMode:"decimal",name:aG,size:1,type:"text",value:az,onBlur:()=>{if(ac.current){ac.current=!1;return}ab(!1),aP($)},onChange:a=>{var b;let c;return _(J?a.currentTarget.value:""===(c=(b=a.currentTarget.value).trim())||"-"===c||"."===c?b:c.match(m)?.[0]??b)},onFocus:()=>{ab(!0),_(p(Z,l,I))},onKeyDown:a=>{if("Enter"===a.key){a.preventDefault(),ac.current=!0,ab(!1),aP($),a.currentTarget.blur();return}"Escape"===a.key&&(a.preventDefault(),ac.current=!0,ab(!1),_(p(Y,l,I)),a.currentTarget.blur())}}),aR?(0,d.jsx)("span",{"aria-hidden":!0,className:"text-token-text-secondary self-center text-xs leading-4",children:H}):null]}),a2=[];aq?(D&&a2.push("minmax(0, 1fr)"),a1&&a2.push(aU),aX&&a2.push(aW)):(D&&a2.push(aZ),a1&&a2.push(aU),aX&&a2.push(aW),a2.push("minmax(0, 1fr)"));let a3=[],a4=aT&&!!D,a5=aV&&!!D;D&&a3.push(aZ),a4&&a3.push(aU),a5&&a3.push(aW),a3.push("minmax(0, 1fr)");let a6=`${a3.length} / ${a3.length+1}`,a7=D?"2 / -1":"1 / -1",a8=Number.isFinite(c)&&Number.isFinite(j)&&Number.isFinite(l)&&l>0&&j>=c?Math.max(0,Math.round((j-c)/l)):0,a9=Math.min(a8+1,12),ba="stepped"===A&&a8>0?Array.from({length:a9},(a,b)=>b):[],bb="stepped"===A?"h-6 w-6":"h-5 w-5",bc="relative flex h-6 w-full min-w-0 flex-1 items-center rounded-full bg-[rgba(0,0,0,0.04)] dark:bg-[rgba(255,255,255,0.06)]",bd=ba.length>0?(0,d.jsx)("div",{"aria-hidden":!0,"data-input-selector-rendered-marker-count":ba.length,className:"pointer-events-none absolute inset-x-4 top-1/2 z-0 flex -translate-y-1/2 justify-between",children:ba.map(a=>(0,d.jsx)("span",{"data-input-selector-step-marker":!0,className:"h-[3px] w-[3px] rounded-full bg-black/20 dark:bg-white/20"},a))}):null,be=T&&!N?(0,d.jsxs)("div",{"data-input-selector-slider":!0,"data-input-selector-slider-style":A,className:(0,f.b)(bc,x&&"opacity-40"),children:[bd,(0,d.jsx)("input",{"aria-label":aH,"aria-valuetext":C,type:"range","data-learning-block-pan":x?void 0:"horizontal",className:(0,f.b)(k.a.inputSelector,"stepped"===A&&k.a.inputSelectorStepped,"text-token-text-primary relative z-10 flex w-full min-w-0 flex-1 items-center"),disabled:x,max:j,min:c,step:l,value:Y,onBlur:()=>aw("blur"),onChange:a=>{ax(),v(n(a.currentTarget.valueAsNumber,c,j,l),"slider")},onPointerDown:ay})]}):(0,d.jsxs)(e.b,{"data-input-selector-slider":!0,"data-input-selector-slider-style":A,"data-learning-block-pan":x?void 0:"horizontal",className:(0,f.b)(bc,"touch-pan-y",x&&"opacity-40"),disabled:x,max:j,min:c,onBlurCapture:()=>aw("blur"),onPointerDownCapture:ay,step:l,value:N?N.values.map(a=>n(a,c,j,l)):[Y],onValueChange:a=>{(ax(),N)?N.onChange([n(a[0],c,j,l),n(a[1],c,j,l)]):v(n(a[0],c,j,l),"slider")},children:[(0,d.jsx)(e.d,{className:"absolute inset-0 rounded-full",children:(0,d.jsx)(e.a,{className:"absolute inset-y-0 rounded-full bg-transparent"})}),bd,(0,d.jsx)(e.c,{"aria-label":N?.ariaLabels[0]??aH,"aria-valuetext":N?.ariaValueTexts?.[0]??C,className:(0,f.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative cursor-pointer rounded-full border shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",bb,N?"flex items-center justify-center text-black":"block"),children:N?.thumbLabels?.[0]&&(0,d.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:N.thumbLabels[0]})}),N&&(0,d.jsx)(e.c,{"aria-label":N.ariaLabels[1],"aria-valuetext":N.ariaValueTexts?.[1],className:(0,f.b)("border-token-border-default bg-token-bg-primary hover:border-token-border-heavy relative flex cursor-pointer items-center justify-center rounded-full border text-black shadow-sm transition-transform after:absolute after:-inset-1 after:content-[''] hover:scale-105 focus-visible:outline-token-border-heavy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus:outline-none dark:bg-white",bb),children:N.thumbLabels?.[1]&&(0,d.jsx)("span",{"aria-hidden":!0,className:"text-[10px] leading-none font-medium",children:N.thumbLabels[1]})})]});return y?(0,d.jsxs)("div",{className:"grid h-full min-w-0 items-center gap-x-3",style:{gridTemplateColumns:a3.join(" ")},children:[aQ,!ao&&a4?(0,d.jsx)("div",{"aria-hidden":!0}):null,!ao&&a5?(0,d.jsx)("div",{"aria-hidden":!0}):null,(0,d.jsx)("div",{className:"h-full min-w-0",style:{gridColumn:ao?a7:a6,gridRow:1},children:a0}),(0,d.jsx)("div",{ref:aj,"aria-hidden":!0,"data-input-selector-discrete-width-measure":!0,className:"pointer-events-none h-0 min-w-0 opacity-0",style:{gridColumn:a6,gridRow:1}})]}):(0,d.jsxs)("div",{ref:af,className:(0,f.b)("relative grid min-w-0 items-center gap-x-3",N&&"text-[11px]",aq&&"gap-y-2"),style:{gridTemplateColumns:a2.join(" ")},children:[aQ,a1,aX,(0,d.jsx)("div",{className:"min-w-0",style:aq?{gridColumn:"1 / -1"}:void 0,children:be}),D?(0,d.jsx)("div",{ref:ag,"aria-hidden":!0,"data-input-selector-label-measure":!0,className:(0,f.b)("pointer-events-none absolute inset-0 h-0 w-max max-w-none overflow-hidden text-sm leading-5 whitespace-nowrap opacity-0 [&_.katex]:!text-[1em]",aF&&"font-medium"),children:aI?(0,d.jsx)(i.a,{className:"katex",latex:D??""}):D}):null]})},b:a=>a,c:o,d:p})},WU2o(a,b,c){c.d(b,{SphericalCoordinatesControls:()=>P,SphericalCoordinatesVisualization:()=>Q});var d,e,f,g,h=c("ABep"),i=c("Ipng"),j=c("mevF"),k=c("unhp"),l=c("PVZC"),m=c("zd8w"),n=c("hPwS");let o=parseInt("179".replace(/\D+/g,"")),p=(d={screenspace:!1,color:new l.K("black"),opacity:1,thickness:.05,size:new l.Wd},e=`#include <common>
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
   }`,f=`uniform vec3 color;
   uniform float opacity;
   #include <clipping_planes_pars_fragment>
   void main(){
     #include <clipping_planes_fragment>
     gl_FragColor = vec4(color, opacity);
     #include <tonemapping_fragment>
     #include <${o>=154?"colorspace_fragment":"encodings_fragment"}>
   }`,(g=class extends l.jd{constructor(a){for(let b in super({vertexShader:e,fragmentShader:f,...a}),d)this.uniforms[b]=new l.Td(d[b]),Object.defineProperty(this,b,{get(){return this.uniforms[b].value},set(a){this.uniforms[b].value=a}});this.uniforms=l.Vd.clone(this.uniforms)}}).key=l.pc.generateUUID(),g);function q({color:a="black",opacity:b=1,transparent:c=!1,screenspace:d=!1,toneMapped:e=!0,polygonOffset:f=!1,polygonOffsetFactor:g=0,renderOrder:h=0,thickness:i=.05,angle:j=Math.PI,clippingPlanes:o,...r}){let s=m.useRef(null),[t]=m.useState(()=>new p({side:1})),{gl:u}=(0,n.C)(),v=u.getDrawingBufferSize(new l.Wd);m.useMemo(()=>(0,n.e)({OutlinesMaterial:p}),[]);let w=m.useRef(0),x=m.useRef(null);return m.useLayoutEffect(()=>{let a=s.current;if(!a)return;let b=a.parent;if(b&&b.geometry&&(w.current!==j||x.current!==b.geometry)){var c;w.current=j,x.current=b.geometry;let d=null==(c=a.children)?void 0:c[0];d&&(j&&d.geometry.dispose(),a.remove(d)),b.skeleton?((d=new l.rd).material=t,d.bind(b.skeleton,b.bindMatrix)):b.isInstancedMesh?(d=new l.Mb(b.geometry,t,b.count)).instanceMatrix=b.instanceMatrix:(d=new l.tc).material=t,a.add(d),d.geometry=j?function(a,b=Math.PI/3){let c=Math.cos(b),d=(1+1e-10)*100,e=[new l.Xd,new l.Xd,new l.Xd],f=new l.Xd,g=new l.Xd,h=new l.Xd,i=new l.Xd;function j(a){let b=~~(a.x*d),c=~~(a.y*d),e=~~(a.z*d);return`${b},${c},${e}`}let k=a.index?a.toNonIndexed():a,m=k.attributes.position,n={};for(let a=0,b=m.count/3;a<b;a++){let b=3*a,c=e[0].fromBufferAttribute(m,b+0),d=e[1].fromBufferAttribute(m,b+1),h=e[2].fromBufferAttribute(m,b+2);f.subVectors(h,d),g.subVectors(c,d);let i=new l.Xd().crossVectors(f,g).normalize();for(let a=0;a<3;a++){let b=j(e[a]);b in n||(n[b]=[]),n[b].push(i)}}let o=new Float32Array(3*m.count),p=new l.z(o,3,!1);for(let a=0,b=m.count/3;a<b;a++){let b=3*a,d=e[0].fromBufferAttribute(m,b+0),k=e[1].fromBufferAttribute(m,b+1),l=e[2].fromBufferAttribute(m,b+2);f.subVectors(l,k),g.subVectors(d,k),h.crossVectors(f,g).normalize();for(let a=0;a<3;a++){let d=n[j(e[a])];i.set(0,0,0);for(let a=0,b=d.length;a<b;a++){let b=d[a];h.dot(b)>c&&i.add(b)}i.normalize(),p.setXYZ(b+a,i.x,i.y,i.z)}}return k.setAttribute("normal",p),k}(b.geometry,j):b.geometry,d.morphTargetInfluences=b.morphTargetInfluences,d.morphTargetDictionary=b.morphTargetDictionary}}),m.useLayoutEffect(()=>{let j=s.current;if(!j)return;let k=j.children[0];if(k){k.renderOrder=h;let l=j.parent;(0,n.s)(k,{morphTargetInfluences:l.morphTargetInfluences,morphTargetDictionary:l.morphTargetDictionary}),(0,n.s)(k.material,{transparent:c,thickness:i,color:a,opacity:b,size:v,screenspace:d,toneMapped:e,polygonOffset:f,polygonOffsetFactor:g,clippingPlanes:o,clipping:o&&o.length>0})}}),m.useEffect(()=>()=>{let a=s.current;if(!a)return;let b=a.children[0];b&&(j&&b.geometry.dispose(),a.remove(b))},[]),m.createElement("group",(0,k.a)({ref:s},r))}var r=c("Njew"),s=c("oeGO"),t=c("Qgfj"),u=c("Wf1j"),v=c("oyxz"),w=c("KwmQ"),x=c("iLdV"),y=c("sKwe"),z=c("LP6J"),A=c("A8Th"),B=c("sszc");let C=B.b.max+.45,D=B.b.max+.72,E=Math.PI/18,F=Math.PI-.16,G=(a,b,c)=>{let d=document.createElement("span");d.style.color=`var(${b})`,d.style.position="absolute",d.style.visibility="hidden",a.appendChild(d);let e=window.getComputedStyle(d).color||c;return d.remove(),e},H=a=>{let{boundary:b,color:c,innerBoundary:d,opacity:e}=a,f=(0,m.useMemo)(()=>{let a,c;return a=d?[...b,...d].map(B.m):[[0,0,0],...b].map(B.m),(c=new l.A).setAttribute("position",new l.ub(a.flat(),3)),c.setIndex(Array.from({length:Math.max(0,b.length-1)},(a,c)=>d?[c,c+1,b.length+c,c+1,b.length+c+1,b.length+c]:[0,c+1,c+2]).flat()),c.computeVertexNormals(),c},[b,d]);return(0,m.useLayoutEffect)(()=>()=>f.dispose(),[f]),(0,h.jsx)("mesh",{geometry:f,renderOrder:1,children:(0,h.jsx)("meshBasicMaterial",{color:c,transparent:!0,opacity:e,side:2,depthWrite:!1})})},I=a=>{let{color:b,opacity:c=1,points:d,width:e=1.6}=a;return(0,h.jsx)(i.a,{color:b,depthWrite:!1,lineWidth:e,opacity:c,points:d.map(B.m),transparent:c<1})},J=()=>(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)(j.a,{center:!0,position:[D,0,0],children:(0,h.jsx)("span",{className:"text-token-text-secondary text-xs",children:"x"})}),(0,h.jsx)(j.a,{center:!0,position:[0,0,D],children:(0,h.jsx)("span",{className:"text-token-text-secondary text-xs",children:"y"})}),(0,h.jsx)(j.a,{center:!0,position:[0,D,0],children:(0,h.jsx)("span",{className:"text-token-text-secondary text-xs",children:"z"})})]}),K=a=>{let{colors:b,isThumbnail:c,values:d}=a,{pStart:e,p:f,phiStart:g,phi:i,thetaStart:j,theta:k}=d,l=i-g,n=k-j,o=(0,m.useMemo)(()=>(0,B.f)(f,g,i,j),[f,g,i,j]),p=(0,m.useMemo)(()=>(0,B.f)(f,g,i,k),[f,g,i,k]),r=(0,m.useMemo)(()=>(0,B.f)(e,g,i,j),[e,g,i,j]),s=(0,m.useMemo)(()=>(0,B.f)(e,g,i,k),[e,g,i,k]),t=(0,m.useMemo)(()=>(0,B.e)(f,g,j,k),[f,g,j,k]),u=(0,m.useMemo)(()=>(0,B.e)(f,i,j,k),[f,i,j,k]),v=(0,m.useMemo)(()=>(0,B.e)(e,g,j,k),[e,g,j,k]),w=(0,m.useMemo)(()=>(0,B.e)(e,i,j,k),[e,i,j,k]),x=(0,m.useMemo)(()=>(0,B.g)(B.b.max,"equatorial"),[]),y=(0,m.useMemo)(()=>(0,B.g)(B.b.max,"meridian"),[]),z=f-e>1e-6&&l>1e-6&&n>1e-6,A=e>1e-6,D=n<B.d.max-1e-6,E=g>B.a.controlMin+1e-6,F=i<B.a.max-1e-6;return(0,h.jsxs)("group",{children:[!c&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)(I,{color:b.secondary,opacity:.22,points:[[-C,0,0],[C,0,0]],width:1}),(0,h.jsx)(I,{color:b.secondary,opacity:.22,points:[[0,-C,0],[0,C,0]],width:1}),(0,h.jsx)(I,{color:b.secondary,opacity:.22,points:[[0,0,-C],[0,0,C]],width:1}),(0,h.jsx)(I,{color:b.secondary,opacity:.14,points:x,width:1}),(0,h.jsx)(I,{color:b.secondary,opacity:.14,points:y,width:1}),(0,h.jsx)(J,{})]}),z&&(0,h.jsxs)("mesh",{renderOrder:2,children:[(0,h.jsx)("sphereGeometry",{args:[f,64,40,(0,B.h)(k),n,g,l]}),(0,h.jsx)("meshBasicMaterial",{color:b.primary,transparent:!0,opacity:.25,side:2,depthWrite:!1}),(0,h.jsx)(q,{angle:0,color:b.primary,opacity:.34,renderOrder:3,thickness:.8,transparent:!0})]}),z&&A&&(0,h.jsxs)("mesh",{renderOrder:2,children:[(0,h.jsx)("sphereGeometry",{args:[e,64,40,(0,B.h)(k),n,g,l]}),(0,h.jsx)("meshBasicMaterial",{color:b.companion,transparent:!0,opacity:.2,side:2,depthWrite:!1}),(0,h.jsx)(q,{angle:0,color:b.companion,opacity:.24,renderOrder:3,thickness:.65,transparent:!0})]}),z&&D&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)(H,{boundary:o,color:b.companion,innerBoundary:A?r:void 0,opacity:.14}),(0,h.jsx)(H,{boundary:p,color:b.companion,innerBoundary:A?s:void 0,opacity:.2})]}),z&&E&&(0,h.jsx)(H,{boundary:t,color:b.accent,innerBoundary:A?v:void 0,opacity:.13}),z&&F&&(0,h.jsx)(H,{boundary:u,color:b.accent,innerBoundary:A?w:void 0,opacity:.18}),z&&D&&(0,h.jsxs)(h.Fragment,{children:[(0,h.jsx)(I,{color:b.primary,opacity:.3,points:o,width:1}),(0,h.jsx)(I,{color:b.primary,opacity:.3,points:p,width:1})]}),z&&E&&(0,h.jsx)(I,{color:b.primary,opacity:.3,points:t,width:1}),z&&F&&(0,h.jsx)(I,{color:b.primary,opacity:.3,points:u,width:1})]})},L=(0,t.f)({sphere:{id:"learningBlock.sphericalCoordinates.shapeSphere",defaultMessage:"Sphere"},cone:{id:"learningBlock.sphericalCoordinates.shapeCone",defaultMessage:"Cone"},donut:{id:"learningBlock.sphericalCoordinates.shapeDonut",defaultMessage:"Donut"}}),M=(0,t.f)({radialStart:{id:"learningBlock.sphericalCoordinates.radialLowerBound",defaultMessage:"Radial lower bound a"},radialEnd:{id:"learningBlock.sphericalCoordinates.radialUpperBound",defaultMessage:"Radial upper bound b"},polarStart:{id:"learningBlock.sphericalCoordinates.polarLowerBound",defaultMessage:"Polar-angle lower bound a"},polarEnd:{id:"learningBlock.sphericalCoordinates.polarUpperBound",defaultMessage:"Polar-angle upper bound b"},azimuthalStart:{id:"learningBlock.sphericalCoordinates.azimuthalLowerBound",defaultMessage:"Azimuthal-angle lower bound a"},azimuthalEnd:{id:"learningBlock.sphericalCoordinates.azimuthalUpperBound",defaultMessage:"Azimuthal-angle upper bound b"}}),N=(0,t.f)({value:{id:"learningBlock.sphericalCoordinates.angularValuePluralized",defaultMessage:"{quantity, plural, one {{multiple} pi radian} other {{multiple} pi radians}}"}}),O=(a,b)=>a.formatMessage(N.value,{quantity:b/Math.PI,multiple:(0,A.c)(a,b/Math.PI)}),P=a=>{let{values:b,setValues:c}=a,d=(0,u.a)(),e=(0,B.l)(b),f=(0,z.c)(d),g=d.formatMessage({id:"learningBlock.sphericalCoordinates.shapeSelector",defaultMessage:"Spherical-coordinate shape"}),i=d.formatMessage(M.radialStart),j=d.formatMessage(M.radialEnd),k=d.formatMessage(M.polarStart),l=d.formatMessage(M.polarEnd),m=d.formatMessage(M.azimuthalStart),n=d.formatMessage(M.azimuthalEnd),o=(0,x.b)(B.c.map((a,b)=>({value:b,label:d.formatMessage(L[a])}))),p=function(a,b,d){let[e,f]=d,g=arguments.length>3&&void 0!==arguments[3]?arguments[3]:1,h=f*g;c(c=>({...c,[a]:h>1e-6?e*g/h:0,[b]:h}),"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")};return(0,h.jsx)(w.c,{screenReaderContent:(0,h.jsx)(v.a,{id:"learningBlock.sphericalCoordinates.controlsDescription",defaultMessage:"Choose a sphere, cone, or donut preset, then adjust the a and b handles to set each radial, polar-angle, and azimuthal-angle interval."}),children:(0,h.jsx)(y.a,{inputs:[{ariaLabel:g,min:0,max:B.c.length-1,step:1,value:B.c.indexOf(e.shape),options:o,onChange:a=>{let b=B.c[a];b&&c((0,B.j)(b),"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")}},{...f,variable:"p",min:B.b.controlMin,max:B.b.max,step:B.b.step,value:e.p,ariaLabel:j,ariaValueText:(0,A.c)(d,e.p),onChange:a=>p("radialInnerFraction","p",[Math.min(e.pStart,a),a]),range:{values:[e.pStart,e.p],ariaLabels:[i,j],ariaValueTexts:[(0,A.c)(d,e.pStart),(0,A.c)(d,e.p)],displayValues:[(0,A.c)(d,e.pStart),(0,A.c)(d,e.p)],onChange:a=>p("radialInnerFraction","p",a)}},{...f,variable:"\\phi",min:B.a.controlMin/Math.PI,max:B.a.max/Math.PI,step:B.a.sliderStep,value:e.phi/Math.PI,ariaLabel:l,ariaValueText:O(d,e.phi),onChange:a=>p("polarLowerFraction","phi",[Math.min(e.phiStart/Math.PI,a),a],Math.PI),range:{values:[e.phiStart/Math.PI,e.phi/Math.PI],ariaLabels:[k,l],ariaValueTexts:[O(d,e.phiStart),O(d,e.phi)],displayValues:[(0,A.b)(d,e.phiStart),(0,A.b)(d,e.phi)],onChange:a=>p("polarLowerFraction","phi",a,Math.PI)}},{...f,variable:"\\theta",min:B.d.controlMin/Math.PI,max:B.d.max/Math.PI,step:B.d.sliderStep,value:e.theta/Math.PI,ariaLabel:n,ariaValueText:O(d,e.theta),onChange:a=>p("azimuthalLowerFraction","theta",[Math.min(e.thetaStart/Math.PI,a),a],Math.PI),range:{values:[e.thetaStart/Math.PI,e.theta/Math.PI],ariaLabels:[m,n],ariaValueTexts:[O(d,e.thetaStart),O(d,e.theta)],displayValues:[(0,A.b)(d,e.thetaStart),(0,A.b)(d,e.theta)],onChange:a=>p("azimuthalLowerFraction","theta",a,Math.PI)}}]})})},Q=a=>{let{values:b,presentationMode:c}=a,d=(0,u.a)(),e=(0,m.useRef)(null),f=(0,m.useRef)(null),g=(a=>{let[b,c]=(0,m.useState)(null);return(0,m.useLayoutEffect)(()=>{let b=a.current;if(!b)return;let d=()=>{let a=window.getComputedStyle(b).color,d={accent:G(b,"--learning-block-accent",a),companion:G(b,"--learning-block-color-companion",a),primary:G(b,"--learning-block-color-primary",a),secondary:G(b,"--text-secondary",a)};c(a=>a?.accent===d.accent&&a.companion===d.companion&&a.primary===d.primary&&a.secondary===d.secondary?a:d)};if(d(),"u"<typeof MutationObserver)return;let e=new MutationObserver(d),f={attributes:!0,attributeFilter:["class","style","data-theme","data-accent"]};return e.observe(document.documentElement,f),document.body&&e.observe(document.body,f),e.observe(b,f),()=>e.disconnect()},[a]),b})(e),i=(0,B.l)(b),j="thumbnail"===c,k=d.formatMessage({id:"learningBlock.sphericalCoordinates.regionDescriptionWithLocalizedAngles",defaultMessage:"{shape} with radial bounds {radiusStart} to {radiusEnd}, polar-angle bounds {polarStart} to {polarEnd}, and azimuthal-angle bounds {azimuthStart} to {azimuthEnd}. The transverse azimuthal radius is {transverseRadius}, equal to radial distance times the sine of the polar angle."},{shape:d.formatMessage(L[i.shape]),radiusStart:(0,A.c)(d,i.pStart),radiusEnd:(0,A.c)(d,i.p),polarStart:O(d,i.phiStart),polarEnd:O(d,i.phi),azimuthStart:O(d,i.thetaStart),azimuthEnd:O(d,i.theta),transverseRadius:(0,A.c)(d,(0,B.i)(i.p,Math.min(Math.max(Math.PI/2,i.phiStart),i.phi)))}),l=d.formatMessage({id:"learningBlock.sphericalCoordinates.keyboardCameraControls",defaultMessage:"Use the arrow keys to rotate the three-dimensional view"});return(0,h.jsx)("div",{ref:e,"aria-description":j?void 0:l,"aria-keyshortcuts":j?void 0:"ArrowLeft ArrowRight ArrowUp ArrowDown","aria-label":k,className:`text-token-text-primary relative w-full overflow-hidden ${j?"h-full":"h-[252px]"}`,onKeyDown:j?void 0:a=>{let b=f.current;if(b){switch(a.key){case"ArrowLeft":b.setAzimuthalAngle(b.getAzimuthalAngle()+E);break;case"ArrowRight":b.setAzimuthalAngle(b.getAzimuthalAngle()-E);break;case"ArrowUp":b.setPolarAngle(Math.max(.16,b.getPolarAngle()-E));break;case"ArrowDown":b.setPolarAngle(Math.min(F,b.getPolarAngle()+E));break;default:return}a.preventDefault(),b.update()}},role:"img",tabIndex:j?void 0:0,children:g&&(0,h.jsxs)(s.a,{"data-learning-block-pan":j?void 0:"both","aria-hidden":!0,camera:{fov:j?45:47,position:[12,9,12]},dpr:[1,1.5],frameloop:"demand",gl:{alpha:!0,antialias:!0},style:{height:"100%",touchAction:j?"auto":"none",width:"100%"},children:[(0,h.jsx)(K,{colors:g,isThumbnail:j,values:i}),!j&&(0,h.jsx)(r.a,{ref:f,enableDamping:!1,enablePan:!1,enableZoom:!1,maxPolarAngle:F,minPolarAngle:.16})]})})}}};