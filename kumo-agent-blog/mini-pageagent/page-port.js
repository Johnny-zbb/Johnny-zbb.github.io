// Infrastructure adapter. The rest of the app never sees SDK snapshots or elements.
export class DomSdkPagePort {
  constructor(root, sdk) {
    this.root = root;
    this.sdk = sdk;
    this.lastSnapshot = null;
  }
  async observe() {
    const raw = this.sdk.analyze({ target: { root: this.root }, output: ['text', 'elements'] });
    this.lastSnapshot = raw;
    const searchInput = this.root.querySelector('[aria-label="搜索实例"]');
    const dialog = this.root.querySelector('#createDialog');
    return {
      text: String(raw.text || '').slice(0, 6500),
      controls: raw.elements.map(item => ({ ref: item.ref, name: item.name || item.element.getAttribute('aria-label') || '', role: item.role })),
      facts: {
        filter: this.root.dataset.filter || 'all',
        search: searchInput ? searchInput.value : '',
        dialogOpen: !!(dialog && !dialog.hidden),
        draftName: this.root.querySelector('#instanceName')?.value || '',
        instances: [...this.root.querySelectorAll('[data-instance-name]')].map(row => ({
          name: row.dataset.instanceName,
          status: row.dataset.instanceStatus
        }))
      }
    };
  }
  async preview(ref) {
    const element = this.lastSnapshot?.refs.resolve(ref);
    if (!element || !this.root.contains(element)) throw new Error('目标元素已失效。');
    element.classList.add('agent-target');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 520));
    element.classList.remove('agent-target');
  }
  async execute(command) {
    const snapshot = this.lastSnapshot;
    const element = snapshot?.refs.resolve(command.ref);
    if (!snapshot || !element || !element.isConnected || !this.root.contains(element)) return { ok: false, summary: 'ref 已失效，请重新观察页面。' };
    if (element.matches(':disabled,[aria-disabled="true"]')) return { ok: false, summary: '目标控件不可用。' };
    const result = command.type === 'input'
      ? this.sdk.actions.input(command.ref, command.value, { snapshot })
      : this.sdk.actions.click(command.ref, { snapshot });
    return { ok: !!result.ok, summary: result.summary || '操作完成' };
  }
}
