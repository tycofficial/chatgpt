export const __rspack_esm_ids=[633555];export const __webpack_modules__={Ipng(a,b,c){let d,e;c.d(b,{a:()=>H});var f=c("unhp"),g=c("zd8w"),h=c("PVZC"),i=c("hPwS");let j=new h.v,k=new h.Xd;class l extends h.Kb{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new h.ub([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new h.ub([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(a){let b=this.attributes.instanceStart,c=this.attributes.instanceEnd;return void 0!==b&&(b.applyMatrix4(a),c.applyMatrix4(a),b.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(a){let b;a instanceof Float32Array?b=a:Array.isArray(a)&&(b=new Float32Array(a));let c=new h.Lb(b,6,1);return this.setAttribute("instanceStart",new h.Rb(c,3,0)),this.setAttribute("instanceEnd",new h.Rb(c,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(a,b=3){let c;a instanceof Float32Array?c=a:Array.isArray(a)&&(c=new Float32Array(a));let d=new h.Lb(c,2*b,1);return this.setAttribute("instanceColorStart",new h.Rb(d,b,0)),this.setAttribute("instanceColorEnd",new h.Rb(d,b,b)),this}fromWireframeGeometry(a){return this.setPositions(a.attributes.position.array),this}fromEdgesGeometry(a){return this.setPositions(a.attributes.position.array),this}fromMesh(a){return this.fromWireframeGeometry(new h.fe(a.geometry)),this}fromLineSegments(a){let b=a.geometry;return this.setPositions(b.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new h.v);let a=this.attributes.instanceStart,b=this.attributes.instanceEnd;void 0!==a&&void 0!==b&&(this.boundingBox.setFromBufferAttribute(a),j.setFromBufferAttribute(b),this.boundingBox.union(j))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new h.td),null===this.boundingBox&&this.computeBoundingBox();let a=this.attributes.instanceStart,b=this.attributes.instanceEnd;if(void 0!==a&&void 0!==b){let c=this.boundingSphere.center;this.boundingBox.getCenter(c);let d=0;for(let e=0,f=a.count;e<f;e++)k.fromBufferAttribute(a,e),d=Math.max(d,c.distanceToSquared(k)),k.fromBufferAttribute(b,e),d=Math.max(d,c.distanceToSquared(k));this.boundingSphere.radius=Math.sqrt(d),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(a){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(a)}}var m=c("STXV");let n=parseInt("179".replace(/\D+/g,""));class o extends h.jd{constructor(a){super({type:"LineMaterial",uniforms:h.Vd.clone(h.Vd.merge([m.UniformsLib.common,m.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new h.Wd(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
      `}),[x]);return g.createElement("group",(0,f.a)({},J,{ref:U}),y&&!aa&&g.createElement("mesh",{castShadow:A,receiveShadow:B,ref:$},D||g.createElement("planeGeometry",null),C||g.createElement("shaderMaterial",{side:2,vertexShader:ae.vertexShader,fragmentShader:ae.fragmentShader})))});c.d(b,{},{a:t})},tkCL(a,b,c){var d=c("ABep"),e=c("mevF"),f=c("Ipng"),g=c("Njew"),h=c("oeGO"),i=c("hPwS"),j=c("zd8w"),k=c("Qgfj"),l=c("Wf1j"),m=c("PVZC"),n=c("l7Go"),o=c("sCEh"),p=c("ZKaa");let q=h.a,r=e.a,s=f.a,t="group",u="mesh",v="sphereGeometry",w="meshBasicMaterial",x="meshStandardMaterial",y=Math.PI/12,z=(0,k.f)({cameraInstructions:{id:"learningBlock.multivariable.cameraInstructions",defaultMessage:"Use the arrow keys to rotate the three-dimensional scene"},pointInstructions:{id:"learningBlock.multivariable.pointInstructions",defaultMessage:"Use the arrow keys to move horizontally or vertically, and Page Up or Page Down to move in depth"},adjustPoint:{id:"learningBlock.multivariable.adjustPoint",defaultMessage:"Adjust point"}}),A={accent:"var(--learning-block-accent)",primary:"var(--learning-block-color-primary)",secondary:"var(--learning-block-color-secondary)",third:"var(--learning-block-color-third)",fourth:"var(--learning-block-color-fourth)",neutral:"var(--text-secondary)"},B=a=>{let{x:b,y:c,z:d}=a;return[b,c,d]},C=a=>{let{position:b}=a,c=(0,i.C)(a=>a.camera),d=(0,i.C)(a=>a.invalidate);return(0,j.useEffect)(()=>{c.position.set(b[0],b[1],b[2]),c.lookAt(0,0,0),c.updateMatrixWorld(),d()},[c,d,b[0],b[1],b[2]]),null},D=a=>{let{arrow:b,colors:c,showLabel:e}=a,f=b.from??(0,p.e)(0,0,0),g=(0,p.a)(b.to,(0,p.h)(f,-1)),h=(0,p.c)(g);if(h<1e-5)return null;let i=(0,p.d)(g),j=new m.Zc().setFromUnitVectors(new m.Xd(0,1,0),new m.Xd(i.x,i.y,i.z)),k=Math.min(b.headLength??(b.emphasis?.32:.24),.3*h),l=b.shaftRadius??(b.emphasis?.046:.034),o=b.headRadius??(b.emphasis?.13:.1),q=h-k,s=(0,p.a)(f,(0,p.h)(i,q/2)),v=(0,p.a)(f,(0,p.h)(i,q+k/2)),w=c[b.role??"primary"];return(0,d.jsxs)(t,{children:[(0,d.jsxs)(u,{position:B(s),quaternion:j.toArray(),children:[(0,d.jsx)("cylinderGeometry",{args:[l,l,q,16]}),(0,d.jsx)(x,{color:w,roughness:.45})]}),(0,d.jsxs)(u,{position:B(v),quaternion:j.toArray(),children:[(0,d.jsx)("coneGeometry",{args:[o,k,18]}),(0,d.jsx)(x,{color:w,roughness:.42})]}),e&&b.label?(0,d.jsx)(r,{center:!0,position:B((0,p.a)(b.to,(0,p.h)(i,.18))),children:(0,d.jsx)(n.a,{latex:b.label,className:"pointer-events-none text-xs font-semibold whitespace-nowrap",style:{color:w}})}):null]})},E=a=>{let{patch:b,colors:c}=a,e=(0,j.useMemo)(()=>{var a;let c;return a=b.corners,(c=new m.A).setAttribute("position",new m.ub([0,1,2,0,2,3].flatMap(b=>B(a[b])),3)),c.computeVertexNormals(),c},[b.corners]);return(0,d.jsx)(u,{geometry:e,renderOrder:1,children:(0,d.jsx)(w,{color:c[b.role??"secondary"],side:2,transparent:!0,opacity:b.opacity??.16,depthWrite:!1})})},F=(a,b)=>{if(!b)return a.length>1?[a]:[];let c=[],d=[];return a.forEach((a,e)=>{b[e]?d.push(a):(d.length>1&&c.push(d),d=[])}),d.length>1&&c.push(d),c},G=(0,j.memo)(function(a){let{surface:b,colors:c}=a,e=(0,j.useMemo)(()=>{let a=[];for(let c=0;c+1<b.grid.length;c+=1)for(let d=0;d+1<b.grid[c].length;d+=1){if(b.validity&&(!b.validity[c]?.[d]||!b.validity[c+1]?.[d]||!b.validity[c+1]?.[d+1]||!b.validity[c]?.[d+1]))continue;let e=b.grid[c][d],f=b.grid[c+1][d],g=b.grid[c+1][d+1],h=b.grid[c][d+1];a.push(...B(e),...B(f),...B(g)),a.push(...B(e),...B(g),...B(h))}let c=new m.A;return c.setAttribute("position",new m.ub(a,3)),c.computeVertexNormals(),c},[b.grid,b.validity]),f=c[b.role??"secondary"],g=b.grid[0]?.length??0,h=(0,j.useMemo)(()=>b.grid.flatMap((a,c)=>F(a,b.validity?.[c]).map((a,b)=>({key:`row-${c}-${b}`,points:a.map(B)}))),[b.grid,b.validity]),i=(0,j.useMemo)(()=>Array.from({length:g},(a,c)=>({points:b.grid.map(a=>a[c]),validity:b.validity?.map(a=>a[c])})).flatMap((a,b)=>{let{points:c,validity:d}=a;return F(c,d).map((a,c)=>({key:`column-${b}-${c}`,points:a.map(B)}))}),[g,b.grid,b.validity]);return(0,d.jsxs)(t,{children:[(0,d.jsx)(u,{geometry:e,renderOrder:1,children:(0,d.jsx)(w,{color:f,side:2,transparent:!0,opacity:b.opacity??.17,depthWrite:!1})}),h.map(a=>{let{key:c,points:e}=a;return(0,d.jsx)(s,{points:e,color:f,transparent:!0,opacity:b.wireOpacity??.5,lineWidth:.9},c)}),i.map(a=>{let{key:c,points:e}=a;return(0,d.jsx)(s,{points:e,color:f,transparent:!0,opacity:b.wireOpacity??.5,lineWidth:.9},c)})]})}),H=a=>{let{curtain:b,colors:c}=a,e=(0,j.useMemo)(()=>{let a=[],c=Math.min(b.upper.length,b.lower.length);for(let d=0;d+1<c;d+=1){let c=b.upper[d],e=b.upper[d+1],f=b.lower[d],g=b.lower[d+1];a.push(...B(c),...B(f),...B(g),...B(c),...B(g),...B(e))}let d=new m.A;return d.setAttribute("position",new m.ub(a,3)),d.computeVertexNormals(),d},[b.lower,b.upper]);return(0,d.jsx)(u,{geometry:e,renderOrder:1,children:(0,d.jsx)(w,{color:c[b.role??"primary"],side:2,transparent:!0,opacity:b.opacity??.22,depthWrite:!1})})},I=a=>{let{colors:b,extent:c,extents:e,labelScale:f=1,labels:g=["x","y","z"],showLabels:h}=a;return(0,d.jsx)(t,{children:[{endpoint:(0,p.e)(e?.[0]??c,0,0),label:g[0]},{endpoint:(0,p.e)(0,e?.[1]??c,0),label:g[1]},{endpoint:(0,p.e)(0,0,e?.[2]??c),label:g[2]}].map(a=>{let{endpoint:c,label:e}=a;return(0,d.jsxs)(t,{children:[(0,d.jsx)(s,{points:[B((0,p.h)(c,-1)),B(c)],color:b.neutral,transparent:!0,opacity:.32,lineWidth:.85}),h?(0,d.jsx)(r,{center:!0,position:B((0,p.h)(c,f)),children:(0,d.jsx)(n.a,{latex:e,className:"pointer-events-none text-xs whitespace-nowrap",style:{color:b.neutral}})}):null]},e)})})},J=a=>{let{colors:b,coordinateGroupRef:c,index:e,interactive:f,onDragActiveChange:g,onDragPoint:h,point:i,showLabel:k}=a,l=(0,j.useRef)(null),o=(0,j.useRef)(new m.Wd),q=(0,j.useRef)(null),s=f&&i.draggable&&void 0!==h,y=(a,b)=>{let c=a.nativeEvent.target;if(!(c instanceof HTMLElement))return a.ray;let d=b??c.getBoundingClientRect();return 0===d.width||0===d.height?a.ray:(o.current.set((a.nativeEvent.clientX-d.left)/d.width*2-1,-(2*((a.nativeEvent.clientY-d.top)/d.height))+1),q.current??=new m.dd,q.current.setFromCamera(o.current,a.camera),q.current.ray)},z=(a,b)=>{let c=a.nativeEvent.target;c instanceof HTMLElement&&(c.style.cursor=b)},A=a=>{if(void 0===i.hitTolerancePixels)return!0;let b=a.nativeEvent.target,d=c.current;if(!(b instanceof HTMLElement)||!d)return!0;let e=b.getBoundingClientRect();if(0===e.width||0===e.height)return!0;d.updateWorldMatrix(!0,!1);let f=b=>{let c=d.localToWorld(new m.Xd(b.x,b.y,b.z)).project(a.camera);return{x:e.left+(c.x+1)*e.width/2,y:e.top+(1-c.y)*e.height/2}},g=f(i.point),h=f(i.dragOrigin??i.point),j=g.x-h.x,k=g.y-h.y,l=j*j+k*k,n=l>0?Math.min(1,Math.max(0,((a.nativeEvent.clientX-h.x)*j+(a.nativeEvent.clientY-h.y)*k)/l)):1,o=h.x+n*j,p=h.y+n*k,q="touch"===a.nativeEvent.pointerType?Math.max(i.hitTolerancePixels,22):i.hitTolerancePixels;return Math.hypot(a.nativeEvent.clientX-o,a.nativeEvent.clientY-p)<=q},C=a=>{let b=l.current;if(b&&b.pointerId===a.pointerId){l.current=null,g(!1),z(a,"grab");try{a.target.releasePointerCapture?.(a.pointerId)}catch{}a.stopPropagation()}};return(0,d.jsxs)(t,{position:B(i.point),onPointerDown:s?a=>{if(!s||!A(a))return;let b=new m.Xd(i.point.x,i.point.y,i.point.z);c.current?.updateWorldMatrix(!0,!1),c.current?.localToWorld(b);let d=a.camera.getWorldDirection(new m.Xd),e=new m.Lc().setFromNormalAndCoplanarPoint(d,b),f=y(a).intersectPlane(e,new m.Xd);if(!f)return;let h=a.nativeEvent.target;if(!(h instanceof HTMLElement))return;let j=h.getBoundingClientRect();l.current={bounds:{height:j.height,left:j.left,top:j.top,width:j.width},offset:b.sub(f),plane:e,pointerId:a.pointerId},g(!0),z(a,"grabbing");try{a.target.setPointerCapture?.(a.pointerId)}catch{}a.stopPropagation()}:void 0,onPointerMove:s?a=>{let b=l.current;if(!s)return;if(!b)return void z(a,A(a)?"grab":"auto");if(b.pointerId!==a.pointerId)return;if(0===a.buttons)return void C(a);let d=y(a,b.bounds).intersectPlane(b.plane,new m.Xd);if(!d)return;let f=d.add(b.offset);c.current?.worldToLocal(f),h(e,(0,p.e)(f.x,f.y,f.z)),a.stopPropagation()}:void 0,onPointerUp:s?C:void 0,onPointerCancel:s?C:void 0,onLostPointerCapture:s?C:void 0,onPointerOver:s?a=>z(a,A(a)?"grab":"auto"):void 0,onPointerOut:s?a=>z(a,l.current?"grabbing":"auto"):void 0,children:[s?(0,d.jsxs)(u,{children:[(0,d.jsx)(v,{args:[i.hitRadius??.36,16,12]}),(0,d.jsx)(w,{transparent:!0,opacity:0,depthWrite:!1})]}):null,(0,d.jsxs)(u,{children:[(0,d.jsx)(v,{args:[i.radius??.085,20,16]}),(0,d.jsx)(x,{color:b[i.role??"accent"]})]}),k&&i.label?(0,d.jsx)(r,{center:!0,position:[.18,.14,0],children:(0,d.jsx)(n.a,{latex:i.label,className:"pointer-events-none text-xs font-semibold whitespace-nowrap",style:{color:b[i.role??"accent"]}})}):null]})},K=a=>{let{scene:b,ariaLabel:c,presentationMode:e,onDragPoint:f}=a,h=(0,l.a)(),i=(0,j.useRef)(null),k=(0,j.useRef)(null),m=(0,j.useRef)(null),n=(a=>{let[b,c]=(0,j.useState)(null);return(0,j.useEffect)(()=>{let b=a.current;if(!b)return;let d=()=>{let a=window.getComputedStyle(b),d=b=>a.getPropertyValue(b).trim()||a.color,e={accent:d("--learning-block-accent"),primary:d("--learning-block-color-primary"),secondary:d("--learning-block-color-secondary"),third:d("--learning-block-color-third"),fourth:d("--learning-block-color-fourth"),neutral:d("--text-secondary")};c(a=>a&&Object.keys(e).every(b=>a[b]===e[b])?a:e)};d();let e=new MutationObserver(d);return e.observe(document.documentElement,{attributes:!0,attributeFilter:["class","data-theme","style"]}),e.observe(b,{attributes:!0,attributeFilter:["class","style"]}),()=>e.disconnect()},[a]),b})(i),o=(a=>{let[b,c]=(0,j.useState)(()=>"u"<typeof IntersectionObserver);return(0,j.useEffect)(()=>{let b=a.current;if(!b||"u"<typeof IntersectionObserver)return;let d=new IntersectionObserver(a=>{let[b]=a;c(b?.isIntersecting??!1)});return d.observe(b),()=>d.disconnect()},[a]),b})(i),r="thumbnail"===e,x=!r&&"fixed"!==b.cameraControls,[A,F]=(0,j.useState)(!1),K=b.extent??2.8,L=b.camera??[2.5*K,-(1.9*K),2.7*K];return(0,d.jsxs)(d.Fragment,{children:[(0,d.jsx)("div",{ref:i,role:"img","aria-label":c,"aria-description":x?h.formatMessage(z.cameraInstructions):void 0,className:r?"text-token-text-primary relative h-full w-full overflow-hidden":"text-token-text-primary relative h-[246px] max-h-[270px] w-full overflow-hidden sm:h-[270px]",onKeyDown:x?a=>{let b=m.current;if(b){switch(a.key){case"ArrowLeft":b.setAzimuthalAngle(b.getAzimuthalAngle()+y);break;case"ArrowRight":b.setAzimuthalAngle(b.getAzimuthalAngle()-y);break;case"ArrowUp":b.setPolarAngle(b.getPolarAngle()-y);break;case"ArrowDown":b.setPolarAngle(b.getPolarAngle()+y);break;default:return}a.preventDefault()}}:void 0,tabIndex:x?0:void 0,children:n&&o?(0,d.jsxs)(q,{"data-learning-block-pan":x||!r&&f&&b.points?.some(a=>a.draggable)?"both":void 0,"aria-hidden":"true",camera:{position:L,fov:38},dpr:[1,1.5],frameloop:"demand",gl:{alpha:!0,antialias:!0,powerPreference:"low-power"},style:{height:"100%",touchAction:r?"auto":"none",width:"100%"},children:[(0,d.jsx)(C,{position:L}),(0,d.jsx)("ambientLight",{intensity:1.5}),(0,d.jsx)("directionalLight",{position:[5,6,8],intensity:1.5}),(0,d.jsxs)(t,{ref:k,rotation:"y"===b.upAxis?void 0:[-Math.PI/2,0,0],children:[b.hideAxes?null:(0,d.jsx)(I,{colors:n,extent:K,extents:b.axisExtents,labelScale:b.axisLabelScale,labels:b.axisLabels,showLabels:!r}),b.surfaces?.map((a,b)=>(0,d.jsx)(G,{surface:a,colors:n},`surface-${b}`)),b.patches?.map((a,b)=>(0,d.jsx)(E,{patch:a,colors:n},`patch-${b}`)),b.curtains?.map((a,b)=>(0,d.jsx)(H,{curtain:a,colors:n},`curtain-${b}`)),b.lines?.map((a,b)=>(0,d.jsx)(s,{points:a.points.map(B),color:n[a.role??"primary"],lineWidth:a.width??1.7,transparent:!0,opacity:a.opacity??.9},`line-${b}`)),b.spheres?.map((a,b)=>(0,d.jsxs)(t,{position:B(a.center??(0,p.e)(0,0,0)),children:[(0,d.jsxs)(u,{children:[(0,d.jsx)(v,{args:[a.radius,32,24]}),(0,d.jsx)(w,{color:n[a.role??"secondary"],transparent:!0,opacity:a.opacity??.15,depthWrite:!1,side:2})]}),(0,d.jsxs)(u,{children:[(0,d.jsx)(v,{args:[a.radius,18,12]}),(0,d.jsx)(w,{color:n[a.role??"secondary"],transparent:!0,opacity:.28,wireframe:!0})]})]},`sphere-${b}`)),b.arrows?.map((a,b)=>(0,d.jsx)(D,{arrow:a,colors:n,showLabel:!r},`arrow-${b}`)),b.points?.map((a,b)=>(0,d.jsx)(J,{point:a,index:b,colors:n,coordinateGroupRef:k,interactive:!r,onDragActiveChange:F,onDragPoint:f,showLabel:!r},`point-${b}`))]}),x?(0,d.jsx)(g.a,{ref:m,enabled:!A,enableDamping:!1,enablePan:!1,enableZoom:!1,minPolarAngle:.18,maxPolarAngle:Math.PI-.18}):null]}):null}),!r&&f?b.points?.map((a,b)=>a.draggable?(0,d.jsx)("button",{type:"button","aria-label":a.ariaLabel,"aria-description":h.formatMessage(z.pointInstructions),className:"bg-token-main-surface-primary sr-only start-3 bottom-3 z-10 rounded-md text-xs focus:not-sr-only",style:{paddingBlock:"calc(var(--spacing) * 2)",paddingInline:"calc(var(--spacing) * 3)",position:"absolute"},onKeyDown:c=>{let d=a.keyboardStep??.1,e="ArrowLeft"===c.key?(0,p.e)(-d,0,0):"ArrowRight"===c.key?(0,p.e)(d,0,0):"ArrowDown"===c.key?(0,p.e)(0,-d,0):"ArrowUp"===c.key?(0,p.e)(0,d,0):"PageDown"===c.key?(0,p.e)(0,0,-d):"PageUp"===c.key?(0,p.e)(0,0,d):null;e&&(c.preventDefault(),c.stopPropagation(),f(b,(0,p.a)(a.point,e)))},children:h.formatMessage(z.adjustPoint)},`point-control-${b}`):null):null]})},L=a=>{let{scene:b,ariaLabel:c,presentationMode:e,onDragPoint:f}=a,g=b.segments?.map(a=>({from:a.from,to:a.to,stroke:A[a.role??"primary"],strokeWidth:a.width??2,opacity:a.opacity,strokeDasharray:a.dashed?"5 4":void 0,endMarker:a.arrow?"arrow":void 0})),h=b.polygons?.map(a=>({points:a.points,fill:A[a.role??"secondary"],opacity:a.opacity??.18})),i=b.circles?.map(a=>({center:a.center,radius:a.radius,stroke:A[a.role??"secondary"],strokeWidth:1.6,opacity:a.opacity})),j=b.points?.map(a=>({x:a.point.x,y:a.point.y,label:"thumbnail"===e?void 0:a.label,labelStyle:"derived_pill",draggable:"thumbnail"!==e&&a.draggable,ariaLabel:a.ariaLabel,keyboardStep:a.keyboardStep,appearance:{fill:A[a.role??"accent"],stroke:"var(--learning-block-visualization-surface, var(--bg-primary))",strokeWidth:2,radius:4}})),k=b.curves?.map(a=>({kind:"polyline",points:a.points,closed:a.closed,stroke:A[a.role??"primary"],strokeWidth:a.width??2,opacity:a.opacity}));return(0,d.jsx)(o.a,{ariaLabel:c,presentationMode:e,canvasSize:{width:360,height:265,padding:22},viewport:{mode:"bounds",bounds:b.bounds,paddingUnits:.18},segments:g,polygons:h,circles:i,points:j,onDragPoint:"thumbnail"!==e&&f?(a,b,c)=>f(a,(0,p.e)(c.x,c.y,0)):void 0,series:k,xAxisLabel:"x",yAxisLabel:"y",showAxisLabels:"thumbnail"!==e,showCoordinateTooltip:b.showCoordinateTooltip})};c.d(b,{},{a:a=>{let{scene:b,ariaLabel:c,presentationMode:e,onDragPoint:f}=a;return"three"===b.kind?(0,d.jsx)(K,{scene:b,ariaLabel:c,presentationMode:e,onDragPoint:f}):(0,d.jsx)(L,{scene:b,ariaLabel:c,presentationMode:e,onDragPoint:f})}})},LJqA(a,b,c){var d=c("ABep"),e=c("zd8w"),f=c("Qgfj"),g=c("Wf1j"),h=c("oyxz"),i=c("HOSX"),j=c("KwmQ"),k=c("pNxJ"),l=c("tkCL"),m=c("oTDc"),n=c("quSB"),o=c("rLdd");let p=(0,f.f)({rankSelector:{id:"learningBlock.nullSpace.rankSelector",defaultMessage:"Matrix rank"},rankOption:{id:"learningBlock.nullSpace.rankOption",defaultMessage:"Rank {rank}"},transform:{id:"learningBlock.nullSpace.transform",defaultMessage:"Transform"},reset:{id:"learningBlock.nullSpace.reset",defaultMessage:"Reset"},actionGroup:{id:"learningBlock.nullSpace.actionGroup",defaultMessage:"Matrix transformation"},nullSpaceLegend:{id:"learningBlock.nullSpace.nullSpaceLegend",defaultMessage:"Null space"},columnSpaceLegend:{id:"learningBlock.nullSpace.columnSpaceLegend",defaultMessage:"Column space"},plane:{id:"learningBlock.nullSpace.plane",defaultMessage:"plane"},line:{id:"learningBlock.nullSpace.line",defaultMessage:"line"},space:{id:"learningBlock.nullSpace.space",defaultMessage:"three-dimensional space"},origin:{id:"learningBlock.nullSpace.origin",defaultMessage:"origin only"},visualization:{id:"learningBlock.nullSpace.visualization",defaultMessage:"Rank {rank}, nullity {nullity}; their sum is {dimension}. The null space is a {nullSpace}, and the column space is a {columnSpace}. Every null-space vector maps to the origin."},collapsedVisualization:{id:"learningBlock.nullSpace.collapsedVisualization",defaultMessage:"Rank {rank}, nullity {nullity}; their sum is {dimension}. The null space has collapsed to the origin, and every other input lies in the {columnSpace} column space."}}),q=(a,b)=>a.formatNumber(Object.is(b,-0)?0:b,{maximumFractionDigits:0,useGrouping:!1}),r=a=>{let{values:b,presentationMode:c}=a,f=(0,g.a)(),i=(0,o.d)(b),j=(0,o.b)(i),k="thumbnail"===c,r=(0,n.c)(),s=i.isCollapsed&&!k&&r,t=(0,m.a)({durationSeconds:1.25,timeStepSeconds:.05,enabled:s,autoplay:s,loop:!1});(0,e.useEffect)(()=>{s&&t.restart()},[i.collapseVersion,s,t.restart]);let u=k?0:i.isCollapsed?r?t.progress:1:0,v=(0,o.c)(j,u),w=f.formatMessage(p[j.nullSpaceShape]),x=f.formatMessage(p[j.columnSpaceShape]),y=f.formatMessage(i.isCollapsed&&u>=1?p.collapsedVisualization:p.visualization,{rank:q(f,j.rank),nullity:q(f,j.nullity),dimension:q(f,j.rank+j.nullity),nullSpace:w,columnSpace:x});return(0,d.jsxs)("div",{ref:t.containerRef,className:k?"relative h-full w-full":"relative w-full",children:[(0,d.jsx)(l.a,{scene:v,ariaLabel:y,presentationMode:c}),k?null:(0,d.jsxs)("div",{"aria-hidden":"true",className:"pointer-events-none absolute start-3 top-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",children:[(0,d.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,d.jsx)("span",{className:"size-2 rounded-full",style:{backgroundColor:"var(--learning-block-color-secondary)"}}),(0,d.jsx)(h.a,{...p.nullSpaceLegend})]}),(0,d.jsxs)("span",{className:"flex items-center gap-1.5",children:[(0,d.jsx)("span",{className:"size-2 rounded-full",style:{backgroundColor:"var(--learning-block-color-primary)"}}),(0,d.jsx)(h.a,{...p.columnSpaceLegend})]})]})]})};c.d(b,{},{NullSpaceCaption:a=>{let b,c,{values:e}=a,f=(0,g.a)(),h=(0,o.b)(e),i=`A=${(b=h.matrix,`\\begin{bmatrix}${b.map(a=>a.map(a=>q(f,a)).join("&")).join("\\\\")}\\end{bmatrix}`)},`,k="\\operatorname{Null}(A)="+(0===(c=h.nullBasis).length?"\\{\\mathbf{0}\\}":`\\operatorname{span}\\left\\{${c.map(a=>`\\begin{bmatrix}${q(f,a.x)}\\\\${q(f,a.y)}\\\\${q(f,a.z)}\\end{bmatrix}`).join(",")}\\right\\}`);return(0,d.jsx)(j.a,{reserveLines:1,children:(0,d.jsxs)("div",{className:"flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1",children:[(0,d.jsx)("div",{className:"shrink-0",children:(0,d.jsx)(j.b,{content:i,format:"katex"})}),(0,d.jsx)("div",{className:"shrink-0",children:(0,d.jsx)(j.b,{content:k,format:"katex"})})]})})},NullSpaceControls:a=>{let{values:b,setValues:c}=a,e=(0,g.a)(),f=(0,o.d)(b);return(0,d.jsxs)(j.c,{screenReaderContent:(0,d.jsx)(h.a,{id:"learningBlock.nullSpace.controlsDescription",defaultMessage:"Choose matrix rank one, two, or three. Transform the input space to send every null-space vector to the origin while other inputs move into the column space."}),children:[(0,d.jsx)(k.a,{inputs:[{min:1,max:3,step:1,value:f.rank,ariaLabel:e.formatMessage(p.rankSelector),options:[1,2,3].map(a=>({value:a,label:e.formatMessage(p.rankOption,{rank:q(e,a)})})),onChange:a=>c({...f,rank:a,collapseVersion:0,isCollapsed:!1},"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE")}]}),(0,d.jsx)(i.b,{"aria-label":e.formatMessage(p.actionGroup),children:(0,d.jsx)(i.a,{onClick:()=>c({...f,collapseVersion:f.collapseVersion+1,isCollapsed:!f.isCollapsed},"CHATGPT_MATH_BLOCK_EDIT_TYPE_SLIDER_CHANGE"),children:e.formatMessage(f.isCollapsed?p.reset:p.transform)})})]})},NullSpaceVisualization:a=>{let{values:b,presentationMode:c}=a,e=(0,o.d)(b);return(0,d.jsx)(r,{values:e,presentationMode:c})}})}};