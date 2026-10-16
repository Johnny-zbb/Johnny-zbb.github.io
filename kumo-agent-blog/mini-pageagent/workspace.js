// Demo bounded context. Purely in-memory; no cloud account or external requests.
const seed = [
  { id: 1, name: 'Kumo-Web-01', region: '华北-北京', config: '2 vCPU · 4 GiB', status: 'running' },
  { id: 2, name: 'Agent-Worker-02', region: '华东-上海', config: '4 vCPU · 8 GiB', status: 'stopped' },
  { id: 3, name: 'Page-Agent-03', region: '华南-广州', config: '2 vCPU · 8 GiB', status: 'running' },
  { id: 4, name: 'Kumo-DB-04', region: '华北-北京', config: '8 vCPU · 16 GiB', status: 'running' }
];
export class DemoWorkspace {
  constructor(root) {
    this.root = root;
    this.reset();
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      if (button.dataset.filter) { this.filter = button.dataset.filter; this.render(); }
      if (button.id === 'createBtn') this.setDialog(true);
      if (button.id === 'cancelCreate') this.setDialog(false);
      if (button.id === 'confirmCreate') this.create();
      if (button.dataset.toggle) {
        const row = this.instances.find(item => String(item.id) === button.dataset.toggle);
        if (row) { row.status = row.status === 'running' ? 'stopped' : 'running'; this.render(); }
      }
    });
    root.querySelector('#searchBox').addEventListener('input', event => {
      this.search = event.target.value;
      this.render();
    });
  }
  reset() {
    this.instances = seed.map(row => ({ ...row }));
    this.filter = 'all';
    this.search = '';
    if (this.root.querySelector('#searchBox')) this.root.querySelector('#searchBox').value = '';
    this.setDialog(false);
    this.render();
  }
  setDialog(open) {
    const dialog = this.root.querySelector('#createDialog');
    if (dialog) dialog.hidden = !open;
    if (open) this.root.querySelector('#instanceName').value = '';
  }
  create() {
    const name = this.root.querySelector('#instanceName').value.trim();
    if (!/^[A-Za-z][\w-]{2,24}$/.test(name)) { this.root.querySelector('#formError').textContent = '名称需以字母开头，长度 3–25，只能使用字母、数字、_ 或 -'; return; }
    if (this.instances.some(row => row.name === name)) { this.root.querySelector('#formError').textContent = '名称已存在'; return; }
    this.instances.push({ id: Math.max(...this.instances.map(x => x.id)) + 1, name, region: '华北-北京', config: '2 vCPU · 4 GiB', status: 'running' });
    this.filter = 'all';
    this.search = '';
    this.root.querySelector('#searchBox').value = '';
    this.root.querySelector('#formError').textContent = '';
    this.setDialog(false);
    this.render();
  }
  render() {
    this.root.dataset.filter = this.filter;
    this.root.querySelectorAll('[data-filter]').forEach(btn => { btn.setAttribute('aria-pressed', String(btn.dataset.filter === this.filter)); });
    const matching = this.instances.filter(row => (this.filter === 'all' || row.status === this.filter) && row.name.toLowerCase().includes(this.search.toLowerCase()));
    const tbody = this.root.querySelector('#instanceRows');
    tbody.replaceChildren(...matching.map(row => {
      const tr = document.createElement('tr');
      tr.dataset.instanceName = row.name;
      tr.dataset.instanceStatus = row.status;
      const add = (tag, content, cls) => { const cell = document.createElement(tag); cell.textContent = content; if (cls) cell.className = cls; return cell; };
      tr.append(add('td', row.name, 'instance-name'), add('td', row.region), add('td', row.config));
      const state = document.createElement('td'); state.append(add('span', row.status === 'running' ? '● 运行中' : '○ 已停止', 'state ' + row.status)); tr.append(state);
      const actions = document.createElement('td'); const button = add('button', row.status === 'running' ? '停止' : '启动', 'table-action');
      button.type = 'button'; button.dataset.toggle = String(row.id); button.setAttribute('aria-label', (row.status === 'running' ? '停止 ' : '启动 ') + row.name); actions.append(button); tr.append(actions);
      return tr;
    }));
    this.root.querySelector('#rowCount').textContent = matching.length + ' / ' + this.instances.length + ' 实例';
    this.root.querySelector('#emptyState').hidden = matching.length > 0;
    this.root.querySelector('#runningCount').textContent = String(this.instances.filter(row => row.status === 'running').length);
    this.root.querySelector('#totalCount').textContent = String(this.instances.length);
  }
}
