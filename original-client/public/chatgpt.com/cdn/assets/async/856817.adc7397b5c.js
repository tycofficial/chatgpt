export const __rspack_esm_ids=[856817];export const __webpack_modules__={pRGt(e,t,a){var n=a("CpsU"),r=a.n(n),i=a("zKw6"),s=a.n(i),o=a("yI91"),l=a("HwQY"),c=a("ASxG"),d=a("mLoc");let{posix:p}=s(),u=`
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
`,f=/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\s|$)/,m=String.raw`
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
`,h=c.object({name:c.string().trim().min(1),description:c.string(),metadata:c.object({"short-description":c.string().optional()}).optional()}),b=c.object({interface:c.object({display_name:c.string().optional(),short_description:c.string().optional(),icon_small:c.string().optional(),icon_large:c.string().optional(),brand_color:c.string().optional(),default_prompt:c.string().optional()}).optional()}),w=c.object({extensions:c.object({"com.openai":c.object({publicSkills:c.array(c.string())})})});async function g(e,t,a,n){n?.throwIfAborted();let r=a.get(t);if("?"===r)return async function(e,t){try{return await async function(e,t){let a=await e.stat(t);if(!a.isFile()||null!=a.size&&a.size>1048576)throw Error("Skill metadata is not a readable text file");let n=0;return new Response((await e.readFile(t)).pipeThrough(new TransformStream({transform(e,t){if((n+=e.byteLength)>1048576)throw Error("Skill metadata exceeds the size limit");t.enqueue(e)}}))).text()}(e,t)}catch(e){if(e instanceof Error&&/ENOENT|No such file or directory/.test(e.message))return null;throw e}}(e,t);if("-"===r)return null;if(null==r||!r.startsWith("+"))throw Error("Unable to read skill metadata");let i=(0,o.a)(r.slice(1));if(i.byteLength>1048576)throw Error("Skill metadata exceeds the size limit");return new TextDecoder().decode(i)}a.d(t,{},{readHostedSkills:async function(e,t,a){let n=a?.signal;n?.throwIfAborted();let i=await (0,d.g)(await e.spawn({args:["bash","-o","pipefail","-c",u,"cloud-skills",t],cwd:t,signal:n,timeoutMs:1e4}));if(n?.throwIfAborted(),0!==i.code&&2!==i.code&&141!==i.code)throw Error("Unable to discover container skills");let s={cwd:t,skills:[],errors:2===i.code?[{path:t,message:"Unable to discover some container skills"}]:[]},o=r()(i.stdout.split("\0").slice(0,-1),2),c=new Map;for(let i of r()(o,32)){n?.throwIfAborted();let r=i.flatMap(e=>{let[,t]=e;return[t,p.join(p.dirname(t),"SKILL.json"),p.join(p.dirname(t),"agents/openai.yaml")]}),o=new Map(i.map(e=>{let[t,a]=e;return[a,function(e,t){if(!p.isAbsolute(e))return null;let[a,n,r,i]=p.relative(e,t).split("/");return a&&n&&r&&i&&".."!==a?p.join(e,a,n,r,".codex-plugin/plugin.json"):null}(t,a)]})),u=Array.from(new Set(o.values())).filter(e=>null!=e&&!c.has(e));r.push(...u);let y=await (0,d.g)(await e.spawn({args:["bash","--norc","-c",'exec python3 -I -S -c "$@"',"skill-metadata",m,String(1048576),String(9e5),...r],cwd:t,signal:n,timeoutMs:1e4}));if(n?.throwIfAborted(),0!==y.code&&127!==y.code)throw Error("Unable to read container skill metadata");let _=127===y.code?r.map(()=>"?"):y.stdout.split("\0").slice(0,-1),k=new Map(r.map((e,t)=>[e,_[t]]));await Promise.all(u.map(async t=>{try{let a=await g(e,t,k,n),r=null==a?null:w.safeParse(JSON.parse(a));c.set(t,r?.success?new Set(r.data.extensions["com.openai"].publicSkills):null)}catch{n?.throwIfAborted(),c.set(t,null)}})),await Promise.all(i.map(async t=>{let[a,r]=t;try{if(!p.isAbsolute(r)||"SKILL.md"!==p.basename(r))throw Error("Invalid skill path");let t=await g(e,r,k,n),i=f.exec(t??"");if(null==i)throw Error("Missing skill frontmatter");let d=h.parse((0,l.d)(i[1])),u=p.dirname(r),m=await g(e,p.join(u,"SKILL.json"),k,n)??await g(e,p.join(u,"agents/openai.yaml"),k,n),w=null==m?void 0:b.parse((0,l.d)(m)).interface,y=o.get(r),_=null==y?null:c.get(y),$={...null==_?{}:{isPublic:_.has(d.name)},name:d.name,description:d.description,shortDescription:d.metadata?.["short-description"],path:r,scope:"repo"===a?"repo":"user",enabled:!0,pluginId:null,interface:null==w?void 0:{displayName:w.display_name,shortDescription:w.short_description,iconSmall:null==w.icon_small?void 0:p.resolve(u,w.icon_small),iconLarge:null==w.icon_large?void 0:p.resolve(u,w.icon_large),iconSmallUrl:null,iconLargeUrl:null,brandColor:w.brand_color,defaultPrompt:w.default_prompt}};s.skills.push($)}catch{s.errors.push({path:r,message:"Unable to read skill metadata"})}})).then(()=>(n?.throwIfAborted(),a?.onBatch?.({data:[{...s,skills:[...s.skills],errors:[...s.errors]}]})))}return n?.throwIfAborted(),{data:[s]}}})}};