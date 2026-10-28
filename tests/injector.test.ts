import { describe,it,expect,vi,afterEach } from 'vitest';
import type { ThemePackage } from '../src/core/theme-manager/schema';
import manifest from '../themes/nerv/manifest.json';
import tokens from '../themes/nerv/tokens.json';
import layout from '../themes/nerv/layout.json';
import { allowedTarget, loopbackSocket, validatePort, validateBindings } from '../scripts/cdp';
import { CompatibilityAdapter } from '../src/core/compatibility';
const theme={manifest,tokens,layout,css:''} as ThemePackage;
afterEach(()=>{window.__CTE_LOCAL__?.restore();delete window.__CTE_LOCAL__;document.body.replaceChildren();vi.useRealTimers();vi.resetModules();});
describe('controlled injection',()=>{
  it('recognizes the observed desktop shell without selecting hidden main surfaces or document editors',()=>{
    document.body.innerHTML='<main hidden></main><div id="layout"><aside class="app-shell-left-panel"><div class="sidebar-navigation"></div></aside><div><main id="chat"><div data-composer-body><div class="ProseMirror" role="textbox" contenteditable="true"></div></div></main></div></div><div class="writing-block-editor"><div class="ProseMirror" role="textbox" contenteditable="true"></div></div>';
    const result=new CompatibilityAdapter(document).inspect();expect(result).toMatchObject({compatible:true,profile:'desktop-2026'});expect(result.main?.id).toBe('chat');expect(result.layout?.id).toBe('layout');
    document.querySelector('[data-composer-body] .ProseMirror')!.setAttribute('contenteditable','false');
    expect(new CompatibilityAdapter(document).inspect()).toMatchObject({compatible:true,main:result.main,composer:result.composer});
    document.querySelector('[data-composer-body]')!.remove();expect(new CompatibilityAdapter(document).inspect().compatible).toBe(false);
  });
  it('rejects remote sockets, redirects in URLs and unrelated renderer targets',()=>{
    for(const value of ['ws://localhost:9335/devtools/page/abc','ws://10.0.0.1:9335/devtools/page/abc','wss://127.0.0.1:9335/devtools/page/abc','ws://127.0.0.1:9336/devtools/page/abc','ws://u:p@127.0.0.1:9335/devtools/page/abc','ws://127.0.0.1:9335/devtools/page/abc?q=1'])expect(()=>loopbackSocket(value,9335)).toThrow();
    expect(loopbackSocket('ws://127.0.0.1:9335/devtools/page/abc',9335)).toContain('127.0.0.1');expect(()=>validatePort(80)).toThrow();expect(allowedTarget({id:'1',type:'page',url:'https://evil.test',webSocketDebuggerUrl:''})).toBe(false);
    expect(()=>validateBindings(['127.0.0.1','::1'])).not.toThrow();for(const addresses of [[],['0.0.0.0'],['127.0.0.1','::'],['192.168.1.4']])expect(()=>validateBindings(addresses)).toThrow();
  });
  it('refuses to inject when official structural anchors do not match',async()=>{
    document.body.innerHTML='<main><textarea></textarea></main>';await import('../src/core/injector/runtime');expect(window.__CTE_LOCAL__!.install(theme).compatible).toBe(false);expect(document.querySelector('[data-cte-panel]')).toBeNull();expect(document.querySelector('[data-cte-style]')).toBeNull();
  });
  it('preserves composer, official event handlers and attributes across apply, collapse and restore',async()=>{
    document.body.innerHTML='<nav id="history" data-cte-region="old"></nav><main><textarea id="prompt-textarea">keep my draft</textarea><button id="original">official</button></main>';
    const handler=vi.fn();document.querySelector('#original')!.addEventListener('click',handler);const composer=document.querySelector('textarea');
    await import('../src/core/injector/runtime');expect(window.__CTE_LOCAL__!.install(theme).compatible).toBe(true);expect(document.querySelectorAll('[data-cte-panel]')).toHaveLength(1);
    document.querySelector<HTMLButtonElement>('[data-collapse]')!.click();expect(document.documentElement.hasAttribute('data-cte-collapsed')).toBe(true);
    window.__CTE_LOCAL__!.install(theme);expect(document.querySelectorAll('[data-cte-panel]')).toHaveLength(1);window.__CTE_LOCAL__!.restore();
    expect(document.querySelector('textarea')).toBe(composer);expect(composer!.value).toBe('keep my draft');document.querySelector<HTMLButtonElement>('#original')!.click();expect(handler).toHaveBeenCalledOnce();expect(document.querySelector('#history')?.getAttribute('data-cte-region')).toBe('old');expect(document.querySelector('[data-cte-panel]')).toBeNull();expect(document.querySelector('[data-cte-style]')).toBeNull();expect(document.documentElement.hasAttribute('data-cte-root')).toBe(false);expect(document.documentElement.hasAttribute('data-cte-collapsed')).toBe(false);
  });
  it('suspends during an unsupported route and rebinds when supported chat returns',async()=>{
    vi.useFakeTimers();document.body.innerHTML='<nav id="history"></nav><main><textarea id="prompt-textarea"></textarea></main>';await import('../src/core/injector/runtime');window.__CTE_LOCAL__!.install(theme);
    document.querySelector<HTMLButtonElement>('[data-collapse]')!.click();
    document.querySelector('#prompt-textarea')!.id='changed-composer';await vi.advanceTimersByTimeAsync(400);
    expect(document.querySelector('[data-cte-panel]')).toBeNull();expect(window.__CTE_LOCAL__!.status()).toMatchObject({phase:'suspended',enabled:true,collapsed:true});
    document.querySelector('main')!.innerHTML='<textarea id="prompt-textarea">host draft</textarea>';await vi.advanceTimersByTimeAsync(400);
    expect(document.querySelectorAll('[data-cte-panel]')).toHaveLength(1);expect(document.querySelector('[data-cte-panel]')?.hasAttribute('data-collapsed')).toBe(true);expect(document.querySelector('textarea')?.value).toBe('host draft');expect(window.__CTE_LOCAL__!.status().phase).toBe('active');
    window.__CTE_LOCAL__!.restore();expect(vi.getTimerCount()).toBe(0);
    document.querySelector('main')!.innerHTML='<textarea id="prompt-textarea"></textarea>';await vi.advanceTimersByTimeAsync(400);expect(document.querySelector('[data-cte-panel]')).toBeNull();expect(window.__CTE_LOCAL__!.status().phase).toBe('disabled');
  });
  it('treats inert settings backgrounds as unsupported without changing native visibility',()=>{
    document.body.innerHTML='<div id="shell" inert><nav id="history"></nav><main><textarea id="prompt-textarea"></textarea></main></div><section role="dialog">Settings fixture</section>';
    expect(new CompatibilityAdapter(document).inspect().compatible).toBe(false);document.querySelector('#shell')!.removeAttribute('inert');expect(new CompatibilityAdapter(document).inspect().compatible).toBe(true);
  });
});
