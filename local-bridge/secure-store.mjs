import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { BridgeError } from './constants.mjs';
const exec = promisify(execFile);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
/** Directory ACL is established before secrets are created; children inherit it. */
export async function restrictOwner(target, directory = false) {
  if (process.platform !== 'win32') { await fs.chmod(target, directory ? 0o700 : 0o600); return; }
  // Reuse the current descriptor so SACL/audit sections are never requested.
  // A private existing ACL is verified without rewriting open file handles.
  const script = `$ErrorActionPreference='Stop';Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -Force;$p=$env:LOCAL_BRIDGE_ACL_TARGET;$id=[Security.Principal.WindowsIdentity]::GetCurrent().User;$items=@(Get-Item -LiteralPath $p);if($items[0].PSIsContainer){$items+=@(Get-ChildItem -LiteralPath $p -Recurse -Force)};foreach($item in $items){if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Protected state cannot contain reparse points'};$isDir=$item.PSIsContainer;$a=Get-Acl -LiteralPath $item.FullName;if($a.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $id.Value){throw 'Protected state must be owned by the current account'};$private=@($a.Access).Count -gt 0;foreach($rule in $a.Access){if($rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $id.Value -or $rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or ($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -ne [Security.AccessControl.FileSystemRights]::FullControl){$private=$false}};if(-not $private -or ($isDir -and -not $a.AreAccessRulesProtected)){$a.SetAccessRuleProtection($true,$false);foreach($rule in @($a.Access)){$a.RemoveAccessRuleSpecific($rule)};$inherit=if($isDir){[Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'}else{[Security.AccessControl.InheritanceFlags]::None};$r=New-Object Security.AccessControl.FileSystemAccessRule($id,'FullControl',$inherit,[Security.AccessControl.PropagationFlags]::None,[Security.AccessControl.AccessControlType]::Allow);$a.AddAccessRule($r);Set-Acl -LiteralPath $item.FullName -AclObject $a};$v=Get-Acl -LiteralPath $item.FullName;if($v.GetOwner([Security.Principal.SecurityIdentifier]).Value -ne $id.Value -or @($v.Access).Count -eq 0){throw 'Credential ownership could not be verified'};foreach($rule in $v.Access){if($rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -ne $id.Value -or $rule.AccessControlType -ne [Security.AccessControl.AccessControlType]::Allow -or ($rule.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -ne [Security.AccessControl.FileSystemRights]::FullControl){throw 'Non-owner credential permission'}}}`;
  let powershell = process.env.LOCAL_BRIDGE_POWERSHELL;
  if (!powershell) { try { const result = await exec('where.exe', ['pwsh.exe'], { windowsHide: true, timeout: 5000 }); powershell = result.stdout.split(/\r?\n/).find(line => line.trim()); } catch {} }
  powershell ||= path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try { await exec(powershell, ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 30000, env: { ...process.env, LOCAL_BRIDGE_ACL_TARGET: target } }); }
  catch { throw new BridgeError('OWNER_ONLY_PERMISSIONS_REQUIRED', 'Owner-only permissions could not be applied. No credentials will be written.'); }

}
export class ProtectedStore {
  constructor(directory) { this.directory = path.resolve(directory); this.queue = Promise.resolve(); }
  async initialize() {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    if ((await fs.lstat(this.directory)).isSymbolicLink()) throw new BridgeError('UNSAFE_STATE_PATH', 'The credential directory must not be a symbolic link');
    await restrictOwner(this.directory, true);
    for (const sub of ['jobs', 'locks']) await fs.mkdir(this.resolve(sub), { recursive: true, mode: 0o700 });
    return this;
  }
  resolve(name) { const result = path.resolve(this.directory, name); if (!result.startsWith(this.directory + path.sep)) throw new BridgeError('INVALID_STATE_PATH', 'Invalid local state path'); return result; }
  async read(name, fallback = null) {
    try { const file = this.resolve(name), stat = await fs.lstat(file); if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Unsafe local state file'); if (process.platform !== 'win32' && (stat.mode & 0o077)) throw Error('State file is not owner-only'); return JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return structuredClone(fallback); throw error; }
  }
  async write(name, value) {
    const operation = async () => {
      const target = this.resolve(name), temporary = target + '.' + crypto.randomUUID() + '.tmp'; await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
      const handle = await fs.open(temporary, 'wx', 0o600);
      try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); } finally { await handle.close(); }
      try {
        for (let retry = 0; ; retry++) {
          try { await fs.rename(temporary, target); break; }
          catch (error) { if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || retry >= 6) throw error; await wait(Math.min(250, 20 * 2 ** retry)); }
        }
      } catch (error) { await fs.unlink(temporary).catch(() => {}); throw error; }
    };
    const result = this.queue.then(operation); this.queue = result.catch(() => {}); return result;
  }
  async withLock(name, fn, { timeoutMs = 45000 } = {}) {
    const target = this.resolve('locks/' + crypto.createHash('sha256').update(name).digest('hex') + '.lock'), nonce = crypto.randomUUID(), start = Date.now();
    while (true) {
      try { const handle = await fs.open(target, 'wx', 0o600); await handle.writeFile(JSON.stringify({ pid: process.pid, nonce, createdAt: Date.now() })); await handle.close(); break; }
      catch (error) {
        if (error.code !== 'EEXIST') throw error;
        let old; try { old = JSON.parse(await fs.readFile(target, 'utf8')); } catch {}
        if (old?.pid) { let alive = true; try { process.kill(old.pid, 0); } catch (error) { if (error.code === 'ESRCH') alive = false; } if (!alive) { const check = JSON.parse(await fs.readFile(target, 'utf8')); if (check.nonce === old.nonce) await fs.unlink(target); continue; } }
        if (Date.now() - start > timeoutMs) throw new BridgeError('SESSION_LOCKED', 'Another local process is refreshing this session');
        await wait(100);
      }
    }
    try { return await fn(); } finally { try { const current = JSON.parse(await fs.readFile(target, 'utf8')); if (current.nonce === nonce) await fs.unlink(target); } catch {} }
  }
  async hostId() { return this.withLock('host-id', async () => { let state = await this.read('host.json'); if (!state) { state = { ext_agent_host_id: 'urn:uuid:' + crypto.randomUUID() }; await this.write('host.json', state); } return state.ext_agent_host_id; }); }
}
