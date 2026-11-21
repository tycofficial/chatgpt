export const __rspack_esm_ids=[856817];export const __webpack_modules__={pRGt(a,b,c){var d=c("CpsU"),e=c.n(d),f=c("zKw6"),g=c.n(f),h=c("yI91"),i=c("HwQY"),j=c("lAQI"),k=c("mLoc");let{posix:l}=g(),m=`
scan() {
  if [ -d "$1" ]; then
    rg --files --hidden --follow --null --glob SKILL.md --glob '!**/{.git,node_modules}/**' -- "$1" |
      while IFS= read -r -d '' skill; do printf '%s\\0%s\\0' "$2" "$skill" || exit 141; done
    code=$?
    case "$code" in 0|1) ;; 2) discovery_code=2 ;; 141) exit 0 ;; *) exit "$code" ;; esac
  fi
}
{
  discovery_code=0
  scan "$HOME/.agents/skills" user
  scan "$\{CODEX_HOME:-$HOME/.codex}/skills" user
  directory=$1
  while :; do
    scope=repo
    if [ "$directory" = "$HOME" ]; then scope=user; fi
    scan "$directory/.agents/skills" "$scope"
    scan "$directory/.codex/skills" "$scope"
    if [ "$directory" = / ] || [ -e "$directory/.git" ]; then break; fi
    directory=$(dirname -- "$directory")
  done
  cache="$\{CODEX_HOME:-$HOME/.codex}/plugins/cache"
  scan "$cache" "$cache"
  exit "$discovery_code"
} | {
  # Stock macOS Bash lacks associative arrays. %q makes each path one line,
  # even when the filename contains a newline. Compare complete lines literally.
  shopt -u nocasematch
  seen=$'\\n'
  count=0
  while IFS= read -r -d '' scope && IFS= read -r -d '' skill; do
    printf -v key '%q' "$skill"
    if [[ "$seen" == *$'\\n'"$key"$'\\n'* ]]; then continue; fi
    seen+="$key"$'\\n'
    printf '%s\\0%s\\0' "$scope" "$skill"
    count=$((count + 1))
    if [ "$count" -ge 512 ]; then break; fi
  done
}
`,n=/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s|$)/,o=String.raw`
import base64, os, stat, sys

def skill_header(data):
    # Each batch starts a fresh Python process. Scan bytes directly to avoid importing re.
    # Trim only common headers, including the closing delimiter SKILL_FRONTMATTER needs.
    # Send the full file when we cannot identify that delimiter.
    newline = data.find(b"\n")
    if newline < 0 or data[:newline].rstrip() != b"---":
        return data
    first = data[newline + 1:newline + 2]
    if not (first.isalpha() or first == b"#"):
        return data
    end = data.find(b"\n---", newline + 1)
    while end >= 0:
        after = end + 4
        if not data[after:after + 1].strip():
            return data[:after + 1]
        end = data.find(b"\n---", after)
    return data

max_file_bytes = int(sys.argv[1])
files = sys.argv[3:]
remaining_bytes = int(sys.argv[2]) - 2 * len(files)
for path in files:
    result = b"!"
    try:
        metadata = os.stat(path)
        if stat.S_ISREG(metadata.st_mode) and metadata.st_size <= max_file_bytes:
            with open(path, "rb") as source:
                contents = source.read(max_file_bytes + 1)
            if len(contents) <= max_file_bytes:
                if os.path.basename(path) == "SKILL.md":
                    contents = skill_header(contents)
                encoded = base64.b64encode(contents)
                result = b"?"
                if len(encoded) <= remaining_bytes:
                    remaining_bytes -= len(encoded)
                    result = b"+" + encoded
    except FileNotFoundError:
        result = b"-"
    except OSError:
        result = b"?"
    sys.stdout.buffer.write(result + b"\0")
`,p=j.F({name:j.L().trim().min(1),description:j.L(),metadata:j.F({"short-description":j.L().optional()}).optional()}),q=j.F({interface:j.F({display_name:j.L().optional(),short_description:j.L().optional(),icon_small:j.L().optional(),icon_large:j.L().optional(),brand_color:j.L().optional(),default_prompt:j.L().optional()}).optional()}),r=j.F({extensions:j.F({"com.openai":j.F({publicSkills:j.g(j.L())})})});async function s(a,b,c,d){d?.throwIfAborted();let e=c.get(b);if("?"===e)return async function(a,b){try{return await async function(a,b){let c=await a.stat(b);if(!c.isFile()||null!=c.size&&c.size>1048576)throw Error("Skill metadata is not a readable text file");let d=0;return new Response((await a.readFile(b)).pipeThrough(new TransformStream({transform(a,b){if((d+=a.byteLength)>1048576)throw Error("Skill metadata exceeds the size limit");b.enqueue(a)}}))).text()}(a,b)}catch(a){if(a instanceof Error&&/ENOENT|No such file or directory/.test(a.message))return null;throw a}}(a,b);if("-"===e)return null;if(null==e||!e.startsWith("+"))throw Error("Unable to read skill metadata");let f=(0,h.a)(e.slice(1));if(f.byteLength>1048576)throw Error("Skill metadata exceeds the size limit");return new TextDecoder().decode(f)}c.d(b,{},{readHostedSkills:async function(a,b,c){let d=c?.signal;d?.throwIfAborted();let f=await (0,k.g)(await a.spawn({args:["bash","-o","pipefail","-c",m,"cloud-skills",b],cwd:b,signal:d,timeoutMs:1e4}));if(d?.throwIfAborted(),0!==f.code&&2!==f.code&&141!==f.code)throw Error("Unable to discover container skills");let g={cwd:b,skills:[],errors:2===f.code?[{path:b,message:"Unable to discover some container skills"}]:[]},h=e()(f.stdout.split("\0").slice(0,-1),2),j=new Map;for(let f of e()(h,32)){d?.throwIfAborted();let e=f.flatMap(a=>{let[,b]=a;return[b,l.join(l.dirname(b),"SKILL.json"),l.join(l.dirname(b),"agents/openai.yaml")]}),h=new Map(f.map(a=>{let[b,c]=a;return[c,function(a,b){if(!l.isAbsolute(a))return null;let[c,d,e,f]=l.relative(a,b).split("/");return c&&d&&e&&f&&".."!==c?l.join(a,c,d,e,".codex-plugin/plugin.json"):null}(b,c)]})),m=Array.from(new Set(h.values())).filter(a=>null!=a&&!j.has(a));e.push(...m);let t=await (0,k.g)(await a.spawn({args:["bash","--norc","-c",'exec python3 -I -S -c "$@"',"skill-metadata",o,String(1048576),String(9e5),...e],cwd:b,signal:d,timeoutMs:1e4}));if(d?.throwIfAborted(),0!==t.code&&127!==t.code)throw Error("Unable to read container skill metadata");let u=127===t.code?e.map(()=>"?"):t.stdout.split("\0").slice(0,-1),v=new Map(e.map((a,b)=>[a,u[b]]));await Promise.all(m.map(async b=>{try{let c=await s(a,b,v,d),e=null==c?null:r.safeParse(JSON.parse(c));j.set(b,e?.success?new Set(e.data.extensions["com.openai"].publicSkills):null)}catch{d?.throwIfAborted(),j.set(b,null)}})),await Promise.all(f.map(async b=>{let[c,e]=b;try{if(!l.isAbsolute(e)||"SKILL.md"!==l.basename(e))throw Error("Invalid skill path");let b=await s(a,e,v,d),f=n.exec(b??"");if(null==f)throw Error("Missing skill frontmatter");let k=p.parse((0,i.d)(f[1])),m=l.dirname(e),o=await s(a,l.join(m,"SKILL.json"),v,d)??await s(a,l.join(m,"agents/openai.yaml"),v,d),r=null==o?void 0:q.parse((0,i.d)(o)).interface,t=h.get(e),u=null==t?null:j.get(t),w={...null==u?{}:{isPublic:u.has(k.name)},name:k.name,description:k.description,shortDescription:k.metadata?.["short-description"],path:e,scope:"repo"===c?"repo":"user",enabled:!0,pluginId:null,interface:null==r?void 0:{displayName:r.display_name,shortDescription:r.short_description,iconSmall:null==r.icon_small?void 0:l.resolve(m,r.icon_small),iconLarge:null==r.icon_large?void 0:l.resolve(m,r.icon_large),iconSmallUrl:null,iconLargeUrl:null,brandColor:r.brand_color,defaultPrompt:r.default_prompt}};g.skills.push(w)}catch{g.errors.push({path:e,message:"Unable to read skill metadata"})}})).then(()=>(d?.throwIfAborted(),c?.onBatch?.({data:[{...g,skills:[...g.skills],errors:[...g.errors]}]})))}return d?.throwIfAborted(),{data:[g]}}})}};